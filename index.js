function sendMail() {  // API über PHP-Skript, nodemailer oder EmailJS erforderlich
    const params = {
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        fahrzeug: document.getElementById("fahrzeug").value,
        datum1: document.getElementById("datum1").value,
        datum2: document.getElementById("datum2").value,
        uhrzeit: document.getElementById("uhrzeit").value,
        nachricht: document.getElementById("nachricht").value,
    };

    emailjs.send("service_id", "template_id", params)
        .then(() => alert("Nachricht erfolgreich gesendet!"))
        .catch(() => alert("Fehler beim Senden der Nachricht."));
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

// Automatisch beim Laden der Seite aufrufen
window.addEventListener('DOMContentLoaded', setupFaqAccordion);

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
  const pauseSuffix = middayPauseNow ? ' – jetzt Mittagspause' : '';
  if (textEl) textEl.textContent = `Heute: geöffnet von ${dayText}${pauseSuffix}`;

  if (openNow) {
    statusEl.classList.remove('closed');
    dotEl && dotEl.style.setProperty('background', '#22c55e');
  } else {
    statusEl.classList.add('closed');
    dotEl && dotEl.style.setProperty('background', '#ef4444');
  }
});
