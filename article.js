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
                .filter(article => article.title)
                .sort((a, b) => {
                    // Sort by date (newest first)
                    return new Date(b.date) - new Date(a.date);
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

// Display Functions==================================================================================================
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
                            class="btn btn-outline-primary w-100 mb-2" 
                            onclick="showArticleDetails('${encodeURIComponent(JSON.stringify(article))}', this)">
                            Show More
                            <i class="fas fa-chevron-down ms-2"></i>
                        </button>
                        <div class="article-content collapse" id="article-${article.title.replace(/\s+/g, '-').toLowerCase()}">
                            <div class="card mt-3">
                                <div class="card-body">
                                    <div class="embed-responsive embed-responsive-16by9">
                                        <iframe class="embed-responsive-item w-100" 
                                                src="${article['en article']}" 
                                                style="height: 500px; border: none;">
                                        </iframe>
                                    </div>
                                    <div class="text-center mt-3">
                                        <a href="${article['en article']}" 
                                           target="_blank" 
                                           class="btn btn-sm btn-primary">
                                            Open in New Tab
                                            <i class="fas fa-external-link-alt ms-2"></i>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function showArticleDetails(articleJSON, buttonElement) {
    try {
        const article = JSON.parse(decodeURIComponent(articleJSON));
        const contentId = `article-${article.title.replace(/\s+/g, '-').toLowerCase()}`;
        const contentElement = document.getElementById(contentId);
        
        // Toggle the content visibility
        if (contentElement.classList.contains('show')) {
            contentElement.classList.remove('show');
            buttonElement.innerHTML = `Show More <i class="fas fa-chevron-down ms-2"></i>`;
        } else {
            contentElement.classList.add('show');
            buttonElement.innerHTML = `Show Less <i class="fas fa-chevron-up ms-2"></i>`;
        }

    } catch (error) {
        console.error('Error showing article details:', error);
    }
}

// Add this CSS to your stylesheet or in a style tag
const styles = `
    .collapse {
        display: none;
    }
    .collapse.show {
        display: block;
    }
    .card-body {
        transition: all 0.3s ease;
    }
    .article-content iframe {
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        border-radius: 4px;
    }
`;

// Add styles to document
const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);
// Filter and search ===========================================================================================================
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

// Keyboard navigation for pagination
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' && state.currentPage > 1) {
        changePage(state.currentPage - 1);
    } else if (e.key === 'ArrowRight' && state.currentPage < Math.ceil(state.filteredArticles.length / CONFIG.articlesPerPage)) {
        changePage(state.currentPage + 1);
    }
});
