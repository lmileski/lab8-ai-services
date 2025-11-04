/**
 * model - manages chat messages and persistence with localStorage.
 * implements the MVC pattern's model layer
 * 
 * @class
 */
// model manages messages and persistence and notifies observers on change
/**
 * generate a unique message ID using timestamp and random string.
 *
 * @returns {string} Unique ID (e.g., 'lx5q2k0.8f3j2k1p9d')
 */
const makeId = () => Date.now().toString(36) + Math.random().toString(16).slice(2);

export class Model {
	/**
	 * create a model instance.
	 * 
	 * @param {string} [key='chat_v1'] - localStorage key for persisting messages
	 */
	constructor(key = 'chat_v1') {
		this.key = key;
		this.messages = [];
		this.lastSaved = null;
		this.watchers = [];
		this.load();
	}

	/**
	 * subscribe to state changes
	 * 
	 * @param {Function} fn - Callback function that receives state updates
	 */
	onChange(fn) {
		this.watchers.push(fn);
	}

	/**
	 * notify all watchers of state change
	 */
	notify() {
		this.watchers.forEach(fn => fn(this.getState()));
	}

	/**
	 * get a safe copy of current state for rendering.
	 * 
	 * @returns {Object} state object with messages array, count, and lastSaved timestamp
	 */
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

	/**
	 * Add a new message to the chat.
	 * 
	 * @param {string} text - Message content
	 * @param {string} role - Message role ('user' or 'bot')
	 * @returns {Object|null} Created message object, or null if text is empty
	 */
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

	/**
	 * Update an existing user message.
	 * 
	 * @param {string} id - Message ID to update
	 * @param {string} newText - New message text
	 * @returns {boolean} True if updated successfully, false otherwise
	 */
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