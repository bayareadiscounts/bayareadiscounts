/**
 * Eligibility Guide Interactive Features
 * Expandable sections, checklists, and county selector
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    initExpandableSections();
    initChecklists();
    initCountySelector();
    initDocumentChecklists();
  }

  /**
   * Initialize expandable sections (using <details> element)
   */
  function initExpandableSections() {
    const sections = document.querySelectorAll('.expandable-section');

    sections.forEach((section) => {
      const header = section.querySelector('.expandable-header');
      const content = section.querySelector('.expandable-content');

      if (!header || !content) return;

      // Convert to details/summary if not already
      if (section.tagName !== 'DETAILS') {
        const details = document.createElement('details');
        details.className = section.className;

        const summary = document.createElement('summary');
        summary.className = 'expandable-header';
        summary.innerHTML = header.innerHTML;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'expandable-content';
        contentDiv.innerHTML = content.innerHTML;

        details.appendChild(summary);
        details.appendChild(contentDiv);

        section.parentNode.replaceChild(details, section);
      }
    });
  }

  /**
   * Initialize interactive checklists
   */
  function initChecklists() {
    const checklists = document.querySelectorAll('.eligibility-checklist');

    checklists.forEach((checklist) => {
      const items = checklist.querySelectorAll('.eligibility-checklist-item');
      const progressBar = checklist.parentElement.querySelector('.progress-fill');
      const progressText = checklist.parentElement.querySelector('.progress-text');
      const storageKey = checklist.dataset.checklistId || 'eligibility-checklist';

      // Load saved state
      const savedState = JSON.parse(localStorage.getItem(storageKey) || '{}');

      items.forEach((item, index) => {
        const itemId = item.dataset.itemId || `item-${index}`;

        // Restore saved state
        if (savedState[itemId]) {
          item.classList.add('checked');
        }

        // Handle click
        item.addEventListener('click', () => {
          item.classList.toggle('checked');

          // Save state
          savedState[itemId] = item.classList.contains('checked');
          localStorage.setItem(storageKey, JSON.stringify(savedState));

          // Update progress
          updateProgress(checklist, progressBar, progressText);

          // Announce to screen readers
          const label = item.querySelector('.checklist-label')?.textContent || '';
          const status = item.classList.contains('checked') ? 'checked' : 'unchecked';
          announceToScreenReader(`${label} ${status}`);
        });

        // Keyboard support
        item.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            item.click();
          }
        });

        // Make focusable
        item.setAttribute('tabindex', '0');
        item.setAttribute('role', 'checkbox');
        item.setAttribute('aria-checked', item.classList.contains('checked'));
      });

      // Initial progress update
      updateProgress(checklist, progressBar, progressText);
    });
  }

  function updateProgress(checklist, progressBar, progressText) {
    const items = checklist.querySelectorAll('.eligibility-checklist-item');
    const checkedItems = checklist.querySelectorAll('.eligibility-checklist-item.checked');
    const total = items.length;
    const checked = checkedItems.length;
    const percentage = total > 0 ? (checked / total) * 100 : 0;

    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
    }

    if (progressText) {
      if (checked === total && total > 0) {
        progressText.innerHTML = '<strong>All requirements met!</strong> You may be eligible.';
      } else {
        progressText.innerHTML = `<strong>${checked}</strong> of <strong>${total}</strong> requirements checked`;
      }
    }

    // Update aria-checked on all items
    items.forEach((item) => {
      item.setAttribute('aria-checked', item.classList.contains('checked'));
    });
  }

  /**
   * Initialize county selector
   */
  function initCountySelector() {
    const selectors = document.querySelectorAll('.county-select');

    selectors.forEach((select) => {
      const container = select.closest('.county-selector');
      const infoCards = container?.querySelectorAll('.county-info') || [];

      // Load saved county
      const savedCounty = localStorage.getItem('selected-county');
      if (savedCounty) {
        select.value = savedCounty;
        showCountyInfo(savedCounty, infoCards);
      }

      select.addEventListener('change', () => {
        const county = select.value;
        localStorage.setItem('selected-county', county);
        showCountyInfo(county, infoCards);
      });
    });
  }

  function showCountyInfo(county, infoCards) {
    infoCards.forEach((card) => {
      if (card.dataset.county === county) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
  }

  /**
   * Initialize document checklists
   */
  function initDocumentChecklists() {
    const checklists = document.querySelectorAll('.document-checklist');

    checklists.forEach((checklist) => {
      const items = checklist.querySelectorAll('.document-item');
      const storageKey = checklist.dataset.checklistId || 'document-checklist';

      // Load saved state
      const savedState = JSON.parse(localStorage.getItem(storageKey) || '{}');

      items.forEach((item, index) => {
        const itemId = item.dataset.itemId || `doc-${index}`;

        // Restore saved state
        if (savedState[itemId]) {
          item.classList.add('checked');
        }

        // Handle click
        item.addEventListener('click', () => {
          item.classList.toggle('checked');

          // Save state
          savedState[itemId] = item.classList.contains('checked');
          localStorage.setItem(storageKey, JSON.stringify(savedState));

          // Announce to screen readers
          const label = item.querySelector('.document-label')?.textContent || '';
          const status = item.classList.contains('checked') ? 'gathered' : 'not gathered';
          announceToScreenReader(`${label} ${status}`);
        });

        // Keyboard support
        item.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            item.click();
          }
        });

        // Make focusable
        item.setAttribute('tabindex', '0');
        item.setAttribute('role', 'checkbox');
        item.setAttribute('aria-checked', item.classList.contains('checked'));
      });
    });
  }

  /**
   * Announce message to screen readers
   */
  function announceToScreenReader(message) {
    let announcer = document.getElementById('sr-announcer');
    if (!announcer) {
      announcer = document.createElement('div');
      announcer.id = 'sr-announcer';
      announcer.setAttribute('role', 'status');
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.className = 'sr-only';
      announcer.style.cssText =
        'position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;';
      document.body.appendChild(announcer);
    }

    announcer.textContent = message;
  }

  // Expose for external use
  window.EligibilityGuide = {
    initChecklists,
    initCountySelector,
    updateProgress,
  };
})();
