// Configuration
const CONFIG = {
    csvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRejUBQCi2XvKxDyrffK2jLZ3BCFBP0D2gCJ17CgChmvaf4GQ1-oACta3DzmOQhdOtwg57ExSVUWMGs/pub?output=csv',
    articlesPerPage: 24,
    paths: {
        articleBase: '/article'
    }
};

// State management
const state = {
    currentPage: 1,
    allArticles: [],
    filteredArticles: [],
    isLoading: false
};

// DOM Elements
const elements = {
    searchInput: document.getElementById('searchInput'),
    articlesContainer: document.getElementById('articlesContainer'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    resultsCount: document.getElementById('resultsCount'),
    pagination: document.getElementById('pagination')
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    try {
        validateElements();
        handleRouting();
        setupEventListeners();
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize the application. Please refresh the page or contact support.');
    }
});

// Validation
function validateElements() {
    const missingElements = [];
    for (const [key, element] of Object.entries(elements)) {
        if (!element) {
            missingElements.push(key);
        }
    }

    if (missingElements.length > 0) {
        throw new Error(`Required DOM elements missing: ${missingElements.join(', ')}`);
    }
}

// Event Listeners
function setupEventListeners() {
    elements.searchInput.addEventListener('input', debounce(applyFilters, 300));
    elements.pagination.addEventListener('click', handlePaginationClick);
}

// Routing
function handleRouting() {
    const path = window.location.pathname;
    const articleMatch = path.match(/\/article\/(\d+)$/);

    if (articleMatch) {
        const articleId = articleMatch[1];
        handleArticleRoute(articleId);
    } else {
        loadArticles();
    }
}

async function handleArticleRoute(articleId) {
    showLoading(true);
    try {
        const articles = await loadAllArticles();
        const article = articles.find(a => a.id === articleId);
        
        if (article && article['en article']) {
            window.location.href = article['en article'];
        } else {
            showError('Article not found');
        }
    } catch (error) {
        console.error('Error loading article:', error);
        showError('Failed to load article. Please try again later.');
    } finally {
        showLoading(false);
    }
}

// Articles Loading
async function loadArticles() {
    if (state.isLoading) return;
    
    showLoading(true);
    try {
        await loadAllArticles();
        displayArticles();
    } catch (error) {
        console.error('Error loading articles:', error);
        showError('Failed to load articles. Please try again later.');
    } finally {
        showLoading(false);
    }
}

function loadAllArticles() {
    return new Promise((resolve, reject) => {
        if (state.allArticles.length > 0) {
            resolve(state.allArticles);
            return;
        }

        state.isLoading = true;

        Papa.parse(CONFIG.csvUrl, {
            download: true,
            header: true,
            complete: (results) => {
                state.allArticles = results.data
                    .filter(article => article.title && article.id && article['en article'])
                    .map(article => ({
                        ...article,
                        date: article.date ? new Date(article.date) : null
                    }))
                    .sort((a, b) => (b.date || 0) - (a.date || 0));
                
                state.filteredArticles = [...state.allArticles];
                state.isLoading = false;
                resolve(state.allArticles);
            },
            error: (error) => {
                state.isLoading = false;
                reject(error);
            }
        });
    });
}

// Display Functions
function displayArticles() {
    if (!elements.articlesContainer) return;
    
    if (state.filteredArticles.length === 0) {
        showNoResults();
        return;
    }

    const start = (state.currentPage - 1) * CONFIG.articlesPerPage;
    const end = Math.min(start + CONFIG.articlesPerPage, state.filteredArticles.length);
    const articlesToShow = state.filteredArticles.slice(start, end);

    const html = `
        <div class="row g-4">
            ${articlesToShow.map(createArticleCard).join('')}
        </div>
    `;

    elements.articlesContainer.innerHTML = html;
    updateResultsCount();
    updatePagination();
}

function createArticleCard(article) {
    const title = article.title || 'Unknown Title';
    const date = article.date ? formatDate(article.date) : 'No date';
    const description = article.description ? truncateText(article.description, 150) : '';

    return `
        <div class="col-md-4 mb-4">
            <div class="card h-100 shadow-sm hover:shadow-lg transition-all duration-300">
                <div class="card-body d-flex flex-column p-4">
                    <h5 class="card-title fs-4 mb-2">${escapeHtml(title)}</h5>
                    <p class="card-text text-muted mb-2">
                        <i class="fas fa-calendar-alt me-2"></i>${date}
                    </p>
                    ${description ? `
                        <p class="card-text text-muted mb-3">${escapeHtml(description)}</p>
                    ` : ''}
                    <div class="mt-auto">
                        <a href="${CONFIG.paths.articleBase}/${article.id}" 
                           class="btn btn-outline-primary mt-auto w-100">
                            Read Article
                            <i class="fas fa-arrow-right ms-2"></i>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Filter Functions
function applyFilters() {
    const searchQuery = elements.searchInput.value.toLowerCase().trim();

    state.filteredArticles = state.allArticles.filter(article => {
        if (!searchQuery) return true;
        
        return (
            article.title?.toLowerCase().includes(searchQuery) ||
            article.description?.toLowerCase().includes(searchQuery)
        );
    });

    state.currentPage = 1;
    displayArticles();
}

// Utility Functions
function formatDate(date) {
    if (!(date instanceof Date)) return 'No date';
    
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substr(0, maxLength).trim() + '...';
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// UI State Functions
function showLoading(show) {
    if (elements.loadingIndicator) {
        elements.loadingIndicator.style.display = show ? 'block' : 'none';
    }
    if (elements.articlesContainer) {
        elements.articlesContainer.style.opacity = show ? '0.5' : '1';
    }
}

function showError(message) {
    const errorHtml = `
        <div class="alert alert-danger" role="alert">
            <i class="fas fa-exclamation-circle me-2"></i>${escapeHtml(message)}
        </div>
    `;
    
    if (elements.articlesContainer) {
        elements.articlesContainer.innerHTML = errorHtml;
    }
}

function showNoResults() {
    const noResultsHtml = `
        <div class="col-12">
            <div class="alert alert-warning">
                <i class="fas fa-search me-2"></i>No articles found matching your criteria. 
                Try adjusting your search.
            </div>
        </div>
    `;
    
    elements.articlesContainer.innerHTML = noResultsHtml;
    updateResultsCount();
    updatePagination();
}

// Pagination Functions
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
}

function handlePaginationClick(event) {
    event.preventDefault();
    if (event.target.classList.contains('page-link')) {
        const page = parseInt(event.target.dataset.page);
        if (page && page !== state.currentPage) {
            changePage(page);
        }
    }
}

function changePage(page) {
    state.currentPage = page;
    displayArticles();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateResultsCount() {
    const searchQuery = elements.searchInput.value.trim();
    
    if (searchQuery) {
        elements.resultsCount.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-filter me-2"></i>Found ${state.filteredArticles.length} 
                article${state.filteredArticles.length !== 1 ? 's' : ''}
            </div>
        `;
    } else {
        elements.resultsCount.innerHTML = '';
    }
}
