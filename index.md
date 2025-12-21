---
layout: default
actions: true
---

<script>
  // Mark current page as active
  document.addEventListener('DOMContentLoaded', function() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
      const linkPath = new URL(link.href).pathname;
      if (linkPath === currentPath || (currentPath === '/' && linkPath === '/')) {
        link.setAttribute('aria-current', 'page');
      }
    });
  });
</script>

<div class="heading-dark-adjust" markdown="1">

## Stretch your budget and discover more of what your community has to offer.

This guide features free and low-cost resources across the counties commonly recognized as the San Francisco Bay Area: Alameda, Contra Costa, Marin, Napa, San Francisco, San Mateo, Santa Clara, Solano, and Sonoma. Resources are highlighted for public benefit recipients such as SNAP/EBT and Medi-Cal, and various demographic groups, families, nonprofit organizations, and anyone looking to reduce everyday expenses, including local nonprofit organizations.

As a community driven project, we work to keep information current. However, availability and eligibility can change, and some listings may occasionally be out of date. Always refer to the program's website for the most current details.

---

</div>

<br>

{% include step-flow.html %}

{% include search-filter-ui.html %}

<div id="search-results" class="programs-container" role="region" aria-live="polite" aria-label="Search results">
{% assign all_programs = "" | split: "" %}
{% for category in site.data.programs %}
  {% for program in category[1] %}
    {% assign all_programs = all_programs | push: program %}
  {% endfor %}
{% endfor %}
{% assign sorted_programs = all_programs | sort: "name" %}
{% for program in sorted_programs %}
  {% include program-card.html program=program %}
{% endfor %}
</div>

{% include mobile-filter-drawer.html %}
{% include back-to-top.html %}

<!-- Load JavaScript -->
<script src="{{ '/assets/js/url-sharing.js' | relative_url }}" defer></script>
<script src="{{ '/assets/js/keyboard-shortcuts.js' | relative_url }}" defer></script>
<script src="{{ '/assets/js/favorites.js' | relative_url }}" defer></script>
<script src="{{ '/assets/js/simple-analytics.js' | relative_url }}" defer></script>
<script src="{{ '/assets/js/step-flow.js' | relative_url }}" defer></script>

<!-- Integrate URL sharing with search/filter -->
<script>
document.addEventListener('DOMContentLoaded', function() {
  const urlSharing = new URLSharing();
  
  // Restore filters from URL on page load
  const initialState = urlSharing.getInitialState();
  
  // Apply initial search
  if (initialState.search) {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.value = initialState.search;
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
  
  // Apply initial filters
  // Apply multiple eligibility, category, and area values
  if (Array.isArray(initialState.eligibility)) {
    initialState.eligibility.forEach(val => {
      const btn = document.querySelector(`[data-filter-type="eligibility"][data-filter-value="${val}"]`);
      if (btn) btn.click();
    });
  }

  if (Array.isArray(initialState.category)) {
    initialState.category.forEach(val => {
      const btn = document.querySelector(`[data-filter-type="category"][data-filter-value="${val}"]`);
      if (btn) btn.click();
    });
  }

  if (Array.isArray(initialState.area)) {
    initialState.area.forEach(val => {
      const btn = document.querySelector(`[data-filter-type="area"][data-filter-value="${val}"]`);
      if (btn) btn.click();
    });
  }
  
  // Listen for filter changes and update URL
  document.addEventListener('filterChange', function(e) {
    urlSharing.updateURL(e.detail);
  });
  
  // Listen for search changes
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', function(e) {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        const filters = {
          search: e.target.value,
          eligibility: Array.from(document.querySelectorAll('[data-filter-type="eligibility"].active:not([data-all="true"])')).map(b => b.dataset.filterValue),
          category: Array.from(document.querySelectorAll('[data-filter-type="category"].active:not([data-all="true"])')).map(b => b.dataset.filterValue),
          area: Array.from(document.querySelectorAll('[data-filter-type="area"].active:not([data-all="true"])')).map(b => b.dataset.filterValue)
        };
        urlSharing.updateURL(filters);
      }, 500);
    });
  }
  
  // Make search-filter.js dispatch filterChange events
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      setTimeout(() => {
        const filters = {
          search: document.getElementById('search-input')?.value || '',
          eligibility: Array.from(document.querySelectorAll('[data-filter-type="eligibility"].active:not([data-all="true"])')).map(b => b.dataset.filterValue),
          category: Array.from(document.querySelectorAll('[data-filter-type="category"].active:not([data-all="true"])')).map(b => b.dataset.filterValue),
          area: Array.from(document.querySelectorAll('[data-filter-type="area"].active:not([data-all="true"])')).map(b => b.dataset.filterValue)
        };
        document.dispatchEvent(new CustomEvent('filterChange', { detail: filters }));
      }, 100);
    });
  });
});
</script>
