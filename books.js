// Configuration
const CONFIG = {
    // Changable filelink on google sheets.
    // File must be scv type.
    // Sometimes it authomatically updates i dont fully understand it...
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
    
    // Simplify photo handling - use the exact path from the data
    const photo = book['photo'] || book['Photo'] || 'photos/logo/placeholder.jpg';
    
    return `
        <div class="col-md-4 mb-4">
            <div class="card h-100 shadow-sm hover:shadow-lg transition-all duration-300">
                <div class="position-relative" style="padding-top: 100%;">
                    <img src="${photo}" 
                         class="card-img-top position-absolute top-0 start-0 w-100 h-100 p-3" 
                         alt="${title}" 
                         style="object-fit: contain;"
                         onerror="this.onerror=null; this.src='photos/logo/placeholder.jpg'">
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
    
    //photo card
    const photo = book['photo'] || book['Photo'] || 'photos/logo/placeholder.jpg';

    // Extract all possible book details
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

    // Group details into columns
    const leftColumnDetails = [
        { label: 'Language', value: details.language },
        { label: 'Category', value: details.category },
        { label: 'Age Range', value: details.age },
        { label: 'Pages', value: details.papers }
    ];

    const rightColumnDetails = [
        { label: 'ISBN 10', value: details.isbn10 },
        { label: 'ISBN 13', value: details.isbn13 },
        { label: 'Publishing Date', value: details.publishingDate }
    ];

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
                                             onerror="this.onerror=null; this.src='photos/logo/placeholder.jpg'"
                                             style="object-fit: contain;">
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
                                        ${renderDetailsColumn(leftColumnDetails)}
                                    </div>
                                    <div class="col-md-6">
                                        ${renderDetailsColumn(rightColumnDetails)}
                                    </div>
                                </div>

                                ${details.status?.toLowerCase() === 'available' ? `
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

// Helper functions
function getPhotoPath(photoValue) {
    if (!photoValue) return 'photos/logo/placeholder.jpg';
    return photoValue.includes('/') ? photoValue : `photos/logo/book photos/${photoValue}`;
}

function renderDetailsColumn(details) {
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

function showBookDetails(bookJSON) {
    try {
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
    } catch (error) {
        console.error('Error showing book details:', error);
    }
}

function sendPurchaseEmail(bookTitle) {
    const subject = encodeURIComponent(`Interest in purchasing: ${decodeURIComponent(bookTitle)}`);
    const body = encodeURIComponent(`I want to buy book: ${decodeURIComponent(bookTitle)}`);
    window.location.href = `mailto:contact@kerkukkitabevi.net?subject=${subject}&body=${body}`;
}
//gfhdjsklskjhgfdfhjkloiuytrsdfghfx4ec65rv78b7
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

// filter and search icon-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
function applyFilters() {
    const searchQuery = elements.searchInput.value.toLowerCase().trim();

    // Filter books
    if (!searchQuery) {
        state.filteredBooks = [...state.allBooks];
    } else {
        state.filteredBooks = state.allBooks.filter(book => {
            return book['book name']?.toLowerCase().includes(searchQuery) ||
                   book['author']?.toLowerCase().includes(searchQuery) ||
                   (book['ISBN 10'] || book['isbn10'] || '').toString().toLowerCase().includes(searchQuery) ||
                   (book['ISBN 13'] || book['isbn13'] || '').toString().toLowerCase().includes(searchQuery);
        });
    }

    // Display books using original createBookCard function
    if (state.filteredBooks.length === 0) {
        elements.booksContainer.innerHTML = `
            <div class="col-12">
                <div class="alert alert-warning">
                    No books found matching your criteria.
                </div>
            </div>
        `;
    } else {
        const start = (state.currentPage - 1) * CONFIG.booksPerPage;
        const end = Math.min(start + CONFIG.booksPerPage, state.filteredBooks.length);
        const booksToShow = state.filteredBooks.slice(start, end);

        elements.booksContainer.innerHTML = booksToShow
            .map(book => {
                const title = book['book name'] || 'Unknown Title';
                const author = book['author'] || 'Unknown Author';
                const price = book['price'] ? `${book['price']} IQD` : null;
                const photo = book['photo'] || book['Photo'] || 'photos/logo/placeholder.jpg';
                
                return `
                    <div class="col-md-4 mb-4">
                        <div class="card h-100 shadow-sm hover:shadow-lg transition-all duration-300">
                            <div class="position-relative" style="padding-top: 100%;">
                                <img src="${photo}" 
                                     class="card-img-top position-absolute top-0 start-0 w-100 h-100 p-3" 
                                     alt="${title}" 
                                     style="object-fit: contain;"
                                     onerror="this.onerror=null; this.src='photos/logo/placeholder.jpg'">
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
            })
            .join('');
    }

    // Update UI elements
    updateResultsCount();
    updatePagination();
}
//-------------------------------------------------------------------------------------------------------------------------------------------------------

// Display functions
function displayBooks() {
    if (state.filteredBooks.length === 0) {
        showNoResults();
        return;
    }

    // Get books for current page
    const start = (state.currentPage - 1) * CONFIG.booksPerPage;
    const end = Math.min(start + CONFIG.booksPerPage, state.filteredBooks.length);
    const booksToShow = state.filteredBooks.slice(start, end);

    // Update the display
    elements.booksContainer.innerHTML = booksToShow
        .map(book => createBookCard(book))
        .join('');

    // Update UI elements
    updateResultsCount();
    updatePagination();
}

function updateResultsCount() {
    elements.resultsCount.innerHTML = `
        <div class="alert alert-info">
            Found ${state.filteredBooks.length} book${state.filteredBooks.length !== 1 ? 's' : ''}
        </div>
    `;
}

function updatePagination() {
    const totalPages = Math.ceil(state.filteredBooks.length / CONFIG.booksPerPage);
    
    // Create pagination elements
    elements.pagination.innerHTML = Array.from({ length: totalPages }, (_, i) => i + 1)
        .map(page => `
            <li class="page-item ${page === state.currentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${page}">${page}</a>
            </li>
        `).join('');

    // Add click handlers
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

// Error handling
function showError(message) {
    elements.booksContainer.innerHTML = `
        <div class="col-12">
            <div class="alert alert-danger">${message}</div>
        </div>
    `;
}

function showLoading(show) {
    elements.loadingIndicator.style.display = show ? 'block' : 'none';
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
        throw new Error(`Required DOM elements missing: ${missingElements.join(', ')}`);
    }
}
