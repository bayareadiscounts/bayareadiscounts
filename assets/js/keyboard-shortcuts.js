// Keyboard Shortcuts for Bay Navigator
// Adapts to OS and browser

class KeyboardShortcuts {
  constructor() {
    this.platform = this.detectPlatform();
    this.browser = this.detectBrowser();
    this.shortcuts = this.getShortcutsForPlatform();
    this.init();
    this.updateShortcutDisplay();
  }

  detectPlatform() {
    const ua = navigator.userAgent.toLowerCase();
    const platform = navigator.platform?.toLowerCase() || '';

    if (platform.includes('mac') || ua.includes('mac')) {
      return 'mac';
    } else if (platform.includes('win') || ua.includes('win')) {
      return 'windows';
    } else if (ua.includes('linux') || ua.includes('x11')) {
      return 'linux';
    } else if (ua.includes('iphone') || ua.includes('ipad')) {
      return 'ios';
    } else if (ua.includes('android')) {
      return 'android';
    }
    return 'other';
  }

  detectBrowser() {
    const ua = navigator.userAgent.toLowerCase();

    // Order matters - check more specific browsers first
    if (ua.includes('brave')) {
      return 'brave';
    } else if (ua.includes('edg/')) {
      return 'edge';
    } else if (ua.includes('opr/') || ua.includes('opera')) {
      return 'opera';
    } else if (ua.includes('vivaldi')) {
      return 'vivaldi';
    } else if (ua.includes('firefox')) {
      return 'firefox';
    } else if (ua.includes('safari') && !ua.includes('chrome')) {
      return 'safari';
    } else if (ua.includes('chrome')) {
      return 'chrome';
    }
    return 'other';
  }

  getShortcutsForPlatform() {
    const isMac = this.platform === 'mac';
    const modKey = isMac ? '⌘' : 'Ctrl';
    const shiftKey = isMac ? '⇧' : 'Shift';
    const altKey = isMac ? '⌥' : 'Alt';

    // Base shortcuts
    const shortcuts = {
      search: {
        keys: isMac ? ['metaKey', 'k'] : ['ctrlKey', 'k'],
        display: `${modKey}+K`,
        displayParts: isMac ? ['⌘', 'K'] : ['Ctrl', 'K'],
        action: 'focusSearch',
        note: null,
      },
      darkmode: {
        keys: isMac ? ['metaKey', 'shiftKey', 'd'] : ['ctrlKey', 'shiftKey', 'd'],
        display: `${modKey}+${shiftKey}+D`,
        displayParts: isMac ? ['⌘', '⇧', 'D'] : ['Ctrl', 'Shift', 'D'],
        action: 'toggleDarkMode',
        note: null,
      },
      help: {
        keys: ['?'],
        display: '?',
        displayParts: ['?'],
        action: 'showHelp',
        note: null,
      },
      searchAlt: {
        keys: ['/'],
        display: '/',
        displayParts: ['/'],
        action: 'focusSearch',
        note: null,
      },
    };

    // Browser-specific conflicts and notes
    this.browserNotes = this.getBrowserNotes(modKey, shiftKey);

    return shortcuts;
  }

  getBrowserNotes(modKey, shiftKey) {
    const notes = {
      brave: {
        conflicts: [],
        note: `Brave: All shortcuts work. ${modKey}+K opens search.`,
      },
      chrome: {
        conflicts: [],
        note: `Chrome: All shortcuts work.`,
      },
      firefox: {
        conflicts: ['search'],
        note: `Firefox: ${modKey}+K may focus browser search. Use / instead.`,
      },
      safari: {
        conflicts: [],
        note: `Safari: All shortcuts work.`,
      },
      edge: {
        conflicts: [],
        note: `Edge: All shortcuts work.`,
      },
      opera: {
        conflicts: [],
        note: `Opera: All shortcuts work.`,
      },
      vivaldi: {
        conflicts: [],
        note: `Vivaldi: All shortcuts work.`,
      },
    };

    return notes[this.browser] || { conflicts: [], note: '' };
  }

  updateShortcutDisplay() {
    const container = document.getElementById('sidebar-shortcuts');
    if (!container) return;

    // Update each shortcut display
    Object.entries(this.shortcuts).forEach(([name, shortcut]) => {
      const el = container.querySelector(`[data-shortcut="${name}"]`);
      if (!el) return;

      const keyEl = el.querySelector('.sidebar-shortcut-key');
      if (keyEl) {
        // Build the key display with proper styling
        keyEl.innerHTML = shortcut.displayParts
          .map((part) => {
            if (part === '⌘') return '<span class="kbd-symbol">⌘</span>';
            if (part === '⇧') return '<span class="kbd-symbol">⇧</span>';
            if (part === '⌥') return '<span class="kbd-symbol">⌥</span>';
            if (part === 'Ctrl') return '<span class="kbd-text">Ctrl</span>';
            if (part === 'Shift') return '<span class="kbd-text">Shift</span>';
            if (part === 'Alt') return '<span class="kbd-text">Alt</span>';
            return `<span class="kbd-key">${part}</span>`;
          })
          .join('<span class="kbd-plus">+</span>');

        // Check for browser conflicts
        if (this.browserNotes.conflicts.includes(name)) {
          el.classList.add('has-conflict');
          keyEl.title = `May conflict with browser shortcut. ${this.browserNotes.note}`;
        }
      }
    });

    // Update browser note
    const noteEl = document.getElementById('shortcuts-browser-note');
    if (noteEl && this.browserNotes.note) {
      // Only show note if there are conflicts or useful info
      if (this.browserNotes.conflicts.length > 0) {
        noteEl.textContent = this.browserNotes.note;
        noteEl.style.display = 'block';
      } else {
        noteEl.style.display = 'none';
      }
    }
  }

  init() {
    document.addEventListener('keydown', (e) => {
      // Don't trigger if user is typing in an input
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.tagName === 'SELECT'
      ) {
        // Allow Escape to blur input
        if (e.key === 'Escape') {
          e.target.blur();
        }
        return;
      }

      // ⌘K or Ctrl+K - Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.focusSearch();
        return;
      }

      // ⌘⇧D or Ctrl+Shift+D - Toggle dark mode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        this.toggleDarkMode();
        return;
      }

      // ? - Show help (keyboard shortcuts)
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        this.showHelp();
        return;
      }

      // / - Also focus search (common convention)
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        this.focusSearch();
        return;
      }

      // Escape - Clear filters or close modals
      if (e.key === 'Escape') {
        this.handleEscape();
        return;
      }
    });
  }

  focusSearch() {
    const searchInput =
      document.getElementById('search-input') || document.getElementById('search');
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }

  toggleDarkMode() {
    const current = localStorage.getItem('theme-preference') || 'auto';
    let next;

    // Cycle through: auto -> light -> dark -> auto
    if (current === 'auto') {
      next = 'light';
    } else if (current === 'light') {
      next = 'dark';
    } else {
      next = 'auto';
    }

    localStorage.setItem('theme-preference', next);

    // Apply theme
    const isDark =
      next === 'dark' ||
      (next === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');

    // Update sidebar theme label if it exists
    const themeLabel = document.getElementById('theme-label');
    if (themeLabel) {
      const labels = { auto: 'System', light: 'Light', dark: 'Dark' };
      themeLabel.textContent = labels[next] || 'System';
    }

    // Update utility bar theme select if it exists
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
      themeSelect.value = next;
    }
  }

  handleEscape() {
    // Close any open modals first
    const openModals = document.querySelectorAll(
      '.modal.show, .modal.open, [role="dialog"][open], #accessibility-panel.open'
    );
    if (openModals.length > 0) {
      openModals.forEach((modal) => {
        modal.classList.remove('show', 'open');
        if (modal.hasAttribute('open')) {
          modal.removeAttribute('open');
        }
      });
      return;
    }

    // Close onboarding modal if open
    const onboarding = document.getElementById('onboarding-modal');
    if (onboarding && !onboarding.hidden) {
      if (window.Onboarding && window.Onboarding.close) {
        window.Onboarding.close();
      } else {
        onboarding.hidden = true;
      }
      return;
    }

    // Otherwise clear filters
    if (window.searchFilter && typeof window.searchFilter.resetFilters === 'function') {
      window.searchFilter.resetFilters();
    }

    // Also clear search input
    const searchInput =
      document.getElementById('search-input') || document.getElementById('search');
    if (searchInput) {
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  showHelp() {
    // Toggle accessibility panel which has help info
    const accessibilityPanel = document.getElementById('accessibility-panel');
    if (accessibilityPanel) {
      accessibilityPanel.classList.toggle('open');
      return;
    }

    // Or show a keyboard help modal if it exists
    const helpModal = document.getElementById('keyboard-help-modal');
    if (helpModal) {
      helpModal.classList.add('show');
    }
  }
}

// Initialize keyboard shortcuts
document.addEventListener('DOMContentLoaded', function () {
  window.keyboardShortcuts = new KeyboardShortcuts();
});
