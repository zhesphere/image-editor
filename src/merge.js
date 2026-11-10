import { $, toast, downloadBlob, fileToBitmap, bitmapToCanvas, extensionForMime, baseName } from './shared/util.js';
import { renderToolNav, wireDropzone } from './shared/shell.js';

$('#nav-tools').innerHTML = renderToolNav('merge');

const items = [];
let merged = null;

function syncLayoutUi() {
  $('#cols-field').classList.toggle('hidden', $('#layout').value !== 'grid');
}

function renderList() {
  const root = $('#list');
  if (!items.length) {
    root.innerHTML = '<p class="hint">尚未添加。</p>';
    $('#render').disabled = true;
    $('#download').disabled = true;
    return;
  }
  root.replaceChildren();
  items.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'thumb-row';
    row.innerHTML = `<img alt="" src="${item.url}"><span class="queue-name">${item.file.name}</span><span class="button-row" style="margin:0"><button class="button small" data-up="${index}">↑</button><button class="button small" data-down="${index}">↓</button><button class="button small" data-del="${index}">移除</button></span>`;
    root.append(row);
  });
  $('#render').disabled = false;
}

async function addFiles(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const bitmap = await fileToBitmap(file);
    const canvas = await bitmapToCanvas(bitmap);
    items.push({ file, canvas, url: canvas.toDataURL('image/png') });
  }
  if (!items.length) return toast('请选择图片。', 'error');
  $('#empty').classList.add('hidden');
  $('#preview-wrap').classList.remove('hidden');
  renderList();
  await merge();
}

function layoutSizes(canvases, layout, cols, gap) {
  if (layout === 'horizontal') {
    const height = Math.max(...canvases.map((c) => c.height));
    const scaled = canvases.map((c) => {
      const w = Math.round(c.width * (height / c.height));
      return { w, h: height, c };
    });
    const width = scaled.reduce((sum, s) => sum + s.w, 0) + gap * (scaled.length - 1);
    return { width, height, cells: scaled.map((s, i) => ({ ...s, x: scaled.slice(0, i).reduce((a, b) => a + b.w + gap, 0), y: 0 })) };
  }
  if (layout === 'vertical') {
    const width = Math.max(...canvases.map((c) => c.width));
    const scaled = canvases.map((c) => {
      const h = Math.round(c.height * (width / c.width));
      return { w: width, h, c };
    });
    const height = scaled.reduce((sum, s) => sum + s.h, 0) + gap * (scaled.length - 1);
    return { width, height, cells: scaled.map((s, i) => ({ ...s, x: 0, y: scaled.slice(0, i).reduce((a, b) => a + b.h + gap, 0) })) };
  }
  const columns = Math.max(2, Math.min(8, cols));
  const cellW = Math.max(...canvases.map((c) => c.width));
  const rows = Math.ceil(canvases.length / columns);
  const rowHeights = Array.from({ length: rows }, (_, row) => {
    const slice = canvases.slice(row * columns, row * columns + columns);
    return Math.max(...slice.map((c) => Math.round(c.height * (cellW / c.width))));
  });
  const width = cellW * columns + gap * (columns - 1);
  const height = rowHeights.reduce((a, b) => a + b, 0) + gap * (rows - 1);
  const cells = canvases.map((c, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const h = Math.round(c.height * (cellW / c.width));
    const y = rowHeights.slice(0, row).reduce((a, b) => a + b + gap, 0);
    return { c, w: cellW, h, x: col * (cellW + gap), y };
  });
  return { width, height, cells };
}

async function merge() {
  if (items.length < 1) return;
  const layout = $('#layout').value;
  const gap = Math.max(0, Number($('#gap').value) || 0);
  const cols = Number($('#cols').value) || 2;
  const { width, height, cells } = layoutSizes(items.map((i) => i.canvas), layout, cols, gap);
  if (width * height > 80_000_000) return toast('合并结果过大，请减少图片或改布局。', 'error');
  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d');
  ctx.fillStyle = $('#bg').value;
  ctx.fillRect(0, 0, width, height);
  for (const cell of cells) {
    ctx.drawImage(cell.c, cell.x, cell.y, cell.w, cell.h);
  }
  merged = out;
  const preview = $('#preview');
  preview.width = out.width;
  preview.height = out.height;
  preview.getContext('2d').drawImage(out, 0, 0);
  const maxH = Math.min(window.innerHeight - 160, 640);
  const scale = Math.min(1, (window.innerWidth - 360) / out.width, maxH / out.height);
  preview.style.width = `${Math.round(out.width * scale)}px`;
  preview.style.height = `${Math.round(out.height * scale)}px`;
  $('#download').disabled = false;
  toast(`已合并 ${items.length} 张 · ${width}×${height}`, 'success');
}

async function download() {
  if (!merged) return;
  const type = $('#format').value;
  const blob = await new Promise((resolve) => merged.toBlob(resolve, type, 0.92));
  downloadBlob(blob, `orbitvo-merge.${extensionForMime(type)}`);
}

$('#choose').onclick = () => $('#file-input').click();
$('#layout').onchange = syncLayoutUi;
$('#render').onclick = merge;
$('#download').onclick = download;
$('#list').onclick = (event) => {
  const up = event.target.dataset.up;
  const down = event.target.dataset.down;
  const del = event.target.dataset.del;
  if (up !== undefined) {
    const i = Number(up);
    if (i > 0) [items[i - 1], items[i]] = [items[i], items[i - 1]];
  } else if (down !== undefined) {
    const i = Number(down);
    if (i < items.length - 1) [items[i], items[i + 1]] = [items[i + 1], items[i]];
  } else if (del !== undefined) {
    items.splice(Number(del), 1);
    if (!items.length) {
      $('#empty').classList.remove('hidden');
      $('#preview-wrap').classList.add('hidden');
      merged = null;
    }
  } else return;
  renderList();
  if (items.length) merge();
};

wireDropzone($('#empty'), { onFiles: addFiles });
wireDropzone($('#stage'), { onFiles: addFiles });
syncLayoutUi();
