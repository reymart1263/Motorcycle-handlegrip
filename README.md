<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/f2ff5931-5801-45cb-a5df-2c2d3fe34028

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Backend + Local Database

- Backend runs with Express in `server.ts`.
- App state API:
  - `GET /api/state` - load saved app data
  - `PUT /api/state` - save app data
- Local backend database file: `data/app-state.json`
- Device-local cache key (for mobile-like offline persistence): `grip_app_state` in local storage.
