// Configuration
const CONFIG = {
    csvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRejUBQCi2XvKxDyrffK2jLZ3BCFBP0D2gCJ17CgChmvaf4GQ1-oACta3DzmOQhdOtwg57ExSVUWMGs/pub?output=csv',
    articlesPerPage: 24
};

// State management
const state = {
    currentPage: 1,
    allArticles: [],
    filteredArticles: []
};

// DOM Elements
const elements = {
    searchInput: document.getElementById('searchInput'),
    articlesContainer: document.getElementById('articlesContainer'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    resultsCount: document.getElementById('resultsCount'),
    pagination: document.getElementById('pagination'),
    mainContent: document.getElementById('mainContent'),
    errorDisplay: document.getElementById('errorDisplay'),
    errorMessage: document.getElementById('errorMessage')
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    try {
        validateElements();
        loadArticles();
        setupEventListeners();
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize the application. Please refresh the page or contact support.');
    }
});

// Event Listeners
function setupEventListeners() {
    elements.searchInput.addEventListener('input', debounce(applyFilters, 300));
    elements.pagination.addEventListener('click', handlePaginationClick);
}

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

// Articles Loading
function loadArticles() {
    showLoading(true);
    
    Papa.parse(CONFIG.csvUrl, {
        download: true,
        header: true,
        complete: (results) => {
            state.allArticles = results.data
                .filter(article => article.title)
                .sort((a, b) => {
                    // Sort by date, most recent first
                    return new Date(b.date || 0) - new Date(a.date || 0);
                });
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
    elements.errorDisplay.style.display = 'none';
    elements.mainContent.style.display = 'block';

    if (state.filteredArticles.length === 0) {
        showNoResults();
        return;
    }

    const start = (state.currentPage - 1) * CONFIG.articlesPerPage;
    const end = Math.min(start + CONFIG.articlesPerPage, state.filteredArticles.length);
    const articlesToShow = state.filteredArticles.slice(start, end);

    elements.articlesContainer.innerHTML = articlesToShow.map(createArticleCard).join('');
    updateResultsCount();
    updatePagination();
}

function createArticleCard(article) {
    const title = article.title || 'Unknown Title';
    const description = article.description || '';
    const date = article.date ? new Date(article.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }) : 'No date';
    const articleUrl = article['en article'] || article['ku article'] || '#';

    return `
        <div class="col-md-4 mb-4">
            <div class="card h-100 shadow-sm hover:shadow-lg transition-all duration-300">
                <div class="card-body d-flex flex-column p-4">
                    <h5 class="card-title fs-4 mb-2 text-truncate">${title}</h5>
                    <p class="card-text text-muted mb-3">
                        <i class="fas fa-calendar-alt me-2"></i>${date}
                    </p>
                    ${description ? `
                        <p class="card-text text-muted mb-3">${description}</p>
                    ` : ''}
                    <div class="mt-auto">
                        <a href="${articleUrl}" 
                           target="_blank" 
                           rel="noopener noreferrer" 
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

    if (!searchQuery) {
        state.filteredArticles = [...state.allArticles];
    } else {
        state.filteredArticles = state.allArticles.filter(article => {
            return article.title?.toLowerCase().includes(searchQuery) ||
                   article.description?.toLowerCase().includes(searchQuery);
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
                <i class="fas fa-search me-2"></i>Found ${state.filteredArticles.length} 
                article${state.filteredArticles.length !== 1 ? 's' : ''}
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
}

function handlePaginationClick(event) {
    if (event.target.classList.contains('page-link')) {
        event.preventDefault();
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

function showNoResults() {
    elements.articlesContainer.innerHTML = `
        <div class="col-12">
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                No articles found matching your criteria. Try adjusting your search.
            </div>
        </div>
    `;
    elements.pagination.innerHTML = '';
    updateResultsCount();
}

function showError(message) {
    if (elements.errorDisplay && elements.errorMessage) {
        elements.errorMessage.textContent = message;
        elements.errorDisplay.style.display = 'block';
        elements.mainContent.style.display = 'none';
    }
}

function showLoading(show) {
    if (elements.loadingIndicator) {
        elements.loadingIndicator.style.display = show ? 'block' : 'none';
        if (elements.articlesContainer) {
            elements.articlesContainer.style.display = show ? 'none' : 'block';
        }
    }
}

// Utility Functions
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
