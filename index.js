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
