export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export function bytes(value) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 ** 2).toFixed(2)} MB`;
}

export function baseName(name) {
  return (name || 'file').replace(/\.[^.]+$/, '').replace(/[^\w\-.\u4e00-\u9fff]+/g, '-') || 'file';
}

export function toast(message, type = '') {
  const host = $('#toasts') || document.body;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  host.append(el);
  window.setTimeout(() => el.remove(), 3600);
}

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function fileToBitmap(file) {
  return createImageBitmap(file, { imageOrientation: 'from-image' });
}

export async function bitmapToCanvas(bitmap) {
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d').drawImage(bitmap, 0, 0);
  bitmap.close?.();
  return canvas;
}

export function canvasToImageData(canvas) {
  return canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
}

export function extensionForMime(type) {
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/png') return 'png';
  if (type === 'application/pdf') return 'pdf';
  if (type === 'application/zip') return 'zip';
  return 'bin';
}
