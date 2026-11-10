import { PDFDocument } from 'pdf-lib';
import { $, toast, downloadBlob, fileToBitmap, bitmapToCanvas, baseName, bytes } from './shared/util.js';
import { renderToolNav, wireDropzone } from './shared/shell.js';
import { mountThemeToggle } from './shared/theme.js';

$('#nav-tools').innerHTML = renderToolNav('images-to-pdf');
mountThemeToggle();

const items = [];
let pdfBytes = null;

const SIZES = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};

function renderList() {
  const root = $('#list');
  if (!items.length) {
    root.innerHTML = '<p class="hint">尚未添加。</p>';
    $('#build').disabled = true;
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
  $('#build').disabled = false;
  $('#preview').src = items[0].url;
}

async function addFiles(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const bitmap = await fileToBitmap(file);
    const canvas = await bitmapToCanvas(bitmap);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    items.push({
      file,
      canvas,
      url: canvas.toDataURL('image/jpeg', 0.85),
      jpeg: new Uint8Array(await blob.arrayBuffer()),
      width: canvas.width,
      height: canvas.height,
    });
  }
  if (!items.length) return toast('请选择图片。', 'error');
  $('#empty').classList.add('hidden');
  $('#preview-wrap').classList.remove('hidden');
  renderList();
  toast(`已加入 ${files.length} 张。`, 'success');
}

function pageSizeFor(item) {
  const mode = $('#page-size').value;
  const orient = $('#orient').value;
  if (mode === 'fit') return [item.width, item.height];
  let [w, h] = SIZES[mode];
  if (orient === 'landscape' || (orient === 'auto' && item.width > item.height)) [w, h] = [h, w];
  return [w, h];
}

async function build() {
  if (!items.length) return;
  const pdf = await PDFDocument.create();
  const margin = Math.max(0, Number($('#margin').value) || 0);
  for (const item of items) {
    const image = await pdf.embedJpg(item.jpeg);
    const [pageW, pageH] = pageSizeFor(item);
    const page = pdf.addPage([pageW, pageH]);
    const maxW = pageW - margin * 2;
    const maxH = pageH - margin * 2;
    const scale = Math.min(maxW / image.width, maxH / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    page.drawImage(image, {
      x: (pageW - w) / 2,
      y: (pageH - h) / 2,
      width: w,
      height: h,
    });
  }
  pdfBytes = await pdf.save();
  $('#download').disabled = false;
  toast(`已生成 ${items.length} 页 PDF · ${bytes(pdfBytes.byteLength)}`, 'success');
}

$('#choose').onclick = () => $('#file-input').click();
$('#build').onclick = build;
$('#download').onclick = () => {
  if (!pdfBytes) return;
  downloadBlob(new Blob([pdfBytes], { type: 'application/pdf' }), `${baseName(items[0]?.file.name || 'images')}-orbitvo.pdf`);
};
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
    pdfBytes = null;
    if (!items.length) {
      $('#empty').classList.remove('hidden');
      $('#preview-wrap').classList.add('hidden');
    }
  } else return;
  renderList();
};

wireDropzone($('#empty'), { onFiles: addFiles });
wireDropzone($('#stage'), { onFiles: addFiles });
