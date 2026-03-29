# Frontend App

Next.js 14 App Router frontend for Seaking AI voice assistant.

This app contains only client-facing logic:

- UI and animations
- microphone capture and VAD
- websocket client streaming
- transcript display

No Azure SDK usage and no private backend keys are used here.

## Source layout

- src/app: layout, page, global styles
- src/components: voice UI components
- src/config: runtime public environment helpers
- src/hooks: microphone and socket hooks
- src/lib: pcm and audio playback helpers
- src/types: frontend voice event types

## Environment

Copy .env.example to .env.local.

Required:

- NEXT_PUBLIC_BACKEND_HTTP_URL=http://localhost:8787

Optional:

- NEXT_PUBLIC_BACKEND_WS_URL=ws://localhost:8787/ws

## Run

- npm run dev
- open http://localhost:3000
