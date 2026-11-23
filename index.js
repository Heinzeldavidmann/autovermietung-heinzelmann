// ============================================================
// index.js – gemeinsames JavaScript für alle Seiten der Website
// ============================================================
// Inhaltsverzeichnis (Funktionen in Aufruf-Reihenfolge):
//   1. setupContactForm()      – Kontaktformular absenden (Netlify Forms), inkl.
//      setupFormSteps()          – Formular in drei Schritten mit Fortschrittsanzeige
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

// ── Öffnungszeiten (zentral, werden von Statusanzeige und Formular genutzt) ──
// Arrays aus Zeitintervallen pro Tag (0=So ... 6=Sa). Bei Änderung auch die Texte in den HTML-Fußbereichen
// und den strukturierten Daten (openingHoursSpecification in index.html) anpassen.
const OPENING_HOURS = {
    0: null,                                        // Sonntag: geschlossen
    1: [["07:30", "12:00"], ["13:00", "18:00"]],  // Montag (Mittagspause 12–13)
    2: [["07:30", "12:00"], ["13:00", "18:00"]],  // Dienstag
    3: [["07:30", "12:00"], ["13:00", "18:00"]],  // Mittwoch
    4: [["07:30", "12:00"], ["13:00", "18:00"]],  // Donnerstag
    5: [["07:30", "12:00"], ["13:00", "18:00"]],  // Freitag
    6: [["07:30", "13:00"]]                         // Samstag (durchgehend)
};

// Liegt der Zeitpunkt innerhalb der Öffnungszeiten?
function isOpenAt(date) {
    const intervals = OPENING_HOURS[date.getDay()];
    if (!intervals) return false;
    const minutes = date.getHours() * 60 + date.getMinutes();
    const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    return intervals.some(([start, end]) => minutes >= toMin(start) && minutes <= toMin(end));
}

// ── Inline-Validierung & Datumslogik fürs Anfrageformular ──
// Zeigt Fehlermeldungen direkt unter dem jeweiligen Feld (beim Verlassen des Felds bzw. beim
// Absenden) und räumt sie live wieder ab, sobald der Wert passt. Das Formular hat "novalidate",
// damit die Browser-eigenen Sprechblasen nicht dazwischenfunken.
function setupFormValidation(form) {
    const pad = n => String(n).padStart(2, '0');
    const todayIso = () => {
        const d = new Date();
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };
    const el = id => form.querySelector('#' + id);
    // Spätestes erlaubtes Datum: heute in zwei Jahren (fängt Tippfehler wie 2062 ab)
    const maxIso = () => {
        const d = new Date(); d.setFullYear(d.getFullYear() + 2);
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };

    const REQUIRED_MESSAGES = {
        fahrzeug: 'Bitte wählen Sie eine Fahrzeugart aus.',
        fahrzeugkategorie: () => el('fahrzeug').value === 'Anhänger'
            ? 'Bitte wählen Sie eine Anhängergruppe aus.'
            : 'Bitte wählen Sie eine Fahrzeuggruppe aus.',
        getriebe: 'Bitte wählen Sie einen Getriebetyp aus.',
        anhaengkupplung: 'Bitte geben Sie an, ob Sie eine Anhängkupplung brauchen.',
        zugfahrzeug: 'Bitte geben Sie an, ob Sie ein Zugfahrzeug brauchen.',
        anrede: 'Bitte wählen Sie eine Anrede aus.',
        vorname: 'Bitte geben Sie Ihren Vornamen ein.',
        nachname: 'Bitte geben Sie Ihren Nachnamen ein.',
        telefon: 'Bitte geben Sie Ihre Telefonnummer ein.',
        email: 'Bitte geben Sie Ihre E-Mail-Adresse ein.',
        abholung_datum: 'Bitte wählen Sie ein Abholdatum.',
        abholung_uhrzeit: 'Bitte geben Sie eine Abholzeit an.',
        rueckgabe_datum: 'Bitte wählen Sie ein Rückgabedatum.',
        rueckgabe_uhrzeit: 'Bitte geben Sie eine Rückgabezeit an.',
    };

    // Ein Feld zählt nicht, wenn es deaktiviert ist oder sein .field (bzw. ein Elternelement)
    // per hidden ausgeblendet wurde. Ausnahme: ein gerade nicht angezeigter Formularschritt
    // (.form-step) – dessen Felder werden trotzdem geprüft, damit beim Absenden nichts fehlt.
    function isInactive(field) {
        if (field.disabled) return true;
        for (let n = field.closest('.field'); n && n !== form; n = n.parentElement) {
            if (n.hidden && !n.classList.contains('form-step')) return true;
        }
        return false;
    }

    function getError(field) {
        const wrapper = field.closest('.field');
        if (!wrapper || isInactive(field)) return ''; // ausgeblendete/deaktivierte Felder überspringen
        const value = field.value.trim();
        // Zahlenfeld mit ungültiger Eingabe (z.B. "abc") meldet value "" plus badInput
        if (field.validity && field.validity.badInput) {
            return field.id === 'fahrtstrecke' ? 'Bitte geben Sie die Fahrtstrecke als ganze Zahl in km an, z.B. 300.' : 'Bitte prüfen Sie Ihre Eingabe.';
        }
        if (field.required && !value) {
            const msg = REQUIRED_MESSAGES[field.id];
            return (typeof msg === 'function' ? msg() : msg) || 'Bitte füllen Sie dieses Feld aus.';
        }
        if (!value) return '';
        if (field.id === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
            return 'Bitte prüfen Sie die E-Mail-Adresse, z.B. name@beispiel.de.';
        }
        if (field.id === 'telefon' && (!field.checkValidity() || value.replace(/\D/g, '').length < 6)) {
            return 'Bitte geben Sie eine gültige Telefonnummer ein, z.B. 0151 23456789.';
        }
        if (field.id === 'fahrtstrecke' && !/^\d{1,5}$/.test(value)) {
            return 'Bitte geben Sie die Fahrtstrecke als ganze Zahl in km an, z.B. 300.';
        }
        if ((field.id === 'abholung_datum' || field.id === 'rueckgabe_datum') && value > maxIso()) {
            return 'Bitte wählen Sie ein Datum innerhalb der nächsten zwei Jahre.';
        }
        if (field.id === 'abholung_datum' && value < todayIso()) {
            return 'Das Abholdatum liegt in der Vergangenheit.';
        }
        if (field.id === 'rueckgabe_datum' && el('abholung_datum').value && value < el('abholung_datum').value) {
            return 'Die Rückgabe muss nach der Abholung liegen.';
        }
        if (field.id === 'rueckgabe_uhrzeit'
            && el('abholung_datum').value && el('abholung_datum').value === el('rueckgabe_datum').value
            && el('abholung_uhrzeit').value && value <= el('abholung_uhrzeit').value) {
            return 'Die Rückgabezeit muss nach der Abholzeit liegen.';
        }
        return '';
    }

    function showError(field, message) {
        const wrapper = field.closest('.field');
        // Fehlertext pro Eingabe (nicht pro .field): Datum und Uhrzeit teilen sich ein .field,
        // sonst würde die gültige Uhrzeit den Fehler des Datums wieder löschen
        let err = wrapper.querySelector('#error-' + field.id);
        if (!err) {
            err = document.createElement('p');
            err.className = 'field-error';
            err.id = 'error-' + field.id;
            wrapper.appendChild(err);
        }
        err.textContent = message;
        err.hidden = !message;
        wrapper.classList.toggle('field-invalid', !!wrapper.querySelector('.field-error:not([hidden])'));
        if (message) {
            field.setAttribute('aria-invalid', 'true');
            field.setAttribute('aria-describedby', err.id);
        } else {
            field.removeAttribute('aria-invalid');
            field.removeAttribute('aria-describedby');
        }
    }

    function validateField(field) {
        const message = getError(field);
        showError(field, message);
        return !message;
    }

    const fields = Array.from(form.querySelectorAll('input[id], select[id], textarea[id]'));
    const isShown = field => field.closest('.field') && field.closest('.field').classList.contains('field-invalid');

    // Klick auf Weiter/Absenden/Zurück direkt aus einem Feld heraus: Die Prüfung beim Verlassen
    // des Felds würde eine Fehlermeldung einblenden, der Button rutscht nach unten und der Klick
    // ginge ins Leere. Deshalb bei diesen Buttons überspringen (sie prüfen ohnehin selbst).
    let skipBlur = false;
    form.addEventListener('pointerdown', e => {
        if (e.target.closest('.form-nav, .form-progress, .form-summary')) {
            skipBlur = true;
            setTimeout(() => { skipBlur = false; }, 400);
        }
    }, true);

    fields.forEach(field => {
        const isSelectLike = field.tagName === 'SELECT' || field.type === 'date' || field.type === 'time';
        field.addEventListener(isSelectLike ? 'change' : 'blur', () => {
            if (!isSelectLike && skipBlur) return;
            validateField(field);
        });
        field.addEventListener('input', () => { if (isShown(field)) validateField(field); });
    });

    // Datumslogik: kein Datum in der Vergangenheit, Rückgabe nie vor der Abholung
    const abholung = el('abholung_datum');
    const rueckgabe = el('rueckgabe_datum');
    if (abholung && rueckgabe) {
        abholung.min = todayIso();
        rueckgabe.min = todayIso();
        abholung.max = maxIso();
        rueckgabe.max = maxIso();

        abholung.addEventListener('change', () => {
            if (!abholung.value) { rueckgabe.min = todayIso(); return; }
            rueckgabe.min = abholung.value;
            // Rückgabe leer oder davor: auf das Abholdatum vorbelegen (Nutzer kann es ändern)
            if (!rueckgabe.value || rueckgabe.value < abholung.value) {
                rueckgabe.value = abholung.value;
                rueckgabe.dispatchEvent(new Event('input', { bubbles: true }));
                rueckgabe.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });

        // Datum und Uhrzeit: bereits angezeigte Rückgabe-Fehler neu bewerten, wenn sich die Abholung ändert
        ['abholung_datum', 'abholung_uhrzeit', 'rueckgabe_datum'].forEach(id => {
            el(id).addEventListener('change', () => {
                ['rueckgabe_datum', 'rueckgabe_uhrzeit'].forEach(rid => {
                    if (isShown(el(rid))) validateField(el(rid));
                });
            });
        });

        // Klick öffnet direkt den Kalender (statt erst ein einzelnes Datumssegment zu fokussieren)
        [abholung, rueckgabe].forEach(input => {
            input.addEventListener('click', () => {
                try { if (input.showPicker) input.showPicker(); } catch (e) { /* nicht unterstützt */ }
            });
        });
    }

    // Prüft alle Felder (optional nur innerhalb von scope, z.B. eines Formularschritts)
    // und liefert das erste fehlerhafte Feld (oder null)
    function validateAll(scope) {
        let first = null;
        api.lastErrorCount = 0;
        fields.filter(field => !scope || scope.contains(field)).forEach(field => {
            if (!validateField(field)) {
                api.lastErrorCount++;
                const wrapper = field.closest('.field');
                wrapper.classList.add('field-bounce');
                setTimeout(() => wrapper.classList.remove('field-bounce'), 600);
                if (!first) first = field;
            }
        });
        return first;
    }

    const api = { validateAll, lastErrorCount: 0 };
    return api;
}

// "Bitte prüfen Sie 1 markiertes Feld." / "… 3 markierte Felder."
function fehlerHinweis(anzahl) {
    return anzahl === 1
        ? 'Bitte prüfen Sie 1 markiertes Feld.'
        : `Bitte prüfen Sie ${anzahl || 'die'} markierte${anzahl ? '' : 'n'} Felder.`;
}

// ── 1. Kontaktformular Submit-Handler (Netlify Forms) ──
function setupContactForm() {
    const form = document.querySelector('.inquiry-form');
    if (!form) return;

    const validation = setupFormValidation(form);
    const steps = setupFormSteps(form, validation);
    setupAutoGrow(form.querySelector('#nachricht'));
    setupFormDraft(form);
    let sending = false;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Enter in Schritt 1 oder 2 schickt nicht ab, sondern geht einen Schritt weiter
        if (steps && !steps.isLast()) {
            steps.next();
            return;
        }

        // Alle Felder prüfen; Fehler erscheinen direkt am jeweiligen Feld.
        // Mit Schritten: zum ersten Schritt mit Fehler springen.
        const firstInvalid = steps ? steps.validateAllSteps() : validation.validateAll();
        if (firstInvalid) {
            showValidationToast(fehlerHinweis(validation.lastErrorCount));
            if (steps) steps.focusField(firstInvalid); else firstInvalid.focus();
            return;
        }

        if (sending) return; // Doppeltes Absenden (Doppelklick, Enter) verhindern
        if (!navigator.onLine) { showFormError(form, 'offline'); return; }
        sending = true;
        const alteMeldung = form.querySelector('.form-status-msg');
        if (alteMeldung) alteMeldung.hidden = true;

        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.textContent = 'Wird gesendet…';
        btn.disabled = true;

        // ── Feldinhalte für die Netlify-Mail aufbereiten ──
        // Browser-eigene Felder (type="date", type="time", type="number") akzeptieren
        // nur ihr jeweiliges Pflichtformat -- schreibt man einen anderen Wert rein,
        // setzt der Browser das Feld sofort auf leer. Deshalb: echte Felder per
        // "disabled" aus FormData ausschließen und stattdessen temporäre hidden-Felder
        // mit demselben name und dem aufbereiteten Wert anlegen. Nach dem Absenden
        // werden disabled aufgehoben und die hidden-Felder wieder entfernt.

        const formatDate = iso => {
            if (!iso) return iso;
            const [y, m, d] = iso.split('-');
            return `${d}.${m}.${y}`;
        };

        const overrides = [
            { id: 'abholung_datum',    format: v => formatDate(v) },
            { id: 'rueckgabe_datum',   format: v => formatDate(v) },
            { id: 'abholung_uhrzeit',  format: v => v ? `${v} Uhr` : v },
            { id: 'rueckgabe_uhrzeit', format: v => v ? `${v} Uhr` : v },
            { id: 'fahrtstrecke',      format: v => v.trim() ? `${v.trim()} km` : v },
        ];

        const hiddenFields = [];
        overrides.forEach(({ id, format }) => {
            const field = form.querySelector(`#${id}`);
            if (!field || !field.value) return;
            field.disabled = true;
            const hidden = document.createElement('input');
            hidden.type  = 'hidden';
            hidden.name  = field.name;
            hidden.value = format(field.value);
            form.appendChild(hidden);
            hiddenFields.push({ field, hidden });
        });

        const vehicleType = (form.querySelector('#fahrzeug') || {}).value || '';

        // Nach 20 Sekunden ohne Antwort abbrechen, damit der Button nicht ewig "Wird gesendet…" zeigt
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);

        try {
            const data = new FormData(form);
            const response = await fetch('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(data).toString(),
                signal: controller.signal,
            });
            if (response.ok) {
                // Messung nur, wenn Google Analytics per Einwilligung geladen wurde (dann existiert window.gtag)
                if (typeof window.gtag === 'function') {
                    window.gtag('event', 'generate_lead', { form_name: 'anfrage', vehicle_type: vehicleType });
                }
                showFormSuccess(form, isShortNotice());
            } else {
                showFormError(form);
            }
        } catch (err) {
            showFormError(form, err.name === 'AbortError' ? 'timeout' : (navigator.onLine ? '' : 'offline'));
        } finally {
            clearTimeout(timeout);
            sending = false;
            // Echte Felder wieder aktivieren, hidden-Felder entfernen
            hiddenFields.forEach(({ field, hidden }) => {
                field.disabled = false;
                if (hidden) hidden.remove();
            });
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });
}

// Gemeinsame Formatierung für Kalender-Fußzeile und Zusammenfassung:
// "2026-11-27" → "Fr, 27.11."  und  "09:00" → "9:00 Uhr"
const WOCHENTAGE_KURZ = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
function formatTag(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return `${WOCHENTAGE_KURZ[new Date(y, m - 1, d).getDay()]}, ${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.`;
}
function formatUhrzeit(t) {
    return t ? `${t.replace(/^0(?=\d:)/, '')} Uhr` : '';
}
// Kleines Hilfsmittel, um Text sicher in HTML einzusetzen
function escapeHtml(text) {
    return String(text).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// Nachrichtenfeld startet zweizeilig und wächst beim Tippen mit (bis max. ca. 10 Zeilen)
function setupAutoGrow(textarea) {
    if (!textarea) return;
    const grow = () => {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight + 2, 260) + 'px';
    };
    textarea.addEventListener('input', grow);
    const form = textarea.closest('form');
    if (form) form.addEventListener('reset', () => setTimeout(grow, 0));
}

// ── 1b. Anfrageformular in drei Schritten (Fahrzeug → Zeitraum → Kontakt) ──
// Platz, den die feste Kopfzeile oben verdeckt. Kommt aus scroll-padding-top in style.css,
// damit Sprünge im Formular dieselbe Höhe nutzen wie Ankerlinks (im Querformat auf dem Handy
// scrollt die Kopfzeile mit und der Wert ist entsprechend klein).
function fixedHeaderOffset() {
    return parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
}

// Blendet immer nur einen .form-step ein, prüft beim "Weiter" nur die Felder des aktuellen
// Schritts und zeigt oben eine Fortschrittsanzeige. Ohne JavaScript bleiben alle Schritte
// sichtbar (normales einstufiges Formular). Die Fahrzeugart-Kacheln und Anrede-Knöpfe
// ([data-choice-for]) steuern die weiterhin vorhandenen, aber versteckten <select>-Felder,
// damit Validierung, Vorausfüllen per Link und Netlify unverändert funktionieren.
function setupFormSteps(form, validation) {
    const stepEls = Array.from(form.querySelectorAll('.form-step'));
    if (stepEls.length < 2) return null;

    const progress = form.querySelector('.form-progress');
    const progressBtns = Array.from(form.querySelectorAll('.form-progress-step'));
    const backBtn = form.querySelector('.form-back');
    const nextBtn = form.querySelector('.form-next');
    const submitBtn = form.querySelector('.form-submit');
    const summary = form.querySelector('.form-summary');
    const fahrzeugSel = form.querySelector('#fahrzeug');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let current = 1;
    let maxReached = 1;
    const nav = form.querySelector('.form-nav');

    // Buttons stehen normal unten im Formular. Nur bei "Anhänger mit Zugfahrzeug" (letztes Feld
    // Getriebetyp ist halb breit) kommen sie ins Raster von Schritt 1, rechts neben das Getriebe.
    function placeNav() {
        if (!nav) return;
        const inline = current === 1 && form.dataset.fahrzeug === 'Anhänger' && form.dataset.zug === 'ja';
        if (inline) stepEls[0].appendChild(nav);
        else stepEls[stepEls.length - 1].after(nav);
    }

    form.classList.add('is-stepped');
    if (progress) progress.hidden = false;
    if (nextBtn) nextBtn.hidden = false;

    // ── Kacheln / Knöpfe ↔ verstecktes <select> ──
    const choiceGroups = Array.from(form.querySelectorAll('[data-choice-for]'));
    function syncChoices() {
        choiceGroups.forEach(group => {
            const sel = form.querySelector('#' + group.dataset.choiceFor);
            group.querySelectorAll('button[data-value]').forEach(btn => {
                btn.setAttribute('aria-pressed', String(!!sel && btn.dataset.value === sel.value));
            });
        });
    }
    choiceGroups.forEach(group => {
        const sel = form.querySelector('#' + group.dataset.choiceFor);
        if (!sel) return;
        group.hidden = false;
        group.closest('.field').classList.add('has-choices');
        group.addEventListener('click', e => {
            const btn = e.target.closest('button[data-value]');
            if (!btn || sel.value === btn.dataset.value) return;
            sel.value = btn.dataset.value;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
        });
        sel.addEventListener('change', syncChoices);
    });

    // ── Fahrzeug-Details erst nach Wahl der Fahrzeugart zeigen ──
    // data-only-for: nur bei dieser Fahrzeugart (Zugfahrzeug-Frage nur bei Anhänger)
    // data-not-for:  nicht bei dieser Fahrzeugart (Getriebe/Kupplung nicht bei Anhänger) –
    //                außer data-with-zug ist gesetzt und ein Zugfahrzeug wird mitgemietet
    const zugSel = form.querySelector('#zugfahrzeug');
    function syncDetails() {
        const wert = fahrzeugSel ? fahrzeugSel.value : '';
        const mitZug = !!zugSel && zugSel.value.startsWith('Ja');
        form.dataset.fahrzeug = wert;
        form.dataset.zug = mitZug ? 'ja' : '';
        // Bei Anhänger geht es um die Anhängergruppe, nicht um die Gruppe des Zugfahrzeugs
        const gruppeLabel = form.querySelector('label[for="fahrzeugkategorie"]');
        if (gruppeLabel) gruppeLabel.textContent = wert === 'Anhänger' ? 'Anhängergruppe' : 'Fahrzeuggruppe';
        placeNav();
        form.querySelectorAll('[data-step-detail]').forEach(field => {
            let show = !!wert;
            if (field.dataset.onlyFor) show = show && wert === field.dataset.onlyFor;
            if (field.dataset.notFor === wert) show = 'withZug' in field.dataset && mitZug;
            field.hidden = !show;
            // Ausgeblendete Felder deaktivieren, damit ein vorher gewählter Wert nicht mitgeschickt wird
            field.querySelectorAll('input, select, textarea').forEach(input => {
                input.disabled = !!wert && !show;
            });
        });
    }
    if (fahrzeugSel) fahrzeugSel.addEventListener('change', syncDetails);
    if (zugSel) zugSel.addEventListener('change', syncDetails);

    // ── Zusammenfassung über den Kontaktdaten ──
    function updateSummary() {
        if (!summary) return;
        const val = id => { const el = form.querySelector('#' + id); return el && !el.disabled ? el.value : ''; };
        // Fahrzeug: Art fett, Details (Gruppe, Zugfahrzeug) dahinter in Grau
        const fahrzeugText = fahrzeugSel && fahrzeugSel.value ? fahrzeugSel.options[fahrzeugSel.selectedIndex].text : '';
        const details = [];
        const gruppe = val('fahrzeugkategorie');
        if (gruppe && gruppe !== 'Kategorie egal') details.push(gruppe);
        const zug = val('zugfahrzeug');
        if (zug.startsWith('Ja')) details.push(`mit ${zug.replace('Ja, ', '')}`);
        const fahrzeugEl = summary.querySelector('.form-summary-fahrzeug');
        fahrzeugEl.innerHTML = fahrzeugText
            ? `<strong>${escapeHtml(fahrzeugText)}</strong>${details.length ? ` <span>${escapeHtml(details.join(', '))}</span>` : ''}`
            : '';
        fahrzeugEl.hidden = !fahrzeugText;
        // Zeitraum: "Fr, 27.11. 17:30 Uhr → Mi, 16.12. 16:00 Uhr"
        const zeitEl = summary.querySelector('.form-summary-zeitraum');
        // "Uhr" in eigenem span, damit es auf schmalen Handys ausgeblendet werden kann
        const zeit = t => t ? `${t.replace(/^0(?=\d:)/, '')}<span class="form-summary-unit"> Uhr</span>` : '';
        const ab = val('abholung_datum'), rueck = val('rueckgabe_datum');
        zeitEl.innerHTML = ab && rueck
            ? `<strong>${formatTag(ab)}</strong> <span>${zeit(val('abholung_uhrzeit'))}</span>`
              + `<span class="form-summary-arrow" aria-hidden="true">→</span>`
              + `<strong>${formatTag(rueck)}</strong> <span>${zeit(val('rueckgabe_uhrzeit'))}</span>`
            : '';
        zeitEl.hidden = !(ab && rueck);
        summary.hidden = fahrzeugEl.hidden && zeitEl.hidden;
        const summaryTitle = form.querySelector('.form-summary-title');
        if (summaryTitle) summaryTitle.hidden = summary.hidden;
    }

    function stepEl(n) { return stepEls[n - 1]; }

    function render(n, { focus = true } = {}) {
        current = n;
        maxReached = Math.max(maxReached, n);
        placeNav();
        stepEls.forEach((el, i) => { el.hidden = i + 1 !== n; });
        progressBtns.forEach(btn => {
            const s = Number(btn.dataset.goto);
            btn.parentElement.classList.toggle('is-done', s < n);
            btn.parentElement.classList.toggle('is-current', s === n);
            btn.disabled = s > maxReached || s === n;
            if (s === n) btn.setAttribute('aria-current', 'step'); else btn.removeAttribute('aria-current');
        });
        const isLast = n === stepEls.length;
        if (backBtn) backBtn.hidden = n === 1;
        if (nextBtn) nextBtn.hidden = isLast;
        if (submitBtn) submitBtn.hidden = !isLast;
        if (isLast) updateSummary();

        if (!reduceMotion) {
            const el = stepEl(n);
            el.classList.remove('form-step-enter');
            void el.offsetWidth;
            el.classList.add('form-step-enter');
        }
        if (!focus) return;
        // Formularanfang ins Bild holen, falls er oberhalb des sichtbaren Bereichs liegt (v.a. Handy)
        const offset = fixedHeaderOffset();
        const top = form.getBoundingClientRect().top;
        if (top < offset) {
            window.scrollBy({ top: top - offset, behavior: reduceMotion ? 'auto' : 'smooth' });
        }
        const title = stepEl(n).querySelector('.form-group-title:not([hidden])');
        if (title) title.focus({ preventScroll: true });
    }

    // Vorwärts nur, wenn alle Schritte bis dorthin vollständig sind
    function goTo(target) {
        for (let s = current; s < target; s++) {
            const invalid = validation.validateAll(stepEl(s));
            if (invalid) {
                if (s !== current) render(s);
                showValidationToast(fehlerHinweis(validation.lastErrorCount));
                focusField(invalid);
                return false;
            }
        }
        const firstVisit = target > maxReached;
        render(target);
        if (firstVisit && typeof window.gtag === 'function') {
            window.gtag('event', 'form_step', { form_name: 'anfrage', step: target });
        }
        return true;
    }

    // Fokus auf ein Feld; bei versteckten Selects stattdessen auf die erste Kachel/den ersten Knopf
    function focusField(field) {
        const group = form.querySelector(`[data-choice-for="${field.id}"]`);
        const target = group && !group.hidden ? group.querySelector('button') : field;
        if (target) target.focus();
    }

    function validateAllSteps() {
        for (let s = 1; s <= stepEls.length; s++) {
            const invalid = validation.validateAll(stepEl(s));
            if (invalid) {
                if (s !== current) render(s, { focus: false });
                return invalid;
            }
        }
        return null;
    }

    if (nextBtn) nextBtn.addEventListener('click', () => goTo(current + 1));
    if (backBtn) backBtn.addEventListener('click', () => render(current - 1));
    form.querySelectorAll('[data-goto]').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = Number(btn.dataset.goto);
            if (target < current) render(target); else if (target > current) goTo(target);
        });
    });

    // Nach dem erfolgreichen Absenden (form.reset in showFormSuccess) zurück auf Schritt 1
    form.addEventListener('reset', () => setTimeout(() => {
        form.querySelectorAll('select.custom-select-hidden').forEach(sel => {
            const display = sel.nextElementSibling;
            const textEl = display && display.querySelector('.custom-select-text');
            const opt = sel.options[sel.selectedIndex];
            const hasValue = !!(opt && opt.value);
            if (textEl) textEl.textContent = hasValue ? opt.text : 'Auswählen';
            if (display) display.classList.toggle('has-value', hasValue);
        });
        form.querySelectorAll('.date-input-wrap').forEach(wrap => {
            const input = wrap.querySelector('input');
            wrap.classList.toggle('has-value', !!(input && input.value));
        });
        syncChoices();
        syncDetails();
        maxReached = 1;
        render(1, { focus: false });
    }, 0));

    syncChoices();
    syncDetails();
    render(1, { focus: false });

    const api = {
        isLast: () => current === stepEls.length,
        next: () => goTo(current + 1),
        validateAllSteps,
        focusField,
        // Für prefillFormFromUrl: Kacheln und Details nach programmatischer Änderung abgleichen
        sync: () => { syncChoices(); syncDetails(); },
    };
    form.formSteps = api;
    return api;
}

// ── 1d. Uhrzeit als Auswahlliste statt Eintippen ──
// Ersetzt die Bedienung der <input type="time">-Felder durch eine Liste im 30-Minuten-Takt
// (auf dem iPhone erscheint dafür das Auswahlrad). Abholung: nur Zeiten in den Öffnungszeiten
// des gewählten Tages (bis 30 Min. vor Schluss). Rückgabe: 6–22 Uhr, da jederzeit möglich.
// "Andere Zeit …" blendet das echte Zeitfeld zum freien Eintragen ein (z.B. 9:15).
// Das echte Zeitfeld bleibt das abgeschickte Feld, die Liste hat keinen name.
function setupTimeSelects() {
    const CUSTOM = 'custom';
    const pad = n => String(n).padStart(2, '0');
    const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const toTime = min => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
    const label = t => `${t.replace(/^0/, '')} Uhr`;

    function pickupSlots(dateValue) {
        let day = dateValue ? new Date(dateValue + 'T12:00').getDay() : 1;
        if (!OPENING_HOURS[day]) day = 1; // geschlossener Tag (Ausnahme): Werktagszeiten anbieten
        const slots = [];
        OPENING_HOURS[day].forEach(([start, end]) => {
            for (let m = toMin(start); m <= toMin(end) - 30; m += 30) slots.push(toTime(m));
        });
        return slots;
    }
    function returnSlots() {
        const slots = [];
        for (let m = 6 * 60; m <= 22 * 60; m += 30) slots.push(toTime(m));
        return slots;
    }

    [
        { timeId: 'abholung_uhrzeit', dateId: 'abholung_datum', name: 'Abholzeit', slots: pickupSlots },
        { timeId: 'rueckgabe_uhrzeit', dateId: null, name: 'Rückgabezeit', slots: returnSlots },
    ].forEach(cfg => {
        const input = document.getElementById(cfg.timeId);
        if (!input) return;
        const split = input.closest('.split-input');
        const field = input.closest('.field');
        const dateInput = cfg.dateId && document.getElementById(cfg.dateId);

        const select = document.createElement('select');
        select.className = 'time-select';
        select.setAttribute('aria-label', cfg.name);
        input.insertAdjacentElement('beforebegin', select);

        // Zeile für die eigene Uhrzeit; das echte Zeitfeld wandert dort hinein
        const custom = document.createElement('div');
        custom.className = 'time-custom';
        custom.hidden = true;
        custom.innerHTML = `<span>Ihre Uhrzeit:</span>`;
        custom.appendChild(input);
        split.insertAdjacentElement('afterend', custom);
        field.classList.add('has-time-select');

        let customMode = false;

        function setCustom(on) {
            customMode = on;
            custom.hidden = !on;
            select.value = on ? CUSTOM : input.value;
        }

        function build() {
            const slots = cfg.slots(dateInput ? dateInput.value : '');
            select.innerHTML = slots.map(t => `<option value="${t}">${label(t)}</option>`).join('')
                + `<option value="${CUSTOM}">Andere Zeit …</option>`;
            if (customMode) { select.value = CUSTOM; return; }
            // Gewählte Zeit gibt es am neuen Tag nicht: offen als eigene Uhrzeit zeigen statt still zu ändern
            if (input.value && !slots.includes(input.value)) setCustom(true);
            else select.value = input.value || slots[0];
        }

        select.addEventListener('change', () => {
            if (select.value === CUSTOM) {
                setCustom(true);
                input.focus();
                try { if (input.showPicker) input.showPicker(); } catch (e) { /* nicht unterstützt */ }
                return;
            }
            customMode = false;
            custom.hidden = true;
            input.value = select.value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });

        if (dateInput) dateInput.addEventListener('change', build);
        input.addEventListener('change', () => { if (!customMode) build(); });
        const form = input.closest('form');
        if (form) form.addEventListener('reset', () => setTimeout(() => { setCustom(false); build(); }, 0));
        build();
    });
}

// ── 1c. Kalender im Schritt "Zeitraum" ──
// Zeigt zwei Monate (mobil einen) und hebt den Zeitraum zwischen Abholung und Rückgabe hervor.
// Ablauf: 1. Tipp = Abholung, 2. Tipp = Rückgabe, nächster Tipp startet einen neuen Zeitraum.
// Welcher Tag als Nächstes dran ist, zeigt eine Anleitung über dem Kalender und eine rote
// Umrandung am passenden Datumsfeld oben (wichtig auf dem Handy, wo es kein Hover gibt).
// Werte werden in die echten Datumsfelder geschrieben (inkl. change-Event), damit Validierung,
// Hinweise, Uhrzeitlisten und Zusammenfassung mitlaufen.
function setupRangeCalendar() {
    const cal = document.querySelector('.range-calendar');
    const start = document.getElementById('abholung_datum');
    const end = document.getElementById('rueckgabe_datum');
    if (!cal || !start || !end) return;

    const monthsEl = cal.querySelector('.range-calendar-months');
    const hintEl = cal.querySelector('.range-calendar-hint');
    const startBox = start.closest('.split-input');
    const endBox = end.closest('.split-input');
    const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    const pad = n => String(n).padStart(2, '0');
    const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const parse = v => { const [y, m, d] = v.split('-').map(Number); return new Date(y, m - 1, d); };

    const today = new Date();
    let view = new Date(today.getFullYear(), today.getMonth(), 1); // erster angezeigter Monat
    let awaitingEnd = false; // true nach dem Abholtag: nächster Tipp setzt die Rückgabe
    let hoverIso = '';
    let updating = false; // true, solange der Kalender selbst Werte setzt

    function setValue(input, value) {
        updating = true;
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        updating = false;
    }

    function renderMonth(first) {
        const y = first.getFullYear(), m = first.getMonth();
        const todayIso = iso(today);
        const s = start.value;
        const preview = awaitingEnd && hoverIso && s && hoverIso >= s;
        const e = preview ? hoverIso : end.value;
        const offset = (first.getDay() + 6) % 7; // Montag zuerst
        let html = `<div class="range-calendar-month"><p class="range-calendar-title">${MONATE[m]} ${y}</p>
            <div class="range-calendar-grid">${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(t => `<span class="range-calendar-wd">${t}</span>`).join('')}`;
        for (let i = 0; i < 42; i++) { // immer 6 Zeilen, damit die Höhe beim Blättern gleich bleibt
            const d = new Date(y, m, i - offset + 1);
            if (d.getMonth() !== m) { html += '<span class="range-calendar-empty"></span>'; continue; }
            const v = iso(d);
            const cls = ['range-calendar-day'];
            if (v < todayIso) cls.push('is-past');
            if (v === todayIso) cls.push('is-today');
            if (d.getDay() === 0) cls.push('is-sunday');
            if (s && v === s) cls.push('is-start');
            if (e && s && v === e && e >= s && !(awaitingEnd && !preview)) cls.push('is-end');
            if (s && e && v > s && v < e && !(awaitingEnd && !preview)) cls.push('in-range');
            if (preview && v === e) cls.push('is-preview');
            html += `<button type="button" tabindex="-1" class="${cls.join(' ')}" data-date="${v}"${v < todayIso ? ' disabled' : ''}${d.getDay() === 0 ? ' title="Sonntag geschlossen, keine Abholung"' : ''}>${d.getDate()}</button>`;
        }
        return html + '</div></div>';
    }

    function renderHint() {
        if (awaitingEnd) hintEl.innerHTML = 'Jetzt den <strong>Rückgabetag</strong> antippen';
        else if (start.value && end.value) hintEl.innerHTML = 'Für einen neuen Zeitraum den <strong>Abholtag</strong> antippen';
        else hintEl.innerHTML = 'Zuerst den <strong>Abholtag</strong> antippen, dann den Rückgabetag';
        // Das Datumsfeld, das der nächste Tipp setzt, rot umranden
        if (startBox) startBox.classList.toggle('is-calendar-target', !awaitingEnd);
        if (endBox) endBox.classList.toggle('is-calendar-target', awaitingEnd);
    }

    function render() {
        const second = new Date(view.getFullYear(), view.getMonth() + 1, 1);
        monthsEl.innerHTML = renderMonth(view) + renderMonth(second);
        cal.querySelector('.range-calendar-prev').disabled =
            view.getFullYear() === today.getFullYear() && view.getMonth() === today.getMonth();
        renderHint();
    }

    // Angezeigten Monat so wählen, dass das Datum sichtbar ist (mobil nur ein Monat sichtbar)
    function showMonthOf(value) {
        if (!value) return;
        const d = parse(value);
        const first = new Date(d.getFullYear(), d.getMonth(), 1);
        const oneMonth = window.matchMedia('(max-width: 600px)').matches;
        const last = new Date(view.getFullYear(), view.getMonth() + (oneMonth ? 0 : 1), 1);
        if (first < view || first > last) view = first;
    }

    monthsEl.addEventListener('click', e => {
        const btn = e.target.closest('.range-calendar-day');
        if (!btn || btn.disabled) return;
        const v = btn.dataset.date;
        if (awaitingEnd && start.value && v >= start.value) {
            awaitingEnd = false;
            setValue(end, v);
        } else {
            // Neuer Zeitraum (oder Tag vor der Abholung angetippt): Abholung setzen
            setValue(start, v);
            setValue(end, v); // vorläufig derselbe Tag, bis die Rückgabe gewählt ist
            awaitingEnd = true;
        }
        hoverIso = '';
        render();
    });
    monthsEl.addEventListener('mouseover', e => {
        const btn = e.target.closest('.range-calendar-day');
        if (!awaitingEnd || !btn || btn.dataset.date === hoverIso) return;
        hoverIso = btn.dataset.date;
        render();
    });
    monthsEl.addEventListener('mouseleave', () => { if (hoverIso) { hoverIso = ''; render(); } });
    cal.querySelectorAll('.range-calendar-nav').forEach(btn => btn.addEventListener('click', () => {
        view = new Date(view.getFullYear(), view.getMonth() + Number(btn.dataset.dir), 1);
        render();
    }));
    // Manuelle Eingabe oben: Kalender nachziehen
    [start, end].forEach(input => input.addEventListener('change', () => {
        if (updating) return;
        awaitingEnd = false;
        showMonthOf(input === end ? end.value : start.value);
        render();
    }));
    const form = start.closest('form');
    if (form) form.addEventListener('reset', () => setTimeout(() => {
        awaitingEnd = false;
        view = new Date(today.getFullYear(), today.getMonth(), 1);
        render();
    }, 0));

    cal.hidden = false;
    showMonthOf(start.value);
    render();
}

// Liegt der Wunsch-Abholtermin in den nächsten 48 Stunden (oder in der Vergangenheit)?
function isShortNotice() {
    const date = document.getElementById('abholung_datum');
    if (!date || !date.value) return false;
    const time = document.getElementById('abholung_uhrzeit');
    const pickup = new Date(date.value + 'T' + ((time && time.value) || '00:00'));
    return pickup.getTime() - Date.now() < 48 * 60 * 60 * 1000;
}

// Zeigt schon beim Ausfüllen den Telefon-Hinweis, sobald der Abholtermin kurzfristig ist.
function setupShortNoticeHint() {
    const hint = document.getElementById('short-notice-hint');
    const date = document.getElementById('abholung_datum');
    const time = document.getElementById('abholung_uhrzeit');
    if (!hint || !date) return;
    // Nur die Abholung muss in den Öffnungszeiten liegen. Die Rückgabe geht jederzeit
    // (Schlüssel wird in den Türeinwurf geworfen), dafür gibt es bewusst keinen Hinweis.
    const closedHint = document.getElementById('closed-hours-hint');
    const update = () => {
        hint.hidden = !isShortNotice();
        if (!closedHint) return;
        const pickup = date.value && time && time.value ? new Date(date.value + 'T' + time.value) : null;
        closedHint.hidden = !(pickup && !isNaN(pickup) && !isOpenAt(pickup));
    };
    ['abholung_datum', 'abholung_uhrzeit'].forEach(id => {
        const el = document.getElementById(id);
        if (el) ['change', 'input'].forEach(ev => el.addEventListener(ev, update));
    });
    const form = date.closest('form');
    if (form) form.addEventListener('reset', () => setTimeout(update, 0));
    update();
}

function showFormSuccess(form, shortNotice) {
    const rushText = shortNotice
        ? ' Bei einer Abholung innerhalb der nächsten 48 Stunden empfehlen wir Ihnen zusätzlich einen kurzen Anruf: <a href="tel:+49758692130">07586&nbsp;/&nbsp;9213-0</a>.'
        : '';
    const closedNowText = isOpenAt(new Date())
        ? ''
        : ' Wir sind gerade geschlossen und antworten zu unseren Öffnungszeiten.';
    form.reset();
    clearFormDraft();
    // Formular ausblenden, nur die Bestätigung zeigen (sonst wirkt das leere Formular wie "nochmal ausfüllen")
    form.classList.add('is-sent');
    const msg = showFormMessage(form,
        'Vielen Dank für Ihre Anfrage!',
        'Wir prüfen die Verfügbarkeit und melden uns persönlich bei Ihnen. Sie haben noch nichts gebucht. Reserviert ist Ihr Fahrzeug erst, sobald wir uns gemeldet haben.' + rushText + closedNowText,
        'success'
    );
    const again = document.createElement('button');
    again.type = 'button';
    again.className = 'form-status-again';
    again.textContent = 'Weitere Anfrage stellen';
    again.addEventListener('click', () => {
        form.classList.remove('is-sent');
        msg.hidden = true;
        const title = form.querySelector('.form-step:not([hidden]) .form-group-title');
        if (title) title.focus();
    });
    msg.appendChild(again);
}

// Fehlermeldung beim Absenden; kind: 'offline' | 'timeout' | '' (Serverfehler)
function showFormError(form, kind) {
    const kontakt = 'Rufen Sie uns an: <a href="tel:+49758692130">07586&nbsp;/&nbsp;9213-0</a> oder schreiben Sie an <a href="mailto:info@autovermietung-heinzelmann.de">info@autovermietung-heinzelmann.de</a>.';
    const texte = {
        offline: ['Keine Internetverbindung.', 'Ihre Angaben bleiben erhalten. Senden Sie die Anfrage erneut, sobald Sie wieder online sind, oder ' + kontakt.charAt(0).toLowerCase() + kontakt.slice(1)],
        timeout: ['Der Server antwortet gerade nicht.', 'Ihre Angaben bleiben erhalten. Bitte versuchen Sie es gleich noch einmal. ' + kontakt],
        '': ['Ihre Anfrage konnte leider nicht gesendet werden.', 'Ihre Angaben bleiben erhalten. Bitte versuchen Sie es noch einmal. ' + kontakt],
    };
    const [title, text] = texte[kind || ''] || texte[''];
    showFormMessage(form, title, text, 'error');
}

function showFormFallback(form) {
    showFormMessage(form, null,
        'Das Formular ist in Kürze vollständig verfügbar. Bis dahin erreichen Sie uns telefonisch unter 07586 / 9213-0 oder per E-Mail an info@autovermietung-heinzelmann.de',
        'error'
    );
}

// Zeigt die Erfolgs- oder Fehlermeldung im Formular an (erstellt sie beim ersten Mal).
// Erfolg wird als Status, Fehler als Alarm vorgelesen; der Fokus springt auf die Meldung.
function showFormMessage(form, title, text, type) {
    let msg = form.querySelector('.form-status-msg');
    if (!msg) {
        msg = document.createElement('div');
        msg.tabIndex = -1;
        form.appendChild(msg);
    }
    msg.className = `form-status-msg is-${type}`;
    msg.setAttribute('role', type === 'success' ? 'status' : 'alert');
    msg.innerHTML = (title ? `<strong class="form-status-title">${title}</strong>` : '') + `<p>${text}</p>`;
    msg.hidden = false;
    msg.focus({ preventScroll: true });
    const r = msg.getBoundingClientRect();
    const offset = fixedHeaderOffset();
    if (r.top < offset || r.bottom > window.innerHeight) {
        window.scrollBy({ top: r.top - offset, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
    return msg;
}

// ── Entwurf sichern ──
// Lädt der Browser die Seite neu (z.B. auf dem Handy nach einem Anruf oder App-Wechsel),
// gehen die Eingaben sonst verloren. Gespeichert wird nur in diesem Browser-Tab
// (sessionStorage, wird beim Schließen des Tabs gelöscht) und nach dem Absenden entfernt.
const DRAFT_KEY = 'anfrageEntwurf';

function clearFormDraft() {
    try { sessionStorage.removeItem(DRAFT_KEY); } catch (e) { /* Speicher nicht verfügbar */ }
}

function setupFormDraft(form) {
    let timer;
    const save = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            if (form.classList.contains('is-sent')) return;
            const values = {};
            form.querySelectorAll('input[id], select[id], textarea[id]').forEach(el => {
                if (el.type === 'hidden' || el.name === 'bot-field' || !el.name) return;
                if (el.value) values[el.id] = el.value;
            });
            try {
                // Nur speichern, wenn wirklich etwas eingegeben wurde (Uhrzeit-Vorgaben allein zählen nicht)
                const echt = Object.keys(values).filter(k => !/_uhrzeit$/.test(k));
                if (echt.length) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(values));
                else sessionStorage.removeItem(DRAFT_KEY);
            } catch (e) { /* Speicher voll oder gesperrt: dann eben ohne Entwurf */ }
        }, 300);
    };
    form.addEventListener('input', save);
    form.addEventListener('change', save);
}

function restoreFormDraft() {
    const form = document.querySelector('.inquiry-form');
    if (!form) return;
    if (window.location.hash.includes('?')) return; // Link mit Vorauswahl hat Vorrang
    let values = null;
    try { values = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null'); } catch (e) { return; }
    if (!values || typeof values !== 'object') return;

    // Reihenfolge wichtig: Fahrzeugart baut die Gruppen auf, Uhrzeiten vor den Daten (Zeitlisten)
    const set = (id, ev = 'change') => {
        const el = form.querySelector('#' + id);
        if (!el || typeof values[id] !== 'string') return;
        el.value = values[id];
        if (el.value !== values[id]) return; // Wert existiert nicht (mehr), z.B. alte Gruppe
        el.dispatchEvent(new Event(ev, { bubbles: true }));
    };
    ['fahrzeug', 'fahrzeugkategorie', 'zugfahrzeug', 'getriebe', 'anhaengkupplung'].forEach(id => set(id));
    set('fahrtstrecke', 'input');
    ['abholung_uhrzeit', 'rueckgabe_uhrzeit', 'abholung_datum', 'rueckgabe_datum', 'anrede'].forEach(id => set(id));
    ['vorname', 'nachname', 'telefon', 'email', 'nachricht'].forEach(id => set(id, 'input'));

    const note = document.getElementById('prefill-note');
    if (note) {
        note.querySelector('.prefill-note-text').textContent = 'Wir haben Ihre bisherigen Angaben wiederhergestellt.';
        note.hidden = false;
        note.querySelector('.prefill-note-reset').addEventListener('click', () => {
            form.reset();
            clearFormDraft();
            note.hidden = true;
        }, { once: true });
    }
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
        question: 'Wie viel Gepäck nehmen Sie mit, z.B. für eine Urlaubsreise?',
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
            { label: 'Kleinere Ladung (bis ca. 10 m³, z.B. 1-Zimmer-Umzug)', next: 'zugfahrzeug-klein' },
            { label: 'Mittlere bis große Ladung (10–20 m³, z.B. 2–3-Zimmer-Umzug)', next: 'zugfahrzeug-mittel' },
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
// (z.B. von einem "Jetzt anfragen"-Button auf preise.html oder aus dem Fuhrpark-Finder),
// werden Fahrzeugart und Modell automatisch ins Kontaktformular übernommen und kurz hervorgehoben.
function prefillFormFromUrl() {
    const hash = window.location.hash; // z.B. "#kontakt?fahrzeug=transporter&modell=..."
    if (!hash.includes('?')) return;

    const queryString = hash.split('?')[1];
    const params = new URLSearchParams(queryString);

    const fahrzeugRaw = params.get('fahrzeug');
    const gruppeRaw   = params.get('gruppe');
    const modell      = params.get('modell');

    // Kurzwerte aus den "Jetzt anfragen"-Links auf die exakten <option>-Values übersetzen
    const FAHRZEUG_MAP = {
        pkw: 'PKW',
        transporter: 'Transporter & LKW',
        lkw: 'Transporter & LKW',
        bus: 'Personentransporter / 9-Sitzer',
        anhaenger: 'Anhänger',
    };
    const fahrzeug = FAHRZEUG_MAP[fahrzeugRaw] || fahrzeugRaw;

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
        // change-Event feuern damit setupFahrzeugkategorie() die Optionen befüllt
        sel.dispatchEvent(new Event('change'));
        fieldsToHighlight.push(sel.closest('.field'));
    }

    // Fahrzeuggruppe direkt ins Dropdown setzen wenn mitgegeben
    if (gruppeRaw) {
        const gruppe = gruppeRaw; // URLSearchParams hat bereits dekodiert (nochmal dekodieren bricht bei "%")
        const gruppeSel = document.getElementById('fahrzeugkategorie');
        if (gruppeSel) {
            gruppeSel.value = gruppe;
            const gruppeDisplay = gruppeSel.nextElementSibling;
            const gruppeTextEl = gruppeDisplay && gruppeDisplay.querySelector('.custom-select-text');
            if (gruppeTextEl) {
                const selected = gruppeSel.options[gruppeSel.selectedIndex];
                if (selected && selected.value) {
                    gruppeTextEl.textContent = selected.text;
                    gruppeDisplay.classList.add('has-value');
                }
            }
            const gruppeField = document.getElementById('field-fahrzeugkategorie');
            if (gruppeField) fieldsToHighlight.push(gruppeField);
        }
    }

    // Nachricht nur bei konkretem Modell (nicht bei reiner Gruppenauswahl)
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
                    if (textEl) textEl.textContent = 'Auswählen';
                    if (display) display.classList.remove('has-value');
                }
                if (textarea) textarea.value = '';
                const form = document.querySelector('.inquiry-form');
                if (form && form.formSteps) form.formSteps.sync();
                note.hidden = true;
            });
        }
    }
}

const GA_MEASUREMENT_ID = 'G-TWHLSRDJS9';
const CONSENT_KEY = 'cookieConsent'; // 'all' | 'essential'

// Google Analytics (GA4) wird ausschließlich nach Zustimmung ("Alle akzeptieren") geladen.
// Consent Mode v2: Alle Speicherzwecke starten auf "denied"; nur Statistik wird bei Zustimmung freigegeben.
// Werbe-Zwecke bleiben immer verweigert, es werden keine Werbe-Signale oder Personalisierung genutzt.
function loadGoogleAnalytics() {
    if (window.__gaLoaded) return;
    window.__gaLoaded = true;
    window['ga-disable-' + GA_MEASUREMENT_ID] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'denied'
    });
    window.gtag('consent', 'update', { analytics_storage: 'granted' });
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, {
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        cookie_flags: 'SameSite=Lax;Secure'
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
    document.head.appendChild(script);
}

// Entfernt GA-Cookies, wenn die Einwilligung widerrufen wird.
function removeGoogleAnalyticsCookies() {
    const host = location.hostname;
    const domains = ['', host, '.' + host, '.' + host.replace(/^www\./, '')];
    document.cookie.split(';').forEach(c => {
        const name = c.split('=')[0].trim();
        if (name.startsWith('_ga')) {
            domains.forEach(d => {
                document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + (d ? '; domain=' + d : '');
            });
        }
    });
}

function showCookieBanner() {
    if (document.getElementById('cookie-consent-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'cookie-consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie-Einstellungen');
    banner.innerHTML = `
        <div class="cookie-consent-inner">
            <div class="cookie-consent-text">
                <strong>Diese Website nutzt Cookies</strong>
                <span>Technisch notwendige Cookies sorgen für die Grundfunktionen der Website. Optionale Dienste wie eingebettete Karten und die Besucherstatistik mit Google Analytics laden wir nur nach Ihrer Zustimmung. Details finden Sie in unserer <a href="datenschutz.html">Datenschutzerklärung</a>.</span>
            </div>
            <div class="cookie-consent-actions">
                <button type="button" class="button button-secondary" id="cookie-consent-essential">Nur notwendige</button>
                <button type="button" class="button" id="cookie-consent-all">Alle akzeptieren</button>
            </div>
        </div>
    `;
    document.body.appendChild(banner);

    setTimeout(() => {
        banner.classList.add('cookie-consent-visible');
        stackBannersOnMobile();
    }, 100);

    function dismiss(value) {
        const previous = localStorage.getItem(CONSENT_KEY);
        localStorage.setItem(CONSENT_KEY, value);
        banner.classList.remove('cookie-consent-visible');
        setTimeout(() => banner.remove(), 400);
        if (value === 'all') {
            loadGoogleAnalytics();
        } else if (previous === 'all') {
            // Widerruf: Tracking sofort stoppen, Cookies löschen und neu laden, damit GA nicht weiterläuft
            window['ga-disable-' + GA_MEASUREMENT_ID] = true;
            if (window.gtag) window.gtag('consent', 'update', { analytics_storage: 'denied' });
            removeGoogleAnalyticsCookies();
            setTimeout(() => location.reload(), 450);
        }
    }

    document.getElementById('cookie-consent-all').addEventListener('click', () => dismiss('all'));
    document.getElementById('cookie-consent-essential').addEventListener('click', () => dismiss('essential'));
}

// ── 7. Cookie-Consent-Banner ──
// Erscheint beim ersten Besuch. Bei "Alle akzeptieren" wird zusätzlich Google Analytics geladen.
// Über den Footer-Link "Cookie-Einstellungen" (wird hier per JS ergänzt) lässt sich die
// Auswahl jederzeit ändern bzw. widerrufen.
function setupCookieConsent() {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (consent === 'all') loadGoogleAnalytics();
    if (!consent) showCookieBanner();

    // Footer-Link zum Ändern der Auswahl ergänzen (neben Impressum/Datenschutz)
    const legalLink = document.querySelector('.footer-bottom a[href="datenschutz.html"]');
    if (legalLink && !document.getElementById('cookie-settings-link')) {
        const link = document.createElement('a');
        link.href = '#';
        link.id = 'cookie-settings-link';
        link.textContent = 'Cookie-Einstellungen';
        link.addEventListener('click', e => { e.preventDefault(); showCookieBanner(); });
        legalLink.insertAdjacentText('afterend', ' · ');
        legalLink.parentNode.insertBefore(link, legalLink.nextSibling.nextSibling);
    }
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
            iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
            iframe.classList.add(...placeholder.classList);
            iframe.classList.remove('map-consent-placeholder');
            placeholder.replaceWith(iframe);
        });
    });
}

// ── 12. Scroll-Reveal: Sektionen und Cards beim Scrollen sanft einblenden ──
// Elemente mit .reveal werden per IntersectionObserver beobachtet.
// Elemente in derselben .reveal-group werden als Gruppe behandelt:
// sobald eines davon sichtbar wird, löst die gesamte Gruppe gestaffelt aus
// (Reihenfolge nach DOM-Position, nicht nach Viewport-Nähe).
function setupScrollReveal() {
    const targets = document.querySelectorAll('.reveal');
    if (!targets.length) return;

    function isInViewport(el) {
        const rect = el.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
    }

    // Elemente ohne Gruppe werden einzeln beobachtet
    const singles = [];
    // Gruppen: Map von Container-Element -> Array der Kind-Elemente
    const groups = new Map();

    targets.forEach(el => {
        const groupEl = el.closest('.reveal-group');
        if (groupEl) {
            if (!groups.has(groupEl)) groups.set(groupEl, []);
            groups.get(groupEl).push(el);
        } else {
            singles.push(el);
        }
    });

    // Einzelne Elemente: wenn mehrere gleichzeitig sichtbar werden (z.B. spec-cards
    // die alle auf einmal im Viewport auftauchen), nach DOM-Reihenfolge staffeln.
    let singleBatchTimer = null;
    const singleBatch = [];

    const singleObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                singleBatch.push(entry.target);
                singleObserver.unobserve(entry.target);
            }
        });
        // Kurz warten bis alle gleichzeitigen Einträge gesammelt sind, dann staffeln
        clearTimeout(singleBatchTimer);
        singleBatchTimer = setTimeout(() => {
            // Nach DOM-Reihenfolge sortieren
            singleBatch.sort((a, b) => {
                const pos = a.compareDocumentPosition(b);
                return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
            });
            singleBatch.forEach((el, i) => {
                setTimeout(() => el.classList.add('revealed'), i * 100);
            });
            singleBatch.length = 0;
        }, 30);
    }, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });

    singles.forEach(el => singleObserver.observe(el));

    // Gruppen: Container beobachten, bei Sichtbarkeit alle Kids der Reihe nach auslösen
    groups.forEach((children, container) => {
        let fired = false;

        function fireGroup() {
            if (fired) return;
            fired = true;
            children.forEach((el, i) => {
                setTimeout(() => el.classList.add('revealed'), i * 120);
            });
        }

        const groupObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    groupObserver.unobserve(container);
                    fireGroup();
                }
            });
        }, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });

        groupObserver.observe(container);
    });

    // Nach zwei Frames: alles was bereits im Viewport liegt sofort einblenden
    // (deckt den Fall ab dass die Seite direkt auf einem Anker wie #kontakt geladen wird)
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            targets.forEach(el => {
                if (!el.classList.contains('revealed') && isInViewport(el)) {
                    el.classList.add('revealed');
                }
            });
        });
    });
}

// ── 13. Counter-Animation: Zahlen zählen hoch wenn sie ins Bild kommen ──
// Elemente mit data-count="60" zählen von 0 auf den Zielwert hoch.
// Das Suffix (z.B. "+") wird aus dem ursprünglichen Text-Inhalt übernommen.
function setupCounterAnimation() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            observer.unobserve(entry.target);

            const el = entry.target;
            const target = parseInt(el.dataset.count, 10);
            const suffix = el.dataset.countSuffix || '';
            const duration = 1400;
            const start = performance.now();

            function tick(now) {
                const elapsed = now - start;
                const progress = Math.min(elapsed / duration, 1);
                // Ease-out cubic
                const eased = 1 - Math.pow(1 - progress, 3);
                el.textContent = Math.round(eased * target) + suffix;
                if (progress < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
        });
    }, { threshold: 0.5 });

    counters.forEach(el => observer.observe(el));
}

// ── 14. Eyebrow-Wasserzeichen einpassen ──
// Die großen, blassen Rubrik-Labels (.eyebrow) sollen in einer Zeile stehen.
// Ist ein Label breiter als sein Platz, wird die Schrift passend verkleinert.
function setupEyebrowFit() {
    const labels = document.querySelectorAll('.eyebrow');
    if (!labels.length) return;

    const fit = () => {
        labels.forEach(el => {
            el.style.fontSize = '';
            el.style.whiteSpace = 'nowrap';
            const avail = el.clientWidth;
            const needed = el.scrollWidth;
            if (avail > 0 && needed > avail) {
                const size = parseFloat(getComputedStyle(el).fontSize);
                el.style.fontSize = `${Math.floor(size * avail / needed * 0.98)}px`;
            }
        });
    };

    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    let timer;
    window.addEventListener('resize', () => {
        clearTimeout(timer);
        timer = setTimeout(fit, 120);
    });
}

window.addEventListener('DOMContentLoaded', () => {
  // Jede Funktion einzeln absichern: ein Fehler in einem Teil (z.B. ein kaputter Link)
  // darf nicht den Rest der Seite lahmlegen (sonst bleiben z.B. .reveal-Abschnitte unsichtbar).
  [
    setupFaqAccordion,
    setupMobileNavToggle,
    setupContactForm,
    setupShortNoticeHint,
    setupTimeSelects,
    setupRangeCalendar,
    setupTestimonialsSlider,
    setupFuhrparkFinder,
    setupMapConsent,
    setupCookieConsent,
    setupFahrzeugkategorie,
    prefillFormFromUrl,
    restoreFormDraft,
    setupScrollReveal,
    setupCounterAnimation,
    setupEyebrowFit,
  ].forEach(fn => {
    try { fn(); } catch (err) { console.error(`${fn.name} fehlgeschlagen:`, err); }
  });
});

// ── 9. Öffnungszeiten-Anzeige (in der Utility Bar direkt unter dem Header) ──
// Berechnet anhand der aktuellen Uhrzeit, ob gerade geöffnet, geschlossen oder
// Mittagspause ist, und aktualisiert Text + grünen/roten Punkt in #open-status.
// Ist die Website gerade außerhalb der Öffnungszeiten geöffnet, wird zusätzlich
// einmalig ein Hinweis-Banner unten eingeblendet (siehe showClosedBanner).
document.addEventListener('DOMContentLoaded', function () {
  // Öffnungszeiten: siehe OPENING_HOURS ganz oben in dieser Datei.

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
    return `${s} - ${e}`; // z.B. "8 - 12 Uhr"
  }
  function intervalsToText(ints) {
    // z.B. [["08:00","12:00"],["13:00","18:00"]] -> "8 - 12 Uhr und 13 - 18 Uhr"
    const parts = ints.map(([s, e]) => rangeSegment(s, e));
    return parts.join(' und ');
  }

  // Nächste Öffnung ab jetzt suchen (heute später, morgen oder an einem der Folgetage)
  function nextOpening() {
    const WOCHENTAGE = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'];
    for (let offset = 0; offset <= 7; offset++) {
      const dayIdx = (day + offset) % 7;
      const ints = OPENING_HOURS[dayIdx];
      if (!ints || ints.length === 0) continue;
      const list = Array.isArray(ints[0]) ? ints : [ints];
      for (const [start] of list) {
        if (offset === 0 && parseTimeToDate(start) <= now) continue;
        const label = offset === 0 ? 'heute' : offset === 1 ? 'morgen' : WOCHENTAGE[dayIdx];
        return { label, time: prettyTime(start) };
      }
    }
    return null;
  }
  function closedTexts() {
    const next = nextOpening();
    if (!next) return { full: 'Jetzt geschlossen', short: 'Geschlossen' };
    return {
      full: `Jetzt geschlossen – öffnet ${next.label} um ${next.time}`,
      short: `Geschlossen – ${next.label} ${next.time}`
    };
  }
  function applyResponsiveText(full, short) {
    if (!textEl) return;
    textEl.dataset.full = full;
    textEl.dataset.short = short;
    const apply = () => {
      textEl.textContent = window.innerWidth <= 900 ? textEl.dataset.short : textEl.dataset.full;
    };
    apply();
    window.addEventListener('resize', apply);
  }

  if (!intervals || intervals.length === 0) {
    const t = closedTexts();
    applyResponsiveText(t.full, t.short);
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
      applyResponsiveText(`Jetzt Mittagspause – wieder geöffnet ab ${nextStart}`, `Pause – ab ${nextStart}`);
    } else if (openNow) {
      applyResponsiveText(`Heute: geöffnet von ${dayText}`, `Geöffnet ${dayText}`);
    } else {
      const t = closedTexts();
      applyResponsiveText(t.full, t.short);
    }
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
      bannerMsg = 'Heute sind wir leider nicht geöffnet. Sie erreichen uns telefonisch Mo. bis Fr. von 7:30 bis 12:00 Uhr und 13:00 bis 18:00 Uhr sowie Sa. von 7:30 bis 13:00 Uhr.';
    } else if (middayPauseNow) {
      bannerMsg = null; // Mittagspause wird bereits in der Utility Bar angezeigt
    } else {
      const firstStart = prettyTime(normIntervals[0][0]);
      const lastEnd = prettyTime(normIntervals[normIntervals.length - 1][1]);
      const nowBeforeOpen = now < parseTimeToDate(normIntervals[0][0]);
      if (nowBeforeOpen) {
        bannerMsg = `Heute öffnen wir um ${firstStart}. Für dringende Anfragen erreichen Sie uns unter 07586 / 9213-0.`;
      } else {
        const naechsterTag = now.getDay() === 6 ? 'Montag' : 'morgen';
        bannerMsg = `Wir hatten heute bis ${lastEnd} geöffnet. Ab ${naechsterTag} sind wir wieder für Sie da. Bei dringenden Anfragen erreichen Sie uns unter 07586 / 9213-0.`;
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
    toast.setAttribute('role', 'alert');
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

  const inner = document.createElement('div');
  inner.className = 'closed-banner-inner';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'closed-banner-icon';
  iconWrap.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true"><path d="M12 2a10 10 0 1010 10A10.011 10.011 0 0012 2zm1 11h-4a1 1 0 010-2h3V7a1 1 0 012 0z"/></svg>';

  const textWrap = document.createElement('div');
  textWrap.className = 'closed-banner-text';
  const heading = document.createElement('strong');
  heading.textContent = 'Aktuell außerhalb der Öffnungszeiten';
  const msg = document.createElement('span');
  msg.textContent = message;
  textWrap.appendChild(heading);
  textWrap.appendChild(msg);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'closed-banner-close';
  closeBtn.setAttribute('aria-label', 'Hinweis schließen');
  closeBtn.textContent = '✕';

  inner.appendChild(iconWrap);
  inner.appendChild(textWrap);
  inner.appendChild(closeBtn);
  banner.appendChild(inner);

  document.body.appendChild(banner);

  setTimeout(() => {
    banner.classList.add('closed-banner-visible');
    stackBannersOnMobile();
  }, 100);

  closeBtn.addEventListener('click', () => {
    banner.classList.remove('closed-banner-visible');
    sessionStorage.setItem('closedBannerDismissed', '1');
    setTimeout(() => {
      banner.remove();
      stackBannersOnMobile();
    }, 400);
  });
}

function stackBannersOnMobile() {
  if (window.innerWidth > 600) return;
  const cookieBanner = document.getElementById('cookie-consent-banner');
  const closedBanner = document.getElementById('closed-banner');
  if (!cookieBanner) return;
  if (closedBanner && closedBanner.classList.contains('closed-banner-visible')) {
    const h = closedBanner.offsetHeight;
    cookieBanner.style.bottom = h + 'px';
  } else {
    cookieBanner.style.bottom = '';
  }
}
window.addEventListener('resize', stackBannersOnMobile);

// ── Fahrzeugkategorie-Dropdown ──
// Kategorien und zugehörige Anker-Links auf preise.html pro Fahrzeugart.
const FAHRZEUG_KATEGORIEN = {
    'PKW': {
        anchor: 'preise-pkw',
        optionen: [
            'Kategorie egal',
            'Gruppe 1 · Kleinwagen',
            'Gruppe 2 · Kleinwagen',
            'Gruppe 3 · Untere Mittelklasse',
            'Gruppe 4 · Mittelklasse',
            'Gruppe 5 · Obere Mittelklasse',
            'Gruppe 6 · Oberklasse',
        ],
        tooltip: [
            { gruppe: 'Gruppe 1 · Kleinwagen',        fahrzeug: 'z.B. Dacia Spring / Renault Twingo / Toyota Aygo',  einsatz: 'Ideal für die Stadt und kurze Strecken' },
            { gruppe: 'Gruppe 2 · Kleinwagen',        fahrzeug: 'z.B. Dacia Sandero / Renault Clio / Toyota Yaris',  einsatz: 'Sparsam und wendig für Alltag und Ausflüge' },
            { gruppe: 'Gruppe 3 · Untere Mittelkl.',  fahrzeug: 'z.B. VW Golf / VW Caddy / Renault Kangoo',          einsatz: 'Geräumig und vielseitig für jeden Bedarf' },
            { gruppe: 'Gruppe 4 · Mittelklasse',      fahrzeug: 'z.B. MB A 180 d / MB B 200 d / Seat Arona',         einsatz: 'Komfortabel für Geschäfts- und Privatreisen' },
            { gruppe: 'Gruppe 5 · Obere Mittelkl.',   fahrzeug: 'z.B. MB C 220 d / MB Citan / Volvo V60',            einsatz: 'Für komfortable Reisen und größere Gruppen' },
            { gruppe: 'Gruppe 6 · Oberklasse',        fahrzeug: 'z.B. MB E 220 d / MB GLC 300 / Volvo XC60',         einsatz: 'Maximaler Komfort, Allrad, große Kofferräume' },
        ],
    },
    'Transporter & LKW': {
        anchor: 'preise-transporter',
        optionen: [
            'Kategorie egal',
            'Gruppe 1 · Führerschein B (MB Vito)',
            'Gruppe 2 · Führerschein B (MB Sprinter)',
            'Gruppe 3 · Führerschein B (MB Sprinter XL)',
            'Gruppe 4 · Führerschein B (MB Sprinter Koffer)',
            'Gruppe 5 · Führerschein C1 (MB Atego LKW)',
            'Gruppe 6 · Führerschein C (MB Atego LKW)',
        ],
        tooltip: [
            { gruppe: 'Gruppe 1 · FS B',  fahrzeug: 'z.B. MB Vito Kasten / Kombi',           einsatz: 'Ideal für kleine Transporte und Lieferungen' },
            { gruppe: 'Gruppe 2 · FS B',  fahrzeug: 'z.B. MB Sprinter Kasten / Kombi',       einsatz: 'Für die meisten Umzüge und Transporte' },
            { gruppe: 'Gruppe 3 · FS B',  fahrzeug: 'z.B. MB Sprinter Kasten / Kombi XL',    einsatz: 'Für größere Wohnungen und viel Volumen' },
            { gruppe: 'Gruppe 4 · FS B',  fahrzeug: 'z.B. MB Sprinter Koffer + Ladebordwand',einsatz: 'Für schwere Güter mit Ladebordwand' },
            { gruppe: 'Gruppe 5 · FS C1', fahrzeug: 'z.B. MB Atego Koffer / Plane (LKW)',    einsatz: 'Für große Umzüge und Gewerbetransporte' },
            { gruppe: 'Gruppe 6 · FS C',  fahrzeug: 'z.B. MB Atego Koffer / Plane (LKW)',    einsatz: 'Für sehr große Mengen und schwere Fracht' },
        ],
    },
    'Personentransporter / 9-Sitzer': {
        anchor: 'preise-9sitzer',
        optionen: [
            'Kategorie egal',
            'Gruppe 1 · Führerschein B (7-9 Sitzer)',
            'Gruppe 2 · Führerschein B (MB Sprinter 9-Sitzer)',
            'Gruppe 3 · Führerschein B (MB Sprinter 9-Sitzer XL)',
        ],
        tooltip: [
            { gruppe: 'Gruppe 1 · FS B', fahrzeug: 'z.B. MB Vito / Renault Trafic Bus',  einsatz: 'Ideal für kleinere Gruppen und Tagesausflüge' },
            { gruppe: 'Gruppe 2 · FS B', fahrzeug: 'z.B. MB Sprinter 9-Sitzer',          einsatz: 'Für Gruppen bis 9 Personen mit viel Gepäck' },
            { gruppe: 'Gruppe 3 · FS B', fahrzeug: 'z.B. MB Sprinter 9-Sitzer XL',       einsatz: 'Optimal für Radsportler, Skifahrer und Bands' },
        ],
    },
    'Anhänger': {
        anchor: 'preise-anhaenger',
        optionen: [
            'Kategorie egal',
            'Planenanhänger EA',
            'Planen- & Kofferanhänger EA',
            'Kofferanhänger EA',
            'Planenanhänger TD',
            'LKW-Koffer- & Planenanhänger TD',
            'Dreiseitenkipper TD',
            'Pferdeanhänger TD',
            'Fahrzeugtransportanhänger',
        ],
        tooltip: [
            { gruppe: 'Planenanhänger EA',               fahrzeug: 'z.B. Einachser, klein',           einsatz: 'Ideal für kleine Transporte und Einkäufe' },
            { gruppe: 'Planen- & Kofferanhänger EA',     fahrzeug: 'z.B. Einachser, mittel',          einsatz: 'Für Umzüge und mittlere Transporte' },
            { gruppe: 'Kofferanhänger EA',               fahrzeug: 'z.B. Einachser, geschlossen',     einsatz: 'Witterungsgeschützt transportieren' },
            { gruppe: 'Planenanhänger TD',               fahrzeug: 'z.B. Tandemachser, groß',         einsatz: 'Für große Mengen und Umzüge' },
            { gruppe: 'LKW-Koffer- & Planenanhänger TD', fahrzeug: 'z.B. Tandemachser, XL',          einsatz: 'Für gewerbliche Großtransporte' },
            { gruppe: 'Dreiseitenkipper TD',             fahrzeug: 'z.B. Tandemachser, Kipper',       einsatz: 'Für Schüttgut, Erde und Bauschutt' },
            { gruppe: 'Pferdeanhänger TD',               fahrzeug: 'z.B. Tandemachser, Pferdeanhänger',einsatz: 'Sicherer Transport für 2 Pferde' },
            { gruppe: 'Fahrzeugtransportanhänger',       fahrzeug: 'z.B. Tandemachser, offen',        einsatz: 'Für PKW, Motorräder und Quads' },
        ],
    },
};

function setupFahrzeugkategorie() {
    const fahrzeugSel = document.getElementById('fahrzeug');
    const kategorieField = document.getElementById('field-fahrzeugkategorie');
    const kategorieSel = document.getElementById('fahrzeugkategorie');
    const infoLink = document.getElementById('fahrzeugkategorie-info');
    if (!fahrzeugSel || !kategorieField || !kategorieSel) return;

    // ── Tooltip aufbauen ──
    // Am body anhängen damit overflow:hidden des Formulars nicht abschneidet.
    // Position wird per JS relativ zum Info-Icon berechnet.
    const tooltip = document.createElement('div');
    tooltip.className = 'gruppe-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.hidden = true;
    document.body.appendChild(tooltip);

    // Tooltip so breit wie der Inhaltsbereich des weißen Formulars, bündig mit den Feldern,
    // direkt unter "Mehr erfahren"; der kleine Pfeil oben zeigt auf den Link.
    function positioniereTooltip() {
        const rect = infoLink.getBoundingClientRect();
        const scrollX = window.scrollX || document.documentElement.scrollLeft;
        const scrollY = window.scrollY || document.documentElement.scrollTop;
        const form = infoLink.closest('.inquiry-form');
        let left = 12, width = window.innerWidth - 24;
        if (form) {
            const f = form.getBoundingClientRect();
            const cs = getComputedStyle(form);
            left = f.left + parseFloat(cs.paddingLeft);
            width = f.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        }
        // Unterkante des sichtbaren Textes, ohne die unsichtbar vergrößerte Tippfläche
        const textBottom = rect.bottom - (parseFloat(getComputedStyle(infoLink).paddingBottom) || 0);
        tooltip.style.top = `${textBottom + scrollY + 10}px`;
        tooltip.style.left = `${left + scrollX}px`;
        tooltip.style.width = `${width}px`;
        const arrowX = Math.min(Math.max(rect.left + rect.width / 2 - left, 16), width - 16);
        tooltip.style.setProperty('--arrow-x', `${arrowX}px`);
    }

    function zeigeTooltip(config) {
        if (!config || !config.tooltip) return;
        tooltip.innerHTML = config.tooltip.map(row => `
            <div class="gruppe-tooltip-row">
                <span class="gruppe-tooltip-gruppe">${row.gruppe}</span>
                <span class="gruppe-tooltip-fahrzeug">${row.fahrzeug}</span>
                <span class="gruppe-tooltip-einsatz">${row.einsatz}</span>
            </div>
        `).join('');
        tooltip.hidden = false;
        positioniereTooltip();
        requestAnimationFrame(() => tooltip.classList.add('tooltip-visible'));
    }

    function versteckeTooltip() {
        tooltip.classList.remove('tooltip-visible');
        // hidden erst nach der Transition setzen damit Fade-out sichtbar ist
        tooltip.addEventListener('transitionend', () => {
            if (!tooltip.classList.contains('tooltip-visible')) tooltip.hidden = true;
        }, { once: true });
    }

    // Hover (Desktop)
    infoLink.addEventListener('mouseenter', () => {
        const config = FAHRZEUG_KATEGORIEN[fahrzeugSel.value];
        if (config) zeigeTooltip(config);
    });
    infoLink.addEventListener('mouseleave', (e) => {
        if (!tooltip.contains(e.relatedTarget)) versteckeTooltip();
    });
    tooltip.addEventListener('mouseleave', (e) => {
        if (!infoLink.contains(e.relatedTarget)) versteckeTooltip();
    });

    // Klick (Mobile)
    infoLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (tooltip.hidden) {
            const config = FAHRZEUG_KATEGORIEN[fahrzeugSel.value];
            if (config) zeigeTooltip(config);
        } else {
            versteckeTooltip();
        }
    });
    document.addEventListener('click', (e) => {
        if (!infoLink.contains(e.target) && !tooltip.contains(e.target)) {
            versteckeTooltip();
        }
    });
    ['scroll', 'resize'].forEach(ev => window.addEventListener(ev, () => {
        if (!tooltip.hidden) positioniereTooltip();
    }, { passive: true }));

    // ── Initialer deaktivierter Zustand ──
    const display = kategorieSel.nextElementSibling;
    const textEl = display && display.querySelector('.custom-select-text');
    kategorieSel.required = false;
    kategorieField.classList.add('kategorie-disabled');
    if (textEl) textEl.textContent = 'Auswählen';
    if (infoLink) infoLink.hidden = true;

    // Klick auf den Wrapper: wenn noch keine Fahrzeugart gewählt, Select blockieren und Fehler zeigen
    const wrapper = kategorieSel.closest('.custom-select-wrapper') || kategorieSel.parentElement;

    function blockiereOhneAuswahl(e) {
        if (!fahrzeugSel.value) {
            e.preventDefault();
            e.stopPropagation();
        }
    }
    if (wrapper) {
        wrapper.addEventListener('mousedown', blockiereOhneAuswahl);
        wrapper.addEventListener('click', (e) => {
            if (!fahrzeugSel.value) {
                e.preventDefault();
                e.stopPropagation();
                kategorieField.classList.remove('kategorie-error');
                void kategorieField.offsetWidth;
                kategorieField.classList.add('kategorie-error');
                let hint = kategorieField.querySelector('.kategorie-hint');
                if (!hint) {
                    hint = document.createElement('p');
                    hint.className = 'kategorie-hint';
                    hint.textContent = 'Bitte zuerst eine Fahrzeugart auswählen.';
                    kategorieField.appendChild(hint);
                }
                hint.classList.add('hint-visible');
                clearTimeout(kategorieField._hintTimer);
                kategorieField._hintTimer = setTimeout(() => {
                    kategorieField.classList.remove('kategorie-error');
                    hint.classList.remove('hint-visible');
                }, 2500);
            }
        });
    }

    fahrzeugSel.addEventListener('change', () => {
        const wert = fahrzeugSel.value;
        const config = FAHRZEUG_KATEGORIEN[wert];
        versteckeTooltip();

        // Dropdown-Optionen neu befüllen
        kategorieSel.innerHTML = '<option value="">Auswählen</option>';

        if (config) {
            config.optionen.forEach(opt => {
                const o = document.createElement('option');
                o.value = opt;
                o.textContent = opt;
                kategorieSel.appendChild(o);
            });
            kategorieSel.required = true;
            kategorieField.classList.remove('kategorie-disabled', 'kategorie-error');
            const hint = kategorieField.querySelector('.kategorie-hint');
            if (hint) hint.classList.remove('hint-visible');
            if (textEl) textEl.textContent = 'Auswählen';
            if (infoLink) infoLink.hidden = false;
        } else {
            kategorieSel.required = false;
            kategorieField.classList.add('kategorie-disabled');
            if (textEl) textEl.textContent = 'Auswählen';
            if (infoLink) infoLink.hidden = true;
        }

        if (display) display.classList.remove('has-value');
        kategorieSel.value = '';
    });
}

// ── 10. Custom-Select-Sync ──
// Die echten <select>-Felder (#fahrzeug, #getriebe, #fahrzeugkategorie) sind unsichtbar;
// sichtbar ist stattdessen ein gestyltes <div class="custom-select-display"> daneben.
// Dieser Block hält den angezeigten Text synchron, sobald sich der Wert ändert.
['fahrzeug', 'getriebe', 'fahrzeugkategorie', 'anhaengkupplung', 'zugfahrzeug', 'anrede'].forEach(id => {
  const sel = document.getElementById(id);
  if (!sel) return;
  const display = sel.nextElementSibling;
  const textEl = display && display.querySelector('.custom-select-text');
  sel.addEventListener('change', () => {
    const selected = sel.options[sel.selectedIndex];
    if (textEl) textEl.textContent = selected.value ? selected.text : 'Auswählen';
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

// ── Aktiver Nav-Link ──
// Vergleicht die aktuelle URL mit den href-Attributen der Nav-Links und
// setzt die Klasse nav-active auf den passenden Link.
(function markActiveNavLink() {
  const currentFile = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.primary-nav a').forEach(link => {
    const href = link.getAttribute('href');
    // Reine Anker-Links (#kontakt) und gemischte (index.html#kontakt) überspringen
    if (href.startsWith('#') || href.includes('#')) return;
    const linkFile = href.split('/').pop() || 'index.html';
    if (linkFile === currentFile) {
      link.classList.add('nav-active');
      link.setAttribute('aria-current', 'page');
    }
  });
})();

// ── Back to top ──
(function setupBackToTop() {
  const btn = document.querySelector('.back-to-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
