# Orbitvo Tools / Image

本地优先的图片与轻量 PDF 工具站：压缩、合并、PDF↔图片、转换编辑。默认不上传文件。

线上：https://img.orbitvo.com/

## 工具

- **图片压缩**：MozJPEG / WebP / PNG（WASM），按质量或目标 KB，批量 ZIP
- **图片合并**：横排 / 竖排 / 网格
- **PDF 转图片**：pdf.js 本地渲染，可 ZIP
- **图片转 PDF**：pdf-lib 本地生成
- **转换与编辑**：尺寸、裁剪、旋转、格式

## 开发

```bash
npm install
npm run dev
```

```bash
npm run build   # 输出到 dist/
npm run preview
```

推送到 `main` 后，GitHub Actions 会构建并部署 Pages。

## 备份

改造前快照标签：`backup-pre-multitool-20261110`  
文件副本：`docs/archive/backup-pre-multitool-20261110/`

## 隐私

见 `src/privacy.html`。处理均在浏览器内完成。
