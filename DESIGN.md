# Design — Orbitvo Tools Image

## World
Quiet professional utility. Ink on paper-blue surfaces, one decisive accent. Feels like a workshop bench, not a marketing landing page.

## Color
- Light: `--bg #f4f6fa`, `--surface #fff`, `--ink #152033`, `--accent #2f5bff`
- Dark (brighter workshop charcoal): `--bg #222938`, `--surface #2c3446`, `--surface-2 #3a4458`, `--ink #f2f5fb`, `--muted #b4c0d4`, `--line #4a556c`, `--accent #6b8cff`
- Theme toggle in topbar; preference in `localStorage` key `orbitvo-theme`
- No purple gradient hero

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
