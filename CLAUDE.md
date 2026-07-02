# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static website for **Autovermietung Heinzelmann GbR**, a regional vehicle rental company in Herbertingen, Germany. No build system — plain HTML/CSS/JS. Hosted on GitHub Pages.

**Live site:** https://heinzeldavidmann.github.io/autovermietung-heinzelmann/

To preview locally: open any `.html` file in a browser, or run a simple HTTP server:
```bash
python3 -m http.server 8000
```

## File Structure

| File | Purpose |
|------|---------|
| `index.html` | Main landing page — all primary sections live here |
| `fuhrpark.html` | Vehicle fleet overview |
| `pkw.html` | PKW fleet detail page |
| `transporter.html` | Transporter fleet detail page |
| `9sitzer.html` | 9-Sitzer & Busse fleet detail page |
| `preise.html` | Rental info, price lists (PDF embed), FAQ accordion |
| `ueber_uns.html` | Company history with timeline |
| `impressum.html` | Legal notice (Impressum) |
| `datenschutz.html` | Privacy policy (Datenschutzerklärung) |
| `style.css` | Single stylesheet for all pages |
| `index.js` | Contact form, FAQ accordion, mobile nav, fuhrpark finder, testimonials slider, cookie consent, map consent, opening hours, custom select sync |
| `images/` | All photos (JPG/HEIC/WebP) |
| `preislisten/` | PDF price lists (Anhänger, Transporter, PKW, LKW, Umzugszubehör) |
| `robots.txt` / `sitemap.xml` | SEO crawl/index directives |
| `CNAME` | Custom domain for GitHub Pages (autovermietung-heinzelmann.de) |

## Design System (style.css)

All pages share one stylesheet. Key CSS custom properties defined in `:root`:

```css
--color-primary: #e60000        /* Heinzelmann red */
--color-primary-dark: #8a0000   /* hover state */
--color-dark: #111827
--color-muted: #666666
--color-border: #e5e7eb
--radius-md: 16px
--radius-lg: 28px
--transition: 0.28s cubic-bezier(0.4, 0, 0.2, 1)  /* all hover effects */
--container: 1180px
--header-offset: 96px           /* fixed header height */
--utility-height: 56px          /* fixed utility bar height */
```

Body has `padding-top: calc(var(--header-offset) + var(--utility-height))` to clear both fixed bars.

## Component Patterns

**Eyebrow label** — always use this pattern before section headings:
```html
<div class="section-heading">
    <p class="eyebrow">Label text</p>
    <h2>Section title</h2>
    <p>Optional description</p>
</div>
```

**Buttons** — use `.button` for primary (red), `.button-secondary` for outlined:
```html
<a href="..." class="button">Text</a>
<a href="..." class="button button-secondary">Text</a>
```

**Vehicle cards** — clickable cards with image, label, title, text, link:
```html
<a href="..." class="vehicle">
    <div class="vehicle-img-wrap"><img src="..." alt="..."></div>
    <div class="vehicle-body">
        <span class="vehicle-label">Category</span>
        <h3>Name</h3>
        <p>Description</p>
        <span class="vehicle-link">Label →</span>
    </div>
</a>
```

**Anforderungen (requirements) layout** — 2-column: intro left, icon list right. Used on both `index.html` and `preise.html`.

## Navigation

All pages share the same header/utility bar HTML. Nav links use plain text (no `<em>` or `CAPS`):
```html
<li><a href="index.html">Startseite</a></li>
<li><a href="fuhrpark.html">Fuhrpark</a></li>
<li><a href="preise.html">Preise</a></li>
<li><a href="ueber_uns.html">Über uns</a></li>
<li><a href="index.html#kontakt">Kontakt</a></li>  <!-- links to section, not subpage -->
```

**Important:** "Kontakt" in the nav and all "Jetzt anfragen" / "Nachricht senden" buttons link to `index.html#kontakt`.

## JavaScript (index.js)

Ten responsibilities, called in order from the central `DOMContentLoaded` listener:
1. **Contact form** — `setupContactForm()` submits `.inquiry-form` via Netlify Forms (`fetch('/', ...)`); requires the site to be hosted on Netlify with `data-netlify="true"` + a hidden `form-name` field on the `<form>` to actually work
2. **FAQ accordion** — `setupFaqAccordion()` toggles `.faq-answer` visibility
3. **Mobile nav toggle** — `setupMobileNavToggle()` controls `.nav-open` on `header.site-header`
4. **Fuhrpark finder** — `setupFuhrparkFinder()` question-tree vehicle-type finder on `fuhrpark.html`
5. **Testimonials slider** — `setupTestimonialsSlider()` customer review carousel
6. **Form prefill** — `prefillFormFromUrl()` pre-fills form fields from link query params
7. **Cookie consent** — `setupCookieConsent()` shows a cookie banner on first visit
8. **Map consent** — `setupMapConsent()` loads the Google Maps embed only after a click on `.map-consent-load-btn`
9. **Opening hours** — updates `#open-status` with current status based on `OPENING_HOURS` object (Mo–Fr 8–12 & 13–18, Sa 9–13)
10. **Custom select** — syncs `#fahrzeug` select value to `.custom-select-display` span

New `setup*()` functions must be added to the `DOMContentLoaded` listener, otherwise they never run. Script must use `defer` attribute: `<script src="index.js" defer></script>`

## Opening Hours Data

Defined in `index.js` — update here when hours change:
```js
const OPENING_HOURS = {
    0: null,                                          // Sonntag: geschlossen
    1: [["07:30", "12:00"], ["13:00", "18:00"]],    // Mo
    2: [["07:30", "12:00"], ["13:00", "18:00"]],    // Di
    3: [["07:30", "12:00"], ["13:00", "18:00"]],    // Mi
    4: [["07:30", "12:00"], ["13:00", "18:00"]],    // Do
    5: [["07:30", "12:00"], ["13:00", "18:00"]],    // Fr
    6: [["09:00", "13:00"]]                          // Sa
};
```
