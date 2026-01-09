/**
 * Bay Navigator - Unified Preferences System
 * Single source of truth for user preferences across the entire site
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'baynavigator_preferences';
  const VERSION = 1;

  // Default preferences
  const DEFAULT_PREFS = {
    version: VERSION,
    groups: [],
    county: null,
    completedOnboarding: false,
    lastUpdated: null,
  };

  let currentPrefs = null;

  /**
   * Load preferences from localStorage
   */
  function load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        currentPrefs = { ...DEFAULT_PREFS };
        return currentPrefs;
      }

      const parsed = JSON.parse(stored);

      // Migration from old storage keys
      if (!parsed.version) {
        currentPrefs = migrateOldPrefs(parsed);
        save(currentPrefs);
        return currentPrefs;
      }

      currentPrefs = { ...DEFAULT_PREFS, ...parsed };
      return currentPrefs;
    } catch (e) {
      console.error('Error loading preferences:', e);
      currentPrefs = { ...DEFAULT_PREFS };
      return currentPrefs;
    }
  }

  /**
   * Migrate from old preference formats
   */
  function migrateOldPrefs(oldData) {
    const migrated = { ...DEFAULT_PREFS };

    // Try to extract data from various old formats
    if (oldData.groups) {
      migrated.groups = Array.isArray(oldData.groups) ? oldData.groups : [];
    }
    if (oldData.eligibility) {
      migrated.groups = Array.isArray(oldData.eligibility) ? oldData.eligibility : [];
    }
    if (oldData.county) {
      migrated.county = oldData.county;
    }

    // Check if user had completed any onboarding
    migrated.completedOnboarding = !!(migrated.groups.length > 0 || migrated.county);
    migrated.lastUpdated = Date.now();

    return migrated;
  }

  /**
   * Save preferences to localStorage
   */
  function save(prefs) {
    try {
      prefs.lastUpdated = Date.now();
      prefs.version = VERSION;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
      currentPrefs = prefs;

      // Dispatch event for other components
      document.dispatchEvent(
        new CustomEvent('preferencesChanged', {
          detail: { ...prefs },
        })
      );

      return true;
    } catch (e) {
      console.error('Error saving preferences:', e);
      return false;
    }
  }

  /**
   * Get current preferences
   */
  function get() {
    if (!currentPrefs) {
      load();
    }
    return { ...currentPrefs };
  }

  /**
   * Update specific preference values
   */
  function update(updates) {
    const prefs = get();
    Object.assign(prefs, updates);
    return save(prefs);
  }

  /**
   * Set groups
   */
  function setGroups(groups) {
    return update({ groups: Array.isArray(groups) ? groups : [] });
  }

  /**
   * Set county
   */
  function setCounty(county) {
    return update({ county: county || null });
  }

  /**
   * Mark onboarding as complete
   */
  function completeOnboarding(groups, county) {
    return save({
      ...get(),
      groups: groups || [],
      county: county || null,
      completedOnboarding: true,
    });
  }

  /**
   * Check if user has completed onboarding
   */
  function hasCompletedOnboarding() {
    const prefs = get();
    return prefs.completedOnboarding === true;
  }

  /**
   * Check if user has any preferences set
   */
  function hasPreferences() {
    const prefs = get();
    return (prefs.groups && prefs.groups.length > 0) || prefs.county;
  }

  /**
   * Reset all preferences
   */
  function reset() {
    currentPrefs = { ...DEFAULT_PREFS };
    try {
      localStorage.removeItem(STORAGE_KEY);
      // Also clean up old keys
      localStorage.removeItem('bad_prefs');
      localStorage.removeItem('bad_wizard_progress');
      localStorage.removeItem('user-preferences');

      document.dispatchEvent(
        new CustomEvent('preferencesChanged', {
          detail: { ...currentPrefs },
        })
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Migrate from all old storage formats on init
   */
  function migrateAllOldData() {
    // Check if we already have new format
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        if (parsed.version === VERSION) {
          return; // Already migrated
        }
      } catch (e) {
        // Continue with migration
      }
    }

    // Try to find old data
    const oldKeys = ['bad_prefs', 'user-preferences', 'bad_wizard_progress'];
    let oldData = null;

    for (const key of oldKeys) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          oldData = JSON.parse(data);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (oldData) {
      const migrated = migrateOldPrefs(oldData);
      save(migrated);

      // Clean up old keys
      oldKeys.forEach((key) => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          // Ignore
        }
      });
    }
  }

  // Initialize on load
  document.addEventListener('DOMContentLoaded', function () {
    migrateAllOldData();
    load();
  });

  // Expose globally
  window.Preferences = {
    load,
    save,
    get,
    update,
    setGroups,
    setCounty,
    completeOnboarding,
    hasCompletedOnboarding,
    hasPreferences,
    reset,
  };
})();
