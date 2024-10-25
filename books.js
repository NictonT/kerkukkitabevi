// Configuration
const CONFIG = {
    csvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSj1Fu63OoSDb2xQxAp16xDzddkIgzb4LLRg-fcgjEKJOi0FRI70vrszirPU8UIeo3unSMHmGP8X9Ro/pub?output=csv',
    booksPerPage: 25,
    defaultFilters: {
        age: { min: 10, max: 18 },
        price: { min: 250, max: 50000 }
    }
};

// State management
const state = {
    currentPage: 1,
    allBooks: [],
    filteredBooks: [],
};

// DOM Elements
const elements = {
    searchInput: document.getElementById('searchInput'),
    booksContainer: document.getElementById('booksContainer'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    resultsCount: document.getElementById('resultsCount'),
    pagination: document.getElementById('pagination'),
    filters: {
        ageMin: document.getElementById('ageRangeMin'),
        ageMax: document.getElementById('ageRangeMax'),
        priceMin: document.getElementById('priceRangeMin'),
        priceMax: document.getElementById('priceRangeMax'),
        applyButton: document.getElementById('applyFiltersBtn')
    }
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    loadBooks();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    elements.searchInput.addEventListener('input', debounce(applyFilters, 300));
    elements.filters.applyButton.addEventListener('click', applyFilters);
    elements.booksContainer.addEventListener('click', handleBookInteractions);
}

// Books Loading
function loadBooks() {
    showLoading(true);
    
    Papa.parse(CONFIG.csvUrl, {
        download: true,
        header: true,
        complete: (results) => {
            state.allBooks = results.data.filter(book => book['book name']);
            state.filteredBooks = [...state.allBooks];
            displayBooks();
            showLoading(false);
        },
        error: (error) => {
            console.error('Error loading books:', error);
            showError('Failed to load books. Please try again later.');
            showLoading(false);
        }
    });
}

// Display Functions
function displayBooks() {
    if (state.filteredBooks.length === 0) {
        showNoResults();
        return;
    }

    const start = (state.currentPage - 1) * CONFIG.booksPerPage;
    const end = Math.min(start + CONFIG.booksPerPage, state.filteredBooks.length);
    const booksToShow = state.filteredBooks.slice(start, end);

    elements.booksContainer.innerHTML = booksToShow
        .map(book => createBookCard(book))
        .join('');

    updateResultsCount();
    updatePagination();
}

function createBookCard(book) {
    const title = book['book name'] || 'Unknown Title';
    const author = book['author'] || 'Unknown Author';
    const description = book['description'] || 'No description available';
    const price = book['price'] ? `${book['price']} IQD` : 'N/A';
    const photo = book['photo'] || 'placeholder.jpg';
    const shortDesc = description.length > 100 ? `${description.substring(0, 100)}...` : description;

    return `
        <div class="col-md-4 mb-4">
            <div class="card h-100">
                <img data-src="${photo}" class="card-img-top lazyload" alt="${title}" onerror="this.src='placeholder.jpg'">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${title}</h5>
                    <p class="card-text text-muted">by ${author}</p>
                    <div class="description-container">
                        <p class="card-text short-description">${shortDesc}</p>
                        ${description.length > 100 ? `
                            <p class="card-text full-description d-none">${description}</p>
                            <button class="btn btn-outline-primary btn-sm mt-2 show-more-btn">Show More</button>
                        ` : ''}
                    </div>
                    <p class="card-text mt-auto"><strong>Price: ${price}</strong></p>
                </div>
            </div>
        </div>
    `;
}

// Filter Functions
function applyFilters() {
    const searchQuery = elements.searchInput.value.toLowerCase().trim();
    const filters = {
        age: {
            min: parseInt(elements.filters.ageMin.value) || 0,
            max: parseInt(elements.filters.ageMax.value) || Infinity
        },
        price: {
            min: parseInt(elements.filters.priceMin.value) || 0,
            max: parseInt(elements.filters.priceMax.value) || Infinity
        }
    };

    state.filteredBooks = state.allBooks.filter(book => {
        if (!book['book name']) return false;

        const matchesSearch = !searchQuery || 
            book['book name'].toLowerCase().includes(searchQuery) ||
            (book['author'] || '').toLowerCase().includes(searchQuery);

        const bookAge = parseInt(book['age']) || 0;
        const bookPrice = parseInt(book['price']) || 0;

        const matchesAge = bookAge >= filters.age.min && 
                          (filters.age.max === Infinity || bookAge <= filters.age.max);
        
        const matchesPrice = bookPrice >= filters.price.min && 
                            (filters.price.max === Infinity || bookPrice <= filters.price.max);

        return matchesSearch && matchesAge && matchesPrice;
    });

    state.currentPage = 1;
    displayBooks();
}

// UI Update Functions
function updateResultsCount() {
    elements.resultsCount.innerHTML = `
        <div class="alert alert-info">
            Found ${state.filteredBooks.length} book${state.filteredBooks.length !== 1 ? 's' : ''}
        </div>
    `;
}

function updatePagination() {
    const totalPages = Math.ceil(state.filteredBooks.length / CONFIG.booksPerPage);
    elements.pagination.innerHTML = Array.from({ length: totalPages }, (_, i) => i + 1)
        .map(page => `
            <li class="page-item ${page === state.currentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${page}">${page}</a>
            </li>
        `).join('');

    // Add pagination click handlers
    elements.pagination.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            changePage(parseInt(e.target.dataset.page));
        });
    });
}

// Utility Functions (continued)
function showLoading(show) {
    elements.loadingIndicator.style.display = show ? 'block' : 'none';
}

function showError(message) {
    elements.booksContainer.innerHTML = `
        <div class="col-12">
            <div class="alert alert-danger">${message}</div>
        </div>
    `;
}

function showNoResults() {
    elements.booksContainer.innerHTML = `
        <div class="col-12">
            <div class="alert alert-warning">No books found matching your criteria.</div>
        </div>
    `;
    updateResultsCount();
    updatePagination();
}

function changePage(page) {
    state.currentPage = page;
    displayBooks();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleBookInteractions(event) {
    if (event.target.classList.contains('show-more-btn')) {
        event.preventDefault();
        const button = event.target;
        const container = button.closest('.description-container');
        const shortDesc = container.querySelector('.short-description');
        const fullDesc = container.querySelector('.full-description');
        
        if (fullDesc.classList.contains('d-none')) {
            fullDesc.classList.remove('d-none');
            shortDesc.classList.add('d-none');
            button.textContent = 'Show Less';
        } else {
            fullDesc.classList.add('d-none');
            shortDesc.classList.remove('d-none');
            button.textContent = 'Show More';
        }
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Error handling for missing elements
function validateElements() {
    const missingElements = [];
    for (const [key, element] of Object.entries(elements)) {
        if (typeof element === 'object' && element !== null) {
            // Check nested elements (like filters)
            for (const [nestedKey, nestedElement] of Object.entries(element)) {
                if (!nestedElement) {
                    missingElements.push(`${key}.${nestedKey}`);
                }
            }
        } else if (!element) {
            missingElements.push(key);
        }
    }

    if (missingElements.length > 0) {
        console.error('Missing DOM elements:', missingElements);
        throw new Error(`Required DOM elements missing: ${missingElements.join(', ')}`);
    }
}

// Initialize validation
try {
    validateElements();
} catch (error) {
    console.error('Initialization failed:', error);
    document.body.innerHTML = `
        <div class="container mt-5">
            <div class="alert alert-danger">
                Failed to initialize the application. Please refresh the page or contact support.
            </div>
        </div>
    `;
}

// Handle global errors
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    showError('An unexpected error occurred. Please refresh the page.');
});

// Export functions for potential testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CONFIG,
        state,
        createBookCard,
        applyFilters,
        displayBooks,
        updateResultsCount,
        updatePagination
    };
}
