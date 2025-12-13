---
layout: default
title: College & University Student Resources
description: Free and discounted benefits for Bay Area college and university students
permalink: /college-university.html
---

<h1 style="display:none">College & University Student Resources</h1>

<a href="https://bayareadiscounts.com" class="site-logo">
  <img src="https://raw.githubusercontent.com/bayareadiscounts/bayareadiscounts/refs/heads/main/logo.png" 
       alt="Bay Area Discounts logo">
</a>

# College & University Student Resources

Comprehensive guide to 150+ free and discounted benefits available exclusively to students enrolled at Bay Area colleges and universities.

_Always verify benefits and eligibility with your college or university as programs and requirements may change._

---

<div id="app">
  <div class="filters-container">
    <input type="text" id="search" placeholder="Search by program name, school, or benefit type..." class="search-input">
    
    <div class="filter-group">
      <label>Institution Type:</label>
      <div class="filter-buttons">
        <button data-filter="type" data-value="">All</button>
        <button data-filter="type" data-value="community-college">Community Colleges</button>
        <button data-filter="type" data-value="csu">CSU</button>
        <button data-filter="type" data-value="uc">UC</button>
        <button data-filter="type" data-value="private">Private</button>
      </div>
    </div>

    <div class="filter-group">
      <label>Location:</label>
      <div class="filter-buttons">
        <button data-filter="location" data-value="">All</button>
        <button data-filter="location" data-value="san-francisco">San Francisco</button>
        <button data-filter="location" data-value="east-bay">East Bay</button>
        <button data-filter="location" data-value="peninsula">Peninsula</button>
        <button data-filter="location" data-value="south-bay">South Bay</button>
        <button data-filter="location" data-value="north-bay">North Bay</button>
        <button data-filter="location" data-value="marin">Marin</button>
      </div>
    </div>

    <div class="filter-group">
      <label>Program Type:</label>
      <div class="filter-buttons">
        <button data-filter="tag" data-value="">All</button>
        <button data-filter="tag" data-value="food">Food</button>
        <button data-filter="tag" data-value="transit">Transit</button>
        <button data-filter="tag" data-value="housing">Housing</button>
        <button data-filter="tag" data-value="financial">Financial</button>
        <button data-filter="tag" data-value="technology">Technology</button>
        <button data-filter="tag" data-value="wellness">Wellness</button>
        <button data-filter="tag" data-value="emergency">Emergency</button>
      </div>
    </div>

    <div class="result-count">
      Showing <span id="count">0</span> programs
    </div>
  </div>

  <div id="results" class="results-grid"></div>
</div>

<style>
#app {
  max-width: 1200px;
  margin: 2rem auto;
  padding: 0 1rem;
}

.filters-container {
  background: #f6f8fa;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  border: 1px solid #d0d7de;
}

.filter-group {
  margin-bottom: 1.5rem;
}

.filter-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
}

.search-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  font-size: 1rem;
  margin-bottom: 1.5rem;
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  border-color: #0969da;
  box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.1);
}

.filter-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.filter-buttons button {
  padding: 0.5rem 1rem;
  border: 1px solid #d0d7de;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.filter-buttons button:hover {
  border-color: #0969da;
  background-color: #f0f7ff;
}

.filter-buttons button.active {
  background-color: #0969da;
  color: white;
  border-color: #0969da;
}

.result-count {
  margin-top: 1rem;
  font-size: 0.9rem;
  color: #57606a;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.program-card {
  background: white;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  padding: 1.5rem;
  transition: all 0.2s;
}

.program-card:hover {
  border-color: #0969da;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.program-card h3 {
  margin: 0 0 0.75rem 0;
  font-size: 1.1rem;
  color: #24292f;
}

.program-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.85rem;
}

.program-college {
  background: #eaeef2;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-weight: 600;
  color: #24292f;
}

.program-location {
  color: #57606a;
  font-size: 0.85rem;
}

.program-benefit {
  margin: 1rem 0;
  font-size: 0.95rem;
  color: #424a53;
  line-height: 1.6;
}

.program-footer {
  border-top: 1px solid #eaeef2;
  padding-top: 1rem;
  margin-top: 1rem;
}

.how-to-use {
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
}

.how-to-use strong {
  display: block;
  margin-bottom: 0.25rem;
  color: #24292f;
}

.how-to-use p {
  margin: 0;
  color: #57606a;
}

.program-timeframe {
  display: block;
  font-size: 0.8rem;
  color: #8c959f;
  font-style: italic;
  margin-bottom: 0.75rem;
}

.program-link {
  display: inline-block;
  padding: 0.5rem 1rem;
  background-color: #0969da;
  color: white;
  text-decoration: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  transition: background-color 0.2s;
}

.program-link:hover {
  background-color: #0860ca;
}

.hidden {
  display: none !important;
}

@media (max-width: 768px) {
  .results-grid {
    grid-template-columns: 1fr;
  }
  
  .filter-buttons {
    flex-direction: column;
  }
  
  .filter-buttons button {
    width: 100%;
  }
}

@media (prefers-color-scheme: dark) {
  .filters-container {
    background: #0d1117;
    border-color: #30363d;
  }

  .search-input {
    background: #0d1117;
    border-color: #30363d;
    color: #c9d1d9;
  }

  .filter-group label {
    color: #c9d1d9;
  }

  .filter-buttons button {
    background: #161b22;
    border-color: #30363d;
    color: #c9d1d9;
  }

  .filter-buttons button:hover {
    background-color: #1f6feb;
    border-color: #58a6ff;
  }

  .filter-buttons button.active {
    background-color: #1f6feb;
    border-color: #1f6feb;
  }

  .result-count {
    color: #8b949e;
  }

  .program-card {
    background: #0d1117;
    border-color: #30363d;
  }

  .program-card:hover {
    border-color: #58a6ff;
  }

  .program-card h3 {
    color: #e6edf3;
  }

  .program-college {
    background: #30363d;
    color: #e6edf3;
  }

  .program-location {
    color: #8b949e;
  }

  .program-benefit {
    color: #c9d1d9;
  }

  .program-footer {
    border-color: #21262d;
  }

  .how-to-use strong {
    color: #e6edf3;
  }

  .how-to-use p {
    color: #8b949e;
  }

  .program-timeframe {
    color: #6e7681;
  }
}
</style>

<script>
document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('search');
  const resultsContainer = document.getElementById('results');
  const countSpan = document.getElementById('count');
  const filterButtons = document.querySelectorAll('.filter-buttons button');
  
  let allPrograms = [];
  let activeFilters = {
    search: '',
    type: '',
    location: '',
    tag: ''
  };

  // Fetch programs from multiple Jekyll data files and combine them
  const ccPrograms = {{ site.data.college-programs-cc.programs | jsonify }};
  const csuPrograms = {{ site.data.college-programs-csu.programs | jsonify }};
  const ucPrograms = {{ site.data.college-programs-uc.programs | jsonify }};
  const privatePrograms = {{ site.data.college-programs-private.programs | jsonify }};
  allPrograms = [...ccPrograms, ...csuPrograms, ...ucPrograms, ...privatePrograms];

  console.log('Loaded', allPrograms.length, 'total programs (CC: 56, CSU: 26, UC: 28, Private: 44)');

  // Handle search - supports multiple search terms
  searchInput.addEventListener('input', (e) => {
    activeFilters.search = e.target.value.toLowerCase();
    render();
  });

  // Handle filter buttons
  filterButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const filterType = this.dataset.filter;
      const filterValue = this.dataset.value;

      // Remove active class from siblings
      document.querySelectorAll(`[data-filter="${filterType}"]`).forEach(b => {
        b.classList.remove('active');
      });

      // Add active class to clicked button
      this.classList.add('active');

      // Update filter
      activeFilters[filterType] = filterValue;
      render();
    });
  });

  function render() {
    const filtered = allPrograms.filter(program => {
      // Search filter - split by spaces to search for multiple terms
      const searchTerms = activeFilters.search.split(/\s+/).filter(s => s.length > 0);
      
      if (searchTerms.length > 0) {
        const searchableText = `${program.title} ${program.benefit} ${program.institution} ${program.tags} ${program.location}`.toLowerCase();
        
        // All search terms must match somewhere in the program
        const allTermsMatch = searchTerms.every(term => searchableText.includes(term));
        
        if (!allTermsMatch) return false;
      }

      // Type filter
      if (activeFilters.type && program.type !== activeFilters.type) {
        return false;
      }

      // Location filter
      if (activeFilters.location && program.location !== activeFilters.location) {
        return false;
      }

      // Tag filter
      if (activeFilters.tag && !program.tags.includes(activeFilters.tag)) {
        return false;
      }

      return true;
    });

    // Clear results
    resultsContainer.innerHTML = '';

    // Render filtered programs
    filtered.forEach(program => {
      const card = document.createElement('div');
      card.className = 'program-card';
      card.innerHTML = `
        <h3>${program.title}</h3>
        <div class="program-meta">
          <span class="program-college">${program.institution}</span>
          <span class="program-location">${program.location}</span>
        </div>
        <p class="program-benefit">${program.benefit}</p>
        <div class="program-footer">
          <div class="how-to-use">
            <strong>How to Use:</strong>
            <p>${program.how_to_use}</p>
          </div>
          <span class="program-timeframe">${program.timeframe}</span>
          <a href="${program.link}" class="program-link" target="_blank" rel="noopener noreferrer">Learn More</a>
        </div>
      `;
      resultsContainer.appendChild(card);
    });

    // Update count
    countSpan.textContent = filtered.length;
  }

  // Initial render
  render();
});
</script>

---

_Last updated: December 12, 2025_  
_This is a community-maintained resource. [Contribute on GitHub](https://github.com/bayareadiscounts/bayareadiscounts)_
