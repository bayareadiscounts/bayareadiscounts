---
layout: default
title: College & University Student Resources
description: Free and discounted benefits for Bay Area college and university students including food assistance, transit passes, emergency grants, recreation access, and more.
permalink: /college-university.html
---

<link rel="stylesheet" href="/assets/css/college-filter-styles.css">

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
    {% include college-program-card.html program=program %}
  {% endfor %}
</div>

---

_Last updated: December 12, 2025_  
_This is a community-maintained resource. [Contribute on GitHub](https://github.com/bayareadiscounts/bayareadiscounts)_

<script src="/assets/js/college-filter-script.js"></script>
