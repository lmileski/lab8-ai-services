// node runner to test a single Gemini model (server-side)
// Usage:
//   export GEMINI_KEY='AIzaSy...'
//   node r-n-d/gemini/run-gemini.js

const KEY = process.env.GEMINI_KEY || process.env.GENERATIVE_API_KEY;
if (!KEY) {
  console.error('Set GEMINI_KEY in the environment, e.g.: export GEMINI_KEY="..."');
  process.exit(1);
}

// preferred model (can be overridden with GEMINI_MODEL env var)
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-pro-preview-03-25';

const fetchImpl = globalThis.fetch || (() => import('node-fetch').then(m => m.default))();

async function runOnce(message = 'Summarize the MVC pattern in one short sentence.') {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(KEY)}`;
  const fetchFn = typeof fetchImpl === 'function' ? fetchImpl : await fetchImpl;
  try {
    const res = await fetchFn(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [ { role: 'user', parts: [ { text: message } ] } ] })
    });

    const txt = await res.text().catch(() => '');
    let data;
    try { data = JSON.parse(txt); } catch (e) { data = null; }

    console.log('model:', MODEL);
    console.log('status:', res.status);

    if (res.status >= 200 && res.status < 300 && data) {
      // extract generated text if present
      const txtOut = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (txtOut) {
        console.log('\nGenerated text:\n');
        console.log(txtOut.trim());
        process.exit(0);
      }
      console.log('response (trimmed):', JSON.stringify(data, null, 2).slice(0,2000));
      process.exit(0);
    }

    // non-success: print trimmed body for debugging
    console.log('response (trimmed):', typeof txt === 'string' ? txt.slice(0,2000) : JSON.stringify(txt).slice(0,2000));
    process.exit(1);
  } catch (err) {
    console.error('request failed:', String(err));
    process.exit(2);
  }
}

runOnce();
