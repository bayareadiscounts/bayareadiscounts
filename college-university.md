---
layout: default
title: College & University Student Resources
description: Free and discounted benefits for Bay Area college and university students including food assistance, transit passes, emergency grants, recreation access, and more.
permalink: /college-university.html
extra_css:
  - /assets/css/college-filter-styles.css
  - /assets/css/college-card-styles.css
---

<h1 style="display:none">College & University Student Resources</h1>

<a href="https://bayareadiscounts.com" class="site-logo">
  <img src="https://raw.githubusercontent.com/bayareadiscounts/bayareadiscounts/refs/heads/main/logo.png" 
       alt="Bay Area Discounts logo">
</a>

# College & University Student Resources

Comprehensive guide to 150+ free and discounted benefits available exclusively to students enrolled at Bay Area colleges and universities. Benefits include transit passes, food assistance, emergency grants, recreation access, wellness services, and more.

_Always verify benefits and eligibility with your college or university as programs and requirements may change._

---

## 🔍 Search All Programs

{% include college-filter-ui.html %}

<div id="search-results" class="programs-container">
  {% for program in site.data.college-programs.programs %}
    <div 
      class="program-card"
      data-program-card="true"
      data-title="{{ program.title }}"
      data-institution="{{ program.institution }}"
      data-location="{{ program.location }}"
      data-tags="{{ program.tags }}"
      data-type="{{ program.type }}"
      data-benefit="{{ program.benefit }}"
      role="article"
    >
      <h3 class="program-name">{{ program.title }}</h3>
      <p class="program-meta">
        <span class="program-college">{{ program.institution }}</span>
        <span class="program-location">{{ program.location }}</span>
      </p>
      <p class="program-benefit">{{ program.benefit }}</p>
      <div class="program-footer">
        <div class="program-details">
          <strong>How to Use:</strong>
          <p>{{ program.how_to_use }}</p>
        </div>
        <span class="program-timeframe">{{ program.timeframe }}</span>
        <a href="{{ program.link }}" class="program-link" target="_blank" rel="noopener noreferrer">Learn More</a>
      </div>
    </div>
  {% endfor %}
</div>

---

_Last updated: December 12, 2025_  
_This is a community-maintained resource. [Contribute on GitHub](https://github.com/bayareadiscounts/bayareadiscounts)_

<script src="/assets/js/college-filter-script.js"></script>
