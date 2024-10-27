// Configuration
const CONFIG = {
    csvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRejUBQCi2XvKxDyrffK2jLZ3BCFBP0D2gCJ17CgChmvaf4GQ1-oACta3DzmOQhdOtwg57ExSVUWMGs/pub?output=csv',
    articlesPerPage: 12,
    defaultFilters: {
        date: {
            start: null,
            end: null
        }
    },
};

// State management
const state = {
    currentPage: 1,
    allArticles: [],
    filteredArticles: [],
    loadedArticleContents: new Map() // Cache for loaded article contents
};

// DOM Elements
const elements = {
    searchInput: document.getElementById('searchInput'),
    articlesContainer: document.getElementById('articlesContainer'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    resultsCount: document.getElementById('resultsCount'),
    pagination: document.getElementById('pagination'),
    modal: {
        container: document.getElementById('articleModal'),
        title: document.querySelector('#articleModal .modal-title'),
        content: document.getElementById('articleContent'),
    }
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    loadArticles();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    elements.searchInput.addEventListener('input', debounce(applyFilters, 300));
}

// Articles Loading
function loadArticles() {
    showLoading(true);
    
    Papa.parse(CONFIG.csvUrl, {
        download: true,
        header: true,
        complete: (results) => {
            state.allArticles = results.data
                .filter(article => article.title && article.date)
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            state.filteredArticles = [...state.allArticles];
            displayArticles();
            showLoading(false);
        },
        error: (error) => {
            console.error('Error loading articles:', error);
            showError('Failed to load articles. Please try again later.');
            showLoading(false);
        }
    });
}

// Display Functions
function displayArticles() {
    if (state.filteredArticles.length === 0) {
        showNoResults();
        return;
    }

    const start = (state.currentPage - 1) * CONFIG.articlesPerPage;
    const end = Math.min(start + CONFIG.articlesPerPage, state.filteredArticles.length);
    const articlesToShow = state.filteredArticles.slice(start, end);

    const html = `
        <div class="row g-4">
            ${articlesToShow.map(article => createArticleCard(article)).join('')}
        </div>
    `;

    elements.articlesContainer.innerHTML = html;
    updateResultsCount();
    updatePagination();
}

function createArticleCard(article) {
    const date = new Date(article.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return `
        <div class="col-md-6 col-lg-4">
            <div class="card h-100 shadow-sm hover:shadow-lg transition-all duration-300">
                <div class="card-body p-4">
                    <h5 class="card-title fs-4 mb-3">${article.title}</h5>
                    <p class="card-text text-muted mb-3">
                        <i class="fas fa-calendar-alt me-2"></i>${date}
                    </p>
                    <div class="mt-auto">
                        <button 
                            class="btn btn-outline-primary w-100" 
                            onclick="showArticleDetails('${encodeURIComponent(JSON.stringify(article))}')">
                            Read Article
                            <i class="fas fa-arrow-right ms-2"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function showArticleDetails(articleJSON) {
    try {
        const article = JSON.parse(decodeURIComponent(articleJSON));
        
        // Show modal with loading state
        elements.modal.title.textContent = article.title;
        elements.modal.content.innerHTML = '<div class="text-center py-5"><div class="spinner-border" role="status"></div></div>';
        
        const modal = new bootstrap.Modal(elements.modal.container);
        modal.show();

        // Check if content is already cached
        if (state.loadedArticleContents.has(article.article)) {
            elements.modal.content.innerHTML = state.loadedArticleContents.get(article.article);
            return;
        }

        // Load content
        const response = await fetch(article.article);
        if (!response.ok) throw new Error('Failed to fetch article content');
        
        const content = await response.text();
        
        // Cache the content
        state.loadedArticleContents.set(article.article, content);
        
        // Update modal content
        elements.modal.content.innerHTML = content;
        
    } catch (error) {
        console.error('Error showing article details:', error);
        elements.modal.content.innerHTML = `
            <div class="alert alert-danger">
                Failed to load article content. Please try again later.
            </div>
        `;
    }
}

// Filter and Search Functions
function applyFilters() {
    const searchQuery = elements.searchInput.value.toLowerCase().trim();

    if (!searchQuery) {
        state.filteredArticles = [...state.allArticles];
    } else {
        state.filteredArticles = state.allArticles.filter(article => {
            return article.title.toLowerCase().includes(searchQuery);
        });
    }

    state.currentPage = 1;
    displayArticles();
}

function updateResultsCount() {
    const searchQuery = elements.searchInput.value.trim();
    
    if (searchQuery) {
        elements.resultsCount.innerHTML = `
            <div class="alert alert-info">
                Found ${state.filteredArticles.length} article${state.filteredArticles.length !== 1 ? 's' : ''}
            </div>
        `;
    } else {
        elements.resultsCount.innerHTML = '';
    }
}

function updatePagination() {
    const totalPages = Math.ceil(state.filteredArticles.length / CONFIG.articlesPerPage);
    
    if (totalPages <= 1) {
        elements.pagination.innerHTML = '';
        return;
    }
    
    elements.pagination.innerHTML = Array.from({ length: totalPages }, (_, i) => i + 1)
        .map(page => `
            <li class="page-item ${page === state.currentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${page}">${page}</a>
            </li>
        `).join('');

    elements.pagination.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            changePage(parseInt(e.target.dataset.page));
        });
    });
}

function showNoResults() {
    elements.articlesContainer.innerHTML = `
        <div class="col-12">
            <div class="alert alert-warning">
                No articles found matching your criteria.
            </div>
        </div>
    `;
    updateResultsCount();
    updatePagination();
}

function changePage(page) {
    state.currentPage = page;
    displayArticles();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Utility Functions
function showError(message) {
    elements.articlesContainer.innerHTML = `
        <div class="col-12">
            <div class="alert alert-danger">${message}</div>
        </div>
    `;
}

function showLoading(show) {
    elements.loadingIndicator.style.display = show ? 'block' : 'none';
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Optional: Add keyboard navigation for pagination
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' && state.currentPage > 1) {
        changePage(state.currentPage - 1);
    } else if (e.key === 'ArrowRight' && state.currentPage < Math.ceil(state.filteredArticles.length / CONFIG.articlesPerPage)) {
        changePage(state.currentPage + 1);
    }
});
