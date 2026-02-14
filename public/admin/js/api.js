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

    // Add methods for other resources (users, shayari, etc.) here

}
