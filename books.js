// Configuration
const CONFIG = {
    csvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQKVLJoqOcDonQqPm7e25B179_x0vp8hnDHivL73cGeopSnrno5fE8huqdntrGqEAeHzG88xmnquR5N/pub?output=csv',
    booksPerPage: 25,
    defaultFilters: {
        age: { min: 10, max: 18 },
        price: { min: 250, max: 50000 }
    },
    paths: {
        placeholderImage: 'photos/logo/placeholder.jpg',
        bookImages: 'photos/books/'
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
//verrrrrrrrry important books section
function createBookCard(book) {
    const title = book['book name'] || 'Unknown Title';
    const author = book['author'] || 'Unknown Author';
    const price = book['price'] ? `${book['price']} IQD` : null;
    const photo = book['photo'] ? `${CONFIG.paths.bookImages}${book['photo']}` : CONFIG.paths.placeholderImage;
    
    return `
        <div class="col-md-4 mb-4">
            <div class="card h-100 shadow-sm hover:shadow-lg transition-all duration-300">
                <div class="position-relative" style="padding-top: 100%;">
                    <img data-src="${photo}" 
                         class="card-img-top lazyload position-absolute top-0 start-0 w-100 h-100 p-3" 
                         alt="${title}" 
                         style="object-fit: contain;"
                         onerror="this.onerror=null; this.src='${CONFIG.paths.placeholderImage}'">
                </div>
                <div class="card-body d-flex flex-column p-4">
                    <h5 class="card-title fs-4 mb-2 text-truncate">${title}</h5>
                    <p class="card-text text-muted mb-3">by ${author}</p>
                    <div class="mt-auto">
                        ${price ? `
                            <p class="card-text mb-3">
                                <span class="badge bg-secondary px-3 py-2">${price}</span>
                            </p>
                        ` : ''}
                        <a href="#" 
                           class="btn btn-outline-primary mt-auto w-100" 
                           onclick="showBookDetails('${encodeURIComponent(JSON.stringify(book))}'); return false;">
                            View Details
                            <i class="fas fa-info-circle ms-2"></i>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function createBookDetailsModal(book) {
    const title = book['book name'] || 'Unknown Title';
    const author = book['author'] || 'Unknown Author';
    const price = book['price'] ? `${book['price']} IQD` : null;
    const photo = book['photo'] ? `${CONFIG.paths.bookImages}${book['photo']}` : CONFIG.paths.placeholderImage;
    const description = book['description'] || null;
    const isbn10 = book['isbn10'] || null;
    const isbn13 = book['isbn13'] || null;
    const language = book['language'] || null;
    const category = book['category'] || null;
    const age = book['age'] || null;
    const papers = book['papers'] || null;
    const publishingDate = book['publishing_date'] || null;
    const status = book['status'] || null;

    // Group the details into left and right columns
    const leftColumnDetails = [
        { label: 'Language', value: language },
        { label: 'Category', value: category },
        { label: 'Age Range', value: age },
        { label: 'Pages', value: papers }
    ];

    const rightColumnDetails = [
        { label: 'ISBN 10', value: isbn10 },
        { label: 'ISBN 13', value: isbn13 },
        { label: 'Publishing Date', value: publishingDate }
    ];

    // Function to create details list
    const createDetailsList = (details) => {
        return details
            .filter(detail => detail.value)
            .map(detail => `
                <div class="mb-3">
                    <strong class="d-block text-dark mb-1">${detail.label}:</strong>
                    <span class="text-muted">${detail.value}</span>
                </div>
            `).join('');
    };

    return `
        <div class="modal fade" id="bookDetailsModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header border-bottom">
                        <h5 class="modal-title fs-4 fw-bold">Book Details</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="row">
                            <!-- Left side - Photo -->
                            <div class="col-md-4 mb-4 mb-md-0">
                                <div class="position-relative rounded overflow-hidden shadow-sm" style="padding-top: 133%;">
                                    <img src="${photo}" 
                                         class="position-absolute top-0 start-0 w-100 h-100" 
                                         alt="${title}"
                                         onerror="this.onerror=null; this.src='${CONFIG.paths.placeholderImage}'"
                                         style="object-fit: contain;">
                                </div>

                                <div class="mt-4">
                                    ${price || status ? `
                                        <div class="d-flex flex-wrap gap-2 justify-content-center">
                                            ${status ? `
                                                <span class="badge ${status.toLowerCase() === 'available' ? 'bg-success' : 'bg-secondary'} px-3 py-2">
                                                    ${status}
                                                </span>
                                            ` : ''}
                                            ${price ? `
                                                <span class="badge bg-primary px-3 py-2">
                                                    ${price}
                                                </span>
                                            ` : ''}
                                        </div>
                                    ` : ''}

                                    ${status?.toLowerCase() === 'available' ? `
                                        <button class="btn btn-success w-100 mt-3" 
                                                onclick="sendPurchaseEmail('${encodeURIComponent(title)}')">
                                            <i class="fas fa-shopping-cart me-2"></i>Buy Now
                                        </button>
                                    ` : '<button class="btn btn-secondary w-100 mt-3" disabled>Sold Out</button>'}
                                </div>
                            </div>

                            <!-- Right side - Details -->
                            <div class="col-md-8">
                                <h4 class="fs-3 fw-bold mb-2">${title}</h4>
                                <p class="text-muted fs-5 mb-4">by ${author}</p>

                                ${description ? `
                                    <div class="mb-4">
                                        <h5 class="fw-bold mb-2">Description</h5>
                                        <p class="text-muted">${description}</p>
                                    </div>
                                ` : ''}
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        ${createDetailsList(leftColumnDetails)}
                                    </div>
                                    <div class="col-md-6">
                                        ${createDetailsList(rightColumnDetails)}
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

function showBookDetails(bookJSON) {
    const book = JSON.parse(decodeURIComponent(bookJSON));
    
    // Remove existing modal if any
    const existingModal = document.getElementById('bookDetailsModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add new modal to body
    document.body.insertAdjacentHTML('beforeend', createBookDetailsModal(book));
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('bookDetailsModal'));
    modal.show();
}

function sendPurchaseEmail(bookTitle) {
    const subject = encodeURIComponent(`Interest in purchasing: ${decodeURIComponent(bookTitle)}`);
    const body = encodeURIComponent(`I want to buy book: ${decodeURIComponent(bookTitle)}`);
    window.location.href = `mailto:contact@kerkukkitabevi.net?subject=${subject}&body=${body}`;
}
function showBookDetails(bookJSON) {
    const book = JSON.parse(decodeURIComponent(bookJSON));
    
    // Remove existing modal if any
    const existingModal = document.getElementById('bookDetailsModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add new modal to body
    document.body.insertAdjacentHTML('beforeend', createBookDetailsModal(book));
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('bookDetailsModal'));
    modal.show();
}

function sendPurchaseEmail(bookTitle) {
    const subject = encodeURIComponent(`Interest in purchasing: ${decodeURIComponent(bookTitle)}`);
    const body = encodeURIComponent(`I want to buy book: ${decodeURIComponent(bookTitle)}`);
    window.location.href = `mailto:contact@kerkukkitabevi.net?subject=${subject}&body=${body}`;
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
