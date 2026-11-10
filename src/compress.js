import { compressImageData } from './shared/encode.js';
import { $, bytes, baseName, toast, downloadBlob, fileToBitmap, bitmapToCanvas, canvasToImageData, extensionForMime } from './shared/util.js';
import { makeZip } from './shared/zip.js';
import { renderToolNav, wireDropzone } from './shared/shell.js';
import { mountThemeToggle } from './shared/theme.js';

$('#nav-tools').innerHTML = renderToolNav('compress');
mountThemeToggle();

const items = [];

function options() {
  return {
    type: $('#format').value,
    mode: $('#mode').value,
    quality: Number($('#quality').value) / 100,
    targetBytes: Number($('#target').value) * 1024,
  };
}

function syncModeUi() {
  const sizeMode = $('#mode').value === 'size';
  const png = $('#format').value === 'image/png';
  $('#quality-field').classList.toggle('hidden', sizeMode || png);
  $('#size-field').classList.toggle('hidden', !sizeMode);
}

function renderQueue() {
  const root = $('#queue');
  if (!items.length) {
    root.innerHTML = '<p class="hint">尚未添加图片。</p>';
    $('#run').disabled = true;
    $('#download-zip').disabled = true;
    return;
  }
  root.replaceChildren();
  items.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'queue-item';
    const meta = item.status === 'ready'
      ? `${item.canvas.width}×${item.canvas.height} · 原 ${bytes(item.file.size)}`
      : item.status;
    row.innerHTML = `<span class="queue-name">${item.file.name}</span><button class="button small" data-i="${index}">移除</button><span class="queue-meta ${item.ok ? 'ok' : item.error ? 'error' : ''}">${meta}</span>`;
    root.append(row);
  });
  $('#run').disabled = false;
  $('#download-zip').disabled = !items.some((item) => item.blob);
}

async function addFiles(files) {
  const list = [...files].filter((file) => /^image\/(jpeg|png|webp)$/i.test(file.type));
  if (!list.length) return toast('请选择 JPEG、PNG 或 WebP。', 'error');
  for (const file of list) {
    try {
      const bitmap = await fileToBitmap(file);
      const canvas = await bitmapToCanvas(bitmap);
      items.push({ file, canvas, status: 'ready', blob: null, ok: false, error: false });
    } catch (error) {
      toast(error.message || '无法读取图片', 'error');
    }
  }
  $('#empty').classList.add('hidden');
  $('#preview-wrap').classList.remove('hidden');
  const last = items[items.length - 1];
  if (last) $('#preview').src = last.canvas.toDataURL('image/png');
  renderQueue();
  toast(`已加入 ${list.length} 张。`, 'success');
}

async function compressOne(item) {
  const opts = options();
  const imageData = canvasToImageData(item.canvas);
  item.status = '压缩中…';
  item.ok = false;
  item.error = false;
  renderQueue();
  await new Promise((resolve) => requestAnimationFrame(resolve));
  const result = await compressImageData(imageData, opts);
  const blob = new Blob([result.buffer], { type: opts.type });
  item.blob = blob;
  item.result = result;
  item.ok = true;
  const ratio = Math.max(0, Math.round((1 - blob.size / item.file.size) * 100));
  item.status = `${bytes(item.file.size)} → ${bytes(blob.size)} · −${ratio}%`;
  return item;
}

async function runAll() {
  if (!items.length) return;
  $('#run').disabled = true;
  let ok = 0;
  for (const item of items) {
    try {
      await compressOne(item);
      ok += 1;
      const url = URL.createObjectURL(item.blob);
      $('#preview').src = url;
      const ratio = Math.max(0, Math.round((1 - item.blob.size / item.file.size) * 100));
      $('#result').classList.remove('hidden');
      $('#result').innerHTML = `<span>原 ${bytes(item.file.size)}</span><span>→</span><span class="ok">${bytes(item.blob.size)} (−${ratio}%)</span><span>${item.result.width}×${item.result.height}</span>`;
    } catch (error) {
      item.error = true;
      item.status = error.message || '失败';
    }
    renderQueue();
  }
  $('#run').disabled = false;
  toast(`完成 ${ok}/${items.length} 张。`, ok ? 'success' : 'error');
}

async function downloadZip() {
  const ready = items.filter((item) => item.blob);
  if (!ready.length) return toast('请先压缩。', 'error');
  const type = options().type;
  const entries = [];
  for (const item of ready) {
    entries.push({
      name: `${baseName(item.file.name)}-orbitvo.${extensionForMime(type)}`,
      data: new Uint8Array(await item.blob.arrayBuffer()),
    });
  }
  downloadBlob(makeZip(entries), 'orbitvo-compressed.zip');
}

$('#choose').onclick = () => $('#file-input').click();
$('#add-more').onclick = () => $('#file-input').click();
$('#run').onclick = runAll;
$('#download-zip').onclick = downloadZip;
$('#quality').oninput = (event) => { $('#quality-value').value = event.target.value; };
$('#target').oninput = (event) => { $('#target-value').value = event.target.value; };
$('#presets').onclick = (event) => {
  const kb = event.target.dataset.kb;
  if (!kb) return;
  $('#target').value = kb;
  $('#target-value').value = kb;
};
$('#mode').onchange = syncModeUi;
$('#format').onchange = syncModeUi;
$('#queue').onclick = (event) => {
  const i = event.target.dataset.i;
  if (i === undefined) return;
  items.splice(Number(i), 1);
  if (!items.length) {
    $('#empty').classList.remove('hidden');
    $('#preview-wrap').classList.add('hidden');
    $('#result').classList.add('hidden');
  }
  renderQueue();
};

wireDropzone($('#empty'), { onFiles: addFiles });
wireDropzone($('#stage'), { onFiles: addFiles });
syncModeUi();
renderQueue();
