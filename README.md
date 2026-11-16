# Roamwise · Trip planner

Roamwise is a small React trip planner that turns a free-form travel idea into a structured, editable day-by-day itinerary.

## Setup

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000). For a real Gemini response, set `OPENROUTER_API_KEY` to a Google AI API key before starting the server. An optional `OPENROUTER_MODEL` selects the Gemini model; values such as `google/gemini-2.0-flash-exp:free` are normalized automatically. Without a key, the app uses a short built-in Kyoto plan so the UI can be evaluated offline.

For Vercel, deploy the repository with `npm run build` as the build command and `dist` as the output directory. The `/api/plan` function is provided by `api/plan.js`; add a Google AI API key as `OPENROUTER_API_KEY` in the Vercel project environment variables for live Gemini responses.

## Usage

Describe a trip in the prompt, choose a suggestion, and select **Plan my trip**. Expand a stop to read its note, move it up or down, or remove it. **Refine with AI** puts a follow-up prompt into the composer, and the moon button toggles dark mode.

## AI usage note

I used AI assistance to scaffold and review the React structure, resilient response handling, and visual copy. The final data contract, UI behavior, styling, and error handling were checked and connected manually.

## Reliability decisions

- The API key is only read by the Express backend and is never shipped to the browser.
- The backend asks for JSON and rejects non-JSON model output. The client validates the returned shape before rendering it.
- Empty input, HTTP failures, malformed JSON, missing days/stops, loading, and empty-day states have explicit UI paths.
- A request sequence id prevents a slower, stale response from overwriting a newer request.

## Known limitations

The current planner edits stops within a day only; moving a stop between days and persistent saved sessions would be sensible next iterations. The offline fallback is intentionally a fixed example rather than a local language model.

## Time spent

Approximately 6 hours, including implementation, responsive styling, and failure-path validation.
