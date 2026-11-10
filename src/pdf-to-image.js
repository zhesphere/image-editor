import * as pdfjs from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { $, toast, downloadBlob, baseName, extensionForMime, bytes } from './shared/util.js';
import { makeZip } from './shared/zip.js';
import { renderToolNav, wireDropzone } from './shared/shell.js';
import { mountThemeToggle } from './shared/theme.js';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
$('#nav-tools').innerHTML = renderToolNav('pdf-to-image');
mountThemeToggle();

let pdfDoc = null;
let pdfName = 'document';
const pageBlobs = [];

async function loadPdf(file) {
  if (file.type && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return toast('请选择 PDF 文件。', 'error');
  }
  const data = new Uint8Array(await file.arrayBuffer());
  pdfDoc = await pdfjs.getDocument({ data }).promise;
  pdfName = baseName(file.name);
  pageBlobs.length = 0;
  $('#empty').classList.add('hidden');
  $('#preview-wrap').classList.remove('hidden');
  $('#convert').disabled = false;
  $('#zip').disabled = true;
  const root = $('#pages');
  root.innerHTML = `<p class="hint">共 ${pdfDoc.numPages} 页 · ${bytes(file.size)}。点击开始转换。</p>`;
  const page = await pdfDoc.getPage(1);
  await drawPage(page, Number($('#scale').value));
  toast(`已加载 ${pdfDoc.numPages} 页。`, 'success');
}

async function drawPage(page, scale) {
  const viewport = page.getViewport({ scale });
  const canvas = $('#preview');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
  const maxH = Math.min(window.innerHeight - 160, 640);
  const fit = Math.min(1, (window.innerWidth - 360) / canvas.width, maxH / canvas.height);
  canvas.style.width = `${Math.round(canvas.width * fit)}px`;
  canvas.style.height = `${Math.round(canvas.height * fit)}px`;
}

async function convert() {
  if (!pdfDoc) return;
  const scale = Number($('#scale').value);
  const type = $('#format').value;
  pageBlobs.length = 0;
  const progress = $('#progress');
  progress.classList.remove('hidden');
  $('#convert').disabled = true;
  const root = $('#pages');
  root.replaceChildren();
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    if (i === 1) {
      const preview = $('#preview');
      preview.width = canvas.width;
      preview.height = canvas.height;
      preview.getContext('2d').drawImage(canvas, 0, 0);
    }
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, 0.92));
    pageBlobs.push(blob);
    progress.querySelector('span').style.width = `${(i / pdfDoc.numPages) * 100}%`;
    const row = document.createElement('div');
    row.className = 'queue-item';
    row.innerHTML = `<span class="queue-name">第 ${i} 页</span><button class="button small" data-page="${i - 1}">下载</button><span class="queue-meta ok">${canvas.width}×${canvas.height} · ${bytes(blob.size)}</span>`;
    root.append(row);
  }
  $('#convert').disabled = false;
  $('#zip').disabled = !pageBlobs.length;
  toast(`已导出 ${pageBlobs.length} 页。`, 'success');
}

$('#choose').onclick = () => $('#file-input').click();
$('#convert').onclick = convert;
$('#zip').onclick = async () => {
  if (!pageBlobs.length) return;
  const type = $('#format').value;
  const entries = [];
  for (let i = 0; i < pageBlobs.length; i++) {
    entries.push({
      name: `${pdfName}-p${String(i + 1).padStart(2, '0')}.${extensionForMime(type)}`,
      data: new Uint8Array(await pageBlobs[i].arrayBuffer()),
    });
  }
  downloadBlob(makeZip(entries), `${pdfName}-pages.zip`);
};
$('#pages').onclick = (event) => {
  const index = event.target.dataset.page;
  if (index === undefined) return;
  const blob = pageBlobs[Number(index)];
  if (blob) downloadBlob(blob, `${pdfName}-p${String(Number(index) + 1).padStart(2, '0')}.${extensionForMime($('#format').value)}`);
};

wireDropzone($('#empty'), {
  onFiles: async (files) => { if (files[0]) loadPdf(files[0]); },
  accept: 'application/pdf',
});
$('#file-input').onchange = async (event) => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (file) loadPdf(file);
};
