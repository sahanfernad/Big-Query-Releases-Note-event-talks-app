// State Management
let allEntries = []; // Loaded raw entries from server
let filteredUpdates = []; // Flat list of updates matching current filter/search
let selectedUpdates = []; // List of selected updates: { id, dateTitle, category, plainText, link }
let currentFilter = 'all';
let currentSearch = '';

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');
const skeletonLoader = document.getElementById('skeleton-loader');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const retryBtn = document.getElementById('retry-btn');
const feedContainer = document.getElementById('feed-container');
const syncStatusText = document.getElementById('sync-status');

// Filter & Search Elements
const searchInput = document.getElementById('search-input');
const filterChips = document.querySelectorAll('.filter-chip');

// Stats Elements
const statTotal = document.getElementById('stat-total');
const statFeatures = document.getElementById('stat-features');
const statAnnouncements = document.getElementById('stat-announcements');
const statIssues = document.getElementById('stat-issues');
const statCards = document.querySelectorAll('.stat-card');

// Sidebar Composer Elements
const selectedEmptyState = document.getElementById('selected-empty-state');
const selectedItemsList = document.getElementById('selected-items-list');
const composerArea = document.getElementById('composer-area');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const clearSelectionBtn = document.getElementById('clear-selection-btn');
const optHashtags = document.getElementById('opt-hashtags');
const optLinks = document.getElementById('opt-links');
const copyTweetBtn = document.getElementById('copy-tweet-btn');
const tweetBtn = document.getElementById('tweet-btn');
const toast = document.getElementById('toast');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    fetchReleases(false);
    setupEventListeners();
});

// Event Listeners Configuration
function setupEventListeners() {
    // Refresh buttons
    refreshBtn.addEventListener('click', () => fetchReleases(true));
    retryBtn.addEventListener('click', () => fetchReleases(true));
    exportCsvBtn.addEventListener('click', exportToCsv);
    
    // Search event (debounced or input)
    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value.toLowerCase().trim();
        renderFilteredFeed();
    });

    // Category filter chips
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilter = chip.dataset.filter;
            
            // Sync with stats cards styling
            updateStatsCardsActiveState(currentFilter);
            renderFilteredFeed();
        });
    });

    // Stats card clicking filters the feed
    statCards.forEach(card => {
        card.addEventListener('click', () => {
            const category = card.dataset.category;
            currentFilter = category;
            
            // Sync filter chips
            filterChips.forEach(chip => {
                if (chip.dataset.filter === category) {
                    chip.classList.add('active');
                } else {
                    chip.classList.remove('active');
                }
            });
            
            updateStatsCardsActiveState(category);
            renderFilteredFeed();
        });
    });

    // Clear selection
    clearSelectionBtn.addEventListener('click', clearAllSelections);

    // Composer customization options
    optHashtags.addEventListener('change', updateTweetText);
    optLinks.addEventListener('change', updateTweetText);

    // User editing textarea manually
    tweetTextarea.addEventListener('input', (e) => {
        updateCharCount(e.target.value.length);
    });

    // Action buttons
    copyTweetBtn.addEventListener('click', copyTweetToClipboard);
    tweetBtn.addEventListener('click', shareOnX);
}

// Fetch Release Notes from API
async function fetchReleases(forceRefresh = false) {
    // Show spinner & disable button
    refreshBtn.disabled = true;
    refreshBtn.querySelector('.icon').classList.add('icon-spinner');
    
    // UI state: loading
    skeletonLoader.classList.remove('hidden');
    feedContainer.classList.add('hidden');
    errorState.classList.add('hidden');
    
    const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'error') {
            throw new Error(data.message);
        }
        
        allEntries = data.entries;
        
        // Update last synced meta
        if (data.feed_updated) {
            const date = new Date(data.feed_updated);
            syncStatusText.textContent = `Last synced: ${date.toLocaleString()}`;
        } else {
            syncStatusText.textContent = `Last synced: Just now`;
        }

        // Render dashboard
        calculateStats(allEntries);
        renderFilteredFeed();
        
        skeletonLoader.classList.add('hidden');
        feedContainer.classList.remove('hidden');
    } catch (error) {
        console.error('Fetch error:', error);
        errorMessage.textContent = error.message || 'Check your network and try again.';
        errorState.classList.remove('hidden');
        skeletonLoader.classList.add('hidden');
    } finally {
        // Reset spinner state
        refreshBtn.disabled = false;
        refreshBtn.querySelector('.icon').classList.remove('icon-spinner');
    }
}

// Calculate Statistics
function calculateStats(entries) {
    let total = 0;
    let features = 0;
    let announcements = 0;
    let issues = 0;

    entries.forEach(entry => {
        entry.updates.forEach(update => {
            total++;
            const cat = update.category.toLowerCase();
            if (cat.includes('feature')) features++;
            else if (cat.includes('announcement')) announcements++;
            else if (cat.includes('issue') || cat.includes('fix')) issues++;
        });
    });

    statTotal.textContent = total;
    statFeatures.textContent = features;
    statAnnouncements.textContent = announcements;
    statIssues.textContent = issues;
}

// Sync stat card border highlighting
function updateStatsCardsActiveState(category) {
    statCards.forEach(card => {
        if (card.dataset.category === category) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });
}

// Filter and render release notes
function renderFilteredFeed() {
    feedContainer.innerHTML = '';
    
    let renderedCount = 0;

    allEntries.forEach(entry => {
        // Filter updates within this entry
        const matchedUpdates = entry.updates.filter(update => {
            // Category check
            let categoryMatch = false;
            if (currentFilter === 'all') {
                categoryMatch = true;
            } else if (currentFilter === 'Issue') {
                categoryMatch = update.category.toLowerCase().includes('issue') || update.category.toLowerCase().includes('fix');
            } else {
                categoryMatch = update.category.toLowerCase() === currentFilter.toLowerCase();
            }

            // Search text check
            let searchMatch = true;
            if (currentSearch) {
                const searchScope = (update.category + " " + update.plain_text + " " + entry.title).toLowerCase();
                searchMatch = searchScope.includes(currentSearch);
            }

            return categoryMatch && searchMatch;
        });

        if (matchedUpdates.length > 0) {
            renderedCount += matchedUpdates.length;

            // Create date heading and cards container
            const dateGroup = document.createElement('div');
            dateGroup.className = 'date-group';

            const dateHeading = document.createElement('h2');
            dateHeading.className = 'date-heading';
            dateHeading.textContent = entry.title;
            dateGroup.appendChild(dateHeading);

            matchedUpdates.forEach(update => {
                const isSelected = selectedUpdates.some(item => item.id === update.id);
                
                const card = document.createElement('div');
                card.className = `update-card ${isSelected ? 'selected' : ''}`;
                card.dataset.id = update.id;
                card.id = `card-${update.id}`;

                // Category badges mapping
                let badgeClass = 'badge-general';
                const catLower = update.category.toLowerCase();
                if (catLower.includes('feature')) badgeClass = 'badge-feature';
                else if (catLower.includes('announcement')) badgeClass = 'badge-announcement';
                else if (catLower.includes('issue') || catLower.includes('fix')) badgeClass = 'badge-issue';
                else if (catLower.includes('deprecation')) badgeClass = 'badge-deprecation';

                card.innerHTML = `
                    <div class="card-select-container">
                        <div class="checkbox-custom" onclick="toggleSelectCard('${update.id}', '${escapeHtml(entry.title)}', '${escapeHtml(update.category)}', '${escapeHtml(update.plain_text)}', '${escapeHtml(entry.link)}')"></div>
                    </div>
                    <div class="update-card-content">
                        <div class="card-header-details">
                            <span class="badge ${badgeClass}">${update.category}</span>
                        </div>
                        <div class="update-body">
                            ${update.content}
                        </div>
                        <div class="card-actions">
                            <a href="${entry.link}" target="_blank" rel="noopener noreferrer" class="card-link">
                                <span>Official Docs</span>
                                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                    <polyline points="15 3 21 3 21 9"></polyline>
                                    <line x1="10" y1="14" x2="21" y2="3"></line>
                                </svg>
                            </a>
                            <button class="btn-card-copy" onclick="copySingleCardDirect(this, '${escapeHtml(update.plain_text)}')">
                                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                                <span>Copy</span>
                            </button>
                            <button class="btn-card-tweet" onclick="tweetSingleDirect('${update.id}', '${escapeHtml(entry.title)}', '${escapeHtml(update.category)}', '${escapeHtml(update.plain_text)}', '${escapeHtml(entry.link)}')">
                                <svg viewBox="0 0 24 24">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                </svg>
                                <span>Tweet This</span>
                            </button>
                        </div>
                    </div>
                `;

                dateGroup.appendChild(card);
            });

            feedContainer.appendChild(dateGroup);
        }
    });

    // Show empty state if nothing found
    if (renderedCount === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'error-container';
        emptyDiv.innerHTML = `
            <div class="error-illustration">🔍</div>
            <h2>No updates found</h2>
            <p>No release notes matched your search filters. Try adjusting your filter chips or query.</p>
        `;
        feedContainer.appendChild(emptyDiv);
    }
}

// Toggle Selection via Checkbox/Card click
window.toggleSelectCard = function(id, dateTitle, category, plainText, link) {
    const card = document.getElementById(`card-${id}`);
    const index = selectedUpdates.findIndex(item => item.id === id);

    if (index === -1) {
        // Add to selection
        selectedUpdates.push({ id, dateTitle, category, plainText, link });
        if (card) card.classList.add('selected');
    } else {
        // Remove from selection
        selectedUpdates.splice(index, 1);
        if (card) card.classList.remove('selected');
    }

    updateSidebar();
};

// Handle Tweet directly (clears others and selects only this one)
window.tweetSingleDirect = function(id, dateTitle, category, plainText, link) {
    // Clear all previous selections
    clearAllSelections(false);

    // Add and select the single item
    selectedUpdates.push({ id, dateTitle, category, plainText, link });
    
    // Highlight the card
    const card = document.getElementById(`card-${id}`);
    if (card) card.classList.add('selected');

    // Update and show composer
    updateSidebar();
    
    // Auto scroll to composer in mobile view
    if (window.innerWidth <= 1024) {
        document.querySelector('.sidebar-panel').scrollIntoView({ behavior: 'smooth' });
    }
};

// Update Tweet composer state
function updateSidebar() {
    if (selectedUpdates.length === 0) {
        selectedEmptyState.classList.remove('hidden');
        selectedItemsList.innerHTML = '';
        composerArea.classList.add('hidden');
        clearSelectionBtn.classList.add('hidden');
        return;
    }

    // Show panel
    selectedEmptyState.classList.add('hidden');
    composerArea.classList.remove('hidden');
    clearSelectionBtn.classList.remove('hidden');

    // Render selections in builder list
    selectedItemsList.innerHTML = '';
    selectedUpdates.forEach(update => {
        const tag = document.createElement('div');
        tag.className = 'selected-tag';
        
        let colorClass = 'badge-general';
        const cat = update.category.toLowerCase();
        if (cat.includes('feature')) colorClass = 'badge-feature';
        else if (cat.includes('announcement')) colorClass = 'badge-announcement';
        else if (cat.includes('issue') || cat.includes('fix')) colorClass = 'badge-issue';
        
        tag.innerHTML = `
            <span class="tag-badge ${colorClass}">${update.category}</span>
            <span class="tag-text">${update.dateTitle}: ${update.plainText}</span>
            <button class="btn-remove-tag" onclick="removeTag('${update.id}')">&times;</button>
        `;
        selectedItemsList.appendChild(tag);
    });

    updateTweetText();
}

// Remove tag from composer
window.removeTag = function(id) {
    const index = selectedUpdates.findIndex(item => item.id === id);
    if (index !== -1) {
        selectedUpdates.splice(index, 1);
        const card = document.getElementById(`card-${id}`);
        if (card) card.classList.remove('selected');
        updateSidebar();
    }
};

// Clear all selections
function clearAllSelections(shouldUpdateUI = true) {
    selectedUpdates.forEach(update => {
        const card = document.getElementById(`card-${update.id}`);
        if (card) card.classList.remove('selected');
    });
    
    selectedUpdates = [];
    
    if (shouldUpdateUI) {
        updateSidebar();
    }
}

// Generate the Tweet Content
function updateTweetText() {
    if (selectedUpdates.length === 0) return;

    const includeHashtags = optHashtags.checked;
    const includeLinks = optLinks.checked;
    
    let tweetContent = "";

    if (selectedUpdates.length === 1) {
        // Single update tweet format
        const item = selectedUpdates[0];
        let emoji = "📢";
        const cat = item.category.toLowerCase();
        if (cat.includes('feature')) emoji = "🚀";
        else if (cat.includes('issue') || cat.includes('fix')) emoji = "⚠️";
        else if (cat.includes('deprecation')) emoji = "🛑";

        tweetContent = `Google BigQuery Update (${item.dateTitle}):\n${emoji} [${item.category}] ${item.plainText}`;
        
        let linkSection = includeLinks ? `\n\nDetails: ${item.link}` : '';
        let hashtagSection = includeHashtags ? `\n\n#BigQuery #GoogleCloud` : '';
        
        // Calculate max text length so it doesn't overflow 280
        const currentLengthWithoutText = tweetContent.length - item.plainText.length + linkSection.length + hashtagSection.length;
        const availableTextSpace = 280 - currentLengthWithoutText;

        if (item.plainText.length > availableTextSpace) {
            const truncatedText = item.plainText.substring(0, availableTextSpace - 3) + "...";
            tweetContent = `Google BigQuery Update (${item.dateTitle}):\n${emoji} [${item.category}] ${truncatedText}`;
        }
        
        tweetContent += linkSection + hashtagSection;
    } else {
        // Multi-updates aggregated format
        tweetContent = `Latest BigQuery Updates:\n`;
        
        selectedUpdates.forEach(item => {
            let emoji = "•";
            const cat = item.category.toLowerCase();
            if (cat.includes('feature')) emoji = "🚀";
            else if (cat.includes('announcement')) emoji = "📢";
            else if (cat.includes('issue') || cat.includes('fix')) emoji = "⚠️";
            else if (cat.includes('deprecation')) emoji = "🛑";

            // Short summary per line
            const truncatedLine = item.plainText.length > 50 ? item.plainText.substring(0, 47) + "..." : item.plainText;
            tweetContent += `${emoji} [${item.category}] ${truncatedLine}\n`;
        });

        const mainLink = selectedUpdates[0].link; // Share documentation link
        let linkSection = includeLinks ? `\nDetails: ${mainLink}` : '';
        let hashtagSection = includeHashtags ? `\n#BigQuery #GoogleCloud` : '';

        // Check if list + elements overflow 280
        const totalFooterLength = linkSection.length + hashtagSection.length;
        if (tweetContent.length + totalFooterLength > 280) {
            const availableSpace = 280 - totalFooterLength - 16; // some buffer
            tweetContent = tweetContent.substring(0, availableSpace) + "\n(truncated)...";
        }
        
        tweetContent += linkSection + hashtagSection;
    }

    tweetTextarea.value = tweetContent;
    updateCharCount(tweetContent.length);
}

// Update Character count UI
function updateCharCount(length) {
    charCounter.textContent = `${length} / 280`;
    
    // Style adjustments for Twitter's limit
    if (length > 280) {
        charCounter.className = 'char-counter danger';
        tweetBtn.disabled = true;
    } else if (length > 250) {
        charCounter.className = 'char-counter warning';
        tweetBtn.disabled = false;
    } else {
        charCounter.className = 'char-counter';
        tweetBtn.disabled = false;
    }
}

// Share on Twitter via Intent
function shareOnX() {
    const text = tweetTextarea.value;
    if (!text || text.length > 280) return;

    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400');
}

// Copy to clipboard with Toast Notification
async function copyTweetToClipboard() {
    const text = tweetTextarea.value;
    if (!text) return;

    try {
        await navigator.clipboard.writeText(text);
        
        // Show success toast
        toast.classList.remove('hidden');
        toast.style.opacity = '1';
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                toast.classList.add('hidden');
            }, 350);
        }, 2000);
        
    } catch (err) {
        console.error('Clipboard copy failed:', err);
    }
}

// Utility to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Copy single card text directly
window.copySingleCardDirect = async function(btnElement, text) {
    if (!text) return;
    try {
        await navigator.clipboard.writeText(text);
        
        const span = btnElement.querySelector('span');
        const originalText = span.textContent;
        span.textContent = 'Copied!';
        btnElement.classList.add('copied');
        
        toast.textContent = "Copied to clipboard!";
        toast.classList.remove('hidden');
        toast.style.opacity = '1';
        
        setTimeout(() => {
            span.textContent = originalText;
            btnElement.classList.remove('copied');
            toast.style.opacity = '0';
            setTimeout(() => {
                toast.classList.add('hidden');
            }, 350);
        }, 2000);
    } catch (err) {
        console.error('Copy card text failed:', err);
    }
};

// Export visible updates to CSV
function exportToCsv() {
    const csvRows = [];
    
    // Header row
    csvRows.push(['Date', 'Category', 'Description', 'Link']);
    
    allEntries.forEach(entry => {
        entry.updates.forEach(update => {
            let categoryMatch = false;
            if (currentFilter === 'all') {
                categoryMatch = true;
            } else if (currentFilter === 'Issue') {
                categoryMatch = update.category.toLowerCase().includes('issue') || update.category.toLowerCase().includes('fix');
            } else {
                categoryMatch = update.category.toLowerCase() === currentFilter.toLowerCase();
            }

            let searchMatch = true;
            if (currentSearch) {
                const searchScope = (update.category + " " + update.plain_text + " " + entry.title).toLowerCase();
                searchMatch = searchScope.includes(currentSearch);
            }
            
            if (categoryMatch && searchMatch) {
                const escapeCsv = (val) => {
                    if (!val) return '';
                    let cleanVal = val.replace(/"/g, '""');
                    return `"${cleanVal}"`;
                };
                
                csvRows.push([
                    escapeCsv(entry.title),
                    escapeCsv(update.category),
                    escapeCsv(update.plain_text),
                    escapeCsv(entry.link)
                ]);
            }
        });
    });
    
    if (csvRows.length <= 1) {
        toast.textContent = "No data available to export!";
        toast.classList.remove('hidden');
        toast.style.opacity = '1';
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.classList.add('hidden'), 350);
        }, 2000);
        return;
    }
    
    const csvContent = csvRows.map(row => row.join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    const dateStr = new Date().toISOString().split('T')[0];
    const filterStr = currentFilter !== 'all' ? `_${currentFilter.toLowerCase()}` : '';
    link.setAttribute('download', `bigquery_release_notes_${dateStr}${filterStr}.csv`);
    
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.textContent = "CSV exported successfully!";
    toast.classList.remove('hidden');
    toast.style.opacity = '1';
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.classList.add('hidden'), 350);
    }, 2000);
}
