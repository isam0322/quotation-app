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
    let state = {
        filterType: 'all', // all, favorites, author, tag
        filterValue: 'all', // 'all', 'Steve Jobs', 'life', etc.
        category: 'all', // from chips
        searchQuery: '',
        searchScope: 'all' // all, content, author, tag
    };

    // --- Event Listeners ---
    addQuoteBtn.addEventListener('click', () => openModal());
    closeModalBtns.forEach(btn => btn.addEventListener('click', closeModalFunc));
    modal.addEventListener('click', (e) => {
        if (e.target === document.querySelector('.modal-backdrop')) closeModalFunc();
    });

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

    // Filter Chips (Categories)
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

                // Reset other filters for clarity? Or keep them combinable?
                // For "Browse Mode", let's reset category chips to All for clarity
                if (state.filterType !== 'all') {
                    state.category = 'all';
                    filterChips.forEach(c => c.classList.remove('active'));
                    document.querySelector('.filter-chip[data-category="all"]').classList.add('active');
                }

                renderQuotes();

                // Mobile: Scroll to content
                if (window.innerWidth <= 900) {
                    document.querySelector('.content-area').scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }

    // Form Submit
    quoteForm.addEventListener('submit', handleFormSubmit);

    // --- Functions ---

    function openModal(quoteId = null) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        if (quoteId) {
            // Compare as strings to be safe (attributes are strings)
            const quote = quotes.find(q => String(q.id) === String(quoteId));
            if (quote) {
                document.getElementById('modal-title').innerText = '言葉を編集する';
                document.getElementById('quote-id').value = quote.id;
                document.getElementById('content').value = quote.content;
                document.getElementById('author').value = quote.author || '';
                document.getElementById('source').value = quote.source || '';
                document.getElementById('category').value = quote.category || 'General';
                document.getElementById('tags').value = quote.tags ? quote.tags.join(', ') : '';
                document.getElementById('note').value = quote.note || '';
            }
        } else {
            document.getElementById('modal-title').innerText = '言葉を記録する';
            quoteForm.reset();
            document.getElementById('quote-id').value = '';
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
            category: form.category.value,
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
        updateSidebar(); // Re-render sidebar to show new authors/tags
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

    function renderQuotes() {
        let filtered = quotes;

        // 1. Sidebar Navigation Filter
        if (state.filterType === 'favorites') {
            filtered = filtered.filter(q => q.isFavorite);
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

            quotesList.innerHTML = `<div class="empty-state"><p>${msg}</p></div>`;
            return;
        }

        quotesList.innerHTML = filtered.map(quote => {
            const tagsHtml = quote.tags.length > 0
                ? `<div class="quote-tags">${quote.tags.map(t => `<span class="tag">#${t}</span>`).join('')}</div>`
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
                    ${tagsHtml}
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
