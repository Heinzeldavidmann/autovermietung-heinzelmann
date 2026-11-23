# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static website for **Autovermietung Heinzelmann GbR**, a regional vehicle rental company in Herbertingen, Germany. No build system — plain HTML/CSS/JS. Hosted on **Netlify** (inkl. Netlify Forms für das Anfrageformular); das GitHub-Repository ist die Quelle, ein Push auf `main` löst das Deploy aus.

**Live site:** https://autovermietung-heinzelmann.de/

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
| `netlify.toml` | Netlify-Einstellungen: Weiterleitung auf https, Browser-Zwischenspeicher für Bilder und Schriften |
| `convert_to_webp.py` | Erzeugt WebP-Fassungen und verkleinerte Bildgrößen (siehe „Bilder") |

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

**Tippflächen (Handy):** Alles Antippbare soll mindestens ca. 44 px groß sein. Wenn das sichtbare Element klein bleiben soll (Slider-Punkte, Kalenderpfeile, Timeline-Punkte), wird nur die Tippfläche über ein unsichtbares `::after` vergrößert; bei allein stehenden Textlinks über `padding` plus gleich großes negatives `margin`. Sammlung: Abschnitt „Handy und Tablet: Tippflächen und Querformat" am Ende von `style.css`. Im Querformat auf niedrigen Bildschirmen (`max-height: 500px`) scrollen Kopfzeile und Schnellzugriff-Leiste mit; JS liest die verdeckte Höhe deshalb über `fixedHeaderOffset()` aus `scroll-padding-top`, nicht aus dem `padding-top` des Body.

## Hero der Startseite

Der Hero (`#home` in `index.html`) zeigt das Firmengebäude (`images/Saumstrasse_Heute.*`) als große Bühne mit dunklem Verlauf, darunter die drei Kennzahlen (`.hero-facts`). Styles: Abschnitt „Hero Firmengebäude als Bühne" am Ende von `style.css`.

Der vorherige Hero (Text links, Foto + Logo-Kasten rechts, drei Kacheln) ist im Git-Tag `hero-original` gesichert. Zum Zurückwechseln den `<section id="home" …>`-Block aus `git show hero-original:index.html` übernehmen. Die alten Klassen (`.hero-section`, `.hero-wrapper`, `.hero-right`, `.hero-logo-panel`, `.trust-item` …) sind in `style.css` weiterhin vorhanden. Der Absatz `.hero-text` stand damals im Hero und steht jetzt unter „Mobilität für jeden Bedarf".

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

## Anfrageformular (#kontakt)

Das Formular ist dreistufig (Fahrzeug → Zeitraum → Kontakt), gesteuert von `setupFormSteps()` in `index.js`. Alle Felder liegen weiter in einem `<form>` (Netlify Forms unverändert), die Schritte sind `.form-step`-Blöcke. Fahrzeugart-Kacheln und Anrede-Knöpfe (`[data-choice-for]`) setzen die versteckten `<select>`-Felder `#fahrzeug` / `#anrede`. Felder mit `data-step-detail` erscheinen erst nach Wahl der Fahrzeugart; `data-only-for` / `data-not-for` steuern, welche Felder je Fahrzeugart erscheinen: Bei Anhänger kommt die Frage nach einem Zugfahrzeug (`#zugfahrzeug`), Getriebe erscheint dort nur mit Zugfahrzeug (`data-with-zug`), die Anhängkupplung nie. Ausgeblendete Felder werden deaktiviert und nicht mitgeschickt. Im Schritt „Zeitraum" zeigt `setupRangeCalendar()` einen Kalender (2 Monate, mobil 1), der den Mietzeitraum hervorhebt und per Klick Abholung/Rückgabe in die Datumsfelder schreibt. Ablauf: 1. Tipp = Abholung, 2. Tipp = Rückgabe, nächster Tipp = neuer Zeitraum. Eine Anleitungszeile über dem Kalender und eine rote Umrandung am passenden Datumsfeld zeigen, welcher Tag als Nächstes dran ist. Das ist vor allem fürs Handy wichtig, wo es kein Hover gibt. Keine zweite Anzeige der Daten im Kalender (wurde als redundant abgelehnt). Uhrzeiten wählt man per Liste (`setupTimeSelects()`, 30-Minuten-Takt): Abholzeiten werden aus `OPENING_HOURS` für den gewählten Tag erzeugt (bis 30 Min. vor Schluss), Rückgabe 6–22 Uhr (Rückgabe ist jederzeit per Schlüsseleinwurf möglich, daher kein Öffnungszeiten-Hinweis dafür). „Andere Zeit …" blendet das echte `<input type="time">` zum freien Eintragen ein; nur dieses Feld wird abgeschickt. Styles: Abschnitte „Anfrageformular in drei Schritten", „Kalender im Schritt Zeitraum" und „Uhrzeit-Auswahlliste" am Ende von `style.css`. Der alte einstufige Stand ist im Git-Tag `formular-original` gesichert.

Robustheit: Eingaben werden als Entwurf im `sessionStorage` des Tabs gesichert (`setupFormDraft`/`restoreFormDraft`) und nach einem Neuladen wiederhergestellt, nach erfolgreichem Absenden gelöscht; ein Link mit Vorauswahl hat Vorrang. Absenden hat ein Zeitlimit von 20 s und getrennte Meldungen für offline, Zeitüberschreitung und Serverfehler. Nach Erfolg zeigt das Formular nur die Bestätigung (`.is-sent`) mit „Weitere Anfrage stellen“. Feldfehler hängen per `aria-describedby` am Feld; vorgelesen wird nur ein Sammelhinweis („Bitte prüfen Sie 2 markierte Felder.“).

## Bilder

Fotos liegen als JPEG (Rückfall) und WebP in `images/`, dazu verkleinerte Fassungen (480/800/1200 px) in `images/responsive/`. Eingebunden werden sie per `<picture>` mit `srcset` + `sizes`, damit Handys nur die Größe laden, die sie anzeigen. Neue Bilder: Datei in `images/` legen und `python3 convert_to_webp.py` ausführen (erzeugt WebP und die verkleinerten Fassungen), dann im HTML den `<source>` nach dem Muster der vorhandenen Bilder mit `srcset`/`sizes` anlegen. Logo und Preislisten-Vorschauen haben eine eigene WebP-Fassung in einem `<picture class="picture-plain">` (`display: contents`, damit das Layout unverändert bleibt). In `netlify.toml` werden Bilder 1 Woche und Schriften 1 Jahr im Browser zwischengespeichert: Ein ersetztes Bild besser unter neuem Dateinamen ablegen.

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
9. **Opening hours** — updates `#open-status` with current status based on `OPENING_HOURS` object (Mo–Fr 7:30–12 & 13–18, Sa 7:30–13)
10. **Custom select** — syncs `#fahrzeug` select value to `.custom-select-display` span

New `setup*()` functions must be added to the `DOMContentLoaded` listener (an array of functions, each wrapped in try/catch so one failure cannot break the rest of the page), otherwise they never run. Script must use `defer` attribute: `<script src="index.js" defer></script>`

## Opening Hours Data

Defined at the top of `index.js` (global, also used by the contact form hint) — update here when hours change, plus the footer texts in all HTML files and `openingHoursSpecification` in `index.html`:
```js
const OPENING_HOURS = {
    0: null,                                          // Sonntag: geschlossen
    1: [["07:30", "12:00"], ["13:00", "18:00"]],    // Mo
    2: [["07:30", "12:00"], ["13:00", "18:00"]],    // Di
    3: [["07:30", "12:00"], ["13:00", "18:00"]],    // Mi
    4: [["07:30", "12:00"], ["13:00", "18:00"]],    // Do
    5: [["07:30", "12:00"], ["13:00", "18:00"]],    // Fr
    6: [["07:30", "13:00"]]                          // Sa
};
```
