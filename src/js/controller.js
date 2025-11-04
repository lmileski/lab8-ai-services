/**
 * Controller - coordinates user actions between view and model, and manages AI provider switching.
 * Implements the MVC pattern's controller layer: handles user input, updates model, and orchestrates AI interactions.
 * 
 * @class
 */
export class Controller {
	/**
	 * Create a controller instance.
	 * 
	 * @param {Model} model - The data model managing chat messages
	 * @param {View} view - The UI view handling DOM rendering
	 * @param {AiRouter} ai - The AI router for provider management
	 */
	constructor(model, view, ai) {
		this.model = model;
		this.view = view;
		this.ai = ai;

		// track if we're editing a prior user message inline
		this.editingId = null;

		// subscribe view to model updates
		this.model.onChange(s => this.view.render(s));

		// wire view events
		this.view.onSend = t => this.handleSend(t);
		this.view.onEdit = id => this.handleEditPrompt(id);
		this.view.onDelete = id => this.handleDelete(id);
		this.view.onExport = () => this.handleExport();
		this.view.onImport = j => this.handleImport(j);
		this.view.onClear = () => this.handleClear();

		// provider menu change
		this.view.onAiChange = provider => this.handleProviderChange(provider);

		// keyboard helpers from the view
		this.view.onClearInput = () => this.view.clearInput();
		this.view.onCancelEdit = () => this.cancelInlineEdit();
		this.view.onEditLast = () => this.editLastMessageInline();

		// seed greeting if empty
		if (this.model.getState().messages.length === 0) {
			this.model.addMessage("hello! i'm your eliza assistant. how can i help you today?", 'bot');
		}

		// first paint
		this.view.render(this.model.getState());
		this.view.setProviderUI(this.ai.provider);
		this.view.focusInput();
	}

	/**
	 * Handle AI provider switching with key validation.
	 * Prompts for API key if needed, validates it, and persists to localStorage.
	 * 
	 * @param {string} provider - Provider name ('eliza', 'gemini', etc.)
	 */
	async handleProviderChange(provider) {
		// keep previous provider so we can revert on invalid key
		const prev = this.ai.provider;

		// validate provider exists
		try {
			if (!this.ai.services || !(provider in this.ai.services)) throw new Error('unknown provider');
		} catch (e) {
			this.view.alert(e.message || 'unknown provider');
			this.view.setProviderUI(prev);
			return;
		}

		// cloud providers require an api key. for gemini, if we already have one
		// (either in-memory or in localStorage), reuse it without prompting.
		// otherwise, prompt the user once and persist it.

		if (provider === 'gemini') {
			const svcG = this.ai.services.gemini;
			let key = (svcG && svcG.apiKey) || '';
			if (!key && typeof window !== 'undefined') {
				key = localStorage.getItem('ai_gemini_api_key') || '';
				if (key) this.ai.setGeminiKey(key);
			}

			if (!key) {
				// no stored key yet: ask the user once
				this.view.alert('please enter your gemini api key to continue.');
				const fromUser = this.view.prompt('enter your gemini api key:', '');
				if (!fromUser) {
					this.view.alert('no key entered. staying on ' + prev + '.');
					this.view.setProviderUI(prev);
					return;
				}
				key = fromUser.trim();
				this.ai.setGeminiKey(key);
			}

			// optimistic switch
			this.ai.provider = provider;
			this.view.setProviderUI(provider);

			(async () => {
				try {
					const ok = await svcG.validateKey();
					if (!ok) {
						// invalid key: clear stored/in-memory key and allow immediate retry
						if (typeof window !== 'undefined') localStorage.removeItem('ai_gemini_api_key');
						this.ai.setGeminiKey('');
						// prompt user to try again once
						this.view.alert('gemini: api key rejected. please enter a new key.');
						const retry = this.view.prompt('enter your gemini api key:', '');
						if (retry) {
							const newKey = String(retry).trim();
							if (newKey) {
								this.ai.setGeminiKey(newKey);
								// keep UI on gemini while retrying
								this.ai.provider = 'gemini';
								this.view.setProviderUI('gemini');
								let ok2 = false;
								try { ok2 = await svcG.validateKey(); } catch { ok2 = false; }
								if (ok2) {
									if (typeof window !== 'undefined') localStorage.setItem('ai_gemini_api_key', newKey);
									return; // stay on gemini, success
								} else {
									// second failure: revert and notify
									if (typeof window !== 'undefined') localStorage.removeItem('ai_gemini_api_key');
									this.ai.setGeminiKey('');
								}
							}
						}
						// revert to previous provider
						this.ai.provider = prev;
						this.view.setProviderUI(prev);
						this.view.alert('gemini: api key rejected. reverted to ' + prev + '.');
						return;
					}
					// success: persist key for future sessions
					if (typeof window !== 'undefined') {
						localStorage.setItem('ai_gemini_api_key', key);
					}
				} catch (err) {
					// network/CORS error — do not persist unvalidated keys
					if (typeof window !== 'undefined') localStorage.removeItem('ai_gemini_api_key');
					this.ai.setGeminiKey('');
					this.ai.provider = prev;
					this.view.setProviderUI(prev);
					this.view.alert('network/CORS error validating gemini key — consider running a local proxy. ' + (err?.message || ''));
				}
			})();
		} else {
			// other providers (eliza, etc.) — just switch
			this.ai.provider = provider;
			this.view.setProviderUI(provider);
		}
	}

	/**
	 * Handle sending a message or committing an inline edit.
	 * Adds user message to model, gets AI response, and displays bot reply.
	 * 
	 * @param {string} text - User's message text
	 */
	async handleSend(text) {
		const trimmed = String(text || '').trim();
		if (!trimmed) return;

		// commit inline edit if active
		if (this.editingId) {
			const ok = this.model.updateMessage(this.editingId, trimmed);
			this.editingId = null;
			this.view.clearInput();
			this.view.focusInput();
			if (!ok) return;
			return;
		}

		// add user message and clear the input immediately for a snappy UI
		const user = this.model.addMessage(trimmed, 'user');
		if (!user) return;
		this.view.clearInput();
		this.view.focusInput();

		// get reply from active provider (async)
		try {
			const replyText = await this.ai.reply(trimmed);
			this.model.addMessage(replyText, 'bot');
		} catch (err) {
			// make errors visible but not fatal
			this.model.addMessage(`(error: ${err?.message || 'ai call failed'})`, 'bot');
		}
	}

	// simple prompt-based editing when clicking the edit button
	handleEditPrompt(id) {
		const msg = this.model.getState().messages.find(m => m.id === id);
		if (!msg || msg.role !== 'user') return;
		const next = this.view.prompt('edit your message:', msg.text);
		if (next == null) return;
		this.model.updateMessage(id, String(next));
	}

	handleDelete(id) {
		if (!this.view.confirm('delete this message?')) return;
		this.model.deleteMessage(id);
	}

	handleClear() {
		if (!this.view.confirm('clear all messages?')) return;
		this.model.clearAll();
		this.cancelInlineEdit();
	}

	handleExport() {
		this.view.download('chat-export.json', this.model.exportJson());
	}

	handleImport(json) {
		const ok = this.model.importJson(json);
		if (!ok) this.view.alert('import failed. please use a valid file.');
	}

	editLastMessageInline() {
		const msgs = this.model.getState().messages;
		const lastUser = [...msgs].reverse().find(m => m.role === 'user');
		if (!lastUser) return;
		this.editingId = lastUser.id;
		this.view.setInputText(lastUser.text);
		this.view.focusInput();
	}

	cancelInlineEdit() {
		this.editingId = null;
		this.view.clearInput();
		this.view.focusInput();
	}
}