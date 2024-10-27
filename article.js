// Configuration
const CONFIG = {
    csvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRejUBQCi2XvKxDyrffK2jLZ3BCFBP0D2gCJ17CgChmvaf4GQ1-oACta3DzmOQhdOtwg57ExSVUWMGs/pub?output=csv',
    articlesPerPage: 24,
};

// State management
const state = {
    currentPage: 1,
    allArticles: [],
    filteredArticles: [],
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
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check if we're on an article page
        const path = window.location.pathname;
        const match = path.match(/\/article\/(\d+)$/);
        
        if (match) {
            const articleId = match[1];
            await handleArticleRoute(articleId);
        } else {
            await loadArticles();
            setupEventListeners();
        }
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize the application');
    }
});

// Event Listeners
function setupEventListeners() {
    elements.searchInput.addEventListener('input', debounce(applyFilters, 300));
}

// Article routing
async function handleArticleRoute(articleId) {
    showLoading(true);
    try {
        const article = await findArticleById(articleId);
        if (article && article['en article']) {
            // Redirect to the Google Doc
            window.location.href = article['en article'];
        } else {
            showError('Article not found');
        }
    } catch (error) {
        console.error('Error loading article:', error);
        showError('Failed to load article');
    }
}

async function findArticleById(articleId) {
    const articles = await loadAllArticles();
    return articles.find(article => article.id === articleId);
}

// Articles Loading
function loadAllArticles() {
    return new Promise((resolve, reject) => {
        if (state.allArticles.length > 0) {
            resolve(state.allArticles);
            return;
        }

        Papa.parse(CONFIG.csvUrl, {
            download: true,
            header: true,
            complete: (results) => {
                state.allArticles = results.data
                    .filter(article => article.title && article.id && article['en article'])
                    .sort((a, b) => new Date(b.date) - new Date(a.date));
                state.filteredArticles = [...state.allArticles];
                resolve(state.allArticles);
            },
            error: reject
        });
    });
}

async function loadArticles() {
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
    const title = article.title || 'Unknown Title';
    const date = article.date ? new Date(article.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }) : 'No date';

    return `
        <div class="col-md-4 mb-4">
            <div class="card h-100 shadow-sm hover:shadow-lg transition-all duration-300">
                <div class="card-body d-flex flex-column p-4">
                    <h5 class="card-title fs-4 mb-2">${title}</h5>
                    <p class="card-text text-muted mb-3">
                        <i class="fas fa-calendar-alt me-2"></i>${date}
                    </p>
                    <div class="mt-auto">
                        <a href="/article/${article.id}" 
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

// Filter and search functions
function applyFilters() {
    const searchQuery = elements.searchInput.value.toLowerCase().trim();

    if (!searchQuery) {
        state.filteredArticles = [...state.allArticles];
    } else {
        state.filteredArticles = state.allArticles.filter(article => {
            return article.title?.toLowerCase().includes(searchQuery);
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
                No articles found matching your criteria. Try adjusting your search.
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

function showError(message) {
    if (elements.errorDisplay && elements.errorMessage) {
        elements.errorMessage.textContent = message;
        elements.errorDisplay.style.display = 'block';
        elements.articlesContainer.style.display = 'none';
        elements.pagination.style.display = 'none';
        elements.resultsCount.style.display = 'none';
    }
}

function showLoading(show) {
    if (elements.loadingIndicator) {
        elements.loadingIndicator.style.display = show ? 'block' : 'none';
    }
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
