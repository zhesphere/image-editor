import { $, $$, toast, downloadBlob, fileToBitmap, bitmapToCanvas, baseName, extensionForMime, bytes } from './shared/util.js';
import { renderToolNav, wireDropzone } from './shared/shell.js';

$('#nav-tools').innerHTML = renderToolNav('edit');

const canvas = $('#canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const state = {
  source: null,
  name: 'image',
  history: [],
  future: [],
  crop: null,
  cropDrag: null,
  view: { scale: 1, x: 0, y: 0 },
};

function clone(source) {
  const copy = document.createElement('canvas');
  copy.width = source.width;
  copy.height = source.height;
  copy.getContext('2d').drawImage(source, 0, 0);
  return copy;
}

function fit() {
  if (!state.source) return 1;
  const stage = $('#stage');
  const pad = 48;
  return Math.min(1, (stage.clientWidth - pad) / state.source.width, (stage.clientHeight - pad) / state.source.height);
}

function draw() {
  if (!state.source) return;
  canvas.width = state.source.width;
  canvas.height = state.source.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(state.source, 0, 0);
  const display = fit() * state.view.scale;
  canvas.style.width = `${Math.round(state.source.width * display)}px`;
  canvas.style.height = `${Math.round(state.source.height * display)}px`;
  canvas.style.transform = `translate(${state.view.x}px,${state.view.y}px)`;
  $('#width').value = state.source.width;
  $('#height').value = state.source.height;
  $('#info').textContent = `${state.source.width} × ${state.source.height} px`;
  $('#undo').disabled = !state.history.length;
  $('#redo').disabled = !state.future.length;
  $('#export').disabled = false;
}

function commit(next) {
  state.history.push(clone(state.source));
  state.future = [];
  while (state.history.length > 30) state.history.shift();
  state.source = next;
  state.crop = null;
  $('#crop-overlay').classList.add('hidden');
  $('#edit-crop').textContent = '调整';
  state.view = { scale: 1, x: 0, y: 0 };
  requestAnimationFrame(draw);
}

function resizeCanvas(source, width, height, rotation = 0, flip = false) {
  const turns = ((rotation % 360) + 360) % 360;
  const rotated = turns % 180 ? { width: height, height: width } : { width, height };
  const out = document.createElement('canvas');
  out.width = rotated.width;
  out.height = rotated.height;
  const outCtx = out.getContext('2d');
  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = 'high';
  outCtx.translate(out.width / 2, out.height / 2);
  outCtx.rotate((turns * Math.PI) / 180);
  outCtx.scale(flip ? -1 : 1, 1);
  outCtx.drawImage(source, -width / 2, -height / 2, width, height);
  return out;
}

function cropToRatio(source, ratio) {
  if (!ratio) return source;
  const sourceRatio = source.width / source.height;
  const width = sourceRatio > ratio ? Math.round(source.height * ratio) : source.width;
  const height = sourceRatio > ratio ? source.height : Math.round(source.width / ratio);
  const x = Math.round((source.width - width) / 2);
  const y = Math.round((source.height - height) / 2);
  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  out.getContext('2d').drawImage(source, x, y, width, height, 0, 0, width, height);
  return out;
}

function cropRect(source, rect) {
  const x = Math.round(rect.x * source.width);
  const y = Math.round(rect.y * source.height);
  const w = Math.max(1, Math.round(rect.w * source.width));
  const h = Math.max(1, Math.round(rect.h * source.height));
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  out.getContext('2d').drawImage(source, x, y, w, h, 0, 0, w, h);
  return out;
}

function resetCrop() {
  const ratio = Number($('#crop-ratio').value) || 0;
  let w = 1; let h = 1; let x = 0; let y = 0;
  if (ratio) {
    if (state.source.width / state.source.height > ratio) {
      w = ratio / (state.source.width / state.source.height);
      x = (1 - w) / 2;
    } else {
      h = (state.source.width / state.source.height) / ratio;
      y = (1 - h) / 2;
    }
  }
  state.crop = { x, y, w, h };
  const box = $('#crop-box');
  Object.assign(box.style, { left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` });
  $('#crop-overlay').classList.remove('hidden');
  $('#edit-crop').textContent = '完成';
}

async function openFile(file) {
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) return toast('请选择 JPEG、PNG 或 WebP。', 'error');
  const bitmap = await fileToBitmap(file);
  state.source = await bitmapToCanvas(bitmap);
  state.name = baseName(file.name);
  state.history = [];
  state.future = [];
  state.view = { scale: 1, x: 0, y: 0 };
  $('#empty').classList.add('hidden');
  $('#preview-wrap').classList.remove('hidden');
  draw();
}

function applySize() {
  if (!state.source) return;
  const width = Math.round(Number($('#width').value));
  const height = Math.round(Number($('#height').value));
  if (!(width > 0 && height > 0 && width <= 16000 && height <= 16000)) return toast('尺寸无效。', 'error');
  if (width === state.source.width && height === state.source.height) return;
  commit(resizeCanvas(state.source, width, height));
}

$('#choose').onclick = () => $('#file-input').click();
$('#width').oninput = () => {
  if (!$('#lock').checked || !state.source) return;
  const ratio = state.source.width / state.source.height;
  $('#height').value = Math.max(1, Math.round(Number($('#width').value) / ratio));
};
$('#height').oninput = () => {
  if (!$('#lock').checked || !state.source) return;
  const ratio = state.source.width / state.source.height;
  $('#width').value = Math.max(1, Math.round(Number($('#height').value) * ratio));
};
['width', 'height'].forEach((id) => {
  $(`#${id}`).addEventListener('change', applySize);
  $(`#${id}`).addEventListener('keydown', (event) => { if (event.key === 'Enter') applySize(); });
});
$$('[data-edge]').forEach((button) => {
  button.onclick = () => {
    if (!state.source) return;
    const edge = Number(button.dataset.edge);
    const factor = edge / Math.max(state.source.width, state.source.height);
    commit(resizeCanvas(state.source, Math.round(state.source.width * factor), Math.round(state.source.height * factor)));
  };
});
$('#rot-l').onclick = () => state.source && commit(resizeCanvas(state.source, state.source.width, state.source.height, -90));
$('#rot-r').onclick = () => state.source && commit(resizeCanvas(state.source, state.source.width, state.source.height, 90));
$('#flip').onclick = () => state.source && commit(resizeCanvas(state.source, state.source.width, state.source.height, 0, true));
$('#crop-ratio').onchange = () => {
  if (!state.source) return;
  if (state.crop) resetCrop();
  else {
    const ratio = Number($('#crop-ratio').value) || 0;
    if (ratio) commit(cropToRatio(state.source, ratio));
  }
};
$('#edit-crop').onclick = () => {
  if (!state.source) return;
  if (state.crop) commit(cropRect(state.source, state.crop));
  else resetCrop();
};
$('#undo').onclick = () => {
  if (!state.history.length) return;
  state.future.push(clone(state.source));
  state.source = state.history.pop();
  state.view = { scale: 1, x: 0, y: 0 };
  draw();
};
$('#redo').onclick = () => {
  if (!state.future.length) return;
  state.history.push(clone(state.source));
  state.source = state.future.pop();
  state.view = { scale: 1, x: 0, y: 0 };
  draw();
};
$('#quality').oninput = (event) => { $('#quality-value').value = event.target.value; };
$('#format').onchange = () => {
  $('#quality-field').classList.toggle('hidden', $('#format').value === 'image/png');
};
$('#export').onclick = async () => {
  if (!state.source) return;
  const type = $('#format').value;
  const quality = Number($('#quality').value) / 100;
  const blob = await new Promise((resolve) => state.source.toBlob(resolve, type, quality));
  downloadBlob(blob, `${state.name}-orbitvo.${extensionForMime(type)}`);
  toast(`已导出 ${bytes(blob.size)}`, 'success');
};

const overlay = $('#crop-overlay');
overlay.addEventListener('pointerdown', (event) => {
  if (!state.crop) return;
  const rect = overlay.getBoundingClientRect();
  state.cropDrag = {
    handle: event.target.dataset.handle,
    startX: event.clientX,
    startY: event.clientY,
    rect: { ...state.crop },
    width: rect.width,
    height: rect.height,
  };
  overlay.setPointerCapture(event.pointerId);
});
overlay.addEventListener('pointermove', (event) => {
  const drag = state.cropDrag;
  if (!drag) return;
  const dx = (event.clientX - drag.startX) / drag.width;
  const dy = (event.clientY - drag.startY) / drag.height;
  let { x, y, w, h } = drag.rect;
  if (!drag.handle) {
    x = Math.max(0, Math.min(1 - w, x + dx));
    y = Math.max(0, Math.min(1 - h, y + dy));
  } else {
    if (drag.handle.includes('w')) { x = Math.max(0, Math.min(x + w - .05, x + dx)); w = drag.rect.w - (x - drag.rect.x); }
    if (drag.handle.includes('e')) w = Math.max(.05, Math.min(1 - x, w + dx));
    if (drag.handle.includes('n')) { y = Math.max(0, Math.min(y + h - .05, y + dy)); h = drag.rect.h - (y - drag.rect.y); }
    if (drag.handle.includes('s')) h = Math.max(.05, Math.min(1 - y, h + dy));
  }
  state.crop = { x, y, w, h };
  Object.assign($('#crop-box').style, { left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` });
});
['pointerup', 'pointercancel'].forEach((type) => overlay.addEventListener(type, () => { state.cropDrag = null; }));

wireDropzone($('#empty'), { onFiles: (files) => files[0] && openFile(files[0]) });
$('#file-input').onchange = (event) => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (file) openFile(file);
};
window.addEventListener('resize', () => { if (state.source) draw(); });
