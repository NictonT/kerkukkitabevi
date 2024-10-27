// Configuration
const CONFIG = {
    // Changable filelink on google sheets.
    // File must be scv type.
    // Sometimes it authomatically updates i dont fully understand it...
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
            state.allBooks = results.data
                .filter(book => book['book name'])
                .sort((a, b) => {
                    // Sort by availability first (available books come first)
                    const statusA = (a.status || '').toLowerCase() === 'available';
                    const statusB = (b.status || '').toLowerCase() === 'available';
                    if (statusA !== statusB) return statusB - statusA;
                    
                    // Then sort by title
                    return (a['book name'] || '').localeCompare(b['book name'] || '');
                });
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

    let html = '';
    let currentStatus = null;

    booksToShow.forEach(book => {
        const status = (book.status || '').toLowerCase() === 'available';
        
        if (status !== currentStatus) {
            if (html) html += '</div>'; // Close previous section
            html += `
                <div class="col-12">
                    <h4 class="mt-4 mb-3">${status ? 'Available Books' : 'Unavailable Books'}</h4>
                </div>
                <div class="row">
            `;
            currentStatus = status;
        }
        
        html += createBookCard(book);
    });

    if (html) html += '</div>'; // Close last section
    
    elements.booksContainer.innerHTML = html;
    updateResultsCount();
    updatePagination();
}
//verrrrrrrrry important books section
function createBookCard(book) {
    const title = book['book name'] || 'Unknown Title';
    const author = book['author'] || 'Unknown Author';
    const price = book['price'] ? `${book['price']} IQD` : null;
    const photo = book['photo'] || book['Photo'] || 'photos/logo/placeholder.jpg';
    const status = (book.status || '').toLowerCase();
    
    // Create a clean book object with only needed data
    const cleanBook = {
        'book name': book['book name'],
        'author': book['author'],
        'price': book['price'],
        'photo': photo,
        'Photo': book['Photo'],
        'language': book['language'],
        'category': book['category'],
        'age': book['age'],
        'papers': book['papers'],
        'ISBN 10': book['ISBN 10'],
        'ISBN 13': book['ISBN 13'],
        'publishing date': book['publishing date'],
        'description': book['description'],
        'status': book['status']
    };

    // Convert to base64 to avoid encoding issues
    const bookData = btoa(unescape(encodeURIComponent(JSON.stringify(cleanBook))));
    
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
                           data-book="${bookData}"
                           onclick="showBookDetails(this.getAttribute('data-book')); return false;">
                            View Details
                            <i class="fas fa-info-circle ms-2"></i>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function showBookDetails(bookData) {
    try {
        // Decode the base64 string back to JSON
        const book = JSON.parse(decodeURIComponent(escape(atob(bookData))));
        
        const existingModal = document.getElementById('bookDetailsModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', createBookDetailsModal(book));
        const modal = new bootstrap.Modal(document.getElementById('bookDetailsModal'));
        modal.show();
    } catch (error) {
        console.error('Error showing book details:', error);
        alert('Could not display book details. Please try again.');
    }
}
// filter and search icon-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
function applyFilters() {
    const searchQuery = elements.searchInput.value.toLowerCase().trim();

    if (!searchQuery) {
        state.filteredBooks = [...state.allBooks]; // allBooks is already sorted by availability
    } else {
        state.filteredBooks = state.allBooks.filter(book => {
            return book['book name']?.toLowerCase().includes(searchQuery) ||
                   book['author']?.toLowerCase().includes(searchQuery) ||
                   (book['ISBN 10'] || book['isbn10'] || '').toString().toLowerCase().includes(searchQuery) ||
                   (book['ISBN 13'] || book['isbn13'] || '').toString().toLowerCase().includes(searchQuery);
        });
    }

    state.currentPage = 1;
    displayBooks();
}

function showBookDetails(bookJSON) {
    try {
        const book = JSON.parse(decodeURIComponent(bookJSON));
        
        const existingModal = document.getElementById('bookDetailsModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', createBookDetailsModal(book));
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
//-------------------------------------------------------------------------------------------------------------------------------------------------------

function updateResultsCount() {
    const searchQuery = elements.searchInput.value.trim();
    
    if (searchQuery) {
        elements.resultsCount.innerHTML = `
            <div class="alert alert-info">
                Found ${state.filteredBooks.length} book${state.filteredBooks.length !== 1 ? 's' : ''}
            </div>
        `;
    } else {
        elements.resultsCount.innerHTML = ''; // Clear the results count when search is empty
    }
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
    state.filteredBooks = [...state.allBooks];
    state.currentPage = 1;
    displayBooks();
}

// Enhanced Filter Functions
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

// Image error handling
function handleImageError(img) {
    img.onerror = null;
    img.src = CONFIG.paths.placeholderImage;
}

// Optional: Add keyboard navigation for pagination
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' && state.currentPage > 1) {
        changePage(state.currentPage - 1);
    } else if (e.key === 'ArrowRight' && state.currentPage < Math.ceil(state.filteredBooks.length / CONFIG.booksPerPage)) {
        changePage(state.currentPage + 1);
    }
});

// Additional initialization on page load
document.addEventListener('DOMContentLoaded', () => {
    try {
        validateElements();
        loadBooks();
        setupEventListeners();
        initializePriceRanges();
        initializeAgeRanges();
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize the application. Please refresh the page or contact support.');
    }
});
