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
        return this._fetch('/admin/users');
    }

    async getUser(id) {
        return this._fetch(`/admin/users/${id}`);
    }

    async createUser(data) {
        return this._fetch('/admin/users', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateUser(id, data) {
        return this._fetch(`/admin/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteUser(id) {
        return this._fetch(`/admin/users/${id}`, {
            method: 'DELETE',
        });
    }


    // --- Bookmarks --- //

    async getBookmarksTree() {
        return this._fetch('/admin/bookmarks/tree');
    }

    async getBookmarks(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this._fetch(`/admin/bookmarks?${query}`);
    }

    async getBookmark(id) {
        return this._fetch(`/admin/bookmarks/${id}`);
    }

    async createBookmark(data) {
        return this._fetch('/admin/bookmarks', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateBookmark(id, data) {
        return this._fetch(`/admin/bookmarks/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteBookmark(id) {
        return this._fetch(`/admin/bookmarks/${id}`, {
            method: 'DELETE',
        });
    }

    // --- Shayari & Quotes --- //
    async getShayariAndQuotes() {
        return this._fetch('/admin/shayari-quotes');
    }

    async getShayariAndQuote(id) {
        return this._fetch(`/admin/shayari-quotes/${id}`);
    }

    async createShayariAndQuote(data) {
        return this._fetch('/admin/shayari-quotes', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateShayariAndQuote(id, data) {
        return this._fetch(`/admin/shayari-quotes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteShayariAndQuote(id) {
        return this._fetch(`/admin/shayari-quotes/${id}`, {
            method: 'DELETE',
        });
    }

    // --- Calendar Reminders --- //
    async getCalendarReminders() {
        return this._fetch('/admin/calendar-reminders');
    }

    async getCalendarReminder(id) {
        return this._fetch(`/admin/calendar-reminders/${id}`);
    }

    async createCalendarReminder(data) {
        return this._fetch('/admin/calendar-reminders', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateCalendarReminder(id, data) {
        return this._fetch(`/admin/calendar-reminders/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteCalendarReminder(id) {
        return this._fetch(`/admin/calendar-reminders/${id}`, {
            method: 'DELETE',
        });
    }

    // --- Background Images --- //
    async getBackgroundImages() {
        return this._fetch('/admin/background-images');
    }

    async createBackgroundImage(data) {
        // Assuming image uploads are handled via a different mechanism (e.g., multipart/form-data)
        // This is a placeholder for creating a background image record
        return this._fetch('/admin/background-images', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async deleteBackgroundImage(id) {
        return this._fetch(`/admin/background-images/${id}`, {
            method: 'DELETE',
        });
    }
}
