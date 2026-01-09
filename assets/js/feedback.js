/**
 * Bay Navigator - Simple Feedback System
 * Allows users to submit feedback via pre-filled GitHub Issues
 */
(function () {
  'use strict';

  const GITHUB_REPO = 'baytides/baynavigator';

  const feedbackTypes = {
    general: { label: 'General Feedback', ghLabel: 'feedback' },
    bug: { label: 'Bug Report', ghLabel: 'bug' },
    'program-issue': { label: 'Program Data Issue', ghLabel: 'data' },
    feature: { label: 'Feature Request', ghLabel: 'enhancement' },
    accessibility: { label: 'Accessibility Issue', ghLabel: 'accessibility' },
  };

  const Feedback = {
    createButton() {
      // Add feedback button to utility bar
      const utilityControls = document.querySelector('.utility-controls');
      if (!utilityControls || document.getElementById('feedback-btn')) return;

      const feedbackItem = document.createElement('div');
      feedbackItem.className = 'utility-item';
      feedbackItem.innerHTML = `
        <button type="button" id="feedback-btn" class="utility-btn" aria-label="Send feedback">
          <svg class="utility-icon" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
          </svg>
          <span>Feedback</span>
        </button>
      `;

      // Insert before the Install App item or at the end
      const installItem = document.getElementById('install-app-item');
      if (installItem) {
        utilityControls.insertBefore(feedbackItem, installItem);
      } else {
        utilityControls.appendChild(feedbackItem);
      }

      // Wire up click handler
      document.getElementById('feedback-btn').addEventListener('click', () => this.showModal());
    },

    showModal() {
      // Remove existing modal if any
      const existing = document.getElementById('feedback-modal');
      if (existing) existing.remove();

      const modal = document.createElement('div');
      modal.id = 'feedback-modal';
      modal.className = 'feedback-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'feedback-title');

      let typeOptions = '';
      Object.entries(feedbackTypes).forEach(([key, value]) => {
        typeOptions += `<option value="${key}">${value.label}</option>`;
      });

      modal.innerHTML = `
        <div class="feedback-modal-backdrop"></div>
        <div class="feedback-modal-content">
          <h3 id="feedback-title">Send Feedback</h3>

          <label for="feedback-type" class="sr-only">Feedback type</label>
          <select id="feedback-type" class="feedback-type-select">
            ${typeOptions}
          </select>

          <label for="feedback-text" class="sr-only">Your feedback</label>
          <textarea
            id="feedback-text"
            class="feedback-textarea"
            placeholder="Tell us what's on your mind..."
            maxlength="2000"
          ></textarea>

          <div class="feedback-modal-actions">
            <button type="button" class="feedback-modal-cancel">Cancel</button>
            <button type="button" class="feedback-modal-submit">Submit on GitHub</button>
          </div>

          <p class="feedback-note">Opens a pre-filled GitHub issue. No account required to view, but you'll need one to submit.</p>
        </div>
      `;

      document.body.appendChild(modal);

      const textarea = modal.querySelector('#feedback-text');
      const typeSelect = modal.querySelector('#feedback-type');
      const submitBtn = modal.querySelector('.feedback-modal-submit');
      const cancelBtn = modal.querySelector('.feedback-modal-cancel');
      const backdrop = modal.querySelector('.feedback-modal-backdrop');

      // Focus textarea
      setTimeout(() => textarea.focus(), 100);

      // Submit handler
      submitBtn.addEventListener('click', () => {
        const text = textarea.value.trim();
        if (!text) {
          textarea.focus();
          return;
        }
        const type = typeSelect.value;
        this.submit(type, text);
        modal.remove();
      });

      // Cancel/close handlers
      cancelBtn.addEventListener('click', () => modal.remove());
      backdrop.addEventListener('click', () => modal.remove());

      // Escape key to close
      modal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') modal.remove();
      });
    },

    submit(type, text) {
      const feedbackType = feedbackTypes[type] || feedbackTypes.general;

      // Build title (first 60 chars of feedback or type label)
      const titleText = text.length > 60 ? text.substring(0, 57) + '...' : text;
      const title = `[${feedbackType.label}] ${titleText}`;

      // Build body with context
      const body = `## Feedback

${text}

---

**Submitted from:** ${window.location.href}
**User Agent:** ${navigator.userAgent}
**Timestamp:** ${new Date().toISOString()}

---
*Submitted via Bay Navigator feedback form*`;

      // Build GitHub issue URL
      const params = new URLSearchParams({
        title: title,
        body: body,
        labels: feedbackType.ghLabel,
      });

      const url = `https://github.com/${GITHUB_REPO}/issues/new?${params.toString()}`;

      // Open in new tab
      window.open(url, '_blank', 'noopener');

      // Show confirmation toast
      this.showToast('Opening GitHub to submit your feedback...');
    },

    showToast(message) {
      const toastId = 'feedback-toast';
      let toast = document.getElementById(toastId);
      if (toast) toast.remove();

      toast = document.createElement('div');
      toast.id = toastId;
      toast.className = 'toast-message';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 4000);
    },

    init() {
      this.createButton();
    },
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Feedback.init());
  } else {
    Feedback.init();
  }

  // Export for external use
  window.feedback = Feedback;
})();
