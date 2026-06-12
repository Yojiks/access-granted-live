# Acceptance Checklist

Use this after `npm run dev:backend` and `npm run dev:frontend`.

- Open `http://localhost:5173` and confirm the 9:16 overlay renders without the debug panel.
- Open `http://localhost:5173/?debug=true` and confirm the debug panel shows `SECRET`.
- Send a wrong 4-digit guess and confirm it appears in `LIVE SYSTEM LOG`.
- Before 30 seconds, send a partial match and confirm no digit is revealed.
- After 30 seconds, send a partial match and confirm exactly one first-three digit can reveal.
- After 60 and 90 seconds, confirm the reveal cap increases to 2 and 3.
- Confirm the fourth digit never reveals from partial guesses.
- Send the full secret code and confirm `ACCESS GRANTED`.
- Send a winner message from the winning nickname within 15 seconds and confirm it is shown.
- Win again, send no winner message, and confirm the timeout notice appears.
- Confirm a new round starts after the reset delay.
- Confirm the top banner renders text or a configured image path.
