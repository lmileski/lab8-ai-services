# Claude API

Claude is implemented in code for learning and comparison, but not shown as an option in the app.

## Get an API key
1. Go to https://console.anthropic.com
2. Create an account and open “API keys”
3. Create a key (looks like sk-ant-…)
4. New accounts usually get a small free credit, which I surpassed tokens on

## Quick test (Node.js)
The test script runs server-side (no browser/CORS).

```
export CLAUDE_KEY=your-key-here
node r-n-d/claude/run-claude.js
```

Expected: a short text reply printed to the terminal.

## Browser use
Direct browser calls to Claude are blocked by CORS. If you want to call Claude from the browser, you must use a proxy you control. This repo has optional proxy support through the config value LOCAL_PROXY. We keep Claude hidden from the UI to avoid forcing a proxy on beginners.

## Limits and behavior (free tier)
- About 5 requests per minute and limited free credit
- Works reliably from server-side code
- Good response quality; clean JSON API; custom headers required

## When to pick Claude
Use Claude if any of these apply:
- You can run requests server-side or have a proxy
- You care more about privacy defaults and stricter data handling
- You’re okay with a smaller free tier and slower request rate

Use Gemini instead if:
- You want a browser-only setup with no proxy
- You need more free requests while developing
- You prefer the simplest setup the lab, which is why I picked it

## Minimal server example

```js
const res = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-api-key': CLAUDE_KEY,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    messages: [{ role: 'user', content: 'Hello' }],
    max_tokens: 256
  })
});
const data = await res.json();
const text = data?.content?.[0]?.text || '';
```

## Notes for this project
- ClaudeService exists in src/js/ai.js for learning and testing
- The UI excludes Claude to keep the lab proxy-free
- Playwright tests mock network calls; no real Claude traffic is needed