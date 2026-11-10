import { encode as encodeJpeg } from '@jsquash/jpeg';
import { encode as encodeWebp } from '@jsquash/webp';
import { encode as encodePng } from '@jsquash/png';

export async function encodeImageData(imageData, type, quality = 0.82) {
  if (type === 'image/jpeg') {
    const buffer = await encodeJpeg(imageData, { quality: Math.round(quality * 100) });
    return buffer;
  }
  if (type === 'image/webp') {
    const buffer = await encodeWebp(imageData, { quality: Math.round(quality * 100) });
    return buffer;
  }
  return encodePng(imageData);
}

function scaleImageData(source, factor) {
  const width = Math.max(1, Math.round(source.width * factor));
  const height = Math.max(1, Math.round(source.height * factor));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const tmp = document.createElement('canvas');
  tmp.width = source.width;
  tmp.height = source.height;
  tmp.getContext('2d').putImageData(source, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(tmp, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

async function findQualityUnder(imageData, type, targetBytes, minQ = 0.4, maxQ = 0.95) {
  let low = minQ;
  let high = maxQ;
  let best = null;
  let last = null;
  for (let i = 0; i < 8; i++) {
    const mid = (low + high) / 2;
    const buffer = await encodeImageData(imageData, type, mid);
    last = { buffer, quality: mid, width: imageData.width, height: imageData.height };
    if (buffer.byteLength <= targetBytes) {
      best = last;
      low = mid;
    } else high = mid;
  }
  return best || last;
}

export async function compressImageData(imageData, { type, mode, quality, targetBytes }) {
  if (mode === 'size') {
    if (type === 'image/png') {
      let best = {
        buffer: await encodeImageData(imageData, type, 1),
        quality: 1,
        width: imageData.width,
        height: imageData.height,
      };
      if (best.buffer.byteLength <= targetBytes) return best;
      for (let factor = 0.9; factor >= 0.12; factor -= 0.08) {
        const scaled = scaleImageData(imageData, factor);
        const buffer = await encodeImageData(scaled, type, 1);
        best = { buffer, quality: 1, width: scaled.width, height: scaled.height };
        if (buffer.byteLength <= targetBytes) return best;
      }
      return best;
    }
    let best = await findQualityUnder(imageData, type, targetBytes);
    if (best.buffer.byteLength <= targetBytes) return best;
    for (let factor = 0.9; factor >= 0.12; factor -= 0.08) {
      const scaled = scaleImageData(imageData, factor);
      best = await findQualityUnder(scaled, type, targetBytes);
      if (best.buffer.byteLength <= targetBytes) return best;
    }
    return best;
  }
  const buffer = await encodeImageData(imageData, type, quality);
  return { buffer, quality, width: imageData.width, height: imageData.height };
}
