// ── Kontaktformular Submit-Handler ──
// Vorbereitet für EmailJS – aktuell zeigt das Formular einen Fallback-Hinweis.
// Sobald EmailJS eingerichtet ist: emailjs.send(...) einkommentieren und
// den showFormFallback()-Aufruf im try-Block entfernen.
function setupContactForm() {
    const form = document.querySelector('.inquiry-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.textContent = 'Wird gesendet…';
        btn.disabled = true;

        const params = {
            name:     document.getElementById('name').value,
            email:    document.getElementById('email').value,
            telefon:  document.getElementById('telefon').value,
            fahrzeug: document.getElementById('fahrzeug').value,
            datum1:   document.getElementById('datum1').value,
            uhrzeit:  document.getElementById('uhrzeit').value,
            datum2:   document.getElementById('datum2').value,
            uhrzeit2: document.getElementById('uhrzeit2').value,
            nachricht: document.getElementById('nachricht').value,
        };

        try {
            // TODO: EmailJS aktivieren sobald Account eingerichtet ist
            // await emailjs.send('SERVICE_ID', 'TEMPLATE_ID', params);
            // showFormSuccess(form);

            // Vorläufiger Fallback bis EmailJS aktiv ist:
            showFormFallback(form);
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

// Diese Funktion sorgt dafür, dass beim Klick auf eine FAQ-Frage die Antwort ein- oder ausgeklappt wird.
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

// Mobile Navigation: Hamburger-Menü (öffnet/schließt die Hauptnavigation auf kleinen Screens)
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

// Automatisch beim Laden der Seite aufrufen
window.addEventListener('DOMContentLoaded', () => {
  setupFaqAccordion();
  setupMobileNavToggle();
  setupContactForm();
});

// Utility Bar nach dem Header
document.addEventListener('DOMContentLoaded', function () {
  // Öffnungszeiten: Arrays aus Zeitintervallen pro Tag (0=So ... 6=Sa)
  const OPENING_HOURS = {
    0: null, // Sonntag: geschlossen
    1: [["08:00", "12:00"], ["13:00", "18:00"]], // Montag (Mittagspause 12–13)
    2: [["08:00", "12:00"], ["13:00", "18:00"]], // Dienstag ("-")
    3: [["08:00", "12:00"], ["13:00", "18:00"]], // Mittwoch ("-")
    4: [["08:00", "12:00"], ["13:00", "18:00"]], // Donnerstag ("-")
    5: [["08:00", "12:00"], ["13:00", "18:00"]], // Freitag ("-")
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
    dotEl && dotEl.style.setProperty('background', '#ef4444');
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
      // Nächstes Intervall finden und dessen Startzeit anzeigen
      let nextStart = '';
      for (let i = 0; i < normIntervals.length - 1; i++) {
        const endDate = parseTimeToDate(normIntervals[i][1]);
        if (now > endDate) {
          nextStart = prettyTime(normIntervals[i + 1][0]);
          break;
        }
      }
      textEl.textContent = `Jetzt Mittagspause – wieder geöffnet ab ${nextStart}`;
    } else {
      textEl.textContent = `Heute: geöffnet von ${dayText}`;
    }
  }

  if (openNow) {
    statusEl.classList.remove('closed');
    dotEl && dotEl.style.setProperty('background', '#22c55e');
  } else {
    statusEl.classList.add('closed');
    dotEl && dotEl.style.setProperty('background', '#ef4444');
  }
});

// Custom select display
const fahrzeugSelect = document.getElementById('fahrzeug');
if (fahrzeugSelect) {
  const display = fahrzeugSelect.nextElementSibling;
  const textEl = display && display.querySelector('.custom-select-text');
  fahrzeugSelect.addEventListener('change', () => {
    const selected = fahrzeugSelect.options[fahrzeugSelect.selectedIndex];
    if (textEl) textEl.textContent = selected.value ? selected.text : 'Bitte wählen...';
    if (display) display.classList.toggle('has-value', !!selected.value);
  });
}
