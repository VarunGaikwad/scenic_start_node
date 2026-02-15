
document.addEventListener('DOMContentLoaded', () => {
    const loginModal = new bootstrap.Modal(document.getElementById('login-modal'));
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const adminUI = document.getElementById('admin-ui');
    const sidebarNav = document.getElementById('sidebar-nav');
    const pageTitle = document.getElementById('page-title');
    const mainView = document.getElementById('main-view');
    const formView = document.getElementById('form-view');
    const addBtn = document.getElementById('add-btn');
    const logoutBtn = document.getElementById('logout-btn');

    const api = new AdminAPI();

    let currentResource = 'users';

    // --- Initial Load --- //
    const token = localStorage.getItem('admin-token');
    if (token) {
        api.setToken(token);
        adminUI.style.display = 'block';
        loadResource(currentResource, true); // Initial load, set active link
    } else {
        loginModal.show();
    }

    // --- Event Listeners --- //
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        try {
            const token = await api.login(email, password);
            localStorage.setItem('admin-token', token);
            api.setToken(token);
            loginModal.hide();
            adminUI.style.display = 'block';
            loadResource(currentResource, true);
        } catch (err) {
            loginError.textContent = err.message;
            loginError.style.display = 'block';
        }
    });

    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('admin-token');
        window.location.reload();
    });

    sidebarNav.addEventListener('click', (e) => {
        e.preventDefault();
        const navLink = e.target.closest('.nav-link');
        if (navLink) {
            const resource = navLink.getAttribute('data-resource');
            if (resource) {
                currentResource = resource;
                pageTitle.textContent = navLink.textContent.trim();
                loadResource(resource);
                
                sidebarNav.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
                navLink.classList.add('active');
            }
        }
    });
    
    addBtn.addEventListener('click', () => {
        if (currentResource === 'bookmarks') {
            showBookmarkForm();
        } else {
            showForm(currentResource);
        }
    });

    // --- Resource Loading & Rendering --- //
    async function loadResource(resource, setActive = false) {
        mainView.innerHTML = '<div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div>';
        formView.style.display = 'none';
        mainView.style.display = 'block';

        if (setActive) {
            sidebarNav.querySelectorAll('.nav-link').forEach(link => {
                link.classList.toggle('active', link.getAttribute('data-resource') === resource);
            });
            pageTitle.textContent = sidebarNav.querySelector(`.nav-link[data-resource="${resource}"]`).textContent.trim();
        }

        try {
            let data;
            switch (resource) {
                case 'users':
                    data = await api.getUsers();
                    renderGeneric(resource, data, ['name', 'email']);
                    break;
                case 'bookmarks':
                    data = await api.getBookmarksTree();
                    renderBookmarksTree(data);
                    break;
                case 'shayari-quotes':
                    data = await api.getShayariAndQuotes();
                    renderGeneric(resource, data, ['content', 'author', 'category']);
                    break;
                case 'calendar-reminders':
                    data = await api.getCalendarReminders();
                    data.forEach(item => item.date = new Date(item.date).toLocaleDateString());
                    renderGeneric(resource, data, ['title', 'date', 'time']);
                    break;
                case 'background-images':
                    data = await api.getBackgroundImages();
                    renderGeneric(resource, data, ['image_url']);
                    break;
                default:
                    mainView.innerHTML = `<p>Management for ${resource} is not yet implemented.</p>`;
            }
        } catch (error) {
            mainView.innerHTML = `<div class="alert alert-danger">Failed to load ${resource}: ${error.message}</div>`;
        }
    }

    function renderGeneric(resource, items, columns) {
        if (!items || items.length === 0) {
            mainView.innerHTML = `<p>No ${resource.replace(/-/g, ' ')} found.</p>`;
            return;
        }
        const headers = [...columns, 'Actions'];
        const tableHtml = `
            <table class="table table-striped">
                <thead>
                    <tr>${headers.map(h => `<th>${h.replace('_', ' ').charAt(0).toUpperCase() + h.slice(1)}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr>
                            ${columns.map(col => `<td>${item[col] || ''}</td>`).join('')}
                            <td>
                                ${resource !== 'background-images' ? `<button class="btn btn-sm btn-outline-secondary me-2" onclick="window.app.editItem('${resource}', '${item._id}')"><i class="bi bi-pencil"></i></button>` : ''}
                                <button class="btn btn-sm btn-outline-danger" onclick="window.app.deleteItem('${resource}', '${item._id}')"><i class="bi bi-trash"></i></button>
                            </td>
                        </tr>`).join('')}
                </tbody>
            </table>`;
        mainView.innerHTML = tableHtml;
    }

    function renderBookmarksTree(nodes) {
        if (!nodes || nodes.length === 0) {
            mainView.innerHTML = '<p>No bookmarks found.</p>'; return;
        }
        mainView.innerHTML = `<div class="list-group bookmark-tree">${nodes.map(renderBookmarkNode).join('')}</div>`;
    }

    function renderBookmarkNode(node) {
        const isFolder = node.type === 'folder';
        const hasChildren = isFolder && node.children && node.children.length > 0;
        return `
            <div class="list-group-item">
                <div class="d-flex justify-content-between align-items-center">
                    <span>
                        <i class="bi ${isFolder ? 'bi-folder' : 'bi-link-45deg'} "></i> ${node.title}
                        ${!isFolder ? `<small class="text-muted ms-2">${node.url}</small>` : ''}
                    </span>
                    <div>
                        <button class="btn btn-sm btn-outline-secondary me-2" onclick="window.app.editBookmark('${node._id}')"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="window.app.deleteBookmark('${node._id}')"><i class="bi bi-trash"></i></button>
                    </div>
                </div>
                ${hasChildren ? `<div class="list-group-item-children mt-2">${node.children.map(renderBookmarkNode).join('')}</div>` : ''}
            </div>`;
    }

    // --- Form Handling --- //
    async function showForm(resource, item = null) {
        const isEditing = item !== null;
        const fieldConfig = {
            'users': [
                { name: 'name', label: 'Name', type: 'text', required: true },
                { name: 'email', label: 'Email', type: 'email', required: true },
                { name: 'password', label: 'Password', type: 'password', required: !isEditing, placeholder: isEditing ? 'Leave blank to keep current password' : '' },
            ],
            'shayari-quotes': [
                { name: 'content', label: 'Content', type: 'textarea', required: true },
                { name: 'author', label: 'Author', type: 'text' },
                { name: 'category', label: 'Category', type: 'text', required: true },
            ],
            'calendar-reminders': [
                { name: 'title', label: 'Title', type: 'text', required: true },
                { name: 'date', label: 'Date', type: 'date', required: true },
                { name: 'time', label: 'Time', type: 'time' },
            ],
            'background-images': [
                { name: 'image_url', label: 'Image URL', type: 'url', required: true },
            ],
        };
        const fields = fieldConfig[resource];
        if (!fields) return alert('Form not defined for this resource');

        const formHtml = `
            <form id="resource-form" data-resource="${resource}">
                <input type="hidden" id="item-id" value="${isEditing ? item._id : ''}">
                ${fields.map(field => {
                    let value = isEditing && item[field.name] ? item[field.name] : '';
                    if (field.type === 'date' && value) value = new Date(value).toISOString().split('T')[0];
                    return `<div class="mb-3">
                        <label for="${field.name}" class="form-label">${field.label}</label>
                        <${field.type === 'textarea' ? 'textarea' : 'input'} 
                            type="${field.type === 'textarea' ? '' : field.type}" 
                            class="form-control" 
                            id="${field.name}" 
                            ${field.required ? 'required' : ''}
                            placeholder="${field.placeholder || ''}"
                            >${field.type === 'textarea' ? value : ''}</${field.type === 'textarea' ? 'textarea' : 'input'}>
                        ${field.type !== 'textarea' ? `<script>document.getElementById('${field.name}').value = '${value}';</script>` : ''}
                    </div>`
                }).join('')}
                <button type="submit" class="btn btn-primary">${isEditing ? 'Update' : 'Create'}</button>
                <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
            </form>`;

        formView.innerHTML = formHtml;
        mainView.style.display = 'none';
        formView.style.display = 'block';

        document.getElementById('cancel-btn').addEventListener('click', () => loadResource(currentResource));
        document.getElementById('resource-form').addEventListener('submit', handleFormSubmit);
    }
    
    async function showBookmarkForm(bookmark = null) {
        const isEditing = bookmark !== null;
        const allFolders = await api.getBookmarks({ type: 'folder' });
        const parentOptions = allFolders
            .filter(folder => !isEditing || folder._id !== bookmark._id) // Prevent setting a folder as its own parent
            .map(folder => `<option value="${folder._id}" ${isEditing && bookmark.parentId === folder._id ? 'selected' : ''}>${folder.title}</option>`)
            .join('');

        const formHtml = `
            <form id="bookmark-form">
                <input type="hidden" id="bookmark-id" value="${isEditing ? bookmark._id : ''}">
                <div class="mb-3">
                    <label for="bookmark-type" class="form-label">Type</label>
                    <select class="form-select" id="bookmark-type" ${isEditing ? 'disabled' : ''}>
                        <option value="link" ${isEditing && bookmark.type === 'link' ? 'selected' : ''}>Link</option>
                        <option value="folder" ${isEditing && bookmark.type === 'folder' ? 'selected' : ''}>Folder</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label for="bookmark-title" class="form-label">Title</label>
                    <input type="text" class="form-control" id="bookmark-title" value="${isEditing ? bookmark.title : ''}" required>
                </div>
                <div class="mb-3" id="bookmark-url-group" style="display: ${isEditing && bookmark.type === 'folder' ? 'none' : 'block'};
">
                    <label for="bookmark-url" class="form-label">URL</label>
                    <input type="url" class="form-control" id="bookmark-url" value="${isEditing && bookmark.url ? bookmark.url : ''}">
                </div>
                <div class="mb-3">
                    <label for="bookmark-parentId" class="form-label">Parent Folder</label>
                    <select class="form-select" id="bookmark-parentId">
                        <option value="">-- Root Level --</option>
                        ${parentOptions}
                    </select>
                </div>
                <button type="submit" class="btn btn-primary">${isEditing ? 'Update' : 'Create'}</button>
                <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
            </form>`;

        formView.innerHTML = formHtml;
        mainView.style.display = 'none';
        formView.style.display = 'block';

        const bookmarkTypeSelect = document.getElementById('bookmark-type');
        const urlGroup = document.getElementById('bookmark-url-group');
        if (!isEditing) { // Only add listener for new bookmarks
            bookmarkTypeSelect.addEventListener('change', () => {
                urlGroup.style.display = bookmarkTypeSelect.value === 'folder' ? 'none' : 'block';
            });
        }
        
        document.getElementById('cancel-btn').addEventListener('click', () => loadResource('bookmarks'));
        document.getElementById('bookmark-form').addEventListener('submit', handleBookmarkFormSubmit);
    }
    
    // --- Form Submission --- //
    async function handleFormSubmit(e) {
        e.preventDefault();
        const resource = e.target.getAttribute('data-resource');
        const id = document.getElementById('item-id').value;
        const data = {};
        const fields = Array.from(e.target.elements).filter(el => el.id);
        fields.forEach(field => {
            if (field.type === 'password' && !field.value) return; // Skip empty password on edit
            data[field.id] = field.value;
        });
        delete data['item-id']; // clean up data object

        try {
            const apiMethods = {
                'users': { create: api.createUser.bind(api), update: api.updateUser.bind(api) },
                'shayari-quotes': { create: api.createShayariAndQuote.bind(api), update: api.updateShayariAndQuote.bind(api) },
                'calendar-reminders': { create: api.createCalendarReminder.bind(api), update: api.updateCalendarReminder.bind(api) },
                'background-images': { create: api.createBackgroundImage.bind(api), update: null },
            };
            if (id) {
                await apiMethods[resource].update(id, data);
            } else {
                await apiMethods[resource].create(data);
            }
            loadResource(resource);
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    }

    async function handleBookmarkFormSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('bookmark-id').value;
        const data = {
            type: document.getElementById('bookmark-type').value,
            title: document.getElementById('bookmark-title').value,
            url: document.getElementById('bookmark-url').value,
            parentId: document.getElementById('bookmark-parentId').value || null,
        };
        try {
            if (id) {
                await api.updateBookmark(id, data);
            } else {
                await api.createBookmark(data);
            }
            loadResource('bookmarks');
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    }

    // --- Global App Object --- //
    window.app = {
        editItem: async (resource, id) => {
            try {
                const apiGetters = {
                    'users': api.getUser.bind(api),
                    'shayari-quotes': api.getShayariAndQuote.bind(api),
                    'calendar-reminders': api.getCalendarReminder.bind(api),
                };
                const item = await apiGetters[resource](id);
                showForm(resource, item);
            } catch (err) {
                alert(`Error: ${err.message}`);
            }
        },
        deleteItem: async (resource, id) => {
            if (confirm('Are you sure you want to delete this item?')) {
                try {
                     const apiDeleters = {
                        'users': api.deleteUser.bind(api),
                        'shayari-quotes': api.deleteShayariAndQuote.bind(api),
                        'calendar-reminders': api.deleteCalendarReminder.bind(api),
                        'background-images': api.deleteBackgroundImage.bind(api),
                    };
                    await apiDeleters[resource](id);
                    loadResource(resource);
                } catch (err) {
                    alert(`Error: ${err.message}`);
                }
            }
        },
        editBookmark: async (id) => {
            try {
                const bookmark = await api.getBookmark(id);
                showBookmarkForm(bookmark);
            } catch (err) {
                alert(`Error: ${err.message}`);
            }
        },
        deleteBookmark: async (id) => {
            if (confirm('Are you sure you want to delete this item and all its contents?')) {
                try {
                    await api.deleteBookmark(id);
                    loadResource('bookmarks');
                } catch (err) {
                    alert(`Error: ${err.message}`);
                }
            }
        }
    };
});
