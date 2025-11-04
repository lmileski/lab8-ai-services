# Gemini API

Gemini is the default cloud provider in the UI because it works from the browser without a proxy.

## Get an API key
1. Go to https://makersuite.google.com/app/apikey
2. Create a key (looks like AIza…)

## Quick test (Node.js)
The test script helps verify your key outside the browser.

```
export GEMINI_KEY=your-key-here
node r-n-d/gemini/run-gemini.js
```

Expected: a short text reply printed to the terminal.

## Browser use
Gemini supports browser requests (CORS is enabled), so you can call the API directly from the app without a proxy.

## Limits and behavior (free tier)
- About 60 requests per minute and 1500 requests per day - awesome!
- Stable free tier suitable for class labs and testing
- Responses are returned under candidates[0].content.parts[0].text

## Error handling to watch for
- 400 invalid request
- 403 invalid or missing key
- 429 rate limit
- 500 server error (retry)

## Minimal browser example (shape only)

```js
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
const res = await fetch(url, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: 'Hello' }] }]
  })
});
const data = await res.json();
const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
```

## Notes for this project
- GeminiService is implemented in src/js/ai.js and used by default in the UI
- API key entry and validation happen in the app; keys persist in localStorage
- Playwright tests mock network calls for reliability; no real Gemini traffic is needed during tests