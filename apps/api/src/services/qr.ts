// Generación de QR como Data URL (PNG base64)
import QRCode from 'qrcode';

export async function generateQRDataURL(uuid: string): Promise<string> {
  return QRCode.toDataURL(uuid, {
    errorCorrectionLevel: 'H',
    width: 300,
    margin: 2,
  });
}

export async function generateQRSVG(uuid: string): Promise<string> {
  return QRCode.toString(uuid, { type: 'svg', errorCorrectionLevel: 'H', width: 200 });
}
