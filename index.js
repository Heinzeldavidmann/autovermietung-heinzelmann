// ============================================================
// index.js – gemeinsames JavaScript für alle Seiten der Website
// ============================================================
// Inhaltsverzeichnis (Funktionen in Aufruf-Reihenfolge):
//   1. setupContactForm()      – Kontaktformular absenden (Netlify Forms)
//   2. setupFaqAccordion()     – FAQ-Fragen auf-/zuklappen
//   3. setupMobileNavToggle()  – Hamburger-Menü auf kleinen Screens
//   4. setupFuhrparkFinder()   – Fahrzeugtyp-Finder (Fragenbaum auf fuhrpark.html)
//   5. setupTestimonialsSlider() – Kundenstimmen-Karussell
//   6. prefillFormFromUrl()    – Formularfelder aus Link-Parametern vorausfüllen
//   7. setupCookieConsent()    – Cookie-Banner beim ersten Besuch
//   8. setupMapConsent()       – Google-Maps-Karten erst nach Klick laden
//   9. Öffnungszeiten-Anzeige  – aktualisiert #open-status im Header
//  10. Custom-Select-Sync      – verbindet echtes <select> mit dem gestylten Dropdown
//  11. Datumsfeld-Placeholder  – zeigt "Datum wählen" solange <input type="date"> leer ist
// Alle setup*-Funktionen werden zentral im DOMContentLoaded-Listener weiter
// unten aufgerufen. Neue Funktionen dort mit ergänzen, sonst laufen sie nie.
// ============================================================

// ── 1. Kontaktformular Submit-Handler (Netlify Forms) ──
function setupContactForm() {
    const form = document.querySelector('.inquiry-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Pflichtfelder prüfen (außer Nachricht)
        const required = form.querySelectorAll('input[required], select[required]');
        let firstInvalid = null;
        required.forEach(field => {
            if (!field.value.trim()) {
                field.closest('.field').classList.add('field-bounce');
                setTimeout(() => field.closest('.field').classList.remove('field-bounce'), 600);
                if (!firstInvalid) firstInvalid = field;
            }
        });
        if (firstInvalid) {
            showValidationToast('Bitte füllen Sie alle markierten Felder aus.');
            firstInvalid.focus();
            return;
        }

        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.textContent = 'Wird gesendet…';
        btn.disabled = true;

        try {
            const data = new FormData(form);
            const response = await fetch('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(data).toString(),
            });
            if (response.ok) {
                showFormSuccess(form);
            } else {
                showFormError(form);
            }
        } catch (err) {
            showFormError(form);
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });
}

function showFormSuccess(form) {
    showFormMessage(form,
        'Vielen Dank für Ihre Anfrage! Wir melden uns so schnell wie möglich bei Ihnen.',
        '#22c55e'
    );
    form.reset();
}

function showFormError(form) {
    showFormMessage(form,
        'Ihre Anfrage konnte leider nicht gesendet werden. Bitte rufen Sie uns an: 07586 / 9213-0 oder schreiben Sie uns direkt an info@autovermietung-heinzelmann.de',
        '#e60000'
    );
}

function showFormFallback(form) {
    showFormMessage(form,
        'Das Formular ist in Kürze vollständig verfügbar. Bis dahin erreichen Sie uns telefonisch unter 07586 / 9213-0 oder per E-Mail an info@autovermietung-heinzelmann.de',
        '#f0b429'
    );
}

// Zeigt die Erfolgs-/Fehler-/Fallback-Meldung unterhalb des Formulars an (erstellt sie beim ersten Mal).
function showFormMessage(form, text, color) {
    let msg = form.querySelector('.form-status-msg');
    if (!msg) {
        msg = document.createElement('p');
        msg.className = 'form-status-msg';
        msg.style.cssText = 'margin-top:16px;padding:12px 16px;border-radius:8px;font-size:0.9em;line-height:1.5;font-weight:500;';
        form.appendChild(msg);
    }
    msg.textContent = text;
    msg.style.background = color + '18';
    msg.style.color = color === '#f0b429' ? '#856404' : color;
    msg.style.border = `1px solid ${color}55`;
}

// ── 2. FAQ-Accordion: Klick auf eine Frage klappt die zugehörige Antwort auf/zu ──
function setupFaqAccordion() {
    document.querySelectorAll('.faq-question').forEach(button => {
        button.addEventListener('click', () => {
            button.classList.toggle('active');
            const answer = button.nextElementSibling;
            if (answer.style.display === "block") {
                answer.style.display = "none";
            } else {
                answer.style.display = "block";
            }
        });
    });
}

// ── 3. Mobile Navigation: Hamburger-Menü (öffnet/schließt die Hauptnavigation auf kleinen Screens) ──
function setupMobileNavToggle() {
  const header = document.querySelector('header.site-header');
  const toggleBtn = document.querySelector('.nav-toggle');
  const nav = document.getElementById('primary-nav');

  if (!header || !toggleBtn || !nav) return;

  function setExpanded(isOpen) {
    toggleBtn.setAttribute('aria-expanded', String(isOpen));
    toggleBtn.setAttribute('aria-label', isOpen ? 'Menü schließen' : 'Menü öffnen');
  }

  function openMenu() {
    header.classList.add('nav-open');
    setExpanded(true);
  }

  function closeMenu() {
    header.classList.remove('nav-open');
    setExpanded(false);
  }

  function toggleMenu() {
    const isOpen = header.classList.toggle('nav-open');
    setExpanded(isOpen);
  }

  // Initial state
  setExpanded(header.classList.contains('nav-open'));

  // Toggle on click
  toggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    toggleMenu();
  });

  // Close when a nav link is clicked
  nav.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    closeMenu();
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  // Close when clicking/tapping outside header
  document.addEventListener('pointerdown', (e) => {
    if (!header.classList.contains('nav-open')) return;
    if (header.contains(e.target)) return;
    closeMenu();
  });
}

// ── 4. Fuhrpark-Finder (nur auf fuhrpark.html) ──
// Mehrstufiger Fragenbaum: der Nutzer klickt sich durch ein paar Fragen,
// am Ende wird eine passende Fahrzeugkategorie empfohlen (mit Link zur Subpage).
//
// FINDER_TREE: jede Frage hat eine ID (Objekt-Key) und eine Liste von Antwort-Optionen.
// Jede Option führt entweder zur nächsten Frage (`next: '<frage-id>'`)
// oder direkt zu einem Ergebnis (`result: '<ergebnis-id>'`).
// Startpunkt ist immer die Frage mit der ID "start".
const FINDER_TREE = {
    start: {
        question: 'Möchten Sie hauptsächlich Personen befördern oder etwas transportieren?',
        options: [
            { label: 'Personen befördern', next: 'personen' },
            { label: 'Güter oder Ladung transportieren', next: 'ladevolumen' },
            { label: 'Beides – Personen und größere Ladung', next: 'beides-personen' }
        ]
    },
    personen: {
        question: 'Wie viele Personen sollen mitfahren (inkl. Ihnen)?',
        options: [
            { label: 'Bis 3 Personen', result: 'pkw' },
            { label: '4 bis 5 Personen', next: 'gepaeck' },
            { label: '6 bis 9 Personen', result: 'bus' }
        ]
    },
    gepaeck: {
        question: 'Wie viel Gepäck nehmen Sie mit, z. B. für eine Urlaubsreise?',
        options: [
            { label: 'Wenig – Kurztrip oder Handgepäck', result: 'pkw' },
            { label: 'Viel – Kofferurlaub oder komplette Familie', result: 'bus' }
        ]
    },
    'beides-personen': {
        question: 'Wie viele Personen sollen mitfahren (inkl. Ihnen)?',
        options: [
            { label: 'Bis 3 Personen', next: 'beides-ladung-klein' },
            { label: '4 bis 5 Personen', next: 'beides-gepaeck' },
            { label: '6 bis 9 Personen', result: 'bus-anhaenger' }
        ]
    },
    'beides-gepaeck': {
        question: 'Wie viel Gepäck bzw. Ladung nehmen Sie zusätzlich mit?',
        options: [
            { label: 'Wenig – passt noch in den Kofferraum', next: 'beides-ladung-klein' },
            { label: 'Viel – braucht zusätzlichen Stauraum', result: 'bus-anhaenger' }
        ]
    },
    'beides-ladung-klein': {
        question: 'Haben Sie ein eigenes Zugfahrzeug mit Anhängerkupplung und passendem Führerschein (Klasse BE)?',
        options: [
            { label: 'Ja, ich brauche nur den Anhänger', result: 'pkw-anhaenger' },
            { label: 'Nein, ich brauche auch das Zugfahrzeug', result: 'bus-oder-transporter' }
        ]
    },
    ladevolumen: {
        question: 'Was möchten Sie transportieren?',
        options: [
            { label: 'Kleinere Ladung (bis ca. 10 m³, z. B. 1-Zimmer-Umzug)', next: 'zugfahrzeug-klein' },
            { label: 'Mittlere bis große Ladung (10–20 m³, z. B. 2–3-Zimmer-Umzug)', next: 'zugfahrzeug-mittel' },
            { label: 'Sehr große oder schwere Fracht (über 20 m³, gewerblich)', next: 'fuehrerschein-gross' },
            { label: 'Ein Fahrzeug, Motorrad oder Pferd transportieren', result: 'spezialanhaenger' }
        ]
    },
    'zugfahrzeug-klein': {
        question: 'Haben Sie ein eigenes Zugfahrzeug mit Anhängerkupplung und passendem Führerschein (Klasse BE)?',
        options: [
            { label: 'Ja, ich brauche nur den Anhänger', result: 'anhaenger-klein' },
            { label: 'Nein, ich brauche auch das Zugfahrzeug', result: 'transporter-klein' }
        ]
    },
    'zugfahrzeug-mittel': {
        question: 'Haben Sie ein eigenes Zugfahrzeug mit Anhängerkupplung und passendem Führerschein (Klasse BE)?',
        options: [
            { label: 'Ja, ich brauche nur den Anhänger', result: 'anhaenger-mittel' },
            { label: 'Nein, ich brauche auch das Zugfahrzeug', result: 'transporter-mittel' }
        ]
    },
    'fuehrerschein-gross': {
        question: 'Welchen Führerschein besitzen Sie?',
        options: [
            { label: 'Nur Klasse B', result: 'transporter-b-max' },
            { label: 'Klasse C1 (bis 7,5 t)', result: 'transporter-c1' },
            { label: 'Klasse C (über 7,5 t)', result: 'transporter-c' }
        ]
    }
};

// Wiederverwendbare SVG-Icons für die Ergebnis-Karten (identisch zu den Icons auf preise.html).
const FINDER_ICONS = {
    pkw: '<svg viewBox="0 110 329.638 120" fill="currentColor" aria-hidden="true"><g transform="scale(-1,1) translate(-329.638,0)"><path d="M324.873,165.878c0,0-0.823-13.567-2.485-18.543c-1.657-4.971-1.652-4.971,0.828-8.119c2.48-3.144-7.291-0.994-8.953-0.663c-1.657,0.337-0.994,1.491-0.994,1.491c-19.222,0.829-63.303-23.86-98.26-27.34c-34.958-3.475-69.097-0.161-81.69,2.817c-12.593,2.982-54.018,25.352-58.652,26.512c-4.635,1.16-2.651-1.16-2.651-1.16c-23.855,0.989-64.783,21.375-64.783,21.375c-1.657,1.16-2.983,7.953-2.983,7.953l0.829,2.32c-6.794,6.302-4.806,19.558-4.806,19.558l3.325-1.165c1.175,2.154,1.481,6.959,1.481,6.959c-5.629,2.651-1.491,4.972-1.491,4.972s2.49-2.149,12.593,0.999c3.904,1.212,12.599,1.636,21.805,1.704c-1.294-3.268-2.03-6.814-2.03-10.538c0-15.84,12.883-28.723,28.723-28.723c15.834,0,28.723,12.883,28.723,28.723c0,3.438-0.642,6.727-1.755,9.792l147.467-0.248c-1.056-2.994-1.662-6.193-1.662-9.544c0-15.84,12.884-28.723,28.724-28.723c15.834,0,28.723,12.883,28.723,28.723c0,2.946-0.45,5.794-1.279,8.472c14.675-3.392,31.769-5.769,31.769-5.769l3.147-4.143c0,0,2.485-17.729,0-20.547C326.048,170.212,324.873,165.878,324.873,165.878z"/><path d="M64.672,218.42c9.419,0,17.487-5.598,21.205-13.618c1.382-2.988,2.211-6.286,2.211-9.803c0-12.935-10.486-23.42-23.42-23.42c-12.935,0-23.421,10.48-23.421,23.42c0,3.807,0.994,7.354,2.61,10.527C47.729,213.149,55.543,218.42,64.672,218.42z"/><path d="M266.163,218.42c9.311,0,17.284-5.479,21.055-13.349c1.471-3.056,2.361-6.452,2.361-10.072c0-12.935-10.486-23.42-23.421-23.42c-12.936,0-23.421,10.48-23.421,23.42c0,3.402,0.761,6.618,2.066,9.533C248.47,212.704,256.636,218.42,266.163,218.42z"/></g></svg>',
    transporter: '<svg viewBox="1 3.5 22 16" fill="currentColor" aria-hidden="true"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>',
    bus: '<svg viewBox="100 360 800 290" fill="currentColor" aria-hidden="true"><g transform="scale(-1,1) translate(-1000,0)"><path d="M847.079,383.445v-9.65c0-9.97-7.58-18.3-17.5-19.25l-18.82-1.8c-17.57-1.68-35.24-2.18-52.88-1.49l-287.08,11.23c-20.52,0.8-40.39,7.4-57.33,19.03l-81.38,55.87c-6.4,4.4-13.58,7.54-21.16,9.26l-75.71,17.15c-17.93,4.06-33.08,15.95-41.3,32.38l-15.52,31.03l-4.14,1.73c-8.84,3.68-15.76,10.86-19.13,19.82c-2.34,6.24-2.83,13.02-1.42,19.53l4.16,19.2c1.48,6.84,7.53,11.72,14.53,11.72h61.47c5.28,28.36,30.15,49.84,60.05,49.84s54.77-21.48,60.05-49.84h322.565c5.28,28.36,30.15,49.84,60.05,49.84s54.77-21.48,60.05-49.84h39.695c5.94,0,10.75-4.81,10.75-10.75v-22.41c0-4.75-3.07-8.76-7.34-10.19l4.37-65.89c1.95-29.54-2.98-59.14-14.4-86.45l-0.34-0.8C839.389,401.865,847.079,393.495,847.079,383.445z M513.169,417.165c0,17.58-4.86,34.81-14.03,49.8h-0.01c-3.08,5.04-8.56,8.11-14.47,8.11h-167.75c-1.33,0-2.06-1.04-2.06-2.07c0-0.87,0.51-1.73,1.6-1.98c10.71-2.43,20.73-6.81,29.79-13.02l81.39-55.88c13.05-8.97,28.32-14.04,44.15-14.66l23.76-0.93c9.62-0.37,17.63,7.33,17.63,16.96V417.165z M668.069,400.295l-8.2,64.11c-0.78,6.1-5.97,10.67-12.12,10.67h-82.57c-4.63,0-9.02-1.41-12.68-3.91c-3.66-2.49-6.58-6.06-8.27-10.36c-4.23-10.75-6.39-22.19-6.39-33.73v-18.04c0-12.43,10.07-22.51,22.51-22.51h95.6C663.319,386.525,669.009,392.995,668.069,400.295z M809.169,452.565c0,12.44-10.08,22.51-22.51,22.51h-95.6c-7.37,0-13.06-6.46-12.13-13.77l8.21-64.11c0.78-6.1,5.97-10.67,12.12-10.67h82.57c4.62,0,9.02,1.42,12.68,3.91c3.66,2.49,6.58,6.06,8.27,10.37c4.22,10.74,6.39,22.18,6.39,33.72V452.565z"/></g></svg>',
    anhaenger: '<svg viewBox="-58 50 320 145" fill="currentColor" aria-hidden="true"><path d="M15.798,150.626h-3.595v-14.264h3.605L15.798,150.626L15.798,150.626z M71.791,54.077h130.949v20.85h-30.747v17.039h30.747v74.136h-17.967l0.117-2.198c0-20.4-16.502-36.873-36.863-36.873s-36.863,16.482-36.863,36.873l0.127,2.198H94.683v-15.476H71.801L71.791,54.077L71.791,54.077z M125.635,92.053h35.495v-17h-35.495C125.635,75.053,125.635,92.053,125.635,92.053z M80.643,91.663h35.505V74.633H80.643V91.663z M175.541,163.913c0,15.202-12.32,27.493-27.513,27.493c-15.212,0-27.523-12.301-27.523-27.493c0-15.222,12.32-27.542,27.523-27.542C163.211,136.371,175.541,148.711,175.541,163.913z M157.866,163.913c0-5.462-4.426-9.887-9.868-9.887c-5.422,0-9.848,4.426-9.848,9.887c0,5.413,4.426,9.848,9.848,9.848C153.44,173.761,157.866,169.326,157.866,163.913z M26.282,136.371v-4.27H0v4.27h12.203h3.605H26.282z M15.798,158.373v-7.748h-3.595v7.748H15.798z M71.01,30.716v18.612h132.532V30.716C203.542,30.716,143.582-11.09,71.01,30.716z M71.791,150.626H15.798v7.748h-3.595v-7.748H0v15.486h94.663v-0.01H71.791V150.626z"/></svg>'
};

// Jedes mögliche Endergebnis des Fragenbaums: Titel, Icon (siehe FINDER_ICONS), Erklärtext und Ziel-Link.
const FINDER_RESULTS = {
    pkw: {
        title: 'PKW',
        icon: 'pkw',
        text: 'Vom Kleinwagen bis zur Reise-Limousine – komfortabel für Geschäftsreisen, Ausflüge oder als Unfallersatzwagen.',
        href: 'pkw.html'
    },
    bus: {
        title: '9-Sitzer / Bus',
        icon: 'bus',
        text: 'Platz für bis zu 9 Personen – ideal für Vereins- oder Familienausflüge und gemeinsame Urlaubsreisen.',
        href: '9sitzer.html'
    },
    'bus-anhaenger': {
        title: '9-Sitzer / Bus + Anhänger',
        icon: 'bus',
        text: 'Für die Gruppe empfiehlt sich ein 9-Sitzer-Bus. Zusätzliches Gepäck oder Ausrüstung transportieren Sie bequem in einem passenden Anhänger dahinter.',
        href: '9sitzer.html'
    },
    'pkw-anhaenger': {
        title: 'PKW + eigener Anhänger',
        icon: 'pkw',
        text: 'Für bis zu 4 Personen reicht ein PKW aus unserem Fuhrpark. Die Ladung nehmen Sie in Ihrem eigenen Anhänger mit.',
        href: 'pkw.html'
    },
    'bus-oder-transporter': {
        title: '9-Sitzer / Bus mit Anhängerkupplung',
        icon: 'bus',
        text: 'Für Personen und Ladung gemeinsam empfiehlt sich ein 9-Sitzer-Bus mit Anhängerkupplung – bei Bedarf zusätzlich mit einem unserer Anhänger.',
        href: '9sitzer.html'
    },
    spezialanhaenger: {
        title: 'Spezial-Anhänger',
        icon: 'anhaenger',
        text: 'Für den Transport von Fahrzeugen, Motorrädern oder Pferden bieten wir spezielle Anhänger wie Fahrzeugtransporter und Pferdeanhänger an.',
        href: 'preise.html#preise-anhaenger'
    },
    'anhaenger-klein': {
        title: 'Anhänger (klein bis mittel)',
        icon: 'anhaenger',
        text: 'Ein Planen- oder Kofferanhänger mit 5–10 m³ Ladevolumen reicht für kleinere Transporte und Umzüge völlig aus.',
        href: 'preise.html#preise-anhaenger'
    },
    'transporter-klein': {
        title: 'Transporter (Führerschein B)',
        icon: 'transporter',
        text: 'Ein Vito oder Sprinter mit 5–10 m³ Ladevolumen ist mit normalem Führerschein B zu fahren – ideal für kleinere Transporte.',
        href: 'transporter.html'
    },
    'anhaenger-mittel': {
        title: 'Anhänger (groß bis extra groß)',
        icon: 'anhaenger',
        text: 'Ein größerer Planenanhänger mit 15–20 m³ Ladevolumen deckt auch umfangreichere Umzüge ab.',
        href: 'preise.html#preise-anhaenger'
    },
    'transporter-mittel': {
        title: 'Transporter Sprinter XL (Führerschein B)',
        icon: 'transporter',
        text: 'Ein Sprinter XL mit 15–20 m³ Ladevolumen ist weiterhin mit Führerschein B zu fahren und deckt die meisten Umzüge ab.',
        href: 'transporter.html'
    },
    'transporter-b-max': {
        title: 'Transporter Sprinter Koffer (Führerschein B)',
        icon: 'transporter',
        text: 'Mit Führerschein B ist der Sprinter Koffer mit Ladebordwand und 20 m³ Ladevolumen die größte verfügbare Option.',
        href: 'transporter.html'
    },
    'transporter-c1': {
        title: 'LKW 7,5 t (Führerschein C1)',
        icon: 'transporter',
        text: 'Mit Führerschein C1 steht Ihnen unser MB Atego 7,5 t mit 36 m³ Ladevolumen für große Umzüge und Gewerbetransporte zur Verfügung.',
        href: 'transporter.html'
    },
    'transporter-c': {
        title: 'LKW 12 t (Führerschein C)',
        icon: 'transporter',
        text: 'Mit Führerschein C steht Ihnen unser MB Atego 12 t mit 45 m³ Ladevolumen für sehr große Mengen und schwere Fracht zur Verfügung.',
        href: 'transporter.html'
    }
};

// Baut den Fragenbaum als Kette von Karten im Container #finder-steps auf.
// Jede beantwortete Frage bleibt sichtbar (mit der gewählten Antwort markiert);
// klickt man eine bereits beantwortete Frage neu an, werden alle danach folgenden
// Schritte entfernt und der Baum ab dort neu aufgebaut (truncateAfter).
function setupFuhrparkFinder() {
    const container = document.getElementById('finder-steps');
    if (!container) return;

    // Rendert eine einzelne Frage inkl. Antwort-Buttons als neue Karte.
    function renderQuestion(stepId) {
        const step = FINDER_TREE[stepId];
        const card = document.createElement('div');
        card.className = 'finder-step';
        card.dataset.step = stepId;

        const question = document.createElement('p');
        question.className = 'finder-step-question';
        question.textContent = step.question;
        card.appendChild(question);

        const options = document.createElement('div');
        options.className = 'finder-step-options';
        step.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'finder-option';
            btn.textContent = opt.label;
            btn.addEventListener('click', () => handleAnswer(card, opt, btn));
            options.appendChild(btn);
        });
        card.appendChild(options);

        container.appendChild(card);
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Rendert die finale Empfehlungs-Karte (Icon, Titel, Text, Link) am Ende des Fragenbaums.
    function renderResult(resultId) {
        const rec = FINDER_RESULTS[resultId];
        if (!rec) return;

        const card = document.createElement('div');
        card.className = 'finder-result';

        const label = document.createElement('p');
        label.className = 'finder-result-label';
        label.textContent = 'Unsere Empfehlung';
        card.appendChild(label);

        const titleRow = document.createElement('div');
        titleRow.className = 'finder-result-title-row';
        if (rec.icon && FINDER_ICONS[rec.icon]) {
            const iconWrap = document.createElement('span');
            iconWrap.className = 'finder-result-icon';
            iconWrap.innerHTML = FINDER_ICONS[rec.icon];
            titleRow.appendChild(iconWrap);
        }
        const title = document.createElement('h3');
        title.textContent = rec.title;
        titleRow.appendChild(title);
        card.appendChild(titleRow);

        const text = document.createElement('p');
        text.textContent = rec.text;
        card.appendChild(text);

        const link = document.createElement('a');
        link.className = 'button';
        link.href = rec.href;
        link.textContent = 'Kategorie ansehen →';
        card.appendChild(link);

        container.appendChild(card);
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Entfernt alle Schritte/Ergebnisse, die nach der geänderten Antwort folgten
    function truncateAfter(card) {
        let next = card.nextElementSibling;
        while (next) {
            const toRemove = next;
            next = next.nextElementSibling;
            toRemove.remove();
        }
    }

    // Reagiert auf einen Options-Klick: markiert die Antwort und rendert je nach
    // Baum-Definition entweder die nächste Frage oder das Endergebnis.
    function handleAnswer(card, opt, clickedBtn) {
        truncateAfter(card);

        card.querySelectorAll('.finder-option').forEach(b => b.classList.remove('active'));
        clickedBtn.classList.add('active');
        card.classList.add('finder-step-answered');

        if (opt.result) {
            renderResult(opt.result);
        } else if (opt.next) {
            renderQuestion(opt.next);
        }
    }

    renderQuestion('start');
}

// ── 5. Kundenstimmen-Karussell: zeigt 3 Testimonials gleichzeitig, mit Pfeilen/Punkten navigierbar ──
function setupTestimonialsSlider() {
  const track = document.querySelector('.testimonials-track');
  if (!track) return;

  const cards = track.querySelectorAll('.testimonial');
  const total = cards.length;
  const visible = 3;
  const maxIndex = total - visible;
  let current = 0;

  const prevBtn = document.getElementById('testimonials-prev');
  const nextBtn = document.getElementById('testimonials-next');
  const dotsContainer = document.getElementById('testimonials-dots');

  // Dots erstellen
  for (let i = 0; i <= maxIndex; i++) {
    const dot = document.createElement('button');
    dot.className = 'testimonials-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Seite ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dotsContainer.appendChild(dot);
  }

  function goTo(index) {
    current = Math.max(0, Math.min(index, maxIndex));
    const cardWidth = cards[0].offsetWidth + 20;
    track.style.transform = `translateX(-${current * cardWidth}px)`;

    dotsContainer.querySelectorAll('.testimonials-dot').forEach((d, i) => {
      d.classList.toggle('active', i === current);
    });
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === maxIndex;
  }

  prevBtn.addEventListener('click', () => goTo(current - 1));
  nextBtn.addEventListener('click', () => goTo(current + 1));
  goTo(0);
}

// ── 6. Formular aus Link-Parametern vorausfüllen ──
// Wenn ein Link wie "index.html#kontakt?fahrzeug=transporter&modell=Sprinter" angeklickt wird
// (z. B. von einem "Jetzt anfragen"-Button auf preise.html oder aus dem Fuhrpark-Finder),
// werden Fahrzeugart und Modell automatisch ins Kontaktformular übernommen und kurz hervorgehoben.
function prefillFormFromUrl() {
    const hash = window.location.hash; // z.B. "#kontakt?fahrzeug=transporter&modell=..."
    if (!hash.includes('?')) return;

    const queryString = hash.split('?')[1];
    const params = new URLSearchParams(queryString);

    const fahrzeug = params.get('fahrzeug');
    const modell = params.get('modell');

    const fieldsToHighlight = [];
    const sel = document.getElementById('fahrzeug');
    const textarea = document.getElementById('nachricht');

    if (fahrzeug && sel) {
        sel.value = fahrzeug;
        const display = sel.nextElementSibling;
        const textEl = display && display.querySelector('.custom-select-text');
        if (textEl) {
            const selected = sel.options[sel.selectedIndex];
            if (selected && selected.value) {
                textEl.textContent = selected.text;
                display.classList.add('has-value');
            }
        }
        fieldsToHighlight.push(sel.closest('.field'));
    }

    if (modell && textarea) {
        textarea.value = `Ich interessiere mich für: ${modell}`;
        fieldsToHighlight.push(textarea.closest('.field'));
    }

    // Scrollen, dann Felder kurz aufleuchten lassen
    const kontaktSection = document.getElementById('kontakt');
    if (kontaktSection) {
        setTimeout(() => {
            kontaktSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Nach dem Scrollen aufleuchten
            setTimeout(() => {
                fieldsToHighlight.forEach(field => {
                    if (!field) return;
                    field.classList.add('field-prefilled');
                    setTimeout(() => field.classList.remove('field-prefilled'), 2200);
                });
            }, 700);
        }, 100);
    }

    if (fieldsToHighlight.length) {
        const note = document.getElementById('prefill-note');
        if (note) {
            note.querySelector('.prefill-note-text').textContent =
                'Wir haben schon ein paar Angaben für Sie vorausgefüllt.';
            note.hidden = false;
            note.querySelector('.prefill-note-reset').addEventListener('click', () => {
                if (sel) {
                    sel.value = '';
                    const display = sel.nextElementSibling;
                    const textEl = display && display.querySelector('.custom-select-text');
                    if (textEl) textEl.textContent = 'Bitte wählen...';
                    if (display) display.classList.remove('has-value');
                }
                if (textarea) textarea.value = '';
                note.hidden = true;
            });
        }
    }
}

// ── 7. Cookie-Consent-Banner ──
// Erscheint beim ersten Besuch als Leiste unten. "Nur notwendige" sperrt die Seite NICHT,
// es werden lediglich optionale Dienste (aktuell: Google Maps, siehe setupMapConsent) nicht
// automatisch geladen. Die Entscheidung wird dauerhaft in localStorage gespeichert, daher
// erscheint das Banner bei wiederkehrenden Besuchern nicht erneut (zum erneuten Testen:
// in den Browser-DevTools unter Application → Local Storage den Eintrag "cookieConsent" löschen).
function setupCookieConsent() {
    const CONSENT_KEY = 'cookieConsent'; // 'all' | 'essential'

    if (localStorage.getItem(CONSENT_KEY)) return;

    const banner = document.createElement('div');
    banner.id = 'cookie-consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie-Einstellungen');
    banner.innerHTML = `
        <div class="cookie-consent-inner">
            <div class="cookie-consent-text">
                <strong>Diese Website nutzt Cookies</strong>
                <span>Technisch notwendige Cookies sorgen für die Grundfunktionen der Website. Optionale Dienste wie eingebettete Karten laden wir nur nach Ihrer Zustimmung. Details finden Sie in unserer <a href="datenschutz.html">Datenschutzerklärung</a>.</span>
            </div>
            <div class="cookie-consent-actions">
                <button type="button" class="button button-secondary" id="cookie-consent-essential">Nur notwendige</button>
                <button type="button" class="button" id="cookie-consent-all">Alle akzeptieren</button>
            </div>
        </div>
    `;
    document.body.appendChild(banner);

    setTimeout(() => banner.classList.add('cookie-consent-visible'), 100);

    function dismiss(value) {
        localStorage.setItem(CONSENT_KEY, value);
        banner.classList.remove('cookie-consent-visible');
        setTimeout(() => banner.remove(), 400);
    }

    document.getElementById('cookie-consent-all').addEventListener('click', () => dismiss('all'));
    document.getElementById('cookie-consent-essential').addEventListener('click', () => dismiss('essential'));
}

// ── 8. Google-Maps-Karten erst nach Klick laden ──
// Datenschutz: Google Maps setzt beim Laden Cookies/überträgt Daten an Google, das darf
// nicht automatisch ohne Zustimmung passieren. Auf index.html steht daher statt des
// <iframe> nur ein Platzhalter-<div class="map-consent-placeholder" data-map-src="...">
// mit einem "Karte laden"-Button. Erst der Klick baut das echte iframe und ersetzt den Platzhalter.
function setupMapConsent() {
    document.querySelectorAll('.map-consent-placeholder').forEach(placeholder => {
        const btn = placeholder.querySelector('.map-consent-load-btn');
        if (!btn) return;
        btn.addEventListener('click', () => {
            const src = placeholder.dataset.mapSrc;
            const iframe = document.createElement('iframe');
            iframe.src = src;
            iframe.referrerPolicy = 'no-referrer-when-downgrade';
            iframe.setAttribute('loading', 'lazy');
            iframe.classList.add(...placeholder.classList);
            iframe.classList.remove('map-consent-placeholder');
            placeholder.replaceWith(iframe);
        });
    });
}

window.addEventListener('DOMContentLoaded', () => {
  setupFaqAccordion();
  setupMobileNavToggle();
  setupContactForm();
  setupTestimonialsSlider();
  setupFuhrparkFinder();
  setupMapConsent();
  setupCookieConsent();
  prefillFormFromUrl();
});

// ── 9. Öffnungszeiten-Anzeige (in der Utility Bar direkt unter dem Header) ──
// Berechnet anhand der aktuellen Uhrzeit, ob gerade geöffnet, geschlossen oder
// Mittagspause ist, und aktualisiert Text + grünen/roten Punkt in #open-status.
// Ist die Website gerade außerhalb der Öffnungszeiten geöffnet, wird zusätzlich
// einmalig ein Hinweis-Banner unten eingeblendet (siehe showClosedBanner).
document.addEventListener('DOMContentLoaded', function () {
  // Öffnungszeiten: Arrays aus Zeitintervallen pro Tag (0=So ... 6=Sa)
  const OPENING_HOURS = {
    0: null, // Sonntag: geschlossen
    1: [["07:30", "12:00"], ["13:00", "18:00"]], // Montag (Mittagspause 12–13)
    2: [["07:30", "12:00"], ["13:00", "18:00"]], // Dienstag ("-")
    3: [["07:30", "12:00"], ["13:00", "18:00"]], // Mittwoch ("-")
    4: [["07:30", "12:00"], ["13:00", "18:00"]], // Donnerstag ("-")
    5: [["07:30", "12:00"], ["13:00", "18:00"]], // Freitag ("-")
    6: [["09:00", "13:00"]]                        // Samstag (durchgehend)
  };

  const statusEl = document.getElementById('open-status');
  if (!statusEl) return;
  const textEl = statusEl.querySelector('.hours-text');
  const dotEl = statusEl.querySelector('.utility-dot');

  const now = new Date();
  const day = now.getDay();
  const intervals = OPENING_HOURS[day];

  function parseTimeToDate(t) {
    const [h, m] = t.split(':').map(Number);
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    return d;
  }
  function prettyTime(t) {
    const [h, m] = t.split(':');
    const hour = String(parseInt(h, 10)); // führende Null entfernen
    return m === '00' ? `${hour} Uhr` : `${hour}:${m} Uhr`;
  }
  function rangeSegment(start, end) {
    const s = prettyTime(start).replace(/\s*Uhr$/, '');
    const e = prettyTime(end); // enthält "Uhr"
    return `${s} - ${e}`; // z. B. "8 - 12 Uhr"
  }
  function intervalsToText(ints) {
    // z. B. [["08:00","12:00"],["13:00","18:00"]] -> "8 - 12 Uhr und 13 - 18 Uhr"
    const parts = ints.map(([s, e]) => rangeSegment(s, e));
    return parts.join(' und ');
  }

  if (!intervals || intervals.length === 0) {
    if (textEl) textEl.textContent = 'Heute: geschlossen';
    statusEl.classList.add('closed');
    dotEl && dotEl.style.setProperty('background', '#e60000');
    return;
  }

  const normIntervals = Array.isArray(intervals[0]) ? intervals : [intervals];

  // Status bestimmen: geöffnet / geschlossen / Mittagspause
  let openNow = false;
  let middayPauseNow = false;
  for (let i = 0; i < normIntervals.length; i++) {
    const [s, e] = normIntervals[i];
    const startDate = parseTimeToDate(s);
    const endDate = parseTimeToDate(e);
    if (now >= startDate && now <= endDate) {
      openNow = true;
      break;
    }
    // Prüfe, ob wir zwischen zwei Intervallen liegen (Pause)
    if (i < normIntervals.length - 1) {
      const nextStart = parseTimeToDate(normIntervals[i + 1][0]);
      if (now > endDate && now < nextStart) {
        middayPauseNow = true;
      }
    }
  }

  const dayText = intervalsToText(normIntervals);
  if (textEl) {
    if (middayPauseNow) {
      let nextStart = '';
      for (let i = 0; i < normIntervals.length - 1; i++) {
        const endDate = parseTimeToDate(normIntervals[i][1]);
        if (now > endDate) {
          nextStart = prettyTime(normIntervals[i + 1][0]);
          break;
        }
      }
      textEl.dataset.full = `Jetzt Mittagspause – wieder geöffnet ab ${nextStart}`;
      textEl.dataset.short = `Pause – ab ${nextStart}`;
    } else {
      textEl.dataset.full = `Heute: geöffnet von ${dayText}`;
      textEl.dataset.short = `Geöffnet ${dayText}`;
    }
    function applyHoursText() {
      textEl.textContent = window.innerWidth <= 680
        ? textEl.dataset.short
        : textEl.dataset.full;
    }
    applyHoursText();
    window.addEventListener('resize', applyHoursText);
  }

  if (openNow) {
    statusEl.classList.remove('closed');
    dotEl && dotEl.style.setProperty('background', '#22c55e');
  } else {
    statusEl.classList.add('closed');
    dotEl && dotEl.style.setProperty('background', '#e60000');

    // Toast-Banner anzeigen
    let bannerMsg;
    if (!intervals || intervals.length === 0) {
      bannerMsg = 'Heute sind wir leider nicht geöffnet. Sie erreichen uns telefonisch Mo. bis Fr. von 7:30 bis 12:00 Uhr und 13:00 bis 18:00 Uhr sowie Sa. von 9:00 bis 13:00 Uhr.';
    } else if (middayPauseNow) {
      bannerMsg = null; // Mittagspause wird bereits in der Utility Bar angezeigt
    } else {
      const firstStart = prettyTime(normIntervals[0][0]);
      const lastEnd = prettyTime(normIntervals[normIntervals.length - 1][1]);
      const nowBeforeOpen = now < parseTimeToDate(normIntervals[0][0]);
      if (nowBeforeOpen) {
        bannerMsg = `Heute öffnen wir um ${firstStart}. Für dringende Anfragen erreichen Sie uns unter 07586 / 9213-0.`;
      } else {
        bannerMsg = `Wir hatten heute bis ${lastEnd} geöffnet. Ab morgen sind wir wieder für Sie da. Bei dringenden Anfragen erreichen Sie uns unter 07586 / 9213-0.`;
      }
    }
    if (bannerMsg) showClosedBanner(bannerMsg);
  }
});

// Validierungs-Toast
function showValidationToast(message) {
  let toast = document.getElementById('validation-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'validation-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.remove('validation-toast-visible');
  void toast.offsetWidth; // reflow für Animation-Reset
  toast.classList.add('validation-toast-visible');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.remove('validation-toast-visible'), 3500);
}

// Außerhalb der Öffnungszeiten: Toast-Banner anzeigen
function showClosedBanner(message) {
  if (sessionStorage.getItem('closedBannerDismissed')) return;

  const banner = document.createElement('div');
  banner.id = 'closed-banner';
  banner.innerHTML = `
    <div class="closed-banner-inner">
      <span class="closed-banner-icon">
        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true"><path d="M12 2a10 10 0 1010 10A10.011 10.011 0 0012 2zm1 11h-4a1 1 0 010-2h3V7a1 1 0 012 0z"/></svg>
      </span>
      <div class="closed-banner-text">
        <strong>Aktuell außerhalb der Öffnungszeiten</strong>
        <span>${message}</span>
      </div>
      <button class="closed-banner-close" aria-label="Hinweis schließen">✕</button>
    </div>
  `;
  document.body.appendChild(banner);

  setTimeout(() => banner.classList.add('closed-banner-visible'), 100);

  banner.querySelector('.closed-banner-close').addEventListener('click', () => {
    banner.classList.remove('closed-banner-visible');
    sessionStorage.setItem('closedBannerDismissed', '1');
    setTimeout(() => banner.remove(), 400);
  });
}

// ── 10. Custom-Select-Sync ──
// Die echten <select>-Felder (#fahrzeug, #getriebe) sind unsichtbar; sichtbar ist
// stattdessen ein gestyltes <div class="custom-select-display"> daneben. Dieser Block
// hält den angezeigten Text synchron, sobald sich der Wert des echten <select> ändert.
['fahrzeug', 'getriebe'].forEach(id => {
  const sel = document.getElementById(id);
  if (!sel) return;
  const display = sel.nextElementSibling;
  const textEl = display && display.querySelector('.custom-select-text');
  sel.addEventListener('change', () => {
    const selected = sel.options[sel.selectedIndex];
    if (textEl) textEl.textContent = selected.value ? selected.text : 'Bitte wählen...';
    if (display) display.classList.toggle('has-value', !!selected.value);
  });
});

// ── 11. Datumsfeld-Placeholder ──
// Native <input type="date"> zeigen auf iOS Safari ohne gesetzten Wert keinen
// Platzhaltertext an. Der Wrapper blendet stattdessen ein eigenes Label ein,
// solange kein Datum gewählt wurde.
document.querySelectorAll('.date-input-wrap input[type="date"]').forEach(input => {
  const wrap = input.closest('.date-input-wrap');
  const sync = () => wrap.classList.toggle('has-value', !!input.value);
  input.addEventListener('change', sync);
  input.addEventListener('input', sync);
  sync();
  input.classList.add('is-empty');
  input.addEventListener('change', () => input.classList.toggle('is-empty', !input.value));
});

// Uhrzeitfelder starten mit vorausgefülltem Vorschlagswert (09:00/16:00) und
// sollen wie ein Platzhalter aussehen, bis der Nutzer die Uhrzeit selbst ändert.
document.querySelectorAll('.inquiry-form input[type="time"]').forEach(input => {
  input.classList.add('is-empty');
  input.addEventListener('change', () => input.classList.remove('is-empty'));
});
