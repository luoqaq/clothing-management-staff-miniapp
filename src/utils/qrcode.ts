import QRCode from 'qrcode';

export interface QRCodeMatrix {
  size: number;
  data: boolean[];
}

interface QRCodeCreateResult {
  modules: {
    size: number;
    data: Uint8Array | boolean[];
  };
}

export function createQRCodeMatrix(content: string): QRCodeMatrix {
  const result = QRCode.create(content, {
    errorCorrectionLevel: 'M',
    margin: 0,
  }) as QRCodeCreateResult;

  return {
    size: result.modules.size,
    data: Array.from(result.modules.data, Boolean),
  };
}

export function drawQRCodeMatrix(
  ctx: Taro.CanvasContext,
  matrix: QRCodeMatrix,
  x: number,
  y: number,
  size: number
) {
  const cellSize = size / matrix.size;

  ctx.setFillStyle('#000000');

  for (let row = 0; row < matrix.size; row++) {
    for (let col = 0; col < matrix.size; col++) {
      if (!matrix.data[row * matrix.size + col]) {
        continue;
      }

      const cellX = x + col * cellSize;
      const cellY = y + row * cellSize;

      ctx.fillRect(cellX, cellY, cellSize, cellSize);
    }
  }
}
