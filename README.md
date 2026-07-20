# 图片编辑器 - 在线修图工具

一个纯前端图片编辑工具，无需上传服务器，所有处理均在浏览器本地完成。

## 功能

- **锐化/清晰度增强** — USM（Unsharp Mask）算法，可调节强度、半径、阈值
- **去水印/修复画笔** — 基于双边滤波的内画修复算法，涂抹水印区域后自动填充
- **裁剪/比例调整** — 支持 1:1、4:3、3:2、16:9、9:16 预设及自定义比例
- **🤖 AI 智能增强** — 接入豆包/火山引擎 API，智能去模糊、降噪、超分辨率
- **🤖 AI 智能去水印** — 利用 SeedEdit 模型智能识别并移除水印，自然填充背景
- **前后对比** — 分割视图对比原图与处理后的效果
- **撤销/重做** — 完整的历史记录支持
- **格式选择** — 支持 PNG、JPEG、WebP 格式下载，JPEG 质量可调

## 🤖 AI 功能配置

AI 增强和 AI 去水印功能需要配置豆包（火山引擎）API：

1. 编辑项目中的 `config.js` 文件，填入 API 密钥：
   ```js
   window.IMAGE_EDITOR_CONFIG = {
     apiKey: 'sk-your-api-key-here',  // 火山引擎 ARK API 密钥
     endpoint: '...',                  // API 端点（可选）
     model: '...',                     // 模型名称（可选）
   };
   ```
2. 网页端工具栏有 **AI 开关**，可随时启用/禁用 AI 功能
3. 推荐模型：`doubao-seedream-4-0-250828`（SeedEdit 4.0）

> ⚠️ API 密钥配置在 `config.js` 中，部署到 GitHub Pages 时请注意不要将密钥提交到公开仓库。建议使用私有仓库或通过环境变量注入。

## 使用方法

1. 打开网页，拖拽图片到上传区 / 点击选择文件 / 直接粘贴图片
2. 使用顶部标签切换工具（锐化 / 去水印 / 裁剪）
3. 手动模式：调节参数后点击"应用"按钮
4. AI 模式：点击 ⚙️ 配置 API 密钥，然后点击 "AI 智能增强" 或 "AI 智能去水印"
5. 点击"下载"保存处理后的图片

### 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Z` | 撤销 |
| `Ctrl+Y` | 重做 |
| `Ctrl+O` | 打开新图片 |
| `Ctrl+V` | 粘贴图片 |
| `Ctrl+S` | 下载图片 |
| `[` `]` | 调整画笔大小 |
| `Escape` | 取消裁剪 / 关闭对话框 |

## 部署到 GitHub Pages

1. 在 GitHub 创建仓库 `image-editor`
2. 推送所有文件到 `main` 分支：
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/你的用户名/image-editor.git
   git push -u origin main
   ```
3. 在仓库 Settings → Pages 中：
   - Source: Deploy from a branch → main → / (root)
   - Custom domain: 填入 `img.zsphere.top`
   - 勾选 Enforce HTTPS
4. 在 DNS 服务商添加 CNAME 记录：
   - 主机记录: `img`
   - 记录类型: CNAME
   - 记录值: `你的用户名.github.io`

## 技术说明

- 纯客户端处理，无后端依赖
- 基于 Canvas API 实现所有图像处理
- 显示时自动降采样以适应屏幕，处理在原始分辨率进行
- 下载输出为完整原始分辨率

## 浏览器兼容

支持所有现代浏览器：Chrome、Edge、Firefox、Safari
