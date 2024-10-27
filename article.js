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

// Modal HTML
const modalHTML = `
<div class="modal fade" id="articleModal" tabindex="-1" aria-labelledby="articleModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="articleModalLabel"></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body"></div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>`;

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
    // Add modal to the page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
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
            console.log('Raw data:', results.data); // Debug log
            state.allArticles = results.data
                .filter(article => article.title)
                .sort((a, b) => {
                    // Sort by date (newest first)
                    return new Date(b.date) - new Date(a.date);
                });
            console.log('Filtered articles:', state.allArticles); // Debug log
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
                        <button 
                            class="btn btn-outline-primary mt-auto w-100" 
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

function showArticleDetails(articleJSON) {
    try {
        const article = JSON.parse(decodeURIComponent(articleJSON));
        const modalElement = document.getElementById('articleModal');
        const titleElement = modalElement.querySelector('.modal-title');
        const bodyElement = modalElement.querySelector('.modal-body');

        // Format the date
        const date = article.date ? new Date(article.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : 'No date';

        // Set the modal title
        titleElement.textContent = article.title;

        // Create the modal content
        bodyElement.innerHTML = `
            <div class="article-content">
                <div class="article-metadata mb-4">
                    <div class="text-muted">
                        <i class="fas fa-calendar-alt me-2"></i>${date}
                    </div>
                </div>
                <div class="article-text">
                    ${article.content || 'No content available.'}
                </div>
            </div>
        `;

        // Show the modal
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    } catch (error) {
        console.error('Error showing article details:', error);
    }
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

// Additional initialization on page load
document.addEventListener('DOMContentLoaded', () => {
    try {
        loadArticles();
        setupEventListeners();
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize the application. Please refresh the page or contact support.');
    }
});
