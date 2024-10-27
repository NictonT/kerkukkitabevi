// Configuration
const CONFIG = {
    csvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRejUBQCi2XvKxDyrffK2jLZ3BCFBP0D2gCJ17CgChmvaf4GQ1-oACta3DzmOQhdOtwg57ExSVUWMGs/pub?output=csv',
    articlesPerPage: 12,
};

// State management
const state = {
    currentPage: 1,
    allArticles: [],
    filteredArticles: [],
    loadedArticleContents: new Map()
};

// Articles Loading
function loadArticles() {
    showLoading(true);
    
    Papa.parse(CONFIG.csvUrl, {
        download: true,
        header: true,
        complete: (results) => {
            console.log('Raw data:', results.data); // Debug log
            
            state.allArticles = results.data
                .filter(article => {
                    // Check for required fields using correct column names
                    return article && 
                           article.title && 
                           article['en article']; // Note the space in column name
                });

            console.log('Filtered articles:', state.allArticles); // Debug log
            
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

async function fetchArticleContent(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch article content');
        const html = await response.text();
        
        // Extract content from Google Doc published page
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Try different content selectors for Google Docs
        const content = doc.querySelector('#contents') || 
                       doc.querySelector('[role="main"]') ||
                       doc.querySelector('.doc-content');
        
        if (!content) {
            throw new Error('Could not find content in the document');
        }

        return content.innerHTML;
    } catch (error) {
        console.error('Error fetching article:', error);
        throw error;
    }
}

async function showArticleDetails(articleJSON) {
    try {
        const article = JSON.parse(decodeURIComponent(articleJSON));
        console.log('Showing article details:', article);
        
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
        if (state.loadedArticleContents.has(article['en article'])) {
            elements.modal.content.innerHTML = state.loadedArticleContents.get(article['en article']);
            return;
        }

        // Fetch and process the content
        const content = await fetchArticleContent(article['en article']);
        
        // Style the content
        const styledContent = `
            <div class="article-content">
                <style>
                    .article-content {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        padding: 1rem;
                    }
                    .article-content img {
                        max-width: 100%;
                        height: auto;
                        margin: 1rem 0;
                    }
                    .article-content h1, 
                    .article-content h2, 
                    .article-content h3 {
                        margin-top: 1.5rem;
                        margin-bottom: 1rem;
                    }
                    .article-content p {
                        margin-bottom: 1rem;
                    }
                </style>
                ${content}
            </div>
        `;
        
        // Cache the content
        state.loadedArticleContents.set(article['en article'], styledContent);
        
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

function createArticleCard(article) {
    return `
        <div class="col-md-6 col-lg-4">
            <div class="card h-100 shadow-sm hover:shadow-lg transition-all duration-300">
                <div class="card-body p-4">
                    <h5 class="card-title fs-4 mb-3">${article.title}</h5>
                    <p class="card-text text-muted mb-3">
                        <i class="fas fa-calendar-alt me-2"></i>${article.date || 'No date'}
                    </p>
                    <div class="mt-auto">
                        <button 
                            class="btn btn-outline-primary w-100" 
                            onclick="showArticleDetails('${encodeURIComponent(JSON.stringify({
                                title: article.title,
                                date: article.date,
                                'en article': article['en article']
                            }))}')">
                            Read Article
                            <i class="fas fa-arrow-right ms-2"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}
