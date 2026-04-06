import { useEffect, useState } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { Button, Canvas, Text, View } from '@tarojs/components';
import { getProduct } from '../../services/products';
import { Product, ProductLabelItem } from '../../types';
import { formatCurrency } from '../../utils/format';

type QRCodeStatus = 'loading' | 'success' | 'error';

interface QRCodeState {
  path: string;
  status: QRCodeStatus;
}

// 标签尺寸配置（高清绘制，避免锯齿）
const LABEL_WIDTH = 720;  // 基础画布宽度（3倍）
const LABEL_HEIGHT = 1080; // 基础画布高度（3倍）
const CANVAS_SCALE = 2;   // 导出时再放大2倍，最终 1440x2160

// 品牌文案配置
const BRAND_LINE1 = 'ChuChuNight';     // 品牌文案第一行
const BRAND_LINE2 = '棉眠小铺 면면샵';   // 品牌文案第二行
const BRAND_LINE1_FONT_SIZE = 56;       // 第一行字体大小
const BRAND_LINE2_FONT_SIZE = 42;       // 第二行字体大小，与颜色尺寸字体大小保持一致
const BRAND_LINE_HEIGHT = 70;           // 行高

export default function ProductLabelPrintPage() {
  const [productId, setProductId] = useState(0);
  const [product, setProduct] = useState<Product | null>(null);
  const [labels, setLabels] = useState<ProductLabelItem[]>([]);
  const [selectedSkuIds, setSelectedSkuIds] = useState<number[]>([]);
  const [generating, setGenerating] = useState(false);
  const [qrCodeMap, setQrCodeMap] = useState<Record<string, QRCodeState>>(({}));

  useLoad((params) => {
    const id = Number(params.id || 0);
    const preselectedSkuId = Number(params.skuId || 0);
    setProductId(id);
    if (id) {
      void loadProduct(id, preselectedSkuId);
    }

  });

  // 预生成所有二维码（下载为本地临时文件）
  useEffect(() => {
    if (labels.length === 0) return;

    const generateQRCodes = async () => {
      // 初始化所有为 loading 状态
      const initialMap: Record<string, QRCodeState> = {};
      for (const label of labels) {
        initialMap[label.barcode] = { path: '', status: 'loading' };
      }
      setQrCodeMap(initialMap);

      // 逐个下载二维码
      for (const label of labels) {
        await downloadQRCode(label.barcode);
      }
    };

    void generateQRCodes();
  }, [labels]);

  // 下载单个二维码
  const downloadQRCode = async (barcode: string): Promise<void> => {
    setQrCodeMap((prev) => ({
      ...prev,
      [barcode]: { path: prev[barcode]?.path || '', status: 'loading' },
    }));

    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=0&data=${encodeURIComponent(barcode)}`;
      const downloadRes = await Taro.downloadFile({ url: qrUrl });
      if (downloadRes.statusCode === 200 && downloadRes.tempFilePath) {
        setQrCodeMap((prev) => ({
          ...prev,
          [barcode]: { path: downloadRes.tempFilePath, status: 'success' },
        }));
      } else {
        throw new Error('下载失败');
      }
    } catch (err) {
      console.error('二维码下载失败:', err);
      setQrCodeMap((prev) => ({
        ...prev,
        [barcode]: { path: '', status: 'error' },
      }));
    }
  };

  // 重试下载二维码
  const handleRetryQRCode = async (e: { stopPropagation: () => void }, barcode: string) => {
    e.stopPropagation();
    await downloadQRCode(barcode);
  };

  // 获取二维码就绪数量统计
  const getQRCodeStats = () => {
    const total = labels.length;
    const ready = labels.filter((l) => qrCodeMap[l.barcode]?.status === 'success').length;
    const loading = labels.filter((l) => qrCodeMap[l.barcode]?.status === 'loading').length;
    const error = labels.filter((l) => qrCodeMap[l.barcode]?.status === 'error').length;
    return { total, ready, loading, error };
  };

  const loadProduct = async (id: number, preselectedSkuId?: number) => {
    try {
      const result = await getProduct(id);
      setProduct(result);
      const labelItems: ProductLabelItem[] = result.specifications.map((spec) => ({
        skuId: spec.id,
        productId: result.id,
        productCode: result.productCode,
        productName: result.name,
        barcode: spec.barcode || spec.skuCode,
        skuCode: spec.skuCode,
        color: spec.color,
        size: spec.size,
        salePrice: spec.salePrice,
        image: result.mainImages[0] || null,
      }));
      setLabels(labelItems);
      if (preselectedSkuId && labelItems.some((l) => l.skuId === preselectedSkuId)) {
        setSelectedSkuIds([preselectedSkuId]);
      } else {
        setSelectedSkuIds(labelItems.map((l) => l.skuId));
      }
    } catch (error: any) {
      Taro.showToast({ title: error.message || '加载失败', icon: 'none' });
    }
  };

  const toggleSelection = (skuId: number) => {
    setSelectedSkuIds((prev) =>
      prev.includes(skuId) ? prev.filter((id) => id !== skuId) : [...prev, skuId]
    );
  };

  // 生成单个标签图片（使用原生 Canvas API）
  const generateLabelImage = async (label: ProductLabelItem): Promise<string> => {
    const ctx = Taro.createCanvasContext('labelCanvas');
    const width = LABEL_WIDTH;
    const height = LABEL_HEIGHT;
    const padding = 60;
    const borderRadius = 48;

    // 清空画布
    ctx.setFillStyle('#ffffff');
    ctx.fillRect(0, 0, width, height);

    // 外边框
    ctx.setStrokeStyle('#cccccc');
    ctx.setLineWidth(1);
    drawRoundRectPath(ctx, 0, 0, width, height, borderRadius);
    ctx.stroke();

    // 品牌区域 - 使用两行文案
    const brandY = 50;
    ctx.setFillStyle('#000000');
    ctx.setTextAlign('center');
    
    // 第一行 - 400字重，使用系统默认字体
    (ctx as any).font = `400 ${BRAND_LINE1_FONT_SIZE}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
    ctx.fillText(BRAND_LINE1, width / 2, brandY + BRAND_LINE1_FONT_SIZE);
    
    // 第二行 - 400字重，使用系统默认字体
    (ctx as any).font = `400 ${BRAND_LINE2_FONT_SIZE}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
    ctx.fillText(BRAND_LINE2, width / 2, brandY + BRAND_LINE1_FONT_SIZE + BRAND_LINE_HEIGHT);
    
    // 品牌区域分隔线
    ctx.setStrokeStyle('#cccccc');
    ctx.setLineWidth(0.5);
    ctx.beginPath();
    const brandDividerY = brandY + BRAND_LINE1_FONT_SIZE + BRAND_LINE_HEIGHT + 30;
    ctx.moveTo(padding, brandDividerY);
    ctx.lineTo(width - padding, brandDividerY);
    ctx.stroke();

    // 商品信息
    ctx.setFillStyle('#000000');
    ctx.setTextAlign('center');
    const infoY = brandDividerY + 72;
    (ctx as any).font = '51px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    ctx.fillText(label.productName, width / 2, infoY);

    (ctx as any).font = '42px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    ctx.fillText(`${label.color} | ${label.size}`, width / 2, infoY + 84);

    // 价格（居中）- ¥符号用小字号，与web端保持一致
    const priceY = infoY + 210;
    const priceText = label.salePrice.toFixed(2);
    const priceSymbol = '¥';
    const priceSymbolFontSize = 40; // 小字号
    const priceValueFontSize = 84;  // 大字号
    const priceSymbolMarginRight = 12;

    // 估算文字宽度（¥符号按0.5倍字号，数字按0.6倍字号）
    const symbolWidth = priceSymbolFontSize * 0.5;
    const valueWidth = priceText.length * priceValueFontSize * 0.6;
    const totalWidth = symbolWidth + priceSymbolMarginRight + valueWidth;

    // 计算起始位置（居中）
    const startX = (width - totalWidth) / 2;
    const symbolX = startX + symbolWidth / 2;
    const valueX = startX + symbolWidth + priceSymbolMarginRight + valueWidth / 2;

    // 绘制 ¥ 符号（小字号，基线对齐）
    ctx.setTextAlign('center');
    (ctx as any).font = `400 ${priceSymbolFontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
    ctx.fillText(priceSymbol, symbolX, priceY - 12); // 稍微上移对齐数值的视觉中心

    // 绘制价格数值（大字号）
    (ctx as any).font = `400 ${priceValueFontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
    ctx.fillText(priceText, valueX, priceY);

    // 分隔线
    const priceDividerY = priceY + 72;
    ctx.beginPath();
    ctx.moveTo(padding, priceDividerY);
    ctx.lineTo(width - padding, priceDividerY);
    ctx.stroke();

    // 二维码区域
    const qrBoxSize = 300;
    const qrPadding = 12;
    const qrBoxX = (width - qrBoxSize) / 2;
    const qrBoxY = priceDividerY + 48;
    const qrImageSize = qrBoxSize - 2 * qrPadding;
    const qrImageX = qrBoxX + qrPadding;
    const qrImageY = qrBoxY + qrPadding;

    // 二维码边框
    ctx.setStrokeStyle('#cccccc');
    ctx.setLineWidth(1);
    drawRoundRectPath(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 10);
    ctx.setFillStyle('#ffffff');
    ctx.fill();
    ctx.stroke();

    // 绘制二维码图片
    const qrState = qrCodeMap[label.barcode];
    if (qrState?.status === 'success' && qrState.path) {
      ctx.drawImage(qrState.path, qrImageX, qrImageY, qrImageSize, qrImageSize);
    } else {
      ctx.setFillStyle('#eeeeee');
      ctx.fillRect(qrImageX, qrImageY, qrImageSize, qrImageSize);
      ctx.setFillStyle('#999999');
      (ctx as any).font = '36px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
      ctx.fillText('二维码', width / 2, qrBoxY + qrBoxSize / 2 + 12);
    }

    // 执行绘制
    await new Promise<void>((resolve) => {
      ctx.draw(false, () => {
        setTimeout(resolve, 100);
      });
    });

    // 导出图片
    return new Promise((resolve, reject) => {
      Taro.canvasToTempFilePath({
        canvasId: 'labelCanvas',
        x: 0,
        y: 0,
        width: width,
        height: height,
        destWidth: width * CANVAS_SCALE,
        destHeight: height * CANVAS_SCALE,
        fileType: 'png',
        quality: 1,
        success: (res) => resolve(res.tempFilePath),
        fail: reject,
      });
    });
  };

  // 绘制圆角矩形路径
  const drawRoundRectPath = (
    ctx: Taro.CanvasContext,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.arc(x + w - radius, y + radius, radius, -Math.PI / 2, 0);
    ctx.lineTo(x + w, y + h - radius);
    ctx.arc(x + w - radius, y + h - radius, radius, 0, Math.PI / 2);
    ctx.lineTo(x + radius, y + h);
    ctx.arc(x + radius, y + h - radius, radius, Math.PI / 2, Math.PI);
    ctx.lineTo(x, y + radius);
    ctx.arc(x + radius, y + radius, radius, Math.PI, -Math.PI / 2);
    ctx.closePath();
  };

  // 预览单个标签
  const handlePreview = async (label: ProductLabelItem) => {
    const qrState = qrCodeMap[label.barcode];
    if (!qrState || qrState.status !== 'success') {
      Taro.showToast({ title: '二维码加载中，请稍候', icon: 'none' });
      return;
    }

    setGenerating(true);
    Taro.showLoading({ title: '生成中...' });

    try {
      const imagePath = await generateLabelImage(label);
      Taro.previewImage({
        urls: [imagePath],
        current: imagePath,
      });
    } catch (error: any) {
      Taro.showToast({ title: error.message || '生成失败', icon: 'none' });
    } finally {
      setGenerating(false);
      Taro.hideLoading();
    }
  };

  // 批量生成并保存标签图片
  const handleGenerate = async () => {
    const selectedLabels = labels.filter((l) => selectedSkuIds.includes(l.skuId));
    if (selectedLabels.length === 0) {
      Taro.showToast({ title: '请至少选择一个规格', icon: 'none' });
      return;
    }

    const notReadyLabels = selectedLabels.filter((l) => qrCodeMap[l.barcode]?.status !== 'success');
    if (notReadyLabels.length > 0) {
      Taro.showToast({ title: '二维码加载中，请稍候', icon: 'none' });
      return;
    }

    setGenerating(true);

    try {
      for (let i = 0; i < selectedLabels.length; i++) {
        const label = selectedLabels[i];
        Taro.showLoading({ title: `正在生成 ${i + 1}/${selectedLabels.length}...` });

        const imagePath = await generateLabelImage(label);

        await new Promise<void>((resolve, reject) => {
          Taro.saveImageToPhotosAlbum({
            filePath: imagePath,
            success: resolve,
            fail: (err) => {
              if (err.errMsg?.includes('auth deny')) {
                Taro.showModal({
                  title: '需要授权',
                  content: '请允许保存图片到相册',
                  success: (modalRes) => {
                    if (modalRes.confirm) {
                      Taro.openSetting();
                    }
                  },
                });
              }
              reject(err);
            },
          });
        });
      }

      Taro.showToast({ title: `已保存 ${selectedLabels.length} 张标签`, icon: 'success' });
    } catch (error: any) {
      Taro.showToast({ title: error.message || '保存失败', icon: 'none' });
    } finally {
      setGenerating(false);
      Taro.hideLoading();
    }
  };

  if (!product) {
    return (
      <View className='page loading-state'>
        <View className='loading-state__panel'>加载中...</View>
      </View>
    );
  }

  return (
    <View className='page page--print'>
      <View className='page__header'>
        <View className='page__eyebrow'>Label Print</View>
        <View className='page__title'>打印标签</View>
        <View className='page__subtitle'>
          {product.name} ({product.productCode})
        </View>
      </View>

      <View className='panel'>
        <View className='card__header'>
          <View>
            <View className='card__title'>选择规格</View>
            <View className='section-desc'>选择需要打印标签的规格</View>
          </View>
        </View>

        <View className='stack'>
          {labels.map((label) => {
            const qrState = qrCodeMap[label.barcode];
            const isReady = qrState?.status === 'success';
            const isLoading = qrState?.status === 'loading';
            const isError = qrState?.status === 'error';

            return (
              <View
                key={label.skuId}
                className={`detail-option ${selectedSkuIds.includes(label.skuId) ? 'detail-option--selected' : ''}`}
                onClick={() => toggleSelection(label.skuId)}
              >
                <View className='row row--start'>
                  <Text>
                    {label.color} / {label.size}
                  </Text>
                  <Text className={selectedSkuIds.includes(label.skuId) ? 'success' : 'muted'}>
                    {formatCurrency(label.salePrice)}
                  </Text>
                </View>
                <View className='list-item__meta'>
                  <Text>{label.barcode}</Text>
                  <View className='row' style={{ gap: '16px', alignItems: 'center' }}>
                    {isLoading && (
                      <View className='qr-status-tag qr-status-tag--loading'>
                        <View className='qr-status-dot' />
                        <Text className='qr-status-text'>加载中</Text>
                      </View>
                    )}
                    {isError && (
                      <Text
                        className='link qr-status-tag qr-status-tag--error'
                        onClick={(e) => handleRetryQRCode(e, label.barcode)}
                      >
                        加载失败，点击重试
                      </Text>
                    )}
                    {isReady && (
                      <Text
                        className='link qr-status-tag qr-status-tag--ready'
                        onClick={(e) => {
                          e.stopPropagation();
                          void handlePreview(label);
                        }}
                      >
                        预览
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View className='panel'>
        <View className='btn-row'>
          {(() => {
            const { ready, loading, error, total } = getQRCodeStats();
            const selectedCount = selectedSkuIds.length;
            const selectedReady = labels.filter(
              (l) => selectedSkuIds.includes(l.skuId) && qrCodeMap[l.barcode]?.status === 'success'
            ).length;

            let btnText = '';
            let btnDisabled = false;

            if (loading > 0 && selectedCount > 0) {
              btnText = `二维码加载中 (${ready}/${total})`;
              btnDisabled = true;
            } else if (error > 0 && ready === 0) {
              btnText = '二维码加载失败';
              btnDisabled = true;
            } else if (selectedCount === 0) {
              btnText = '请选择规格';
              btnDisabled = true;
            } else {
              btnText = `生成并保存标签 (${selectedReady}张)`;
              btnDisabled = selectedReady === 0 || selectedReady < selectedCount;
            }

            return (
              <Button
                className='button button--primary'
                loading={generating}
                disabled={btnDisabled}
                onClick={() => void handleGenerate()}
              >
                {btnText}
              </Button>
            );
          })()}
        </View>

      </View>

      {/* 隐藏的原生 Canvas */}
      <Canvas
        canvasId='labelCanvas'
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: LABEL_WIDTH,
          height: LABEL_HEIGHT,
        }}
      />
    </View>
  );
}
