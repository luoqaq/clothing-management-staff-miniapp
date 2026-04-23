import { useEffect, useState } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { Button, Canvas, Text, View } from '@tarojs/components';
import { getProduct } from '../../services/products';
import { Product, ProductLabelItem } from '../../types';
import { formatCurrency } from '../../utils/format';
import { createQRCodeMatrix, drawQRCodeMatrix, QRCodeMatrix } from '../../utils/qrcode';

type QRCodeStatus = 'loading' | 'success' | 'error';

interface QRCodeState {
  status: QRCodeStatus;
  matrix: QRCodeMatrix | null;
}

// 标签尺寸配置：40mm x 60mm 放大 2 倍导出
// 打印 App 默认不读 PNG DPI，实测 472x709 偏小，改用 944x1417
const LABEL_WIDTH = 944;
const LABEL_HEIGHT = 1417;
const SMALL_LABEL_WIDTH = 1181;
const SMALL_LABEL_HEIGHT = 709;
const CANVAS_SCALE = 1;

// 品牌文案配置
const BRAND_LINE1 = 'ChuChuNight';     // 品牌文案第一行
const BRAND_LINE2 = '棉眠小铺 면면샵';   // 品牌文案第二行
const BRAND_LINE1_FONT_SIZE = 84;       // 第一行字体大小
const BRAND_LINE2_FONT_SIZE = 64;       // 第二行字体大小，与颜色尺寸字体大小保持一致
const BRAND_LINE_HEIGHT = 102;          // 行高
const PRODUCT_NAME_FONT_SIZE = 86;
const PRODUCT_NAME_MIN_FONT_SIZE = 64;
const PRODUCT_DETAIL_FONT_SIZE = 68;
const PRODUCT_DETAIL_MIN_FONT_SIZE = 52;
const SMALL_PRODUCT_CODE_FONT_SIZE = 112;
const SMALL_PRODUCT_NAME_FONT_SIZE = 74;
const SMALL_PRODUCT_NAME_MIN_FONT_SIZE = 54;
const SMALL_PRODUCT_DETAIL_FONT_SIZE = 74;
const SMALL_PRODUCT_DETAIL_MIN_FONT_SIZE = 54;
const SMALL_LABEL_QR_SIZE = 432;
const SMALL_LABEL_QR_INNER_SIZE = 396;
const PRICE_SYMBOL_FONT_SIZE = 62;
const PRICE_VALUE_FONT_SIZE = 142;
const FONT_FAMILY = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

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
      const initialMap: Record<string, QRCodeState> = {};
      for (const label of labels) {
        initialMap[label.barcode] = { status: 'loading', matrix: null };
      }
      setQrCodeMap(initialMap);

      await Promise.all(labels.map((label) => generateQRCode(label.barcode)));
    };

    void generateQRCodes();
  }, [labels]);

  const generateQRCode = async (barcode: string): Promise<void> => {
    setQrCodeMap((prev) => ({
      ...prev,
      [barcode]: { status: 'loading', matrix: prev[barcode]?.matrix || null },
    }));

    try {
      const matrix = createQRCodeMatrix(barcode);
      setQrCodeMap((prev) => ({
        ...prev,
        [barcode]: { status: 'success', matrix },
      }));
    } catch (err) {
      console.error('二维码生成失败:', err);
      setQrCodeMap((prev) => ({
        ...prev,
        [barcode]: { status: 'error', matrix: null },
      }));
    }
  };

  const handleRetryQRCode = async (e: { stopPropagation: () => void }, barcode: string) => {
    e.stopPropagation();
    await generateQRCode(barcode);
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
        image: spec.image || result.mainImages[0] || null,
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
    const padding = 80;

    // 清空画布
    ctx.setFillStyle('#ffffff');
    ctx.fillRect(0, 0, width, height);

    // 品牌区域 - 使用两行文案
    const brandY = 66;
    ctx.setFillStyle('#000000');
    ctx.setTextAlign('center');

    // 第一行 - 400字重，使用系统默认字体
    (ctx as any).font = `400 ${BRAND_LINE1_FONT_SIZE}px ${FONT_FAMILY}`;
    ctx.fillText(BRAND_LINE1, width / 2, brandY + BRAND_LINE1_FONT_SIZE);

    // 第二行 - 400字重，使用系统默认字体
    (ctx as any).font = `400 ${BRAND_LINE2_FONT_SIZE}px ${FONT_FAMILY}`;
    ctx.fillText(BRAND_LINE2, width / 2, brandY + BRAND_LINE1_FONT_SIZE + BRAND_LINE_HEIGHT);

    const brandDividerY = brandY + BRAND_LINE1_FONT_SIZE + BRAND_LINE_HEIGHT + 40;

    // 商品信息
    ctx.setFillStyle('#000000');
    ctx.setTextAlign('center');
    const infoY = brandDividerY + 90;
    drawCenteredFittedText(ctx, label.productCode, width / 2, infoY - 8, {
      fontSize: PRODUCT_DETAIL_FONT_SIZE,
      minFontSize: PRODUCT_DETAIL_MIN_FONT_SIZE,
      maxWidth: width - padding * 2,
      fontWeight: 400,
    });

    drawCenteredFittedText(ctx, label.productName, width / 2, infoY + 102, {
      fontSize: PRODUCT_NAME_FONT_SIZE,
      minFontSize: PRODUCT_NAME_MIN_FONT_SIZE,
      maxWidth: width - padding * 2,
      fontWeight: 500,
    });

    drawCenteredFittedText(ctx, `${label.color} | ${label.size}`, width / 2, infoY + 228, {
      fontSize: PRODUCT_DETAIL_FONT_SIZE,
      minFontSize: PRODUCT_DETAIL_MIN_FONT_SIZE,
      maxWidth: width - padding * 2,
      fontWeight: 400,
    });

    // 价格（居中）- ¥符号用小字号，与web端保持一致
    const priceY = infoY + 408;
    const priceText = label.salePrice.toFixed(2);
    const priceSymbol = '¥';
    const priceSymbolMarginRight = 16;

    // 估算文字宽度（¥符号按0.5倍字号，数字按0.6倍字号）
    const symbolWidth = PRICE_SYMBOL_FONT_SIZE * 0.5;
    const valueWidth = priceText.length * PRICE_VALUE_FONT_SIZE * 0.6;
    const totalWidth = symbolWidth + priceSymbolMarginRight + valueWidth;

    // 计算起始位置（居中）
    const startX = (width - totalWidth) / 2;
    const symbolX = startX + symbolWidth / 2;
    const valueX = startX + symbolWidth + priceSymbolMarginRight + valueWidth / 2;

    // 绘制 ¥ 符号（小字号，基线对齐）
    ctx.setTextAlign('center');
    (ctx as any).font = `400 ${PRICE_SYMBOL_FONT_SIZE}px ${FONT_FAMILY}`;
    ctx.fillText(priceSymbol, symbolX, priceY - 16); // 稍微上移对齐数值的视觉中心

    // 绘制价格数值（大字号）
    (ctx as any).font = `400 ${PRICE_VALUE_FONT_SIZE}px ${FONT_FAMILY}`;
    ctx.fillText(priceText, valueX, priceY);

    // 二维码区域
    const qrBoxSize = 394;
    const qrPadding = 16;
    const qrBoxX = (width - qrBoxSize) / 2;
    const qrBoxY = priceY + 156;
    const qrImageSize = qrBoxSize - 2 * qrPadding;
    const qrImageX = qrBoxX + qrPadding;
    const qrImageY = qrBoxY + qrPadding;

    // 绘制二维码图片
    const qrState = qrCodeMap[label.barcode];
    if (qrState?.status === 'success' && qrState.matrix) {
      drawQRCodeMatrix(ctx, qrState.matrix, qrImageX, qrImageY, qrImageSize);
    } else {
      ctx.setFillStyle('#eeeeee');
      ctx.fillRect(qrImageX, qrImageY, qrImageSize, qrImageSize);
      ctx.setFillStyle('#999999');
      (ctx as any).font = `48px ${FONT_FAMILY}`;
      ctx.fillText('二维码', width / 2, qrBoxY + qrBoxSize / 2 + 16);
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

  const generateSmallLabelImage = async (label: ProductLabelItem): Promise<string> => {
    const ctx = Taro.createCanvasContext('smallLabelCanvas');
    const width = SMALL_LABEL_WIDTH;
    const height = SMALL_LABEL_HEIGHT;
    const paddingX = 64;
    const textQrGap = 44;
    const qrBoxX = width - paddingX - SMALL_LABEL_QR_SIZE;
    const qrBoxY = (height - SMALL_LABEL_QR_SIZE) / 2;
    const qrImageX = qrBoxX + (SMALL_LABEL_QR_SIZE - SMALL_LABEL_QR_INNER_SIZE) / 2;
    const qrImageY = qrBoxY + (SMALL_LABEL_QR_SIZE - SMALL_LABEL_QR_INNER_SIZE) / 2;
    const textX = paddingX;
    const textWidth = qrBoxX - textX - textQrGap;

    ctx.setFillStyle('#ffffff');
    ctx.fillRect(0, 0, width, height);
    ctx.setFillStyle('#000000');
    ctx.setTextAlign('left');

    drawFittedText(ctx, label.productCode, textX, 160, {
      fontSize: SMALL_PRODUCT_CODE_FONT_SIZE,
      minFontSize: SMALL_PRODUCT_DETAIL_MIN_FONT_SIZE,
      maxWidth: textWidth,
      fontWeight: 500,
      textAlign: 'left',
    });

    drawFittedText(ctx, label.productName, textX, 308, {
      fontSize: SMALL_PRODUCT_NAME_FONT_SIZE,
      minFontSize: SMALL_PRODUCT_NAME_MIN_FONT_SIZE,
      maxWidth: textWidth,
      fontWeight: 500,
      textAlign: 'left',
    });

    drawFittedText(ctx, `${label.color} | ${label.size}`, textX, 478, {
      fontSize: SMALL_PRODUCT_DETAIL_FONT_SIZE,
      minFontSize: SMALL_PRODUCT_DETAIL_MIN_FONT_SIZE,
      maxWidth: textWidth,
      fontWeight: 500,
      textAlign: 'left',
    });

    const qrState = qrCodeMap[label.barcode];
    if (qrState?.status === 'success' && qrState.matrix) {
      drawQRCodeMatrix(ctx, qrState.matrix, qrImageX, qrImageY, SMALL_LABEL_QR_INNER_SIZE);
    } else {
      ctx.setFillStyle('#eeeeee');
      ctx.fillRect(qrImageX, qrImageY, SMALL_LABEL_QR_INNER_SIZE, SMALL_LABEL_QR_INNER_SIZE);
      ctx.setFillStyle('#999999');
      ctx.setTextAlign('center');
      (ctx as any).font = `48px ${FONT_FAMILY}`;
      ctx.fillText('二维码', qrBoxX + SMALL_LABEL_QR_SIZE / 2, qrBoxY + SMALL_LABEL_QR_SIZE / 2 + 16);
    }

    await new Promise<void>((resolve) => {
      ctx.draw(false, () => {
        setTimeout(resolve, 100);
      });
    });

    return new Promise((resolve, reject) => {
      Taro.canvasToTempFilePath({
        canvasId: 'smallLabelCanvas',
        x: 0,
        y: 0,
        width,
        height,
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
  const drawFittedText = (
    ctx: Taro.CanvasContext,
    text: string,
    x: number,
    y: number,
    options: {
      fontSize: number;
      minFontSize: number;
      maxWidth: number;
      fontWeight?: number;
      textAlign?: 'left' | 'center';
    }
  ) => {
    const { fontSize, minFontSize, maxWidth, fontWeight = 400, textAlign = 'center' } = options;
    let finalFontSize = fontSize;
    const measureText = (value: string, size: number) => {
      (ctx as any).font = `${fontWeight} ${size}px ${FONT_FAMILY}`;
      if (typeof (ctx as any).measureText === 'function') {
        return (ctx as any).measureText(value).width;
      }
      return value.length * size * 0.6;
    };

    while (finalFontSize > minFontSize && measureText(text, finalFontSize) > maxWidth) {
      finalFontSize -= 2;
    }

    (ctx as any).font = `${fontWeight} ${finalFontSize}px ${FONT_FAMILY}`;
    ctx.setTextAlign(textAlign);
    ctx.fillText(text, x, y);
  };

  const drawCenteredFittedText = (
    ctx: Taro.CanvasContext,
    text: string,
    x: number,
    y: number,
    options: {
      fontSize: number;
      minFontSize: number;
      maxWidth: number;
      fontWeight?: number;
    }
  ) => {
    drawFittedText(ctx, text, x, y, { ...options, textAlign: 'center' });
  };

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

  const handlePreviewSmall = async (label: ProductLabelItem) => {
    const qrState = qrCodeMap[label.barcode];
    if (!qrState || qrState.status !== 'success') {
      Taro.showToast({ title: '二维码加载中，请稍候', icon: 'none' });
      return;
    }

    setGenerating(true);
    Taro.showLoading({ title: '生成中...' });

    try {
      const imagePath = await generateSmallLabelImage(label);
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
  const saveImageToAlbum = async (imagePath: string) => {
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
  };

  const handleGenerate = async (labelType: 'large' | 'small') => {
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

        const imagePath = labelType === 'large'
          ? await generateLabelImage(label)
          : await generateSmallLabelImage(label);

        await saveImageToAlbum(imagePath);
      }

      Taro.showToast({ title: `已保存 ${selectedLabels.length} 张${labelType === 'large' ? '标签' : '小标签'}`, icon: 'success' });
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
                        预览标签
                      </Text>
                    )}
                    {isReady && (
                      <Text
                        className='link qr-status-tag qr-status-tag--ready'
                        onClick={(e) => {
                          e.stopPropagation();
                          void handlePreviewSmall(label);
                        }}
                      >
                        小标签
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
              <>
                <Button
                  className='button button--primary'
                  loading={generating}
                  disabled={btnDisabled}
                  onClick={() => void handleGenerate('large')}
                >
                  {btnText}
                </Button>
                <Button
                  className='button'
                  loading={generating}
                  disabled={btnDisabled}
                  onClick={() => void handleGenerate('small')}
                >
                  {selectedCount === 0 ? '请选择规格' : `生成并保存小标签 (${selectedReady}张)`}
                </Button>
              </>
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
      <Canvas
        canvasId='smallLabelCanvas'
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: SMALL_LABEL_WIDTH,
          height: SMALL_LABEL_HEIGHT,
        }}
      />
    </View>
  );
}
