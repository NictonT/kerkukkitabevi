// Configuration
const CONFIG = {
    csvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQKVLJoqOcDonQqPm7e25B179_x0vp8hnDHivL73cGeopSnrno5fE8huqdntrGqEAeHzG88xmnquR5N/pub?output=csv',
    booksPerPage: 24,
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
            state.filteredBooks = sortBooksByAvailability([...state.allBooks]);
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

// Sorting Function
function sortBooksByAvailability(books) {
    return [...books].sort((a, b) => {
        const statusA = (a.status || '').toLowerCase();
        const statusB = (b.status || '').toLowerCase();
        
        // First sort by availability
        if (statusA === 'available' && statusB !== 'available') return -1;
        if (statusA !== 'available' && statusB === 'available') return 1;
        
        // Then sort by price
        const priceA = Number(a.price?.replace(/[^\d.-]/g, '')) || 0;
        const priceB = Number(b.price?.replace(/[^\d.-]/g, '')) || 0;
        if (priceA !== priceB) return priceA - priceB;
        
        // Then by title
        return (a['book name'] || '').localeCompare(b['book name'] || '');
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

    let currentAvailability = null;
    let html = '';

    booksToShow.forEach(book => {
        const bookStatus = (book.status || '').toLowerCase();
        
        if (bookStatus !== currentAvailability) {
            if (html !== '') {
                html += '</div>'; // Close previous row
            }
            html += `
                <div class="col-12 mb-4">
                    <div class="alert alert-${bookStatus === 'available' ? 'success' : 'secondary'} mb-4">
                        <h4 class="mb-0">
                            ${bookStatus === 'available' ? 'Available Books' : 'Currently Unavailable Books'}
                        </h4>
                    </div>
                </div>
                <div class="row">
            `;
            currentAvailability = bookStatus;
        }
        
        html += createBookCard(book);
    });

    if (html !== '') {
        html += '</div>';
    }

    elements.booksContainer.innerHTML = html;
    updateResultsCount();
    updatePagination();
}

function createBookCard(book) {
    const title = book['book name'] || 'Unknown Title';
    const author = book['author'] || 'Unknown Author';
    const price = book['price'] ? `${book['price']} IQD` : null;
    const photo = book['photo'] || book['Photo'] || 'photos/logo/placeholder.jpg';
    const status = (book.status || '').toLowerCase();
    
    return `
        <div class="col-md-4 mb-4">
            <div class="card h-100 shadow-sm hover:shadow-lg transition-all duration-300 ${status === 'available' ? 'border-success' : 'border-secondary'}">
                <div class="position-relative">
                    <div class="position-absolute top-0 end-0 m-2">
                        <span class="badge ${status === 'available' ? 'bg-success' : 'bg-secondary'} px-2 py-1">
                            ${status === 'available' ? 'Available' : 'Unavailable'}
                        </span>
                    </div>
                    <div style="padding-top: 100%;">
                        <img src="${photo}" 
                             class="card-img-top position-absolute top-0 start-0 w-100 h-100 p-3" 
                             alt="${title}" 
                             style="object-fit: contain;"
                             onerror="this.onerror=null; this.src='${CONFIG.paths.placeholderImage}'">
                    </div>
                </div>
                <div class="card-body d-flex flex-column p-4">
                    <h5 class="card-title fs-4 mb-2 text-truncate">${title}</h5>
                    <p class="card-text text-muted mb-3">by ${author}</p>
                    <div class="mt-auto">
                        ${price ? `
                            <p class="card-text mb-3">
                                <span class="badge bg-primary px-3 py-2">${price}</span>
                            </p>
                        ` : ''}
                        <a href="#" 
                           class="btn ${status === 'available' ? 'btn-outline-success' : 'btn-outline-secondary'} mt-auto w-100" 
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
    const photo = book['photo'] || book['Photo'] || CONFIG.paths.placeholderImage;
    const status = (book.status || '').toLowerCase();

    const details = {
        price: book['price'] ? `${book['price']} IQD` : null,
        language: book['language'],
        category: book['category'],
        age: book['age'],
        papers: book['papers'],
        isbn10: book['ISBN 10'] || book['isbn10'],
        isbn13: book['ISBN 13'] || book['isbn13'],
        publishingDate: book['publishing_date'] || book['publishing date'],
        description: book['description'],
        status: book['status']
    };

    return `
        <div class="modal fade" id="bookDetailsModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header border-bottom">
                        <h5 class="modal-title fs-4">Book Details</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="row g-4">
                            <div class="col-md-4">
                                <div class="text-center">
                                    <div class="position-relative rounded shadow-sm mb-4" style="padding-top: 133%;">
                                        <img src="${photo}" 
                                             class="position-absolute top-0 start-0 w-100 h-100" 
                                             alt="${title}"
                                             style="object-fit: contain;"
                                             onerror="this.onerror=null; this.src='${CONFIG.paths.placeholderImage}'">
                                    </div>
                                    ${renderStatusAndPrice(details.status, details.price)}
                                </div>
                            </div>
                            <div class="col-md-8">
                                <h4 class="fs-3 mb-2">${title}</h4>
                                <p class="text-muted mb-4">by ${author}</p>
                                
                                ${details.description ? `
                                    <div class="mb-4">
                                        <h6 class="fw-bold mb-2">Description</h6>
                                        <p class="text-muted">${details.description}</p>
                                    </div>
                                ` : ''}

                                <div class="row">
                                    <div class="col-md-6">
                                        ${renderBookDetails([
                                            { label: 'Language', value: details.language },
                                            { label: 'Category', value: details.category },
                                            { label: 'Age Range', value: details.age },
                                            { label: 'Pages', value: details.papers }
                                        ])}
                                    </div>
                                    <div class="col-md-6">
                                        ${renderBookDetails([
                                            { label: 'ISBN 10', value: details.isbn10 },
                                            { label: 'ISBN 13', value: details.isbn13 },
                                            { label: 'Publishing Date', value: details.publishingDate }
                                        ])}
                                    </div>
                                </div>

                                ${status === 'available' ? `
                                    <button class="btn btn-success w-100 mt-4" 
                                            onclick="sendPurchaseEmail('${encodeURIComponent(title)}')">
                                        <i class="fas fa-shopping-cart me-2"></i>Buy Now
                                    </button>
                                ` : '<button class="btn btn-secondary w-100 mt-4" disabled>Sold Out</button>'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Helper Functions
function renderBookDetails(details) {
    return details
        .filter(detail => detail.value)
        .map(detail => `
            <div class="mb-3">
                <strong class="d-block text-dark mb-1">${detail.label}:</strong>
                <span class="text-muted">${detail.value}</span>
            </div>
        `).join('');
}

function renderStatusAndPrice(status, price) {
    if (!status && !price) return '';
    
    return `
        <div class="d-flex justify-content-center gap-2 flex-wrap">
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
    `;
}

// Search and Filter Functions
function applyFilters() {
    const searchQuery = elements.searchInput.value.toLowerCase().trim();

    if (!searchQuery) {
        state.filteredBooks = sortBooksByAvailability([...state.allBooks]);
    } else {
        state.filteredBooks = sortBooksByAvailability(
            state.allBooks.filter(book => {
                return book['book name']?.toLowerCase().includes(searchQuery) ||
                       book['author']?.toLowerCase().includes(searchQuery) ||
                       (book['ISBN 10'] || book['isbn10'] || '').toString().toLowerCase().includes(searchQuery) ||
                       (book['ISBN 13'] || book['isbn13'] || '').toString().toLowerCase().includes(searchQuery);
            })
        );
    }

    state.currentPage = 1;
    displayBooks();
}

// Modal Functions
function showBookDetails(bookJSON) {
    const book = JSON.parse(decodeURIComponent(bookJSON));
    
    const existingModal = document.getElementById('bookDetailsModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', createBookDetailsModal(book));
    const modal = new bootstrap.Modal(document.getElementById('bookDetailsModal'));
    modal.show();
}

function sendPurchaseEmail(bookTitle) {
    const subject = encodeURIComponent(`Interest in purchasing: ${decodeURIComponent(bookTitle)}`);
    const body = encodeURIComponent(`I want to buy book: ${decodeURIComponent(bookTitle)}`);
    window.location.href = `mailto:contact@kerkukkitabevi.net?subject=${subject}&body=${body}`;
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

    elements.pagination.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            changePage(parseInt(e.target.dataset.page));
        });
    });
}

function showNoResults() {
    elements.booksContainer.innerHTML = `
        <div class="col-12">
            <div class="alert alert-warning">
                No books found matching your criteria. Try adjusting your search or filters.
            </div>
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

// Event handling
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

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Loading and Error Handling
function showLoading(show) {
    if (elements.loadingIndicator) {
        elements.loadingIndicator.style.display = show ? 'block' : 'none';
        
        if (show) {
            elements.booksContainer.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-3 text-muted">Loading books...</p>
                </div>
            `;
        }
    }
}

function showError(message) {
    elements.booksContainer.innerHTML = `
        <div class="col-12">
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle me-2"></i>
                ${message}
            </div>
        </div>
    `;
}

// Price Formatting
function formatPrice(price) {
    if (!price) return null;
    const numericPrice = Number(price.replace(/[^\d.-]/g, ''));
    if (isNaN(numericPrice)) return null;
    return `${numericPrice.toLocaleString()} IQD`;
}

// Image Handling
function handleImageError(img) {
    img.onerror = null;
    img.src = CONFIG.paths.placeholderImage;
}

// Validation
function validateElements() {
    const missingElements = [];
    for (const [key, element] of Object.entries(elements)) {
        if (typeof element === 'object' && element !== null) {
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
        console.error(`Missing DOM elements: ${missingElements.join(', ')}`);
        showError('Some page elements are missing. Please refresh the page or contact support.');
        return false;
    }
    return true;
}

// Enhanced Filter Functionality
function applyPriceFilter(books) {
    const minPrice = Number(elements.filters.priceMin.value) || CONFIG.defaultFilters.price.min;
    const maxPrice = Number(elements.filters.priceMax.value) || CONFIG.defaultFilters.price.max;

    return books.filter(book => {
        const price = Number(book.price?.replace(/[^\d.-]/g, '')) || 0;
        return price >= minPrice && price <= maxPrice;
    });
}

function applyAgeFilter(books) {
    const minAge = Number(elements.filters.ageMin.value) || CONFIG.defaultFilters.age.min;
    const maxAge = Number(elements.filters.ageMax.value) || CONFIG.defaultFilters.age.max;

    return books.filter(book => {
        const age = Number(book.age?.replace(/[^\d.-]/g, '')) || 0;
        return age >= minAge && age <= maxAge;
    });
}

// Initialize Price Range Inputs
function initializePriceRanges() {
    if (elements.filters.priceMin && elements.filters.priceMax) {
        elements.filters.priceMin.value = CONFIG.defaultFilters.price.min;
        elements.filters.priceMax.value = CONFIG.defaultFilters.price.max;
    }
}

// Initialize Age Range Inputs
function initializeAgeRanges() {
    if (elements.filters.ageMin && elements.filters.ageMax) {
        elements.filters.ageMin.value = CONFIG.defaultFilters.age.min;
        elements.filters.ageMax.value = CONFIG.defaultFilters.age.max;
    }
}

// Reset Filters
function resetFilters() {
    elements.searchInput.value = '';
    initializePriceRanges();
    initializeAgeRanges();
    state.filteredBooks = sortBooksByAvailability([...state.allBooks]);
    state.currentPage = 1;
    displayBooks();
}

// Add this to your initialization
document.addEventListener('DOMContentLoaded', () => {
    if (validateElements()) {
        loadBooks();
        setupEventListeners();
        initializePriceRanges();
        initializeAgeRanges();
    }
});

// Optional: Add keyboard navigation for pagination
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' && state.currentPage > 1) {
        changePage(state.currentPage - 1);
    } else if (e.key === 'ArrowRight' && state.currentPage < Math.ceil(state.filteredBooks.length / CONFIG.booksPerPage)) {
        changePage(state.currentPage + 1);
    }
});
