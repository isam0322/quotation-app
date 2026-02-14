document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const addQuoteBtn = document.getElementById('add-quote-btn');
    const searchToggleBtn = document.getElementById('search-toggle-btn');
    // const searchSection = document.getElementById('search-section'); // Defined below
    const searchInput = document.getElementById('search-input');
    const searchScope = document.getElementById('search-scope'); // NEW
    const clearSearchBtn = document.getElementById('clear-search');
    const filterChips = document.querySelectorAll('.filter-chip');

    const authorList = document.getElementById('author-list'); // NEW
    const tagList = document.getElementById('tag-list'); // NEW

    const modal = document.getElementById('quote-modal');
    const closeModalBtns = document.querySelectorAll('.close-modal, .close-modal-btn');
    const quoteForm = document.getElementById('quote-form');

    const quotesList = document.getElementById('quotes-list');

    // --- State ---
    let quotes = JSON.parse(localStorage.getItem('quotes')) || [];
    // Comprehensive default folders
    const defaultFolders = [
        '心に響く', 'アイデア', '仕事', '人間関係',
        '恋愛・結婚', 'ビジネス・起業', 'お金・投資', '健康・メンタル',
        '勇気', '癒し', '戒め', '笑い・ユーモア', 'モチベーション',
        '本・小説', '映画・ドラマ', 'アニメ・漫画', '歌詞',
        '自分の言葉', 'その他'
    ];

    let storedFolders = JSON.parse(localStorage.getItem('folders'));
    // Migration: If no folders or only old defaults (<= 4 items), replace with new full list
    let folders;
    if (!storedFolders || storedFolders.length <= 4) {
        folders = defaultFolders;
        localStorage.setItem('folders', JSON.stringify(folders)); // Auto-save new defaults
    } else {
        folders = storedFolders;
    }
    let state = {
        filterType: 'all', // all, favorites, folder, author, tag
        filterValue: 'all', // 'all', 'ID_OF_FOLDER', 'Steve Jobs', etc.
        category: 'all', // from chips (legacy compatibility, maybe map to folders later?)
        searchQuery: '',
        searchScope: 'all' // all, content, author, tag
    };

    // --- DOM Elements for Folders ---
    const folderList = document.getElementById('folder-list');
    const folderSelect = document.getElementById('folder-select');
    const addFolderBtn = document.getElementById('add-folder-btn');
    const quickAddFolderBtn = document.getElementById('quick-add-folder-btn');

    // --- Event Listeners ---
    addQuoteBtn.addEventListener('click', () => openModal());
    closeModalBtns.forEach(btn => btn.addEventListener('click', closeModalFunc));
    modal.addEventListener('click', (e) => {
        if (e.target === document.querySelector('.modal-backdrop')) closeModalFunc();
    });

    // Folder Creation
    const createFolderHandler = () => {
        const name = prompt('新しいフォルダ名を入力してください:');
        if (name && name.trim()) {
            if (!folders.includes(name.trim())) {
                folders.push(name.trim());
                saveFolders();
                updateSidebar(); // Re-render sidebar
                updateFolderSelect(); // Re-render dropdown
            } else {
                alert('そのフォルダ名は既に存在します');
            }
        }
    };

    if (addFolderBtn) addFolderBtn.addEventListener('click', createFolderHandler);
    if (quickAddFolderBtn) quickAddFolderBtn.addEventListener('click', createFolderHandler);

    // Toggle Search Section
    searchToggleBtn.addEventListener('click', () => {
        const section = document.getElementById('search-section');
        section.classList.toggle('hidden');
        searchToggleBtn.classList.toggle('active');
        if (!section.classList.contains('hidden')) searchInput.focus();
    });

    // Search Input
    searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase();
        clearSearchBtn.classList.toggle('hidden', state.searchQuery === '');
        renderQuotes();
    });

    // Search Scope
    searchScope.addEventListener('change', (e) => {
        state.searchScope = e.target.value;
        renderQuotes();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        state.searchQuery = '';
        clearSearchBtn.classList.add('hidden');
        searchInput.focus();
        renderQuotes();
    });

    // Filter Chips (Categories) - Keeping for now as "Tags" or secondary filter
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            state.category = chip.dataset.category;
            renderQuotes();
        });
    });

    // Sidebar & Navigation
    function bindSidebarEvents() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                // Remove active from all nav items
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');

                // Update state
                state.filterType = item.dataset.type;
                state.filterValue = item.dataset.value;

                // Reset category chips on main view change
                if (state.filterType !== 'all') {
                    state.category = 'all';
                    filterChips.forEach(c => c.classList.remove('active'));
                    document.querySelector('.filter-chip[data-category="all"]').classList.add('active');
                }

                renderQuotes();

                // Mobile: Scroll to content
                if (window.innerWidth <= 900) {
                    document.querySelector('.content-area').scrollIntoView({ behavior: 'smooth' });
                    // Also close sidebar on mobile if it was open (Library view)
                    const sidebar = document.querySelector('.sidebar');
                    if (sidebar.classList.contains('mobile-visible')) {
                        document.querySelector('.nav-btn[data-target="home"]').click(); // Simulate home click to return
                    }
                }
            });
        });
    }

    // Form Submit
    quoteForm.addEventListener('submit', handleFormSubmit);

    // --- Functions ---
    function saveFolders() {
        localStorage.setItem('folders', JSON.stringify(folders));
    }

    function updateFolderSelect() {
        // Current value
        const currentVal = folderSelect.value;
        folderSelect.innerHTML = `<option value="">(未分類)</option>` +
            folders.map(f => `<option value="${f}">${f}</option>`).join('');

        // Restore value if exists
        if (folders.includes(currentVal)) {
            folderSelect.value = currentVal;
        }
    }

    function openModal(quoteId = null) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        updateFolderSelect(); // Ensure dropdown is up to date

        if (quoteId) {
            // Compare as strings to be safe (attributes are strings)
            const quote = quotes.find(q => String(q.id) === String(quoteId));
            if (quote) {
                document.getElementById('modal-title').innerText = '言葉を編集する';
                document.getElementById('quote-id').value = quote.id;
                document.getElementById('content').value = quote.content;
                document.getElementById('author').value = quote.author || '';
                document.getElementById('source').value = quote.source || '';

                // Map legacy category to folder if possible, or use new folder prop
                document.getElementById('folder-select').value = quote.folder || '';

                document.getElementById('tags').value = quote.tags ? quote.tags.join(', ') : '';
                document.getElementById('note').value = quote.note || '';
            }
        } else {
            document.getElementById('modal-title').innerText = '言葉を記録する';
            quoteForm.reset();
            document.getElementById('quote-id').value = '';
            // If currently viewing a folder, default to that folder
            if (state.filterType === 'folder') {
                document.getElementById('folder-select').value = state.filterValue;
            }
        }
    }

    function closeModalFunc() {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    function handleFormSubmit(e) {
        e.preventDefault();

        const quoteId = document.getElementById('quote-id').value;
        const form = e.target;

        const newQuote = {
            id: quoteId || Date.now().toString(),
            content: form.content.value,
            author: form.author.value,
            source: form.source.value,
            folder: document.getElementById('folder-select').value, // NEW
            category: 'General', // Legacy support
            tags: form.tags.value.split(',').map(t => t.trim()).filter(t => t),
            note: form.note.value,
            updatedAt: Date.now(),
            createdAt: quoteId ? quotes.find(q => q.id === quoteId).createdAt : Date.now(),
            isFavorite: false // Preserve if editing? Should fix this logic
        };

        if (quoteId) {
            const index = quotes.findIndex(q => q.id === quoteId);
            newQuote.isFavorite = quotes[index].isFavorite;
            quotes[index] = newQuote;
        } else {
            quotes.unshift(newQuote);
        }

        saveToLocalStorage();
        updateSidebar();
        renderQuotes();
        closeModalFunc();
    }

    function saveToLocalStorage() {
        localStorage.setItem('quotes', JSON.stringify(quotes));
    }

    function deleteQuote(id) {
        if (confirm('この名言を削除してもよろしいですか？')) {
            quotes = quotes.filter(q => q.id !== id);
            saveToLocalStorage();
            updateSidebar();
            renderQuotes();
        }
    }

    // --- Sidebar Rendering ---
    function updateSidebar() {
        // 0. Folders
        folderList.innerHTML = folders.map(folder => `
            <li class="nav-item" data-type="folder" data-value="${folder}">
                <i class="fas fa-folder"></i> ${folder}
            </li>
        `).join('');

        // 1. Authors
        const authors = [...new Set(quotes.map(q => q.author).filter(a => a))].sort();
        authorList.innerHTML = authors.map(author => `
            <li class="nav-item" data-type="author" data-value="${author}">
                <i class="fas fa-user-pen"></i> ${author}
            </li>
        `).join('');

        // 2. Tags
        const allTags = quotes.flatMap(q => q.tags);
        const uniqueTags = [...new Set(allTags)].sort();
        tagList.innerHTML = uniqueTags.map(tag => `
            <li class="nav-item" data-type="tag" data-value="${tag}">
                <i class="fas fa-tag"></i> ${tag}
            </li>
        `).join('');

        // Re-bind events to new elements
        bindSidebarEvents();
    }

    window.handleDelete = deleteQuote;
    window.handleEdit = openModal;
    window.openModal = openModal; // Expose for inline onclick

    function renderQuotes() {
        let filtered = quotes;

        // 1. Sidebar Navigation Filter
        if (state.filterType === 'favorites') {
            filtered = filtered.filter(q => q.isFavorite);
        } else if (state.filterType === 'folder') {
            filtered = filtered.filter(q => q.folder === state.filterValue);
        } else if (state.filterType === 'author') {
            filtered = filtered.filter(q => q.author === state.filterValue);
        } else if (state.filterType === 'tag') {
            filtered = filtered.filter(q => q.tags.includes(state.filterValue));
        }

        // 2. Category Filter (Chips)
        if (state.category !== 'all') {
            filtered = filtered.filter(q => q.category === state.category);
        }

        // 3. Search Filter (with Scope)
        if (state.searchQuery) {
            const q = state.searchQuery;
            filtered = filtered.filter(item => {
                const matchContent = item.content.toLowerCase().includes(q);
                const matchAuthor = (item.author || '').toLowerCase().includes(q);
                const matchTag = item.tags.some(t => t.toLowerCase().includes(q));

                if (state.searchScope === 'all') return matchContent || matchAuthor || matchTag;
                if (state.searchScope === 'content') return matchContent;
                if (state.searchScope === 'author') return matchAuthor;
                if (state.searchScope === 'tag') return matchTag;
                return false;
            });
        }

        // Render
        if (filtered.length === 0) {
            let msg = '条件に一致する言葉が見つかりませんでした。';
            if (filtered.length === 0 && quotes.length === 0) msg = 'まだ記録がありません。';
            if (state.filterType === 'folder' && filtered.length === 0) msg = 'このフォルダは空です。';

            quotesList.innerHTML = `<div class="empty-state"><p>${msg}</p></div>`;
            return;
        }

        quotesList.innerHTML = filtered.map(quote => {
            const tagsHtml = quote.tags.length > 0
                ? `<div class="quote-tags">${quote.tags.map(t => `<span class="tag">#${t}</span>`).join('')}</div>`
                : '';

            // Show folder badge if not in folder view
            const folderBadge = (quote.folder && state.filterType !== 'folder')
                ? `<span class="tag" style="color: var(--accent-color); border: 1px solid var(--border-color); padding: 2px 6px; border-radius: 4px; margin-right: 8px;"><i class="fas fa-folder" style="margin-right:4px;"></i>${quote.folder}</span>`
                : '';

            return `
            <div class="quote-card">
                <div class="quote-content-wrapper">
                    <p class="quote-text">${quote.content}</p>
                    <div class="quote-meta">
                        ${quote.author ? `<span class="quote-author">${quote.author}</span>` : ''}
                        ${quote.source ? `<span class="quote-source">${quote.source}</span>` : ''}
                    </div>
                </div>
                <div class="quote-footer">
                    <div style="display:flex; align-items:center; gap: 0.5rem; flex-wrap:wrap;">
                        ${folderBadge}
                        ${tagsHtml}
                    </div>
                    <div class="card-actions">
                        <button onclick="handleEdit('${quote.id}')" class="card-action-btn edit"><i class="fas fa-edit"></i></button>
                        <button onclick="handleDelete('${quote.id}')" class="card-action-btn delete"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    // Initial Init
    updateSidebar();

    // Add default active state to "All"
    document.querySelector('.nav-item[data-type="all"]').classList.add('active');
    bindSidebarEvents(); // Bind for static elements

    renderQuotes();

    // --- Bottom Navigation Logic (Mobile) ---
    const bottomNavBtns = document.querySelectorAll('.bottom-nav .nav-btn');
    const mobileAddBtn = document.getElementById('mobile-add-btn');

    if (mobileAddBtn) {
        mobileAddBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent bubbling just in case
            console.log('Mobile Add Clicked');
            openModal();
        });
    }

    bottomNavBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = btn.dataset.target;
            if (!target) return; // Ignore add button here

            // Active State
            bottomNavBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // View Switching
            handleMobileViewSwitch(target);
        });
    });

    function handleMobileViewSwitch(target) {
        const sidebar = document.querySelector('.sidebar');
        const contentArea = document.querySelector('.content-area');
        const searchSection = document.getElementById('search-section');

        // Reset views
        sidebar.classList.remove('mobile-visible');
        contentArea.classList.remove('hidden');
        searchSection.classList.add('hidden');

        // Scroll to top
        window.scrollTo(0, 0);

        if (target === 'home') {
            // Show Quotes
        } else if (target === 'search') {
            searchSection.classList.remove('hidden');
            document.getElementById('search-input').focus();
        } else if (target === 'library') {
            // Show Sidebar overlay
            sidebar.classList.add('mobile-visible');
            contentArea.classList.add('hidden'); // Optional: hide content behind
        } else if (target === 'settings') {
            // todo
        }
    }

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                }, err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });
    }
});
