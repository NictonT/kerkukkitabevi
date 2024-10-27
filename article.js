// Configuration
const CONFIG = {
    csvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRejUBQCi2XvKxDyrffK2jLZ3BCFBP0D2gCJ17CgChmvaf4GQ1-oACta3DzmOQhdOtwg57ExSVUWMGs/pub?output=csv',
    articlesPerPage: 12,
    defaultFilters: {
        date: {
            start: null,
            end: null
        }
    }
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
    
    // Add keypress event for search input
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            applyFilters();
        }
    });
}

// Articles Loading
function loadArticles() {
    showLoading(true);
    
    Papa.parse(CONFIG.csvUrl, {
        download: true,
        header: true,
        complete: (results) => {
            // Filter out any rows that don't have the required data
            state.allArticles = results.data
                .filter(article => {
                    // Check if the row has all required fields and they're not empty
                    return article && 
                           article.title && 
                           article.title.trim() !== '' && 
                           article.date && 
                           article.date.trim() !== '' && 
                           article.article && 
                           article.article.trim() !== '';
                })
                .sort((a, b) => new Date(b.date) - new Date(a.date));

            console.log('Loaded articles:', state.allArticles); // Debug log
            
            if (state.allArticles.length > 0) {
                state.filteredArticles = [...state.allArticles];
                displayArticles();
            } else {
                showError('No articles available. Please check back later.');
            }
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
    if (!state.filteredArticles || state.filteredArticles.length === 0) {
        showNoResults();
        return;
    }

    const start = (state.currentPage - 1) * CONFIG.articlesPerPage;
    const end = Math.min(start + CONFIG.articlesPerPage, state.filteredArticles.length);
    const articlesToShow = state.filteredArticles.slice(start, end);

    if (articlesToShow.length === 0) {
        showNoResults();
        return;
    }

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

async function fetchArticleContent(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch article content');
        const html = await response.text();
        
        // Extract the content from the Google Docs HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Try different possible content selectors
        const content = doc.querySelector('#contents') || 
                       doc.querySelector('.doc-content') || 
                       doc.querySelector('body');
        
        return content ? content.innerHTML : html;
    } catch (error) {
        console.error('Error fetching article:', error);
        throw error;
    }
}

async function showArticleDetails(articleJSON) {
    try {
        const article = JSON.parse(decodeURIComponent(articleJSON));
        
        // Show modal with loading state
        elements.modal.title.textContent = article.title;
        elements.modal.content.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;
        
        const modal = new bootstrap.Modal(elements.modal.container);
        modal.show();

        // Check if content is already cached
        if (state.loadedArticleContents.has(article.article)) {
            elements.modal.content.innerHTML = state.loadedArticleContents.get(article.article);
            return;
        }

        // Fetch and process the content
        const content = await fetchArticleContent(article.article);
        
        // Style the content
        const styledContent = `
            <div class="article-content">
                <style>
                    .article-content {
                        font-family: 'Open Sans', sans-serif;
                        line-height: 1.6;
                        color: #333;
                        padding: 1rem;
                    }
                    .article-content img {
                        max-width: 100%;
                        height: auto;
                        margin: 1rem 0;
                    }
                    .article-content h1, .article-content h2, .article-content h3 {
                        margin-top: 1.5rem;
                        margin-bottom: 1rem;
                    }
                    .article-content p {
                        margin-bottom: 1rem;
                    }
                    .article-content ul, .article-content ol {
                        margin-bottom: 1rem;
                        padding-left: 2rem;
                    }
                </style>
                ${content}
            </div>
        `;
        
        // Cache the content
        state.loadedArticleContents.set(article.article, styledContent);
        
        // Update modal content
        elements.modal.content.innerHTML = styledContent;
        
    } catch (error) {
        console.error('Error showing article details:', error);
        elements.modal.content.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle me-2"></i>
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
            const titleMatch = article.title?.toLowerCase().includes(searchQuery);
            const dateMatch = article.date?.toLowerCase().includes(searchQuery);
            return titleMatch || dateMatch;
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
                <i class="fas fa-search me-2"></i>
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
    
    elements.pagination.innerHTML = `
        <li class="page-item ${state.currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${state.currentPage - 1}">
                <i class="fas fa-chevron-left"></i>
            </a>
        </li>
        ${Array.from({ length: totalPages }, (_, i) => i + 1)
            .map(page => `
                <li class="page-item ${page === state.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${page}">${page}</a>
                </li>
            `).join('')}
        <li class="page-item ${state.currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${state.currentPage + 1}">
                <i class="fas fa-chevron-right"></i>
            </a>
        </li>
    `;

    elements.pagination.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(e.target.closest('.page-link').dataset.page);
            if (!isNaN(page)) {
                changePage(page);
            }
        });
    });
}

// Error and Results Display
function showError(message) {
    elements.articlesContainer.innerHTML = `
        <div class="col-12">
            <div class="alert alert-danger" role="alert">
                <i class="fas fa-exclamation-circle me-2"></i>
                ${message}
            </div>
        </div>
    `;
    elements.resultsCount.innerHTML = '';
    elements.pagination.innerHTML = '';
}

function showNoResults() {
    elements.articlesContainer.innerHTML = `
        <div class="col-12">
            <div class="alert alert-info" role="alert">
                <i class="fas fa-info-circle me-2"></i>
                No articles found matching your search criteria. Please try a different search term.
            </div>
            <button class="btn btn-outline-primary mt-3" onclick="resetSearch()">
                <i class="fas fa-redo me-2"></i>Show all articles
            </button>
        </div>
    `;
    elements.pagination.innerHTML = '';
}

// Utility Functions
function resetSearch() {
    elements.searchInput.value = '';
    state.filteredArticles = [...state.allArticles];
    state.currentPage = 1;
    displayArticles();
}

function changePage(page) {
    state.currentPage = page;
    displayArticles();
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
