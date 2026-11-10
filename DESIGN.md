# Design — Orbitvo Tools Image

## World
Quiet professional utility. Ink on paper-blue surfaces, one decisive accent. Feels like a workshop bench, not a marketing landing page.

## Color
- `--bg: #f3f5f8` / dark `#0f131c`
- `--surface: #ffffff` / dark `#171d2a`
- `--ink: #152033` / dark `#e8edf7`
- `--muted: #5c6b84`
- `--line: #d5dde8`
- `--accent: #2f5bff` (single brand blue; no purple gradient hero)
- `--ok: #1f7a57`
- `--danger: #b8324a`

## Type
- UI: `"IBM Plex Sans", "PingFang SC", "Noto Sans SC", system-ui, sans-serif`
- Metrics/tabular: `"IBM Plex Mono", ui-monospace, monospace`
- Display on hub only, max ~2.4rem; tool pages stay compact

## Layout
- Hub: one claim + tool grid (not equal icon-card spam; each tile is a verb)
- Tool pages: topbar + dropzone or workspace; controls in a dense side/bottom panel
- Radius 12px panels, 8px controls; no pill clusters

## Motion
- Dropzone hover border
- Result bar fade-in after encode
- Queue row status update
- Prefer `transform`/`opacity`, 180–280ms ease-out

## Voice
Short action labels. Privacy line always concrete: “仅在本机浏览器处理，不上传”.
