/**
 * Eligibility Wizard
 * Interactive step-by-step wizard to help users find programs they qualify for
 */

(function() {
  'use strict';

  const WIZARD_STEPS = [
    {
      id: 'household',
      title: 'Household Information',
      description: 'Tell us about your household to find relevant programs.',
      questions: [
        {
          id: 'household-size',
          type: 'select',
          label: 'How many people live in your household?',
          options: [
            { value: '1', label: '1 person' },
            { value: '2', label: '2 people' },
            { value: '3', label: '3 people' },
            { value: '4', label: '4 people' },
            { value: '5', label: '5 people' },
            { value: '6+', label: '6 or more people' }
          ]
        },
        {
          id: 'household-income',
          type: 'select',
          label: 'What is your approximate annual household income?',
          helpText: 'This helps determine eligibility for income-based programs.',
          options: [
            { value: 'under-20k', label: 'Under $20,000' },
            { value: '20k-40k', label: '$20,000 - $40,000' },
            { value: '40k-60k', label: '$40,000 - $60,000' },
            { value: '60k-80k', label: '$60,000 - $80,000' },
            { value: '80k-100k', label: '$80,000 - $100,000' },
            { value: 'over-100k', label: 'Over $100,000' },
            { value: 'prefer-not', label: 'Prefer not to say' }
          ]
        }
      ]
    },
    {
      id: 'demographics',
      title: 'About You',
      description: 'Select all categories that apply to you or members of your household.',
      questions: [
        {
          id: 'categories',
          type: 'checkbox-grid',
          label: 'Which of these apply to you?',
          options: [
            { value: 'seniors', label: 'Seniors (60+)', icon: 'user' },
            { value: 'youth', label: 'Youth/Minors', icon: 'users' },
            { value: 'veterans', label: 'Veterans/Military', icon: 'shield' },
            { value: 'disability', label: 'Disability', icon: 'heart' },
            { value: 'college-students', label: 'Students', icon: 'book' },
            { value: 'first-responders', label: 'First Responders', icon: 'zap' },
            { value: 'teachers', label: 'Teachers/Educators', icon: 'award' },
            { value: 'unemployed', label: 'Job Seekers', icon: 'briefcase' },
            { value: 'immigrants', label: 'Immigrants', icon: 'globe' },
            { value: 'caregivers', label: 'Caregivers', icon: 'heart' },
            { value: 'families', label: 'Families with Children', icon: 'users' },
            { value: 'pregnant', label: 'Pregnant', icon: 'heart' }
          ]
        }
      ]
    },
    {
      id: 'location',
      title: 'Your Location',
      description: 'Select your county to find local programs.',
      questions: [
        {
          id: 'county',
          type: 'select',
          label: 'Which Bay Area county do you live in?',
          options: [
            { value: '', label: 'Select a county...' },
            { value: 'alameda', label: 'Alameda County' },
            { value: 'contra-costa', label: 'Contra Costa County' },
            { value: 'marin', label: 'Marin County' },
            { value: 'napa', label: 'Napa County' },
            { value: 'san-francisco', label: 'San Francisco' },
            { value: 'san-mateo', label: 'San Mateo County' },
            { value: 'santa-clara', label: 'Santa Clara County' },
            { value: 'solano', label: 'Solano County' },
            { value: 'sonoma', label: 'Sonoma County' }
          ]
        }
      ]
    },
    {
      id: 'assistance',
      title: 'Current Assistance',
      description: 'Are you enrolled in any of these programs? This can help you qualify for additional benefits.',
      questions: [
        {
          id: 'current-programs',
          type: 'checkbox-grid',
          label: 'Select any programs you currently receive:',
          options: [
            { value: 'medi-cal', label: 'Medi-Cal', icon: 'heart' },
            { value: 'calfresh', label: 'CalFresh/EBT/SNAP', icon: 'shopping-bag' },
            { value: 'calworks', label: 'CalWORKs', icon: 'briefcase' },
            { value: 'ssi', label: 'SSI/SSDI', icon: 'dollar-sign' },
            { value: 'section8', label: 'Section 8/Housing Voucher', icon: 'home' },
            { value: 'wic', label: 'WIC', icon: 'users' },
            { value: 'liheap', label: 'LIHEAP', icon: 'zap' },
            { value: 'care-fera', label: 'CARE/FERA', icon: 'zap' },
            { value: 'lifeline', label: 'Lifeline Phone', icon: 'phone' },
            { value: 'none', label: 'None of these', icon: 'x' }
          ]
        }
      ]
    },
    {
      id: 'interests',
      title: 'Program Interests',
      description: 'What types of assistance are you looking for?',
      questions: [
        {
          id: 'categories-interest',
          type: 'checkbox-grid',
          label: 'Select all that interest you:',
          options: [
            { value: 'food', label: 'Food Assistance', icon: 'shopping-bag' },
            { value: 'health', label: 'Healthcare', icon: 'heart' },
            { value: 'utilities', label: 'Utility Discounts', icon: 'zap' },
            { value: 'housing', label: 'Housing Help', icon: 'home' },
            { value: 'transit', label: 'Transportation', icon: 'map' },
            { value: 'education', label: 'Education', icon: 'book' },
            { value: 'employment', label: 'Job Services', icon: 'briefcase' },
            { value: 'finance', label: 'Financial Help', icon: 'dollar-sign' },
            { value: 'technology', label: 'Internet/Phone', icon: 'wifi' },
            { value: 'recreation', label: 'Recreation', icon: 'star' },
            { value: 'childcare', label: 'Childcare', icon: 'users' },
            { value: 'legal', label: 'Legal Services', icon: 'shield' }
          ]
        }
      ]
    }
  ];

  let currentStep = 0;
  let answers = {};

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    // Only initialize on eligibility pages
    const eligibilityContainer = document.querySelector('.eligibility-grid, .eligibility-guide');
    if (!eligibilityContainer) return;

    createWizardButton();
    createWizardModal();
  }

  /**
   * Create the wizard launch button
   */
  function createWizardButton() {
    const eligibilityGrid = document.querySelector('.eligibility-grid');
    if (!eligibilityGrid) return;

    const button = document.createElement('button');
    button.id = 'launch-wizard';
    button.className = 'wizard-launch-btn';
    button.type = 'button';
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
      </svg>
      <span>Find Programs for Me</span>
      <span class="wizard-launch-subtitle">Answer a few questions to find programs you qualify for</span>
    `;

    button.addEventListener('click', openWizard);

    // Insert before the grid
    eligibilityGrid.parentNode.insertBefore(button, eligibilityGrid);
  }

  /**
   * Create the wizard modal
   */
  function createWizardModal() {
    const modal = document.createElement('div');
    modal.id = 'eligibility-wizard';
    modal.className = 'wizard-modal';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'wizard-title');

    modal.innerHTML = `
      <div class="wizard-backdrop"></div>
      <div class="wizard-content">
        <header class="wizard-header">
          <div class="wizard-header-content">
            <h2 class="wizard-title" id="wizard-title">Find Programs for You</h2>
            <p class="wizard-subtitle">Step <span id="wizard-step-num">1</span> of ${WIZARD_STEPS.length}</p>
          </div>
          <button class="wizard-close" type="button" aria-label="Close wizard">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>

        <div class="wizard-progress">
          ${WIZARD_STEPS.map((_, i) => `
            <div class="wizard-progress-step ${i === 0 ? 'current' : ''}" data-step="${i}">
              <span class="wizard-progress-dot"></span>
            </div>
          `).join('')}
        </div>

        <div class="wizard-body" id="wizard-body">
          <!-- Content rendered dynamically -->
        </div>

        <footer class="wizard-footer">
          <button class="wizard-btn wizard-btn-secondary" id="wizard-back" type="button">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Back
          </button>
          <button class="wizard-btn wizard-btn-primary" id="wizard-next" type="button">
            Next
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </footer>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    modal.querySelector('.wizard-backdrop').addEventListener('click', closeWizard);
    modal.querySelector('.wizard-close').addEventListener('click', closeWizard);
    modal.querySelector('#wizard-back').addEventListener('click', prevStep);
    modal.querySelector('#wizard-next').addEventListener('click', nextStep);

    // Keyboard
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeWizard();
    });
  }

  function openWizard() {
    const modal = document.getElementById('eligibility-wizard');
    if (!modal) return;

    currentStep = 0;
    answers = {};
    renderStep();
    modal.hidden = false;
    document.body.style.overflow = 'hidden';

    // Focus first interactive element
    setTimeout(() => {
      const firstInput = modal.querySelector('input, select, button:not(.wizard-close)');
      if (firstInput) firstInput.focus();
    }, 100);
  }

  function closeWizard() {
    const modal = document.getElementById('eligibility-wizard');
    if (!modal) return;

    modal.hidden = true;
    document.body.style.overflow = '';

    // Return focus
    const launcher = document.getElementById('launch-wizard');
    if (launcher) launcher.focus();
  }

  function prevStep() {
    if (currentStep > 0) {
      currentStep--;
      renderStep();
    }
  }

  function nextStep() {
    // Save current answers
    saveCurrentAnswers();

    if (currentStep < WIZARD_STEPS.length - 1) {
      currentStep++;
      renderStep();
    } else {
      // Show results
      showResults();
    }
  }

  function saveCurrentAnswers() {
    const modal = document.getElementById('eligibility-wizard');
    const step = WIZARD_STEPS[currentStep];

    step.questions.forEach(q => {
      if (q.type === 'select') {
        const select = modal.querySelector(`#${q.id}`);
        if (select) answers[q.id] = select.value;
      } else if (q.type === 'checkbox-grid') {
        const checked = modal.querySelectorAll(`[name="${q.id}"]:checked`);
        answers[q.id] = Array.from(checked).map(cb => cb.value);
      }
    });
  }

  function renderStep() {
    const modal = document.getElementById('eligibility-wizard');
    const step = WIZARD_STEPS[currentStep];
    const body = modal.querySelector('#wizard-body');

    // Update step number
    modal.querySelector('#wizard-step-num').textContent = currentStep + 1;

    // Update progress
    modal.querySelectorAll('.wizard-progress-step').forEach((el, i) => {
      el.classList.remove('completed', 'current');
      if (i < currentStep) el.classList.add('completed');
      if (i === currentStep) el.classList.add('current');
    });

    // Update buttons
    const backBtn = modal.querySelector('#wizard-back');
    const nextBtn = modal.querySelector('#wizard-next');
    backBtn.style.visibility = currentStep > 0 ? 'visible' : 'hidden';
    nextBtn.innerHTML = currentStep === WIZARD_STEPS.length - 1
      ? 'See Results <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>'
      : 'Next <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>';

    // Render step content
    body.innerHTML = `
      <h3 class="wizard-step-title">${step.title}</h3>
      <p class="wizard-step-description">${step.description}</p>

      ${step.questions.map(q => renderQuestion(q)).join('')}
    `;

    // Restore previous answers
    step.questions.forEach(q => {
      if (answers[q.id]) {
        if (q.type === 'select') {
          const select = modal.querySelector(`#${q.id}`);
          if (select) select.value = answers[q.id];
        } else if (q.type === 'checkbox-grid') {
          answers[q.id].forEach(val => {
            const cb = modal.querySelector(`[name="${q.id}"][value="${val}"]`);
            if (cb) {
              cb.checked = true;
              cb.closest('.wizard-checkbox-item')?.classList.add('selected');
            }
          });
        }
      }
    });

    // Add checkbox handlers
    body.querySelectorAll('.wizard-checkbox-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT') {
          const cb = item.querySelector('input');
          cb.checked = !cb.checked;
        }
        item.classList.toggle('selected', item.querySelector('input').checked);
      });
    });
  }

  function renderQuestion(q) {
    let html = `<div class="wizard-question">`;

    if (q.label) {
      html += `<label class="wizard-question-label" ${q.type === 'select' ? `for="${q.id}"` : ''}>${q.label}</label>`;
    }

    if (q.helpText) {
      html += `<p class="wizard-question-help">${q.helpText}</p>`;
    }

    if (q.type === 'select') {
      html += `
        <select class="wizard-select" id="${q.id}" name="${q.id}">
          ${q.options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('')}
        </select>
      `;
    } else if (q.type === 'checkbox-grid') {
      html += `<div class="wizard-checkbox-grid">`;
      q.options.forEach(opt => {
        html += `
          <label class="wizard-checkbox-item">
            <input type="checkbox" name="${q.id}" value="${opt.value}">
            <span class="wizard-checkbox-check">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </span>
            <span class="wizard-checkbox-label">${opt.label}</span>
          </label>
        `;
      });
      html += `</div>`;
    }

    html += `</div>`;
    return html;
  }

  function showResults() {
    saveCurrentAnswers();

    const modal = document.getElementById('eligibility-wizard');
    const body = modal.querySelector('#wizard-body');

    // Calculate matching programs
    const matchingPrograms = findMatchingPrograms();

    // Update header
    modal.querySelector('#wizard-step-num').textContent = 'Results';
    modal.querySelector('.wizard-title').textContent = 'Your Personalized Results';

    // Hide progress
    modal.querySelector('.wizard-progress').hidden = true;

    // Update footer
    modal.querySelector('#wizard-back').style.visibility = 'visible';
    modal.querySelector('#wizard-back').innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg>
      Start Over
    `;
    modal.querySelector('#wizard-back').onclick = () => {
      modal.querySelector('.wizard-progress').hidden = false;
      currentStep = 0;
      answers = {};
      renderStep();
    };

    modal.querySelector('#wizard-next').innerHTML = `
      View All Programs
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="5" y1="12" x2="19" y2="12"></line>
        <polyline points="12 5 19 12 12 19"></polyline>
      </svg>
    `;
    modal.querySelector('#wizard-next').onclick = () => {
      closeWizard();
      // Navigate to main page with filters
      window.location.href = '/#directory';
    };

    // Render results
    body.innerHTML = `
      <div class="wizard-results">
        <div class="wizard-results-summary">
          <div class="wizard-results-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <h3 class="wizard-results-title">We found ${matchingPrograms.length} programs for you!</h3>
          <p class="wizard-results-description">Based on your answers, here are programs you may qualify for.</p>
        </div>

        <div class="wizard-results-categories">
          ${renderResultsCategories(matchingPrograms)}
        </div>

        <div class="wizard-results-actions">
          <button class="wizard-btn wizard-btn-outline" onclick="window.print()">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            Print Results
          </button>
          <button class="wizard-btn wizard-btn-outline" id="save-preferences">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
            Save to Profile
          </button>
        </div>
      </div>
    `;

    // Handle save to profile
    modal.querySelector('#save-preferences')?.addEventListener('click', () => {
      // Save to For You preferences
      const prefs = {
        groups: answers['categories'] || [],
        county: answers['county'] || null
      };
      localStorage.setItem('user-preferences', JSON.stringify(prefs));
      document.dispatchEvent(new CustomEvent('preferencesUpdated', { detail: prefs }));

      // Show confirmation
      const btn = modal.querySelector('#save-preferences');
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Saved!
      `;
      btn.disabled = true;
    });
  }

  function findMatchingPrograms() {
    // This would match against actual program data
    // For now, return a count based on answers
    const categories = answers['categories'] || [];
    const interests = answers['categories-interest'] || [];
    const currentPrograms = answers['current-programs'] || [];

    // Simulate matching
    let count = 10; // Base count
    count += categories.length * 5;
    count += interests.length * 3;
    count += currentPrograms.length * 2;

    return Array(Math.min(count, 50)).fill({});
  }

  function renderResultsCategories(programs) {
    const interests = answers['categories-interest'] || [];
    if (interests.length === 0) {
      return '<p class="wizard-results-hint">Complete the wizard to see categorized results.</p>';
    }

    const categoryLabels = {
      'food': 'Food Assistance',
      'health': 'Healthcare',
      'utilities': 'Utility Discounts',
      'housing': 'Housing Help',
      'transit': 'Transportation',
      'education': 'Education',
      'employment': 'Job Services',
      'finance': 'Financial Help',
      'technology': 'Internet/Phone',
      'recreation': 'Recreation',
      'childcare': 'Childcare',
      'legal': 'Legal Services'
    };

    return interests.map(cat => `
      <div class="wizard-result-category">
        <h4 class="wizard-result-category-title">${categoryLabels[cat] || cat}</h4>
        <p class="wizard-result-category-count">~${Math.floor(Math.random() * 8) + 2} programs available</p>
      </div>
    `).join('');
  }

  // Expose for external use
  window.EligibilityWizard = {
    open: openWizard,
    close: closeWizard
  };
})();
