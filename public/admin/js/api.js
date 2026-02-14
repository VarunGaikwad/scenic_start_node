const API_BASE = '/admin';
const AUTH_URL = '/unauth/login';

class Api {
    static get token() {
        return localStorage.getItem('token');
    }

    static get headers() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
        };
    }

    static async login(email, password) {
        const res = await fetch(AUTH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (!res.ok) throw await res.json();
        return res.json();
    }

    static async get(resource, params = {}) {
        const url = new URL(resource, window.location.origin + API_BASE + '/');
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

        const res = await fetch(url, { headers: this.headers });
        if (res.status === 401) {
            window.app.logout();
            throw new Error('Unauthorized');
        }
        if (!res.ok) throw await res.json();
        return res.json();
    }

    static async post(resource, data) {
        const res = await fetch(`${API_BASE}/${resource}`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(data)
        });
        if (!res.ok) throw await res.json();
        return res.json();
    }

    static async put(resource, id, data) {
        const res = await fetch(`${API_BASE}/${resource}/${id}`, {
            method: 'PUT',
            headers: this.headers,
            body: JSON.stringify(data)
        });
        if (!res.ok) throw await res.json();
        return res.json();
    }

    static async delete(resource, id) {
        const res = await fetch(`${API_BASE}/${resource}/${id}`, {
            method: 'DELETE',
            headers: this.headers
        });
        if (!res.ok) throw await res.json();
        return res.json();
    }
}
