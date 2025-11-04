// model manages messages and persistence and notifies observers on change
const makeId = () => Date.now().toString(36) + Math.random().toString(16).slice(2);

export class Model {
	constructor(key = 'chat_v1') {
		this.key = key;
		this.messages = [];
		this.lastSaved = null;
		this.watchers = [];
		this.load();
	}

	// allow views/controllers to subscribe to changes
	onChange(fn) {
		this.watchers.push(fn);
	}

	// make current state aware to listeners
	notify() {
		this.watchers.forEach(fn => fn(this.getState()));
	}

	// return a safe copy of state for rendering
	getState() {
		return {
			messages: [...this.messages],
			count: this.messages.length,
			lastSaved: this.lastSaved
		};
	}

	// persist state to localstorage with basic error handling
	save() {
		try {
			const payload = {
				messages: this.messages,
				lastSaved: Date.now()
			};
			localStorage.setItem(this.key, JSON.stringify(payload));
			this.lastSaved = payload.lastSaved;
		} catch (e) {
			console.warn('save failed', e);
		}
	}

	// load state from localstorage defensively
	load() {
		try {
			const raw = localStorage.getItem(this.key);
			if (!raw) return;
			const d = JSON.parse(raw);
			if (d && Array.isArray(d.messages)) {
				this.messages = d.messages.filter(m =>
					m &&
					m.id &&
					typeof m.text === 'string' &&
					(m.role === 'user' || m.role === 'bot')
				);
				this.lastSaved = d.lastSaved || null;
			}
		} catch (e) {
			// improper storage should not break the app
			console.warn('load failed, clearing', e);
			localStorage.removeItem(this.key);
			this.messages = [];
			this.lastSaved = null;
		}
	}

	// create a message
	addMessage(text, role) {
		const t = String(text || '').trim();
		if (!t) return null;
		const msg = {
			id: makeId(),
			text: t,
			role,
			timestamp: Date.now(),
			edited: false
		};
		this.messages.push(msg);
		this.save();
		this.notify();
		return msg;
	}

	// update (just user messages)
	updateMessage(id, newText) {
		const m = this.messages.find(x => x.id === id);
		if (!m || m.role !== 'user') return false;
		const t = String(newText || '').trim();
		if (!t) return false;
		m.text = t;
		m.edited = true;
		this.save();
		this.notify();
		return true;
	}

	// delete a user message
	deleteMessage(id) {
		const i = this.messages.findIndex(x => x.id === id);
		if (i < 0) return false;
		this.messages.splice(i, 1);
		this.save();
		this.notify();
		return true;
	}

	// delete all messages
	clearAll() {
		this.messages = [];
		this.save();
		this.notify();
	}

	// export current state as pretty json
	exportJson() {
		return JSON.stringify(
			{
				messages: this.messages,
				lastSaved: this.lastSaved
			},
			null,
			2
		);
	}

	// import state from json with validation
	importJson(text) {
		try {
			const d = JSON.parse(text);
			if (!d || !Array.isArray(d.messages)) return false;
			const ok = d.messages.every(m =>
				m &&
				m.id &&
				typeof m.text === 'string' &&
				(m.role === 'user' || m.role === 'bot')
			);
			if (!ok) return false;
			this.messages = d.messages;
			this.lastSaved = d.lastSaved || Date.now();
			this.save();
			this.notify();
			return true;
		} catch {
			return false;
		}
	}
}