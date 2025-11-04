/**
 * AI service layer: provides a clean abstraction for swapping AI providers
 * without modifying controller logic. Implements the Port-Adapter (Hexagonal)
 * pattern where each service is an adapter to a different AI provider.
 */

import { getBotResponse } from './eliza.js';
import { config } from './config.js';

/**
 * Local Eliza chatbot service (rule-based, no API calls).
 * 
 * @class
 */
export class ElizaService {
	/**
	 * Generate a response using the local Eliza bot.
	 * 
	 * @param {string} text - User's message
	 * @returns {Promise<string>} Bot's response
	 */
	async reply(text) {
		return getBotResponse(text);
	}
}

/**
 * Google Gemini AI service (cloud-based LLM).
 * Browser-friendly (CORS enabled), generous free tier.
 * 
 * @class
 */
export class GeminiService {
	/**
	 * Create a Gemini service instance.
	 * 
	 * @param {Object} options - Configuration options
	 * @param {string} [options.apiKey='YOUR_GEMINI_API_KEY_HERE'] - Google AI API key
	 * @param {string} [options.model='gemini-2.5-pro-preview-03-25'] - Gemini model to use
	 * @param {string} [options.baseUrl='https://generativelanguage.googleapis.com/v1beta'] - API base URL
	 */
	constructor({ apiKey = 'YOUR_GEMINI_API_KEY_HERE', model = 'gemini-2.5-pro-preview-03-25', baseUrl = 'https://generativelanguage.googleapis.com/v1beta' } = {}) {
		this.apiKey = apiKey;
		this.model = model;
		this.baseUrl = baseUrl;
	}

	/**
	 * Update the API key (allows runtime key changes).
	 * 
	 * @param {string} k - New API key
	 */
	setApiKey(k) {
		this.apiKey = k;
	}

	/**
	 * Generate a response from Gemini API.
	 * 
	 * @param {string} text - User's message
	 * @returns {Promise<string>} Gemini's response text
	 * @throws {Error} If API key is missing, network fails, or API returns error
	 */
	async reply(text) {
		if (!this.apiKey || this.apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
			throw new Error('missing gemini api key');
		}

		// Build request details for Gemini
		const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
		const headers = { 'content-type': 'application/json' };
		const payload = { contents: [ { role: 'user', parts: [{ text }] } ] };

		let res;
		try {
			if (typeof window !== 'undefined' && config.LOCAL_PROXY) {
				const proxyRes = await fetch(config.LOCAL_PROXY, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ provider: 'gemini', url, headers, body: payload })
				});
				if (!proxyRes.ok) {
					const txt = await proxyRes.text().catch(() => '');
					throw new Error(`proxy error: ${proxyRes.status} ${txt}`);
				}
				const proxied = await proxyRes.json().catch(() => null);
				res = { ok: true, status: proxyRes.status, json: async () => proxied };
			} else {
				res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
			}
		} catch (err) {
			if (typeof window !== 'undefined' && !config.LOCAL_PROXY) {
				throw new Error(`network error (possibly CORS): ${err?.message || String(err)} — consider running a local proxy and set config.LOCAL_PROXY to its URL`);
			}
			throw err;
		}

		if (!res.ok) {
			const msg = await (res.text ? res.text().catch(() => String(res.status)) : Promise.resolve(String(res.status)));
			throw new Error(`gemini error: ${res.status} ${msg}`);
		}

		const data = await (res.json ? res.json() : Promise.resolve(null));
		// gemini returns candidates -> content -> parts -> text
		const textOut = data?.candidates?.[0]?.content?.parts?.[0]?.text;
		return (textOut && String(textOut).trim()) || 'sorry, i could not generate a response.';
	}

	/**
	 * Validate the Gemini API key by making a minimal test request.
	 * 
	 * @returns {Promise<boolean>} True if key is valid, false if rejected (401/403)
	 * @throws {Error} If network/CORS error occurs (caller should handle with user-friendly message)
	 */
	async validateKey() {
		if (!this.apiKey) return false;
		const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
		const headers = { 'content-type': 'application/json' };
		const payload = { contents: [ { role: 'user', parts: [{ text: 'ping' }] } ] };
		try {
			if (typeof window !== 'undefined' && config.LOCAL_PROXY) {
				const proxyRes = await fetch(config.LOCAL_PROXY, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ provider: 'gemini', url, headers, body: payload })
				});
				if (!proxyRes.ok) return false;
				return true;
			} else {
				const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
				if (res.status === 401 || res.status === 403) return false;
				return res.ok;
			}
		} catch (err) {
			// bubble network/CORS errors to the caller for a clearer UI message
			throw err;
		}
	}
}

/**
 * AI Router - orchestrates multiple AI service providers with runtime switching.
 * Implements dependency injection pattern: services are provided at construction,
 * and the active provider can be changed without restarting the app.
 * 
 * @class
 */
export class AiRouter {
	/**
	 * Create an AI router with multiple service providers.
	 * 
	 * @param {Object} services - Map of provider names to service instances (e.g., { eliza: ElizaService, gemini: GeminiService })
	 * @param {string} [defaultKey='eliza'] - Initial provider to use
	 */
	constructor(services, defaultKey = 'eliza') {
		this.services = services;
		this.current = defaultKey in services ? defaultKey : Object.keys(services)[0];
	}

	/**
	 * Get the currently active provider name.
	 * 
	 * @returns {string} Current provider key (e.g., 'eliza', 'gemini')
	 */
	get provider() {
		return this.current;
	}

	/**
	 * Switch to a different AI provider.
	 * 
	 * @param {string} name - Provider key to switch to
	 * @throws {Error} If provider name is not registered
	 */
	set provider(name) {
		if (!(name in this.services)) {
			throw new Error(`unknown provider: ${name}`);
		}
		this.current = name;
	}

	/**
	 * Get the currently active service instance.
	 * 
	 * @returns {Object} Active service (ElizaService, ClaudeService, or GeminiService)
	 */
	get service() {
		return this.services[this.current];
	}

	/**
	 * Update Gemini API key (allows runtime key changes).
	 * 
	 * @param {string} k - New API key
	 */
	setGeminiKey(k) {
		if (this.services.gemini?.setApiKey) this.services.gemini.setApiKey(k);
	}

	/**
	 * Send a message to the currently active AI provider.
	 * 
	 * @param {string} text - User's message
	 * @returns {Promise<string>} AI's response
	 * @throws {Error} If active service throws (network error, invalid key, etc.)
	 */
	async reply(text) {
		return this.service.reply(text);
	}
}