// node runner to print only the assistant text (stdout) on success.
// Usage:
//   export CLAUDE_KEY='sk-...'
//   node r-n-d/claude/run-claude.js

const KEY = process.env.CLAUDE_KEY || process.env.CLAUDE_API_KEY;
if (!KEY) {
  console.error('Set CLAUDE_KEY (or CLAUDE_API_KEY) in the environment, e.g.: export CLAUDE_KEY="..."');
  process.exit(1);
}

// preferred model (override with CLAUDE_MODEL env var if needed)
const MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';

const fetchImpl = globalThis.fetch || (() => import('node-fetch').then(m => m.default))();

async function runOnce(message = 'Summarize the MVC pattern in one short sentence.') {
  const url = 'https://api.anthropic.com/v1/messages';
  const body = {
    model: MODEL,
    system: 'You are a concise assistant.',
    max_tokens: 300,
    messages: [ { role: 'user', content: message } ]
  };

  try {
    const fetchFn = typeof fetchImpl === 'function' ? fetchImpl : await fetchImpl;
    const res = await fetchFn(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': KEY,
        'accept': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    const txt = await res.text().catch(() => '');
    let data = null;
    try { data = JSON.parse(txt); } catch (e) { /* ignore parse errors */ }

    if (res.status >= 200 && res.status < 300 && data) {
      const out = data?.content?.[0]?.text?.trim()
        || data?.completion?.[0]?.text?.trim()
        || data?.output?.text?.trim()
        || null;

      if (out) {
        // print only the assistant text
        console.log(out);
        process.exit(0);
      }

      // fallback: print a compact JSON representation
      console.log(JSON.stringify(data, null, 2).slice(0, 2000));
      process.exit(0);
    }

    // non-success: print error details trimmed to stderr
    const errOut = txt || JSON.stringify(data) || String(res.status);
    console.error(errOut.slice(0, 2000));
    process.exit(1);
  } catch (err) {
    console.error(String(err));
    process.exit(2);
  }
}

runOnce();
