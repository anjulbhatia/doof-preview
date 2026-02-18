# Web Interface

Modern web UI using Hono.js with shadcn/ui inspired design.

## Design Philosophy

- **Color neutral**: Almost monochrome with subtle grays
- **Soft UI**: Rounded corners, gentle shadows, no harsh borders
- **Clean typography**: System fonts, good hierarchy, no chunky text
- **Minimal**: Only what's needed, no decorative noise

## Stack

- **Backend**: Hono.js (lightweight, fast)
- **Styling**: Tailwind with shadcn/ui color system
- **No HTMX**: Pure vanilla JS for simplicity

## Run

```bash
cd web
bun install
bun server.ts
```

Open http://localhost:3000

## Structure

- `server.ts` - Hono backend
- `index.html` - Single page app

Both files in `/web` directory.
