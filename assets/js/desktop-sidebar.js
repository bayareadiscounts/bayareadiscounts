/**
 * Desktop Sidebar Navigation
 * Handles sidebar navigation, view switching, and state management
 */

(function() {
  'use strict';

  // Wait for DOM to be ready
  document.addEventListener('DOMContentLoaded', initSidebar);

  function initSidebar() {
    const sidebar = document.getElementById('desktop-sidebar');
    if (!sidebar) return;

    // Initialize components
    initNavigation();
    initThemeToggle();
    initSavedCount();
    initProgramCount();
  }

  /**
   * Initialize navigation between views
   */
  function initNavigation() {
    const navItems = document.querySelectorAll('.sidebar-nav-item[data-view]');

    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        // Allow normal navigation for external links
        if (item.getAttribute('href') && !item.getAttribute('href').startsWith('#')) {
          return;
        }

        e.preventDefault();

        const view = item.dataset.view;
        switchView(view);

        // Update active state
        navItems.forEach(nav => {
          nav.classList.remove('active');
          nav.setAttribute('aria-current', 'false');
        });
        item.classList.add('active');
        item.setAttribute('aria-current', 'true');

        // Update URL hash
        if (view) {
          history.pushState({ view }, '', `#${view}`);
        }
      });
    });

    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.view) {
        switchView(e.state.view);
        updateActiveNav(e.state.view);
      } else {
        // Default to For You
        const hash = window.location.hash.slice(1);
        const view = hash || 'for-you';
        switchView(view);
        updateActiveNav(view);
      }
    });

    // Check initial hash
    const initialHash = window.location.hash.slice(1);
    if (initialHash && ['for-you', 'directory', 'saved'].includes(initialHash)) {
      switchView(initialHash);
      updateActiveNav(initialHash);
    }
  }

  /**
   * Switch between views (For You, Directory, etc.)
   */
  function switchView(view) {
    // Dispatch custom event for other scripts to handle
    document.dispatchEvent(new CustomEvent('viewChange', {
      detail: { view }
    }));

    // Show/hide relevant sections
    const forYouSection = document.getElementById('for-you-section');
    const directorySection = document.getElementById('directory-section');
    const searchFilters = document.querySelector('.search-panel');

    if (view === 'for-you') {
      if (forYouSection) forYouSection.hidden = false;
      if (directorySection) directorySection.hidden = true;
      if (searchFilters) searchFilters.hidden = true;
    } else if (view === 'directory') {
      if (forYouSection) forYouSection.hidden = true;
      if (directorySection) directorySection.hidden = false;
      if (searchFilters) searchFilters.hidden = false;
    }

    // Update page title
    const titles = {
      'for-you': 'For You - Bay Area Discounts',
      'directory': 'Directory - Bay Area Discounts',
      'saved': 'Saved Programs - Bay Area Discounts'
    };
    if (titles[view]) {
      document.title = titles[view];
    }
  }

  /**
   * Update active nav item
   */
  function updateActiveNav(view) {
    const navItems = document.querySelectorAll('.sidebar-nav-item[data-view]');
    navItems.forEach(item => {
      const isActive = item.dataset.view === view;
      item.classList.toggle('active', isActive);
      item.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
  }

  /**
   * Initialize theme toggle in sidebar
   */
  function initThemeToggle() {
    const themeToggle = document.getElementById('sidebar-theme-toggle');
    const themeLabel = document.getElementById('theme-label');
    if (!themeToggle) return;

    // Update label based on current theme
    function updateThemeLabel() {
      const theme = localStorage.getItem('theme-preference') || 'auto';
      const labels = {
        'auto': 'System',
        'light': 'Light',
        'dark': 'Dark'
      };
      if (themeLabel) {
        themeLabel.textContent = labels[theme] || 'System';
      }
    }

    updateThemeLabel();

    themeToggle.addEventListener('click', () => {
      // Cycle through: auto -> light -> dark -> auto
      const current = localStorage.getItem('theme-preference') || 'auto';
      let next;
      if (current === 'auto') {
        next = 'light';
      } else if (current === 'light') {
        next = 'dark';
      } else {
        next = 'auto';
      }

      localStorage.setItem('theme-preference', next);

      // Apply theme
      const isDark = next === 'dark' || (next === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');

      updateThemeLabel();
    });
  }

  /**
   * Initialize saved programs count
   */
  function initSavedCount() {
    const badge = document.getElementById('saved-badge');
    const label = document.getElementById('saved-count-label');
    if (!badge && !label) return;

    function updateCount() {
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      const count = favorites.length;

      if (badge) {
        badge.textContent = count;
        badge.hidden = count === 0;
      }

      if (label) {
        label.textContent = count === 0 ? 'No saved' : `${count} saved`;
      }
    }

    // Initial count
    updateCount();

    // Listen for favorites changes
    window.addEventListener('storage', (e) => {
      if (e.key === 'favorites') {
        updateCount();
      }
    });

    // Also listen for custom events from favorites.js
    document.addEventListener('favoritesUpdated', updateCount);
  }

  /**
   * Initialize program count
   */
  function initProgramCount() {
    const label = document.getElementById('program-count-label');
    if (!label) return;

    // Count programs from DOM
    const programs = document.querySelectorAll('[data-program]');
    const count = programs.length;

    if (count > 0) {
      label.textContent = `${count} programs`;
    }
  }
})();
