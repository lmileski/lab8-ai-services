// view owns all dom creation, events, and renders based on model state
const fmtClock = ms =>
	new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// label shows saved time only; design keeps this compact in header
const fmtSaved = ms => {
	if (!ms) return 'Saved: —';
	const d = new Date(ms);
	const hhmm = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	return `Saved: ${hhmm}`;
};

// helper to create elements with optional class/text
const el = (tag, cls, text) => {
	const n = document.createElement(tag);
	if (cls) n.className = cls;
	if (text != null) n.textContent = text;
	return n;
};

export class View {
	constructor() {
		// cache key nodes once
		this.list = document.getElementById('messages');
		this.form = document.getElementById('chat-form');
		this.input = document.getElementById('chat-input');
		this.chatWindow = document.querySelector('.chat-window');

		this.msgCount = document.getElementById('msg-count');
		this.lastSaved = document.getElementById('last-saved');
		this.exportBtn = document.getElementById('export-btn');
		this.importBtn = document.getElementById('import-btn');
		this.clearBtn = document.getElementById('clear-btn');
		this.fileInput = document.getElementById('file-input');

		// new: provider select
		this.aiSelect = document.getElementById('ai-select');

		// event callbacks wired by controller
		this.onSend = null;
		this.onEdit = null;
		this.onDelete = null;
		this.onExport = null;
		this.onImport = null;
		this.onClear = null;
		this.onAiChange = null;

		// keyboard shortcuts
		this.onClearInput = null;
		this.onCancelEdit = null;
		this.onEditLast = null;

		// submit sends or commits inline edit
		this.form.addEventListener('submit', e => {
			e.preventDefault();
			const t = this.input.value.trim();
			if (!t) return;
			if (!this.onSend) return;
			this.onSend(t);
		});

		// actions for dynamic messages
		this.list.addEventListener('click', e => {
			const btn = e.target.closest('button[data-action]');
			if (!btn) return;
			const id = btn.closest('li[data-id]')?.dataset.id;
			if (!id) return;
			if (btn.dataset.action === 'edit' && this.onEdit) this.onEdit(id);
			if (btn.dataset.action === 'delete' && this.onDelete) this.onDelete(id);
		});

		// topbar controls
		this.exportBtn.addEventListener('click', e => {
			e.preventDefault();
			if (this.onExport) this.onExport();
		});

		this.importBtn.addEventListener('click', e => {
			e.preventDefault();
			this.fileInput.click();
		});

		this.fileInput.addEventListener('change', () => this.handleFile());

		this.clearBtn.addEventListener('click', e => {
			e.preventDefault();
			if (this.onClear) this.onClear();
		});

		// provider change wired to controller
		this.aiSelect.addEventListener('change', () => {
			if (this.onAiChange) this.onAiChange(this.aiSelect.value);
		});

		// keyboard shortcuts bound on input for a natural feel
		this.input.addEventListener('keydown', e => {
			// ctrl/cmd + k clears input quickly
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
				e.preventDefault();
				if (this.onClearInput) this.onClearInput();
				return;
			}
			// esc cancels inline edit and clears box
			if (e.key === 'Escape') {
				e.preventDefault();
				if (this.onCancelEdit) this.onCancelEdit();
				return;
			}
			// arrow up/down loads last user message for quick editing when box is empty
			if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && this.input.value.trim() === '') {
				e.preventDefault();
				if (this.onEditLast) this.onEditLast();
			}
		});

		// avoid horizontal scroll in chat pane
		if (this.chatWindow) this.chatWindow.style.overflowX = 'hidden';
	}

	// focus helpers
	focusInput() {
		this.input?.focus();
	}

	setInputText(text) {
		this.input.value = text;
	}

	clearInput() {
		this.input.value = '';
	}

	setProviderUI(provider) {
		// keep the select in sync with controller's notion of provider
		if (this.aiSelect) this.aiSelect.value = provider;
	}

	// read selected file and hand off to controller
	async handleFile() {
		const f = this.fileInput.files?.[0];
		if (!f) return;
		const text = await f.text();
		if (this.onImport) this.onImport(text);
		this.fileInput.value = '';
	}

	// render entire list from model state
	render(state) {
		this.list.innerHTML = '';
		state.messages.forEach(m => this.list.append(this.renderItem(m)));
		this.updateMeta(state);
		this.scrollToBottom();
	}

	// render a single message row
	renderItem(m) {
		const li = el('li', m.role);
		li.dataset.id = m.id;

		const bubble = el(
			'p',
			'bubble',
			m.text + (m.edited ? ' (edited)' : '')
		);

		const t = document.createElement('time');
		t.className = 'time';
		t.dateTime = new Date(m.timestamp).toISOString();
		t.textContent = fmtClock(m.timestamp);

		if (m.role === 'user') {
			const actions = el('div', 'msg-actions');
			const edit = el('button', 'action action--secondary', 'Edit');
			edit.dataset.action = 'edit';
			const del = el('button', 'action action--secondary', 'Delete');
			del.dataset.action = 'delete';
			actions.append(edit, del);
			li.append(bubble, actions, t);
		} else {
			li.append(bubble, t);
		}

		return li;
	}

	// update header meta labels
	updateMeta(s) {
		this.msgCount.textContent = `${s.count} messages`;
		this.lastSaved.textContent = fmtSaved(s.lastSaved);
	}

	// keep newest content in view
	scrollToBottom() {
		if (this.chatWindow) {
			this.chatWindow.scrollTop = this.chatWindow.scrollHeight;
		}
	}

	// thin wrappers for dialogs to keep controller clean
	confirm(t) {
		return window.confirm(t);
	}

	prompt(t, d = '') {
		return window.prompt(t, d);
	}

	alert(t) {
		window.alert(t);
	}

	// trigger a download of text content
	download(name, text) {
		const a = document.createElement('a');
		a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
		a.download = name;
		document.body.appendChild(a);
		a.click();
		a.remove();
	}
}