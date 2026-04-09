declare module 'qrcode' {
  interface QRCodeCreateOptions {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    margin?: number;
  }

  interface QRCodeCreateResult {
    modules: {
      size: number;
      data: Uint8Array | boolean[];
    };
  }

  const QRCode: {
    create(text: string, options?: QRCodeCreateOptions): QRCodeCreateResult;
  };

  export default QRCode;
}
