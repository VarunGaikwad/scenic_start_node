class AdminAPI {
    constructor(baseUrl = '/api') {
        this.baseUrl = baseUrl;
        this.token = null;
    }

    setToken(token) {
        this.token = token;
    }

    async _fetch(url, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(`${this.baseUrl}${url}`, { ...options, headers });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.error || errorData.message || 'API Error');
        }

        return response.json();
    }

    // --- Authentication --- //

    async login(email, password) {
        const data = await this._fetch('/unauth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password, isAdmin: true }),
        });
        return data.token;
    }

    // --- Users --- //
    async getUsers() {
        return this._fetch('/auth/user');
    }

    async getUser(id) {
        return this._fetch(`/auth/user/${id}`);
    }

    async createUser(data) {
        return this._fetch('/auth/user', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateUser(id, data) {
        return this._fetch(`/auth/user/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteUser(id) {
        return this._fetch(`/auth/user/${id}`, {
            method: 'DELETE',
        });
    }


    // --- Bookmarks --- //

    async getBookmarksTree() {
        return this._fetch('/auth/bookmark/tree');
    }

    async getBookmarks(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this._fetch(`/auth/bookmark?${query}`);
    }

    async getBookmark(id) {
        return this._fetch(`/auth/bookmark/${id}`);
    }

    async createBookmark(data) {
        return this._fetch('/auth/bookmark', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateBookmark(id, data) {
        return this._fetch(`/auth/bookmark/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteBookmark(id) {
        return this._fetch(`/auth/bookmark/${id}`, {
            method: 'DELETE',
        });
    }

    // --- Shayari & Quotes --- //
    async getShayariAndQuotes() {
        return this._fetch('/auth/shayari-quote');
    }

    async getShayariAndQuote(id) {
        return this._fetch(`/auth/shayari-quote/${id}`);
    }

    async createShayariAndQuote(data) {
        return this._fetch('/auth/shayari-quote', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateShayariAndQuote(id, data) {
        return this._fetch(`/auth/shayari-quote/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteShayariAndQuote(id) {
        return this._fetch(`/auth/shayari-quote/${id}`, {
            method: 'DELETE',
        });
    }

    // --- Calendar Reminders --- //
    async getCalendarReminders() {
        return this._fetch('/auth/calendar-reminder');
    }

    async getCalendarReminder(id) {
        return this._fetch(`/auth/calendar-reminder/${id}`);
    }

    async createCalendarReminder(data) {
        return this._fetch('/auth/calendar-reminder', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateCalendarReminder(id, data) {
        return this._fetch(`/auth/calendar-reminder/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteCalendarReminder(id) {
        return this._fetch(`/auth/calendar-reminder/${id}`, {
            method: 'DELETE',
        });
    }

    // --- Background Images --- //
    async getBackgroundImages() {
        return this._fetch('/auth/background-image');
    }

    async createBackgroundImage(data) {
        // Assuming image uploads are handled via a different mechanism (e.g., multipart/form-data)
        // This is a placeholder for creating a background image record
        return this._fetch('/auth/background-image', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async deleteBackgroundImage(id) {
        return this._fetch(`/auth/background-image/${id}`, {
            method: 'DELETE',
        });
    }
}
