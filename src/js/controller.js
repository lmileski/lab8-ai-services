// controller coordinates user actions between view and model and calls the ai router
export class Controller {
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

	// when user toggles the provider dropdown
	handleProviderChange(provider) {
		try {
			// set active provider
			this.ai.provider = provider;
		} catch (e) {
			this.view.alert(e.message || 'unknown provider');
			this.view.setProviderUI('eliza');
			this.ai.provider = 'eliza';
			return;
		}

		// if provider is cloud, make sure we have an api key
		if (provider === 'claude') {
			this.view.alert('please enter your claude api key to continue.');
			const fromUser = this.view.prompt('enter your claude api key:', '');
			if (!fromUser) {
				this.view.alert('no key entered. staying on eliza.');
				this.view.setProviderUI('eliza');
				this.ai.provider = 'eliza';
				return;
			}
			this.ai.setClaudeKey(fromUser.trim());
			// optionally persist to localstorage for this lab
			localStorage.setItem('ai_claude_api_key', fromUser.trim());
		} else if (provider === 'gemini') {
			this.view.alert('please enter your gemini api key to continue.');
			const fromUser = this.view.prompt('enter your gemini api key:', '');
			if (!fromUser) {
				this.view.alert('no key entered. staying on eliza.');
				this.view.setProviderUI('eliza');
				this.ai.provider = 'eliza';
				return;
			}
			this.ai.setGeminiKey(fromUser.trim());
			localStorage.setItem('ai_gemini_api_key', fromUser.trim());
		}
	}

	// send either commits an inline edit or sends a fresh message
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

		// add user message
		const user = this.model.addMessage(trimmed, 'user');
		if (!user) return;

		// get reply from active provider
		try {
			const replyText = await this.ai.reply(trimmed);
			this.model.addMessage(replyText, 'bot');
		} catch (err) {
			// make errors visible but not fatal
			this.model.addMessage(`(error: ${err?.message || 'ai call failed'})`, 'bot');
		}

		this.view.clearInput();
		this.view.focusInput();
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