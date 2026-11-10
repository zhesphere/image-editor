const TOOLS = [
  { href: './compress.html', id: 'compress', title: '图片压缩', desc: '质量或目标 KB，批量打包' },
  { href: './merge.html', id: 'merge', title: '图片合并', desc: '横排、竖排或网格拼成一张' },
  { href: './pdf-to-image.html', id: 'pdf-to-image', title: 'PDF 转图片', desc: '按页导出，可打包 ZIP' },
  { href: './images-to-pdf.html', id: 'images-to-pdf', title: '图片转 PDF', desc: '多图合成一个 PDF' },
  { href: './edit.html', id: 'edit', title: '转换与编辑', desc: '格式、裁剪、旋转、改尺寸' },
];

export function currentToolId() {
  const file = location.pathname.split('/').pop() || 'index.html';
  if (file === '' || file === 'index.html') return 'home';
  return file.replace(/\.html$/, '');
}

export function renderToolNav(activeId = currentToolId()) {
  return TOOLS.map((tool) => {
    const current = tool.id === activeId ? ' aria-current="page"' : '';
    return `<a class="tool-link" href="${tool.href}"${current}>${tool.title}</a>`;
  }).join('');
}

export function renderHubCards() {
  return TOOLS.map((tool, index) => `
    <a class="tool-card" href="${tool.href}" style="--i:${index}">
      <strong>${tool.title}</strong>
      <span>${tool.desc}</span>
    </a>
  `).join('');
}

export function wireDropzone(zone, { onFiles, accept } = {}) {
  if (!zone) return;
  const input = zone.querySelector('input[type="file"]') || document.querySelector('#file-input');
  const open = () => input?.click();
  zone.addEventListener('click', (event) => {
    if (event.target.closest('button,a,label,input,select')) return;
    open();
  });
  zone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      open();
    }
  });
  ['dragenter', 'dragover'].forEach((type) => zone.addEventListener(type, (event) => {
    event.preventDefault();
    zone.classList.add('dragover');
  }));
  ['dragleave', 'drop'].forEach((type) => zone.addEventListener(type, (event) => {
    event.preventDefault();
    zone.classList.remove('dragover');
  }));
  zone.addEventListener('drop', (event) => {
    const files = [...(event.dataTransfer?.files || [])];
    if (files.length) onFiles?.(files);
  });
  input?.addEventListener('change', (event) => {
    const files = [...event.target.files];
    event.target.value = '';
    if (files.length) onFiles?.(files);
  });
  if (accept && input) input.accept = accept;
}

export { TOOLS };
