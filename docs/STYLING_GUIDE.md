# Styling Guide

This document explains the standardized styling system for Bay Navigator, ensuring consistent appearance across all pages without requiring custom CSS for each page.

## Quick Start

For any new content page (like privacy policy, about, terms, etc.), simply use the `content-wrapper` class:

```markdown
---
layout: default
title: Your Page Title
---

<div class="content-wrapper" markdown="1">

# Your Page Heading

Your content here...

</div>
```

That's it! No custom CSS needed. The page will automatically have:

- Consistent typography
- Proper spacing
- Dark mode support
- Responsive design
- Accessible color contrast

## CSS Variables

All colors and styles use CSS variables defined in `assets/css/base.css`. These variables automatically adapt to:

- System dark mode preference (`@media (prefers-color-scheme: dark)`)
- Manual theme selection (`body[data-theme="dark"]` or `body[data-theme="light"]`)

### Available Variables

#### Colors

- `--primary-teal`: #00acc1 (Main brand color)
- `--primary-teal-dark`: #00838f
- `--primary-teal-darker`: #006064
- `--accent-orange`: #ff6f00
- `--accent-orange-light`: #ff8f00

#### Backgrounds

- `--bg-body`: Page background gradient
- `--bg-main`: Main content background (white/dark)
- `--bg-table-hover`: Table row hover color
- `--bg-footer`: Footer background

#### Text

- `--text-primary`: Main text color (dark/light based on theme)
- `--text-heading`: Heading color (teal in light mode, cyan in dark mode)
- `--text-link`: Link color
- `--text-link-hover`: Link hover color

#### Borders & Shadows

- `--border-color`: Standard border color
- `--border-light`: Light border (cyan-based)
- `--shadow`: Box shadow color
- `--shadow-light`: Lighter shadow

## Standard Classes

### `.content-wrapper`

The main class for content pages. Provides:

- Max width: 900px
- Centered layout
- Proper padding and spacing
- Responsive typography
- Dark mode support

**Usage:**

```html
<div class="content-wrapper" markdown="1">
  <!-- Your markdown content -->
</div>
```

**Includes:**

- H1-H6 styling with proper hierarchy
- Paragraph spacing
- Link styling with underlines
- Strong/bold text emphasis
- Code block styling
- Horizontal rules
- List styling

### `.sr-only`

Screen reader only content (visually hidden but accessible):

```html
<h1 class="sr-only">Page Title for Screen Readers</h1>
```

### `.container`

Standard page container (already used in main layouts):

- Max width: 1200px
- Centered with auto margins
- Responsive padding

## Dark Mode

Dark mode works automatically through:

1. **System Preference**: Uses `@media (prefers-color-scheme: dark)`
2. **Manual Toggle**: Uses `body[data-theme="dark"]` or `body[data-theme="light"]`

All CSS variables automatically switch between light and dark values. You don't need to add custom dark mode CSS when using the standard classes.

### Dark Mode Colors

**Light Mode:**

- Background: white
- Text: #24292e (dark gray)
- Headings: #00838f (teal)
- Links: #00838f (teal)

**Dark Mode:**

- Background: #0d1117 (dark)
- Text: #e8eef5 (light gray)
- Headings: #79d8eb (cyan)
- Links: #79d8eb (cyan)

## Typography

### Font Stack

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
```

System fonts for optimal performance and native feel.

### Heading Sizes

- **H1**: 2.5rem (40px)
- **H2**: 2rem (32px) - with bottom border
- **H3**: 1.5rem (24px)
- **H4-H6**: Progressively smaller

### Line Height

- Body text: 1.8 (for readability)
- Headings: Default

## Responsive Design

All standard classes are mobile-first and responsive:

- **Mobile (< 768px)**: Optimized padding and font sizes
- **Tablet (769px - 1024px)**: Medium spacing
- **Desktop (> 1024px)**: Full spacing and sizing

## Accessibility Features

### WCAG 2.2 AAA Compliance

1. **Text Spacing**: Enhanced spacing mode available via utility bar
   - Letter spacing: 0.12em
   - Word spacing: 0.16em
   - Line height: 1.8
   - Paragraph spacing: 2em

2. **Color Contrast**: All colors meet WCAG AAA standards
   - Light mode: 7:1+ contrast ratio
   - Dark mode: 7:1+ contrast ratio

3. **Focus Indicators**: All interactive elements have visible focus states

4. **Landmarks**: Proper semantic HTML structure
   - `<header>` for site header
   - `<main>` for main content
   - `<nav>` for navigation
   - `<footer>` for footer

## Adding New Pages

### Example: Creating a new Terms of Service page

1. Create `terms.md`:

```markdown
---
layout: default
title: Terms of Service - Bay Navigator
description: Terms and conditions for using Bay Navigator
---

<div class="content-wrapper" markdown="1">

# Terms of Service

**Last Updated**: December 18, 2025

## Acceptance of Terms

By accessing and using this website...

## User Responsibilities

Users of this site agree to...

</div>
```

2. That's it! No custom CSS needed. The page will automatically have:
   - Consistent styling with other pages
   - Dark mode support
   - Responsive design
   - Proper accessibility

## Custom Styling (When Needed)

If you need custom styling for a specific component, add it in a `<style>` block AFTER the frontmatter and BEFORE the content:

```markdown
---
layout: default
title: Custom Page
---

<style>
.custom-component {
  /* Your custom styles */
  /* Use CSS variables for colors! */
  background: var(--bg-main);
  color: var(--text-primary);
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .custom-component {
    /* Dark mode overrides if needed */
  }
}

body[data-theme="dark"] .custom-component {
  /* Manual dark mode overrides */
}
</style>

<div class="content-wrapper" markdown="1">
  <!-- Content -->
</div>
```

## Migration from Custom CSS

If you have an existing page with custom CSS (like the old privacy-content class), migrate to content-wrapper:

**Before:**

```markdown
<style>
.privacy-content {
  max-width: 900px;
  margin: 0 auto;
  /* ... lots of custom CSS ... */
}
</style>

<div class="privacy-content" markdown="1">
```

**After:**

```markdown
<div class="content-wrapper" markdown="1">
```

Delete all the custom CSS! The standardized class handles everything.

## Files Modified

- `assets/css/base.css` - Core variables and `.content-wrapper` class
- `_includes/site-header.html` - Header component with dark mode support
- `privacy.md` - Example usage of `.content-wrapper`

## Testing

Run the full test suite to verify styling works across all viewports:

```bash
npx playwright test tests/recent-changes.spec.js
```

Tests verify:

- Responsive design (mobile, tablet, desktop)
- Dark mode toggle functionality
- Theme override behavior
- Content visibility
- ADA compliance
