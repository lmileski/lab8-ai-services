# Lab 8: AI Services – Chat Assistant (Provider Abstraction)

Simple MVC chat app that swaps AI providers at runtime via a tiny service layer. The UI supports Eliza and Gemini (cloud, API key). Claude is included only for R&D notes, not surfaced in the UI.

## Deployment
The site was deployed via Netlify

View the site here: [lab8-ai-services](https://lab8-ai-services.netlify.app/)

Use the API key for gemini I sent in the comments to the assignment submission.

## Learning objectives

- Understand trade‑offs between AI vendors by doing small exploratory tests
- Use a Port‑Adapter (Hexagonal) or basic DI pattern to swap implementations
- Call a cloud LLM over HTTP (fetch) from a browser app
- Handle async with async/await
- Write end‑to‑end tests with Playwright
- Implement simple, safe API key management (no keys in Git)

## Quick start

Prerequisites
- Node.js 16+ and npm
- A Gemini API key from Google AI Studio

Install and run
```bash
npm install
npx playwright install
npm start
# open http://localhost:3000
```

Use the app
- Start on Eliza (no key). Type and send messages.
- Switch to Gemini in the dropdown; enter your API key when prompted. The key is stored in localStorage for convenience.

Run tests
```bash
npm test
# optional report
npx playwright show-report
```

## How it’s structured
- `src/js/ai.js`: ElizaService (local), GeminiService (cloud), AiRouter (switcher)
- `src/js/controller.js`: coordinates UI actions and AI calls
- `src/js/model.js`: message state + localStorage persistence
- `src/js/view.js`: DOM rendering and events
- `tests/*.spec.js`: Playwright E2E (Gemini network is mocked)
- `r-n-d/`: short notes and tiny Node scripts for provider research

## Why abstract AI services?
- Try multiple vendors without rewriting features
- Let users pick local vs cloud
- Test reliably by mocking the cloud call
- Keep controller/business logic stable while swapping adapters

## Real‑world flow
- Development: Eliza (free, fast)
- Tests: mocked cloud response (deterministic)
- Production: allow Eliza or a cloud model depending on needs

## Provider notes
- Eliza: local, free, no key.
- Gemini: works from the browser (CORS enabled). Key is prompted once and saved in localStorage. An optional `LOCAL_PROXY` exists in `config.js` but is not required.
- Claude: kept for research only; browser calls need a proxy. Not shown in the dropdown.

## Security and keys
- No keys in Git. Keys live in the browser’s localStorage for this lab.
- This is a teaching setup; production apps should keep keys server-side.

## Research and choice
- `r-n-d/` shows quick experiments with at least two vendors (Gemini, Claude)
- We use Gemini in the UI to avoid a proxy and keep setup simple; Claude stays documented in R&D

## Rubric coverage
- AI Research: two vendors tested and summarized in `r-n-d/`
- AI Implementation: ElizaService + GeminiService behind an `AiRouter`
- Security & Config: keys prompted and stored locally; nothing in Git
- E2E Tests: Playwright tests for Eliza and mocked Gemini
- Code Quality: small, readable modules with basic error handling and JSDoc
- README: setup, comparison, privacy/cost notes
- Git Practices: commit regularly with meaningful messages
- Publishing: see Deploy below

## License

MIT (see LICENSE)
