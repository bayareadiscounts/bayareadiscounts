// URL Sharing - Save and restore filters/search from URL parameters

class URLSharing {
  constructor() {
    this.params = new URLSearchParams(window.location.search);
  }

  // Get filters from URL on page load
  getInitialState() {
    const parseList = (val) => {
      if (!val) return [];
      return val.split(',').map(v => v.trim()).filter(Boolean);
    };

    return {
      search: this.params.get('q') || '',
      eligibility: parseList(this.params.get('eligibility')),
      category: parseList(this.params.get('category')),
      area: parseList(this.params.get('area'))
    };
  }

  // Update URL when filters change (without page reload)
  updateURL(filters) {
    const params = new URLSearchParams();
    
    if (filters.search) params.set('q', filters.search);
    const toListString = (val) => Array.isArray(val) ? val.join(',') : (val || '');
    const elig = toListString(filters.eligibility);
    const cat = toListString(filters.category);
    const area = toListString(filters.area);
    if (elig) params.set('eligibility', elig);
    if (cat) params.set('category', cat);
    if (area) params.set('area', area);
    
    const newURL = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    
    window.history.replaceState({}, '', newURL);
  }

  // Get shareable URL
  getShareableURL() {
    return window.location.href;
  }

  // Copy current search to clipboard
  async copyToClipboard() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      return true;
    } catch (err) {
      console.error('Failed to copy URL:', err);
      return false;
    }
  }
}

// Usage example for integration with search-filter.js:
/*
const urlSharing = new URLSharing();

// On page load, restore filters from URL
const initialState = urlSharing.getInitialState();
if (initialState.search) {
  document.getElementById('search-input').value = initialState.search;
}
// Apply initial filters...

// When filters change, update URL
function onFilterChange(filters) {
  urlSharing.updateURL(filters);
  // ... rest of filter logic
}
*/
