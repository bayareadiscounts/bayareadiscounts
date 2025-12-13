// College program search and filter functionality
document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('college-search');
  const filterButtons = document.querySelectorAll('[data-filter]');
  const resetButton = document.getElementById('reset-filters');
  const resultCount = document.querySelector('.result-number');
  const programCards = document.querySelectorAll('[data-program-card]');

  console.log('Initializing college filter. Found', programCards.length, 'program cards');

  // Function to filter programs
  function filterPrograms() {
    const searchTerm = searchInput.value.toLowerCase();
    let visibleCount = 0;

    // Get active filters (only non-"all" values)
    const activeFilters = {};
    filterButtons.forEach(btn => {
      if (btn.classList.contains('active') && btn.dataset.value !== 'all') {
        const filterType = btn.dataset.filter;
        const filterValue = btn.dataset.value;
        
        if (!activeFilters[filterType]) {
          activeFilters[filterType] = [];
        }
        activeFilters[filterType].push(filterValue);
      }
    });

    console.log('Active filters:', activeFilters);

    programCards.forEach(card => {
      let shouldShow = true;
      const cardTitle = (card.dataset.title || '').toLowerCase();
      const cardBenefit = (card.dataset.benefit || '').toLowerCase();
      const cardTags = (card.dataset.tags || '').split(',').map(t => t.trim().toLowerCase());
      const cardType = (card.dataset.type || '').toLowerCase();
      const cardLocation = (card.dataset.location || '').toLowerCase();
      const cardInstitution = (card.dataset.institution || '').toLowerCase();

      // Search filter
      if (searchTerm && searchTerm.length > 0) {
        const matchesSearch =
          cardTitle.includes(searchTerm) ||
          cardBenefit.includes(searchTerm) ||
          cardTags.some(tag => tag.includes(searchTerm)) ||
          cardInstitution.includes(searchTerm) ||
          cardLocation.includes(searchTerm);
        
        if (!matchesSearch) {
          shouldShow = false;
        }
      }

      // Institution type filter (data-type on card)
      if (shouldShow && activeFilters['institution-type'] && activeFilters['institution-type'].length > 0) {
        if (!activeFilters['institution-type'].includes(cardType)) {
          shouldShow = false;
        }
      }

      // Program type filter (tags on card)
      if (shouldShow && activeFilters['program-type'] && activeFilters['program-type'].length > 0) {
        const hasMatchingTag = activeFilters['program-type'].some(filter =>
          cardTags.includes(filter)
        );
        if (!hasMatchingTag) {
          shouldShow = false;
        }
      }

      // Location filter
      if (shouldShow && activeFilters['location'] && activeFilters['location'].length > 0) {
        if (!activeFilters['location'].includes(cardLocation)) {
          shouldShow = false;
        }
      }

      card.style.display = shouldShow ? '' : 'none';
      if (shouldShow) visibleCount++;
    });

    // Update result count
    resultCount.textContent = visibleCount;
    console.log('Visible count:', visibleCount);
  }

  // Search input listener
  if (searchInput) {
    searchInput.addEventListener('input', filterPrograms);
  }

  // Filter button listeners
  filterButtons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const filterType = this.dataset.filter;
      const filterValue = this.dataset.value;

      console.log('Button clicked:', filterType, filterValue);

      // Get all buttons of the same filter type
      const sameTypeButtons = document.querySelectorAll(`[data-filter="${filterType}"]`);
      
      // Reset siblings
      sameTypeButtons.forEach(sibling => {
        sibling.classList.remove('active');
        sibling.setAttribute('aria-pressed', 'false');
      });

      // Activate clicked button
      this.classList.add('active');
      this.setAttribute('aria-pressed', 'true');

      filterPrograms();
    });
  });

  // Reset filters
  if (resetButton) {
    resetButton.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('Reset clicked');
      
      // Reset all buttons to "all"
      filterButtons.forEach(btn => {
        if (btn.dataset.value === 'all') {
          btn.classList.add('active');
          btn.setAttribute('aria-pressed', 'true');
        } else {
          btn.classList.remove('active');
          btn.setAttribute('aria-pressed', 'false');
        }
      });

      // Clear search
      searchInput.value = '';
      filterPrograms();
    });
  }

  // Initial filter on page load
  filterPrograms();
});
