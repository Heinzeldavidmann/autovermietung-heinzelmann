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
