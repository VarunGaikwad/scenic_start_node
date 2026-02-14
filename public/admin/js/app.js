const App = {
    token: localStorage.getItem('token'),
    user: JSON.parse(localStorage.getItem('user') || '{}'),
    currentPage: 'users',

    init() {
        if (!this.token) {
            this.showLogin();
        } else {
            this.showDashboard();
        }
        this.bindEvents();
    },

    bindEvents() {
        // Login Form
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const data = await Api.login(email, password);

                if (data.user.role !== 'admin') {
                    throw new Error('Access denied. Admin only.');
                }

                this.token = data.token;
                this.user = data.user;
                localStorage.setItem('token', this.token);
                localStorage.setItem('user', JSON.stringify(this.user));

                this.showDashboard();
            } catch (err) {
                const errorDiv = document.getElementById('login-error');
                errorDiv.textContent = err.message || 'Login failed';
                errorDiv.classList.remove('d-none');
            }
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });

        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                e.target.classList.add('active');
                this.loadPage(e.target.dataset.page);
            });
        });

        // Add Button
        document.getElementById('add-btn').addEventListener('click', () => {
            this.openModal();
        });

        // Save Button (Modal)
        document.getElementById('save-btn').addEventListener('click', () => {
            this.saveItem();
        });
    },

    logout() {
        this.token = null;
        this.user = {};
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.showLogin();
    },

    showLogin() {
        document.getElementById('login-container').classList.remove('d-none');
        document.getElementById('app-container').classList.add('d-none');
    },

    showDashboard() {
        document.getElementById('login-container').classList.add('d-none');
        document.getElementById('app-container').classList.remove('d-none');
        this.loadPage('users');
    },

    async loadPage(page) {
        this.currentPage = page;
        document.getElementById('page-title').textContent = page.replace('-', ' ').toUpperCase();

        try {
            const data = await Api.get(page);
            this.renderTable(page, data);
        } catch (err) {
            console.error(err);
            alert('Failed to load data');
        }
    },

    renderTable(resource, data) {
        const thead = document.getElementById('table-header');
        const tbody = document.getElementById('table-body');
        thead.innerHTML = '';
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="100" class="text-center">No records found</td></tr>';
            return;
        }

        const columns = this.getColumns(resource);

        // Header
        columns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col.label;
            thead.appendChild(th);
        });
        const actionTh = document.createElement('th');
        actionTh.textContent = 'Actions';
        thead.appendChild(actionTh);

        // Body
        data.forEach(item => {
            const tr = document.createElement('tr');

            columns.forEach(col => {
                const td = document.createElement('td');
                let value = item[col.key];

                // Formatters
                if (col.type === 'bool') value = value ? 'Yes' : 'No';
                if (col.type === 'date') value = new Date(value).toLocaleDateString();
                if (col.type === 'image') value = `<a href="${value}" target="_blank">View</a>`;

                td.innerHTML = value !== undefined && value !== null ? value : '';
                tr.appendChild(td);
            });

            // Actions
            const actionTd = document.createElement('td');

            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-sm btn-outline-secondary me-2';
            editBtn.textContent = 'Edit';
            editBtn.onclick = () => this.openModal(item);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-sm btn-outline-danger';
            deleteBtn.textContent = 'Delete';
            deleteBtn.onclick = () => this.deleteItem(item._id);

            actionTd.appendChild(editBtn);
            actionTd.appendChild(deleteBtn);
            tr.appendChild(actionTd);

            tbody.appendChild(tr);
        });
    },

    getColumns(resource) {
        const configs = {
            'users': [
                { key: 'email', label: 'Email' },
                { key: 'role', label: 'Role' },
                { key: 'status', label: 'Status' },
                { key: 'createdAt', label: 'Created At', type: 'date' }
            ],
            'bookmarks': [
                { key: 'title', label: 'Title' },
                { key: 'type', label: 'Type' },
                { key: 'url', label: 'URL', type: 'link' },
                { key: 'createdAt', label: 'Created At', type: 'date' }
            ],
            'shayari-quotes': [
                { key: 'text', label: 'Text' },
                { key: 'type', label: 'Type' },
                { key: 'author', label: 'Author' }
            ],
            'background-images': [
                { key: 'image_url', label: 'Image', type: 'image' },
                { key: 'text_color', label: 'Text Color' },
                { key: 'is_welcome', label: 'Welcome Screen', type: 'bool' }
            ],
            'calendar-reminders': [
                { key: 'title', label: 'Title' },
                { key: 'type', label: 'Type' },
                { key: 'completed', label: 'Completed', type: 'bool' },
                { key: 'createdAt', label: 'Created At', type: 'date' }
            ]
        };
        return configs[resource] || [];
    },

    getFormFields(resource) {
        const configs = {
            'users': [
                { key: 'email', label: 'Email', type: 'email', required: true },
                { key: 'password', label: 'Password', type: 'password' },
                { key: 'role', label: 'Role', type: 'select', options: ['user', 'admin'] },
                { key: 'status', label: 'Status', type: 'select', options: ['active', 'blocked'] }
            ],
            'bookmarks': [
                { key: 'title', label: 'Title', type: 'text', required: true },
                { key: 'type', label: 'Type', type: 'select', options: ['link', 'folder'] },
                { key: 'url', label: 'URL', type: 'text' },
                // parentId is complex, skipping for simple UI, defaults to root
            ],
            'shayari-quotes': [
                { key: 'text', label: 'Text', type: 'textarea', required: true },
                { key: 'type', label: 'Type', type: 'select', options: ['shayari', 'quotes'] },
                { key: 'author', label: 'Author', type: 'text' },
                { key: 'tags', label: 'Tags (comma separated)', type: 'text' }
            ],
            'background-images': [
                { key: 'image_url', label: 'Image URL', type: 'text', required: true },
                { key: 'text_color', label: 'Text Color', type: 'select', options: ['light', 'dark'] },
                { key: 'is_welcome', label: 'Is Welcome Screen', type: 'checkbox' },
                { key: 'overlay_color', label: 'Overlay Color (Hex)', type: 'text' },
                { key: 'overlay_opacity', label: 'Overlay Opacity (0-1)', type: 'number' }
            ],
            'calendar-reminders': [
                { key: 'title', label: 'Title', type: 'text', required: true },
                { key: 'type', label: 'Type', type: 'select', options: ['task', 'event', 'birthday'] },
                { key: 'description', label: 'Description', type: 'textarea' },
                { key: 'userId', label: 'User ID', type: 'text', required: true }, // Admin must specify user
                { key: 'completed', label: 'Completed', type: 'checkbox' }
            ]
        };
        return configs[resource] || [];
    },

    openModal(item = null) {
        this.currentItem = item;
        const modalTitle = document.getElementById('modalTitle');
        const formFields = document.getElementById('form-fields');
        formFields.innerHTML = '';

        modalTitle.textContent = item ? 'Edit Item' : 'Add New Item';

        const fields = this.getFormFields(this.currentPage);

        fields.forEach(field => {
            const div = document.createElement('div');
            div.className = 'mb-3';

            const label = document.createElement('label');
            label.className = 'form-label';
            label.textContent = field.label;
            div.appendChild(label);

            let input;
            const value = item ? (item[field.key] || '') : '';

            if (field.type === 'select') {
                input = document.createElement('select');
                input.className = 'form-select';
                field.options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt;
                    option.textContent = opt;
                    if (value === opt) option.selected = true;
                    input.appendChild(option);
                });
            } else if (field.type === 'textarea') {
                input = document.createElement('textarea');
                input.className = 'form-control';
                input.value = value;
            } else if (field.type === 'checkbox') {
                div.className = 'form-check mb-3';
                input = document.createElement('input');
                input.className = 'form-check-input';
                input.type = 'checkbox';
                input.checked = !!value;
                label.className = 'form-check-label';
                div.appendChild(input); // Input comes first in Bootstrap check
                div.appendChild(label); // Label comes second
                // Fix order for checkbox
                formFields.appendChild(div);
                input.dataset.key = field.key;
                return;
            } else {
                input = document.createElement('input');
                input.className = 'form-control';
                input.type = field.type;
                input.value = value;
                if (field.required) input.required = true;
            }

            input.dataset.key = field.key;
            div.appendChild(input);
            formFields.appendChild(div);
        });

        const modal = new bootstrap.Modal(document.getElementById('dataModal'));
        modal.show();
        this.currentModal = modal;
    },

    async saveItem() {
        const fields = this.getFormFields(this.currentPage);
        const data = {};

        let isValid = true;
        fields.forEach(field => {
            const el = document.querySelector(`[data-key="${field.key}"]`);
            if (field.type === 'checkbox') {
                data[field.key] = el.checked;
            } else {
                if (field.required && !el.value) isValid = false;
                data[field.key] = el.value;
            }
        });

        // Special handling for tags (comma separated string to array)
        if (this.currentPage === 'shayari-quotes' && data.tags) {
            data.tags = data.tags.split(',').map(t => t.trim()).filter(Boolean);
        }

        if (!isValid) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            if (this.currentItem) {
                await Api.put(this.currentPage, this.currentItem._id, data);
            } else {
                await Api.post(this.currentPage, data);
            }
            this.currentModal.hide();
            this.loadPage(this.currentPage);
        } catch (err) {
            console.error(err);
            alert('Operation failed: ' + (err.error || err.message));
        }
    },

    async deleteItem(id) {
        if (!confirm('Are you sure you want to delete this item?')) return;

        try {
            await Api.delete(this.currentPage, id);
            this.loadPage(this.currentPage);
        } catch (err) {
            console.error(err);
            alert('Failed to delete item: ' + (err.error || err.message));
        }
    }
};

window.app = App;
document.addEventListener('DOMContentLoaded', () => App.init());
