let currentPage = 1;
const booksPerPage = 25;
let allBooks = [];
let filteredBooks = [];

document.addEventListener("DOMContentLoaded", function() {
    loadCSVFile();
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', debounce(applyFilters, 300));
});

function loadCSVFile() {
    const csvLink = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSj1Fu63OoSDb2xQxAp16xDzddkIgzb4LLRg-fcgjEKJOi0FRI70vrszirPU8UIeo3unSMHmGP8X9Ro/pub?output=csv';

    // تحميل ايكون
    document.getElementById('loadingIndicator').style.display = 'block';

    fetch(csvLink)
        .then(response => response.text())
        .then(data => {
            // yyyyyyyyyyyyy
            const worker = new Worker('parserWorker.js');
            worker.postMessage(data);
            worker.onmessage = function(e) {
                if (e.data.error) {
                    console.error('Worker error:', e.data.error);
                    document.getElementById('booksContainer').innerHTML = '<p>Error loading data.</p>';
                } else {
                    allBooks = e.data;
                    filteredBooks = e.data;
                    displayBooks();
                }
                // تحميل ايكون ساخله
                document.getElementById('loadingIndicator').style.display = 'none';
            };
            worker.onerror = function(error) {
                console.error('Worker error:', error);
                document.getElementById('booksContainer').innerHTML = '<p>Error loading data.</p>';
                // تحميل ايكون ساخله
                document.getElementById('loadingIndicator').style.display = 'none';
            };
        })
        .catch(error => {
            console.error('Error fetching the CSV file:', error);
            document.getElementById('booksContainer').innerHTML = '<p>Error loading data.</p>';
            // تحميل ايكون ساخله
            document.getElementById('loadingIndicator').style.display = 'none';
        });
}

function displayBooks() {
    const booksContainer = document.getElementById('booksContainer');
    booksContainer.innerHTML = '';

    const start = (currentPage - 1) * booksPerPage;
    const end = start + booksPerPage;
    const booksToDisplay = filteredBooks.slice(start, end);

    booksToDisplay.forEach(book => {
        const title = book['book name'] || 'Unknown Title';
        const author = book['author'] || 'Unknown Author';
        const description = book['description'] || 'No description available';
        const price = book['price'] || 'N/A';
        const photo = book['photo'] || 'placeholder.jpg';

        const col = document.createElement('div');
        col.className = 'col-md-4';
        col.innerHTML = `
            <div class="card h-100">
                <img data-src="${photo}" class="card-img-top lazyload" alt="${title}">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${title}</h5>
                    <p class="card-text text-muted">by ${author}</p>
                    <div class="description-container">
                        <p class="card-text short-description">${description.substring(0, 100)}...</p>
                        <p class="card-text full-description d-none">${description}</p>
                        <a href="#" class="btn btn-outline-primary mt-auto show-more-btn">Show More</a>
                    </div>
                    <p class="card-text">Price: ${price}</p>
                </div>
            </div>
        `;
        booksContainer.appendChild(col);
    });

    // بو ناده عبادي
    booksContainer.addEventListener('click', function(event) {
        if (event.target.classList.contains('show-more-btn')) {
            event.preventDefault();
            const button = event.target;
            const descriptionContainer = button.closest('.description-container');
            const shortDescription = descriptionContainer.querySelector('.short-description');
            const fullDescription = descriptionContainer.querySelector('.full-description');
            if (fullDescription.classList.contains('d-none')) {
                fullDescription.classList.remove('d-none');
                shortDescription.classList.add('d-none');
                button.textContent = 'Show Less';
            } else {
                fullDescription.classList.add('d-none');
                shortDescription.classList.remove('d-none');
                button.textContent = 'Show More';
            }
        }
    });

    updatePagination();
}

function updatePagination() {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    const totalPages = Math.ceil(filteredBooks.length / booksPerPage);

    for (let i = 1; i <= totalPages; i++) {
        const pageItem = document.createElement('li');
        pageItem.className = `page-item ${i === currentPage ? 'active' : ''}`;
        pageItem.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        pageItem.addEventListener('click', (e) => {
            e.preventDefault();
            changePage(i);
        });
        pagination.appendChild(pageItem);
    }
}

function changePage(pageNumber) {
    currentPage = pageNumber;
    displayBooks();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function applyFilters() {
    const ageMin = parseInt(document.getElementById('ageRangeMin').value);
    const ageMax = parseInt(document.getElementById('ageRangeMax').value);
    const priceMin = parseInt(document.getElementById('priceRangeMin').value);
    const priceMax = parseInt(document.getElementById('priceRangeMax').value);
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();

    filteredBooks = allBooks.filter(book => {
        const bookAge = parseInt(book['age']) || 0;
        const bookPrice = parseInt(book['price']) || 0;
        const bookName = book['book name'] ? book['book name'].toLowerCase() : '';
        const isbn10 = book['isbn10'] ? book['isbn10'].toLowerCase() : '';
        const isbn13 = book['isbn13'] ? book['isbn13'].toLowerCase() : '';

        return (
            (isNaN(ageMin) || isNaN(ageMax) || (bookAge >= ageMin && bookAge <= ageMax)) &&
            (isNaN(priceMin) || isNaN(priceMax) || (bookPrice >= priceMin && bookPrice <= priceMax)) &&
            (bookName.includes(searchQuery) || isbn10.includes(searchQuery) || isbn13.includes(searchQuery))
        );
    });

    currentPage = 1;
    displayBooks();
}

function debounce(func, delay) {
    let debounceTimer;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(context, args), delay);
    };
}
