
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

    let currentResource = 'users'; // Default resource
    let bookmarks = []; // To store the fetched bookmarks tree

    // Check for token on load
    const token = localStorage.getItem('admin-token');
    if (token) {
        api.setToken(token);
        adminUI.style.display = 'block';
        loadResource(currentResource);
    } else {
        loginModal.show();
    }

    // Handle Login
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
            loadResource(currentResource);
        } catch (err) {
            loginError.textContent = err.message;
            loginError.style.display = 'block';
        }
    });

    // Handle Logout
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('admin-token');
        window.location.reload();
    });

    // Handle Sidebar Navigation
    sidebarNav.addEventListener('click', (e) => {
        e.preventDefault();
        const navLink = e.target.closest('.nav-link');
        if (navLink) {
            // Remove active class from all links
            sidebarNav.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
            // Add active class to the clicked link
            navLink.classList.add('active');

            const resource = navLink.getAttribute('data-resource');
            if (resource) {
                currentResource = resource;
                pageTitle.textContent = navLink.textContent.trim();
                loadResource(resource);
            }
        }
    });

    // Load data for the selected resource
    async function loadResource(resource) {
        mainView.innerHTML = '<div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div>';
        formView.style.display = 'none';
        mainView.style.display = 'block';
        try {
            switch (resource) {
                case 'bookmarks':
                    bookmarks = await api.getBookmarksTree();
                    renderBookmarksTree(bookmarks);
                    break;
                // Add cases for other resources here
                default:
                    mainView.innerHTML = `<p>Management for ${resource} is not yet implemented.</p>`;
            }
        } catch (error) {
            mainView.innerHTML = `<div class="alert alert-danger">Failed to load ${resource}: ${error.message}</div>`;
        }
    }

    // Render the bookmarks as a tree
    function renderBookmarksTree(nodes) {
        if (!nodes || nodes.length === 0) {
            mainView.innerHTML = '<p>No bookmarks found.</p>';
            return;
        }

        const treeHtml = `
            <div class="list-group bookmark-tree">
                ${nodes.map(node => renderBookmarkNode(node)).join('')}
            </div>`;
        mainView.innerHTML = treeHtml;
    }

    function renderBookmarkNode(node) {
        const isFolder = node.type === 'folder';
        const hasChildren = isFolder && node.children && node.children.length > 0;

        return `
            <div class="list-group-item">
                <div class="d-flex justify-content-between align-items-center">
                    <span>
                        <i class="bi ${isFolder ? 'bi-folder' : 'bi-link-45deg'}"></i>
                        ${node.title}
                        ${!isFolder ? `<small class="text-muted ms-2">${node.url}</small>` : ''}
                    </span>
                    <div>
                        <button class="btn btn-sm btn-outline-secondary me-2" onclick="window.app.editBookmark('${node._id}')"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="window.app.deleteBookmark('${node._id}')"><i class="bi bi-trash"></i></button>
                    </div>
                </div>
                ${hasChildren ? `
                    <div class="list-group-item-children mt-2">
                        ${node.children.map(child => renderBookmarkNode(child)).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Show the form for adding/editing a bookmark
    async function showBookmarkForm(bookmark = null) {
        const isEditing = bookmark !== null;

        const allFolders = await api.getBookmarks({ type: 'folder' });

        const parentOptions = allFolders.map(folder =>
            `<option value="${folder._id}" ${isEditing && bookmark.parentId === folder._id ? 'selected' : ''}>${folder.title}</option>`
        ).join('');

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
                <div class="mb-3" id="bookmark-url-group" style="display: ${isEditing && bookmark.type === 'folder' ? 'none' : 'block'};">
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
            </form>
        `;

        formView.innerHTML = formHtml;
        mainView.style.display = 'none';
        formView.style.display = 'block';

        // Event listeners for the form
        const bookmarkForm = document.getElementById('bookmark-form');
        const bookmarkTypeSelect = document.getElementById('bookmark-type');
        const urlGroup = document.getElementById('bookmark-url-group');

        bookmarkTypeSelect.addEventListener('change', () => {
            urlGroup.style.display = bookmarkTypeSelect.value === 'folder' ? 'none' : 'block';
        });

        document.getElementById('cancel-btn').addEventListener('click', () => {
            formView.style.display = 'none';
            mainView.style.display = 'block';
        });

        bookmarkForm.addEventListener('submit', async (e) => {
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
        });
    }

    // Expose actions to the global scope so they can be called from onclick attributes
    window.app = {
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

    addBtn.addEventListener('click', () => {
        switch (currentResource) {
            case 'bookmarks':
                showBookmarkForm();
                break;
            // Add cases for other resources
        }
    });
});
