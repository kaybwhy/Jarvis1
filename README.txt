JARVIS v3 — Cloudflare Worker

1. Create a Google AI Studio API key.
   Use the Gemini API. The current free tier includes Gemini 2.5 Flash text input/output, subject to Google's rate limits.

2. Create a Cloudflare Worker from the Cloudflare dashboard.
   Paste worker.js into the Worker editor and deploy.

3. Add TWO settings under Worker > Settings > Variables and Secrets:
   - GEMINI_API_KEY
       Type: Secret
       Value: your Google AI Studio API key
   - ALLOWED_ORIGIN
       Type: Variable
       Value: https://kaybwhy.github.io

   If your GitHub Pages site is a project URL, you can instead use the exact origin, for example:
       https://kaybwhy.github.io

4. Copy the Worker URL ending in workers.dev.

5. Upload everything inside the frontend folder to your GitHub Pages repository.

6. Open your GitHub Pages site on iPhone.
   Open Setup & memory and paste the Worker URL.
   Tap Save connection.

7. Tap Start Listening once. Then say:
       "Jarvis"
   and wait for the response prompt, or say:
       "Jarvis, should I take this loan?"
   Jarvis will send the question to Gemini and can challenge the reasoning instead of automatically agreeing.

IMPORTANT:
- Never put GEMINI_API_KEY into app.js or any GitHub Pages file.
- The browser can see the Worker URL; the Gemini key stays server-side.
- Voice activation is reliable only while the webpage is open and listening. iOS Safari does not let a normal webpage keep a microphone session running in the background/locked like Siri.
- Local memories are stored in this browser's localStorage. They are sent to Gemini as context when you ask something.
