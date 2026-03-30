<div align="center">

<h1>🌍 AphaEarth — Emergency Response & Safety</h1>

<p><i>Smart, fast, human‑centric emergency assistance powered by Expo + React Native.</i></p>

<img src="app%20photo/1.jpg" alt="AphaEarth Banner" width="100%" />

<br/>

<img src="https://img.shields.io/badge/Expo-%23000000.svg?style=for-the-badge&logo=expo&logoColor=white" />
<img src="https://img.shields.io/badge/React%20Native-20232a?style=for-the-badge&logo=react&logoColor=61DAFB" />
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
<img src="https://img.shields.io/badge/Platforms-Android%20%7C%20iOS%20%7C%20Web-0a192f?style=for-the-badge" />

</div>

---

## Highlights

- ⚡ Real‑time emergency chat with responder flow
- 📍 Auto location + weather context with risk scoring
- 🛡️ AI‑generated precaution points (Groq, Mixtral)
- 📡 One‑tap alert broadcast to backend (Telegram bridge)
- 🎨 Clean, gradient‑driven UI with haptics and safe‑areas

## Screenshots

<p>
  <img src="app%20photo/2.jpg" alt="Emergency Type Selection" width="32%" />
  <img src="app%20photo/3.jpg" alt="AI Precaution Points" width="32%" />
  <img src="app%20photo/4.jpg" alt="Responder Chat" width="32%" />
</p>
<p>
  <img src="app%20photo/5.jpg" alt="Risk & Weather Context" width="32%" />
  <img src="app%20photo/6.jpg" alt="Alert Confirmation" width="32%" />
  <img src="app%20photo/7.jpg" alt="Message Delivery States" width="32%" />
</p>

## Quick Start

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the dev server

   ```bash
   npx expo start
   ```

   Open on Android, iOS, or scan QR in Expo Go.

## Configuration

- Backend endpoint: configured in code as `BACKEND_URL` (Render).
- Groq API key: prefer `EXPO_PUBLIC_GROQ_API_KEY` via environment.

Create a `.env` file (Expo supports `EXPO_PUBLIC_*` at runtime):

```env
EXPO_PUBLIC_GROQ_API_KEY=your_groq_key_here
```

Then reference it in code (example next step):

```ts
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
```

Avoid committing secrets and never hardcode API keys.

## Tech Stack

- Expo + React Native (TypeScript)
- Expo Router, Safe Area Context, Linear Gradient
- Expo Location, Open‑Meteo API
- Groq Chat Completions (Mixtral‑8x7B‑32768)

## Project Structure

- `app/(tabs)/EmergencyScreen.tsx` — Emergency flow UI, chat, alerting
- `contexts/*` — Alert, Risk, Sensor, Theme contexts
- `components/ui/*` — Themed UI primitives
- `services/NotificationService.js` — Notifications wiring

## Contributors

Contributed by: **REHAN SUMAN**

Thank you for your energy, design sense, and attention to detail.

## Contributing

PRs welcome. Keep components typed, avoid inline secrets, and match the existing design language.

## License

Proprietary. Do not redistribute without permission.
