const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const canvas = $('#canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const MAX_HISTORY_BYTES = 80 * 1024 * 1024;

const state = {
  source: null, originalName: 'image', history: [], future: [], batch: [],
  pendingRotation: 0, pendingFlip: false, view: { scale: 1, x: 0, y: 0 }, pointers: new Map(),
};

function bytes(value) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 ** 2).toFixed(2)} MB`;
}
function baseName(name) { return (name || 'image').replace(/\.[^.]+$/, '').replace(/[^\w\-.\u4e00-\u9fff]+/g, '-'); }
function toast(message, type = '') {
  const el = document.createElement('div'); el.className = `toast ${type}`; el.textContent = message; $('#toasts').append(el);
  window.setTimeout(() => el.remove(), 3600);
}
function setControls() {
  const ready = Boolean(state.source);
  $('#undo').disabled = !state.history.length; $('#redo').disabled = !state.future.length;
  $('#export').disabled = !ready; $('#apply-size').disabled = !ready;
}
function draw() {
  if (!state.source) return;
  canvas.width = state.source.width; canvas.height = state.source.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(state.source, 0, 0);
  canvas.style.transform = `translate(${state.view.x}px,${state.view.y}px) scale(${state.view.scale})`;
  $('#image-info').textContent = `${canvas.width} × ${canvas.height} px`;
  $('#width').value = canvas.width; $('#height').value = canvas.height;
}
function cloneCanvas(source) {
  const copy = document.createElement('canvas'); copy.width = source.width; copy.height = source.height;
  copy.getContext('2d').drawImage(source, 0, 0); return copy;
}
function currentBytes() { return canvas.width * canvas.height * 4; }
function pushHistory() {
  const copy = cloneCanvas(state.source); state.history.push(copy); state.future = [];
  let total = state.history.reduce((sum, item) => sum + item.width * item.height * 4, 0);
  while (total > MAX_HISTORY_BYTES && state.history.length > 1) { const removed = state.history.shift(); total -= removed.width * removed.height * 4; }
  setControls();
}
function restore(next, target) { target.push(cloneCanvas(state.source)); state.source = next; state.view = { scale:1, x:0, y:0 }; draw(); setControls(); }
function undo() { if (state.history.length) restore(state.history.pop(), state.future); }
function redo() { if (state.future.length) restore(state.future.pop(), state.history); }
function setSource(source, name) {
  state.source = source; state.originalName = baseName(name); state.history = []; state.future = []; state.batch = []; state.pendingRotation = 0; state.pendingFlip = false; state.view = { scale:1, x:0, y:0 };
  $('#upload').classList.add('hidden'); draw(); setControls();
}
async function decode(file) {
  if (!file || !/^image\/(jpeg|png|webp)$/i.test(file.type)) throw new Error('请选择 JPEG、PNG 或 WebP 图片。');
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const decoded = document.createElement('canvas'); decoded.width = bitmap.width; decoded.height = bitmap.height;
  decoded.getContext('2d').drawImage(bitmap, 0, 0); bitmap.close(); return decoded;
}
async function openFiles(files, primary = true) {
  const selected = [...files]; if (!selected.length) return;
  const results = await Promise.allSettled(selected.map(async file => ({ file, canvas: await decode(file) })));
  const valid = results.filter(r => r.status === 'fulfilled').map(r => r.value);
  results.filter(r => r.status === 'rejected').forEach(r => toast(r.reason.message, 'error'));
  if (!valid.length) return;
  if (primary) setSource(valid[0].canvas, valid[0].file.name);
  valid.forEach((item, index) => state.batch.push({ file:item.file, canvas:item.canvas, active: primary && index === 0, state:'ready' }));
  renderQueue(); if (valid.length > 1) toast(`已建立 ${valid.length} 张图片的批量队列。`, 'success');
}
function resizeCanvas(source, width, height, rotation = 0, flip = false) {
  const turns = ((rotation % 360) + 360) % 360;
  const rotated = turns % 180 ? { width:height, height:width } : { width, height };
  const out = document.createElement('canvas'); out.width = rotated.width; out.height = rotated.height;
  const outCtx = out.getContext('2d'); outCtx.imageSmoothingEnabled = true; outCtx.imageSmoothingQuality = 'high';
  outCtx.translate(out.width / 2, out.height / 2); outCtx.rotate(turns * Math.PI / 180); outCtx.scale(flip ? -1 : 1, 1);
  outCtx.drawImage(source, -width / 2, -height / 2, width, height); return out;
}
function cropToRatio(source, ratio) {
  if (!ratio) return source;
  const sourceRatio = source.width / source.height;
  const width = sourceRatio > ratio ? Math.round(source.height * ratio) : source.width;
  const height = sourceRatio > ratio ? source.height : Math.round(source.width / ratio);
  const x = Math.round((source.width - width) / 2), y = Math.round((source.height - height) / 2);
  const out = document.createElement('canvas'); out.width = width; out.height = height;
  out.getContext('2d').drawImage(source, x, y, width, height, 0, 0, width, height); return out;
}
function batchDimensions(source, targetWidth, targetHeight) {
  if (!$('#lock-ratio').checked) return { width: targetWidth, height: targetHeight };
  const factor = Math.max(targetWidth, targetHeight) / Math.max(source.width, source.height);
  return { width: Math.max(1, Math.round(source.width * factor)), height: Math.max(1, Math.round(source.height * factor)) };
}
function applySize() {
  if (!state.source) return;
  const width = Number($('#width').value), height = Number($('#height').value);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1 || width > 16000 || height > 16000) return toast('尺寸需要在 1 到 16000 px 之间。', 'error');
  pushHistory(); const rotated = resizeCanvas(state.source, Math.round(width), Math.round(height), state.pendingRotation, state.pendingFlip);
  state.source = cropToRatio(rotated, Number($('#crop-ratio').value) || 0);
  state.pendingRotation = 0; state.pendingFlip = false; state.view = { scale:1, x:0, y:0 }; draw(); setControls(); toast('尺寸与方向已应用。', 'success');
}
function updateRatio(event) {
  if (!state.source || !$('#lock-ratio').checked) return;
  const ratio = state.source.width / state.source.height; const input = event.target;
  if (input.id === 'width') $('#height').value = Math.max(1, Math.round(Number(input.value) / ratio));
  else $('#width').value = Math.max(1, Math.round(Number(input.value) * ratio));
}
function setLongEdge(value) {
  if (!state.source) return; const factor = value / Math.max(state.source.width, state.source.height);
  $('#width').value = Math.round(state.source.width * factor); $('#height').value = Math.round(state.source.height * factor);
}
function extension(type) { return type === 'image/jpeg' ? 'jpg' : type === 'image/webp' ? 'webp' : 'png'; }
function canvasToBlob(source, type, quality, background) {
  return new Promise((resolve, reject) => {
    let output = source;
    if (type === 'image/jpeg') {
      output = document.createElement('canvas'); output.width = source.width; output.height = source.height;
      const outCtx = output.getContext('2d'); outCtx.fillStyle = background; outCtx.fillRect(0, 0, output.width, output.height); outCtx.drawImage(source, 0, 0);
    }
    output.toBlob(blob => {
      if (!blob) return reject(new Error('浏览器无法生成此图片。'));
      if (blob.type !== type) return reject(new Error(`当前浏览器不支持 ${type} 导出。`));
      resolve(blob);
    }, type, quality);
  });
}
function exportOptions() { return { type:$('#format').value, quality:Number($('#quality').value) / 100, background:$('#background').value }; }
function download(blob, name) { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
async function exportOne(source = state.source, name = state.originalName) {
  const { type, quality, background } = exportOptions(); const blob = await canvasToBlob(source, type, quality, background);
  download(blob, `${baseName(name)}-orbitvo.${extension(type)}`); $('#export-estimate').textContent = `刚才导出：${bytes(blob.size)} · ${blob.type}`; return blob;
}
async function exportCurrent() { try { const blob = await exportOne(); toast(`已导出 ${bytes(blob.size)}。`, 'success'); } catch (error) { toast(error.message, 'error'); } }
function renderQueue() {
  const root = $('#queue'); root.replaceChildren();
  if (!state.batch.length) { root.innerHTML = '<p class="hint">暂无批量图片。首张会在画布中编辑，其余图片会加入队列。</p>'; return; }
  state.batch.forEach((item, index) => { const row = document.createElement('div'); row.className = 'queue-item'; row.innerHTML = `<span class="queue-name">${item.active ? '当前编辑 · ' : ''}${item.file.name}</span><button class="button small" data-remove="${index}">移除</button><span class="queue-meta queue-state ${item.state}">${item.state === 'ready' ? `${item.canvas.width} × ${item.canvas.height}` : item.state}</span>`; root.append(row); });
}
async function exportBatch() {
  if (!state.batch.length) return toast('请先添加批量图片。', 'error');
  const width = Number($('#width').value), height = Number($('#height').value); const rotation = state.pendingRotation, flip = state.pendingFlip, cropRatio = Number($('#crop-ratio').value) || 0;
  $('#export-batch').disabled = true;
  for (const item of state.batch) {
    try { item.state = 'processing'; renderQueue(); const source = item.active ? state.source : item.canvas; const dimensions = batchDimensions(source, width, height); const processed = item.active ? source : cropToRatio(resizeCanvas(source, dimensions.width, dimensions.height, rotation, flip), cropRatio); const blob = await exportOne(processed, item.file.name); item.state = `done · ${bytes(blob.size)}`; }
    catch (error) { item.state = `error · ${error.message}`; }
    renderQueue(); await new Promise(resolve => setTimeout(resolve, 80));
  }
  $('#export-batch').disabled = false; toast('批量导出已完成。浏览器可能会要求允许多个下载。', 'success');
}
function dialog(title, body) {
  $('#dialog').innerHTML = `<header><h2 id="dialog-title">${title}</h2><button class="button small" data-close>关闭</button></header>${body}`;
  $('#dialog-backdrop').classList.add('open'); $('#dialog [data-close]').focus();
}
function closeDialog() { $('#dialog-backdrop').classList.remove('open'); }
function setupPanZoom() {
  canvas.addEventListener('wheel', event => { if (!state.source) return; event.preventDefault(); const next = state.view.scale * (event.deltaY < 0 ? 1.1 : .9); state.view.scale = Math.max(.5, Math.min(4, next)); draw(); }, { passive:false });
  canvas.addEventListener('pointerdown', event => { canvas.setPointerCapture(event.pointerId); state.pointers.set(event.pointerId, { x:event.clientX, y:event.clientY }); });
  canvas.addEventListener('pointermove', event => { const previous = state.pointers.get(event.pointerId); if (!previous) return; state.view.x += event.clientX - previous.x; state.view.y += event.clientY - previous.y; state.pointers.set(event.pointerId, { x:event.clientX, y:event.clientY }); draw(); });
  ['pointerup','pointercancel'].forEach(type => canvas.addEventListener(type, event => state.pointers.delete(event.pointerId)));
}
function bindEvents() {
  $('#choose').onclick = () => $('#file-input').click(); $('#replace').onclick = () => $('#file-input').click(); $('#add-batch').onclick = () => $('#file-input').click();
  $('#file-input').onchange = event => { openFiles(event.target.files, !state.source); event.target.value = ''; };
  $('#width').oninput = updateRatio; $('#height').oninput = updateRatio; $$('.button[data-scale]').forEach(button => button.onclick = () => setLongEdge(Number(button.dataset.scale)));
  $('#rotate-left').onclick = () => { state.pendingRotation -= 90; toast('已加入左转，点击“应用尺寸与方向”确认。'); };
  $('#rotate-right').onclick = () => { state.pendingRotation += 90; toast('已加入右转，点击“应用尺寸与方向”确认。'); };
  $('#flip').onclick = () => { state.pendingFlip = !state.pendingFlip; toast('已切换镜像，点击“应用尺寸与方向”确认。'); };
  $('#apply-size').onclick = applySize; $('#undo').onclick = undo; $('#redo').onclick = redo; $('#export').onclick = exportCurrent; $('#export-batch').onclick = exportBatch;
  $('#quality').oninput = event => $('#quality-value').value = event.target.value;
  $('#format').onchange = event => { const lossless = event.target.value === 'image/png'; $('#quality-field').classList.toggle('hidden', lossless); $('#background-field').classList.toggle('hidden', event.target.value !== 'image/jpeg'); };
  $('#queue').onclick = event => { const index = event.target.dataset.remove; if (index !== undefined) { state.batch.splice(Number(index), 1); renderQueue(); } };
  $('#privacy').onclick = () => dialog('隐私说明', '<p><strong>本地功能：</strong>导入、缩放、旋转、转换和导出均在当前浏览器内完成；我们不接收或保存图片。</p><p><strong>可选云端 AI：</strong>若未来启用豆包增强，图片会被发送到你选择的服务。它必须是独立开关、先说明再同意，且不使用部署在前端的共享密钥。</p>');
  $('#ai-info').onclick = () => dialog('关于豆包 AI 的更好用法', '<p>豆包的生成式增强擅长补足模糊细节、重绘被遮挡区域，因而比本地锐化更适合复杂去水印。这是云端生成式编辑，不应承诺“与原图完全一致”，也不应处理无权修改的内容。</p><p>建议的后续方案：保留本地发布工作台作为默认；AI 采用独立“发送到豆包”步骤，展示发送提示、结果前后对比和“保留/丢弃”选择。密钥应由用户临时输入，或经你确认后使用有配额、鉴权和隐私条款的服务端代理。</p>');
  $('#dialog-backdrop').onclick = event => { if (event.target === $('#dialog-backdrop') || event.target.dataset.close !== undefined) closeDialog(); };
  document.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); } if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { event.preventDefault(); exportCurrent(); } if (event.key === 'Escape') closeDialog(); });
  const dropzone = $('#dropzone'); ['dragenter','dragover'].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.add('dragover'); })); ['dragleave','drop'].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.remove('dragover'); })); dropzone.addEventListener('drop', event => openFiles(event.dataTransfer.files, !state.source)); dropzone.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') $('#file-input').click(); });
  document.addEventListener('paste', event => { const files = [...event.clipboardData.files].filter(file => file.type.startsWith('image/')); if (files.length) openFiles(files, !state.source); }); setupPanZoom(); renderQueue(); setControls();
}
bindEvents();
