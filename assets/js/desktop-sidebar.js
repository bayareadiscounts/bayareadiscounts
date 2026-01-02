/**
 * Desktop Sidebar Navigation
 * Handles sidebar auxiliary features (theme, install, etc.)
 * Note: Navigation is now handled via direct links in desktop-sidebar.html
 */

(function() {
  'use strict';

  // Wait for DOM to be ready
  document.addEventListener('DOMContentLoaded', initSidebar);

  function initSidebar() {
    const sidebar = document.getElementById('desktop-sidebar');
    if (!sidebar) return;

    // Initialize components
    initActionButtons();
  }

  /**
   * Initialize action buttons (Update Filters, Install)
   */
  function initActionButtons() {
    // Update Filters button - opens onboarding modal
    const updateFiltersBtn = document.getElementById('sidebar-update-filters');
    if (updateFiltersBtn) {
      updateFiltersBtn.addEventListener('click', () => {
        if (window.Onboarding && window.Onboarding.open) {
          window.Onboarding.open();
        }
      });
    }

    // Install App button
    const installBtn = document.getElementById('sidebar-install');
    const installItem = document.getElementById('sidebar-install-item');
    if (installBtn && installItem) {
      // Show install button when PWA install is available
      window.addEventListener('beforeinstallprompt', () => {
        installItem.style.display = '';
      });

      installBtn.addEventListener('click', async () => {
        if (typeof window.triggerPWAInstall === 'function') {
          await window.triggerPWAInstall();
        }
      });

      // Hide after app is installed
      window.addEventListener('appinstalled', () => {
        installItem.style.display = 'none';
      });
    }
  }
})();
