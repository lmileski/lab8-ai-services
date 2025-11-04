// initialize mvc on dom ready
import { Model } from './model.js';
import { View } from './view.js';
import { Controller } from './controller.js';
import { AiRouter, ElizaService, GeminiService } from './ai.js';
import { config } from './config.js';

window.addEventListener('DOMContentLoaded', () => {
	// build model and view
	const model = new Model();
	const view = new View();

	// get api keys from config
	const geminiKey = config.GEMINI_KEY;

	// set up ai service router with default eliza
	const ai = new AiRouter({
		eliza: new ElizaService(),
			gemini: new GeminiService({ 
				apiKey: geminiKey,
				model: 'gemini-2.5-pro-preview-03-25'
			})
	}, 'eliza');

	// hand everything to the controller
	new Controller(model, view, ai);
});