const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ============================================
// EMAIL ZA RODITELJA (POTVRDA REZERVACIJE)
// ============================================
// Pošalji email za potvrdu rezervacije (RODITELJU - SA SVIM DETALJIMA)
exports.sendBookingConfirmation = async (
  booking,
  roditelj,
  playroom,
  timeSlot,
  selectedOstaleCene,
  selectedUsluge,
) => {
  try {
    // Formatiranje dodatnih cena
    const ostaleCeneHtml =
      selectedOstaleCene && selectedOstaleCene.length > 0
        ? selectedOstaleCene
            .map(
              (c) => `
        <div class="price-item">
          <span>${c.naziv}:</span>
          <strong>+${c.cena} RSD</strong>
          ${c.tip === "po_osobi" ? '<span class="price-type">(po osobi)</span>' : ""}
        </div>
      `,
            )
            .join("")
        : '<div class="price-item"><span>Nema dodatnih cena</span></div>';

    // Formatiranje dodatnih usluga
    const uslugeHtml =
      selectedUsluge && selectedUsluge.length > 0
        ? selectedUsluge
            .map(
              (u) => `
        <div class="price-item">
          <span>${u.naziv}:</span>
          <strong>+${u.cena} RSD</strong>
        </div>
      `,
            )
            .join("")
        : '<div class="price-item"><span>Nema dodatnih usluga</span></div>';

    // Formatiranje besplatnih pogodnosti
    const besplatneHtml =
      playroom.besplatnePogodnosti && playroom.besplatnePogodnosti.length > 0
        ? playroom.besplatnePogodnosti
            .map((p) => `<span class="free-badge">✓ ${p}</span>`)
            .join("")
        : "<span>Nema navedenih pogodnosti</span>";

    const mailOptions = {
      from: `"Svet Igraonica" <${process.env.EMAIL_USER}>`,
      to: roditelj.email,
      subject: `✅ Potvrda rezervacije - ${playroom.naziv}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #ff6b4a, #ff8c6e); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 1.8rem; }
            .content { padding: 30px; }
            .section { margin-bottom: 25px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
            .section h2 { color: #ff6b4a; font-size: 1.2rem; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f9f9f9; padding: 15px; border-radius: 12px; }
            .info-item { display: flex; justify-content: space-between; flex-wrap: wrap; }
            .info-label { font-weight: 600; color: #666; }
            .info-value { font-weight: 500; color: #333; }
            .price-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .price-item:last-child { border-bottom: none; }
            .price-total { background: #fff3e0; padding: 15px; border-radius: 12px; margin-top: 15px; display: flex; justify-content: space-between; font-weight: 700; font-size: 1.2rem; }
            .total-amount { color: #ff6b4a; font-size: 1.4rem; }
            .free-badge { background: #e8f5e9; color: #2e7d32; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; display: inline-block; margin: 4px; }
            .footer { background: #f8f8f8; padding: 20px; text-align: center; color: #666; font-size: 12px; }
            hr { margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Svet Igraonica</h1>
              <p>Vaša rezervacija je potvrđena!</p>
            </div>
            <div class="content">
              <p>Poštovani/a <strong>${roditelj.ime} ${roditelj.prezime}</strong>,</p>
              <p>Hvala vam što koristite našu platformu! U nastavku su detalji vaše rezervacije.</p>

              <div class="section">
                <h2>📅 Detalji termina</h2>
                <div class="info-grid">
                  <div class="info-item"><span class="info-label">Igraonica:</span><span class="info-value">${playroom.naziv}</span></div>
                  <div class="info-item"><span class="info-label">Adresa:</span><span class="info-value">${playroom.adresa}, ${playroom.grad}</span></div>
                  <div class="info-item"><span class="info-label">Datum:</span><span class="info-value">${new Date(timeSlot.datum).toLocaleDateString("sr-RS", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span></div>
                  <div class="info-item"><span class="info-label">Vreme:</span><span class="info-value">${timeSlot.vremeOd} - ${timeSlot.vremeDo}</span></div>
                  <div class="info-item"><span class="info-label">Broj dece:</span><span class="info-value">${booking.brojDece || 1}</span></div>
                  <div class="info-item"><span class="info-label">Broj roditelja:</span><span class="info-value">${booking.brojRoditelja || 0}</span></div>
                </div>
              </div>

              <div class="section">
                <h2>💰 Cenovnik</h2>
                <div class="price-item"><span>Osnovna cena (${booking.brojDece || 1} dece × ${playroom.osnovnaCena} RSD):</span><strong>${playroom.osnovnaCena * (booking.brojDece || 1)} RSD</strong></div>
                ${
                  booking.brojRoditelja > 0 &&
                  playroom.cenaRoditelja &&
                  playroom.cenaRoditelja.tip !== "ne_naplacuje"
                    ? `
                  <div class="price-item"><span>Roditelji (${booking.brojRoditelja} × ${playroom.cenaRoditelja.iznos} RSD):</span><strong>${playroom.cenaRoditelja.iznos * booking.brojRoditelja} RSD</strong></div>
                `
                    : ""
                }
                ${ostaleCeneHtml}
                ${uslugeHtml}
                <div class="price-total">
                  <span>Ukupno za plaćanje:</span>
                  <span class="total-amount">${booking.ukupnaCena} RSD</span>
                </div>
              </div>

              <div class="section">
                <h2>✨ Besplatne pogodnosti</h2>
                <div class="free-features-list">
                  ${besplatneHtml}
                </div>
              </div>

              ${
                booking.napomena
                  ? `
              <div class="section">
                <h2>📝 Napomena</h2>
                <p style="background: #fff3e0; padding: 12px; border-radius: 10px;">${booking.napomena}</p>
              </div>
              `
                  : ""
              }

              <div class="section">
                <h2>👤 Vaši podaci</h2>
                <div class="info-grid">
                  <div class="info-item"><span class="info-label">Ime i prezime:</span><span class="info-value">${roditelj.ime} ${roditelj.prezime}</span></div>
                  <div class="info-item"><span class="info-label">Email:</span><span class="info-value">${roditelj.email}</span></div>
                  <div class="info-item"><span class="info-label">Telefon:</span><span class="info-value">${roditelj.telefon}</span></div>
                </div>
              </div>

              <p>Za sva pitanja, kontaktirajte igraonicu direktno na <strong>${playroom.kontaktTelefon}</strong> ili <strong>${playroom.kontaktEmail}</strong>.</p>
            </div>
            <div class="footer">
              <p>Ovo je automatski generisana poruka. Molimo ne odgovarajte na nju.</p>
              <p>© 2026 Svet Igraonica - Sva prava zadržana.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(
      `✅ Email poslat roditelju na ${roditelj.email}, ID: ${info.messageId}`,
    );
    return true;
  } catch (error) {
    console.error("❌ Greška pri slanju emaila roditelju:", error.message);
    return false;
  }
};

// ============================================
// EMAIL ZA RODITELJA (OTKAZIVANJE)
// ============================================
exports.sendBookingCancellation = async (user, playroom, timeSlot) => {
  try {
    const mailOptions = {
      from: `"Svet Igraonica" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `❌ Otkazivanje rezervacije - ${playroom.naziv}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f44336, #d32f2f); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .cancelled-details { background: #ffebee; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #f44336; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>❌ Otkazivanje rezervacije</h1>
            </div>
            <div class="content">
              <p>Poštovani/a <strong>${user.ime} ${user.prezime}</strong>,</p>
              <p>Vaša rezervacija je otkazana.</p>
              
              <div class="cancelled-details">
                <h2>📅 Otkazana rezervacija</h2>
                <p><strong>Igraonica:</strong> ${playroom.naziv}</p>
                <p><strong>Datum:</strong> ${new Date(timeSlot.datum).toLocaleDateString("sr-RS")}</p>
                <p><strong>Vreme:</strong> ${timeSlot.vremeOd} - ${timeSlot.vremeDo}</p>
              </div>
              
              <p>Ako niste tražili otkazivanje, molimo kontaktirajte nas.</p>
            </div>
            <div class="footer">
              <p>© 2026 Svet Igraonica</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email o otkazivanju poslat na ${user.email}`);
    return true;
  } catch (error) {
    console.error("❌ Greška pri slanju emaila o otkazivanju:", error.message);
    return false;
  }
};

// ============================================
// EMAIL ZA VLASNIKA (NOVA REZERVACIJA)
// ============================================
// Pošalji email vlasniku o novoj rezervaciji (sa svim detaljima)
exports.sendBookingConfirmationToOwner = async (
  booking,
  roditelj,
  playroom,
  timeSlot,
  vlasnik,
  selectedOstaleCene,
  selectedUsluge,
) => {
  try {
    // Formatiranje dodatnih cena
    const ostaleCeneHtml =
      selectedOstaleCene && selectedOstaleCene.length > 0
        ? selectedOstaleCene
            .map(
              (c) => `
        <div class="price-item">
          <span>${c.naziv}:</span>
          <strong>+${c.cena} RSD</strong>
          ${c.tip === "po_osobi" ? '<span class="price-type">(po osobi)</span>' : ""}
        </div>
      `,
            )
            .join("")
        : '<div class="price-item"><span>Nema dodatnih cena</span></div>';

    // Formatiranje dodatnih usluge
    const uslugeHtml =
      selectedUsluge && selectedUsluge.length > 0
        ? selectedUsluge
            .map(
              (u) => `
        <div class="price-item">
          <span>${u.naziv}:</span>
          <strong>+${u.cena} RSD</strong>
        </div>
      `,
            )
            .join("")
        : '<div class="price-item"><span>Nema dodatnih usluga</span></div>';

    // Formatiranje besplatnih pogodnosti
    const besplatneHtml =
      playroom.besplatnePogodnosti && playroom.besplatnePogodnosti.length > 0
        ? playroom.besplatnePogodnosti
            .map((p) => `<span class="free-badge">✓ ${p}</span>`)
            .join("")
        : "<span>Nema navedenih pogodnosti</span>";

    const mailOptions = {
      from: `"Svet Igraonica" <${process.env.EMAIL_USER}>`,
      to: vlasnik.email,
      subject: `🆕 Nova rezervacija - ${playroom.naziv}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #4caf50, #45a049); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 1.8rem; }
            .content { padding: 30px; }
            .section { margin-bottom: 25px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
            .section h2 { color: #4caf50; font-size: 1.2rem; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f9f9f9; padding: 15px; border-radius: 12px; }
            .info-item { display: flex; justify-content: space-between; flex-wrap: wrap; }
            .info-label { font-weight: 600; color: #666; }
            .info-value { font-weight: 500; color: #333; }
            .price-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .price-item:last-child { border-bottom: none; }
            .price-total { background: #e8f5e9; padding: 15px; border-radius: 12px; margin-top: 15px; display: flex; justify-content: space-between; font-weight: 700; font-size: 1.2rem; }
            .total-amount { color: #4caf50; font-size: 1.4rem; }
            .free-badge { background: #e8f5e9; color: #2e7d32; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; display: inline-block; margin: 4px; }
            .footer { background: #f8f8f8; padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Nova rezervacija!</h1>
              <p>Neko je rezervisao termin u vašoj igraonici</p>
            </div>
            <div class="content">
              <p>Poštovani/a <strong>${vlasnik.ime} ${vlasnik.prezime}</strong>,</p>
              <p>Imate novu rezervaciju u vašoj igraonici <strong>${playroom.naziv}</strong>.</p>

              <div class="section">
                <h2>📅 Detalji termina</h2>
                <div class="info-grid">
                  <div class="info-item"><span class="info-label">Datum:</span><span class="info-value">${new Date(timeSlot.datum).toLocaleDateString("sr-RS", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span></div>
                  <div class="info-item"><span class="info-label">Vreme:</span><span class="info-value">${timeSlot.vremeOd} - ${timeSlot.vremeDo}</span></div>
                  <div class="info-item"><span class="info-label">Broj dece:</span><span class="info-value">${booking.brojDece || 1}</span></div>
                  <div class="info-item"><span class="info-label">Broj roditelja:</span><span class="info-value">${booking.brojRoditelja || 0}</span></div>
                </div>
              </div>

              <div class="section">
                <h2>💰 Cenovnik</h2>
                <div class="price-item"><span>Osnovna cena (${booking.brojDece || 1} dece × ${playroom.osnovnaCena} RSD):</span><strong>${playroom.osnovnaCena * (booking.brojDece || 1)} RSD</strong></div>
                ${
                  booking.brojRoditelja > 0 &&
                  playroom.cenaRoditelja &&
                  playroom.cenaRoditelja.tip !== "ne_naplacuje"
                    ? `
                  <div class="price-item"><span>Roditelji (${booking.brojRoditelja} × ${playroom.cenaRoditelja.iznos} RSD):</span><strong>${playroom.cenaRoditelja.iznos * booking.brojRoditelja} RSD</strong></div>
                `
                    : ""
                }
                ${ostaleCeneHtml}
                ${uslugeHtml}
                <div class="price-total">
                  <span>Ukupno za plaćanje:</span>
                  <span class="total-amount">${booking.ukupnaCena} RSD</span>
                </div>
              </div>

              <div class="section">
                <h2>✨ Besplatne pogodnosti</h2>
                <div class="free-features-list">
                  ${besplatneHtml}
                </div>
              </div>

              ${
                booking.napomena
                  ? `
              <div class="section">
                <h2>📝 Napomena roditelja</h2>
                <p style="background: #fff3e0; padding: 12px; border-radius: 10px;">${booking.napomena}</p>
              </div>
              `
                  : ""
              }

              <div class="section">
                <h2>👤 Podaci o roditelju</h2>
                <div class="info-grid">
                  <div class="info-item"><span class="info-label">Ime i prezime:</span><span class="info-value">${roditelj.ime} ${roditelj.prezime}</span></div>
                  <div class="info-item"><span class="info-label">Email:</span><span class="info-value">${roditelj.email}</span></div>
                  <div class="info-item"><span class="info-label">Telefon:</span><span class="info-value">${roditelj.telefon}</span></div>
                </div>
              </div>

              <p>Možete pregledati sve rezervacije u vašem <a href="http://localhost:3000/owner-slots">vlasničkom panelu</a>.</p>
            </div>
            <div class="footer">
              <p>Ovo je automatski generisana poruka. Molimo ne odgovarajte na nju.</p>
              <p>© 2026 Svet Igraonica - Sva prava zadržana.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(
      `✅ Email vlasniku poslat na ${vlasnik.email}, ID: ${info.messageId}`,
    );
    return true;
  } catch (error) {
    console.error("❌ Greška pri slanju emaila vlasniku:", error.message);
    return false;
  }
};

// ============================================
// EMAIL ZA VLASNIKA (OTKAZIVANJE REZERVACIJE)
// ============================================
exports.sendCancellationToOwner = async (
  booking,
  roditelj,
  playroom,
  timeSlot,
  vlasnik,
) => {
  try {
    const mailOptions = {
      from: `"Svet Igraonica" <${process.env.EMAIL_USER}>`,
      to: vlasnik.email,
      subject: `❌ Otkazana rezervacija - ${playroom.naziv}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f44336, #d32f2f); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .cancelled-details { background: #ffebee; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #f44336; }
            .customer-details { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #ff6b4a; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>❌ Otkazana rezervacija</h1>
              <p>Rezervacija je otkazana</p>
            </div>
            <div class="content">
              <p>Poštovani/a <strong>${vlasnik.ime} ${vlasnik.prezime}</strong>,</p>
              <p>Rezervacija u vašoj igraonici <strong>${playroom.naziv}</strong> je otkazana.</p>
              
              <div class="cancelled-details">
                <h2>📅 Otkazana rezervacija</h2>
                <p><strong>Datum:</strong> ${new Date(timeSlot.datum).toLocaleDateString("sr-RS", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                <p><strong>Vreme:</strong> ${timeSlot.vremeOd} - ${timeSlot.vremeDo}</p>
                <p><strong>Broj dece:</strong> ${booking.brojDece || 1}</p>
              </div>
              
              <div class="customer-details">
                <h2>👤 Podaci o roditelju</h2>
                <p><strong>Ime i prezime:</strong> ${roditelj.ime} ${roditelj.prezime}</p>
                <p><strong>Telefon:</strong> ${roditelj.telefon || "Nije uneto"}</p>
                <p><strong>Email:</strong> ${roditelj.email}</p>
              </div>
            </div>
            <div class="footer">
              <p>© 2026 Svet Igraonica</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email vlasniku o otkazivanju poslat na ${vlasnik.email}`);
    return true;
  } catch (error) {
    console.error(
      "❌ Greška pri slanju emaila vlasniku o otkazivanju:",
      error.message,
    );
    return false;
  }
};
