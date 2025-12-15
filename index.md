---
layout: default
---

{% include site-header.html %}

<script>
  // Mark current page as active
  document.addEventListener('DOMContentLoaded', function() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
      const linkPath = new URL(link.href).pathname;
      if (linkPath === currentPath || (currentPath === '/' && linkPath === '/')) {
        link.setAttribute('aria-current', 'page');
      }
    });
  });
</script>

Stretch your budget and discover more of what your community has to offer.

This guide features free and low cost services, programs, and benefits across the counties commonly recognized as the San Francisco Bay Area: Alameda, Contra Costa, Marin, Napa, San Francisco, San Mateo, Santa Clara, Solano, and Sonoma. Resources are highlighted for public benefit recipients such as SNAP/EBT/Medi Cal, seniors, youth, college students, military members and veterans, and anyone looking to reduce everyday expenses, including local nonprofit organizations.

As a community driven project, we work to keep information current. However, availability and eligibility can change, and some listings may occasionally be out of date. Always refer to the program’s website for the most up to date details.

  <div style="margin-bottom: 30px;">
    <h3 style="color: var(--text-heading, #333); font-size: 1.1em; margin-bottom: 10px;">💡 Support This Project</h3>
    <p>If this guide helps you save, consider supporting us here:</p>
    <!-- WCAG 2.2: Button image has sufficient touch target with link wrapping -->
    <a href="https://www.buymeacoffee.com/bayareadiscounts" target="_blank" rel="noopener noreferrer" style="display: inline-block; min-height: 48px; min-width: auto; padding: 0;">
      <img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=bayareadiscounts&button_colour=40DCA5&font_colour=ffffff&font_family=Cookie&outline_colour=000000&coffee_colour=FFDD00" alt="Buy Me a Coffee" style="display: block; min-height: 48px;" />
    </a>
  </div>

---

<br>

{% include search-filter-ui.html %}

<div id="search-results" class="programs-container">

{% for category in site.data.programs %}
  {% for program in category[1] %}
    {% include program-card.html program=program %}
  {% endfor %}
{% endfor %}

</div>
