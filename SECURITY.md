# Security

The Royal Gambit is a public portfolio project. The repository is set up so runtime secrets stay outside source control.

## Secrets And Environment Variables

- Do not commit real `.env` files.
- `.env.example` contains placeholder names only.
- Vercel KV or Upstash Redis credentials should be stored in Vercel project environment variables.
- Server-side Redis credentials are read only by serverless API routes and are not bundled into the browser app.

## Multiplayer Room Sync

Friend rooms store game-state data, not account credentials or personal profile data.

The Vercel room-sync API applies:

- room ID validation
- client ID validation
- HTTP method restrictions
- request-size limits
- game-state payload-size limits
- generic server-error responses that do not expose internal exception details
- room TTL when Redis/KV storage is configured

Room links should still be treated as share links: anyone with the room URL can join that game room.

## Reporting Issues

Please open a GitHub issue for reproducible security or privacy concerns.
