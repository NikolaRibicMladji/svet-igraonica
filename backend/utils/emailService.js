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
exports.sendBookingConfirmation = async (booking, user, playroom, timeSlot) => {
  try {
    const mailOptions = {
      from: `"Svet Igraonica" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `✅ Potvrda rezervacije - ${playroom.naziv}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ff6b4a, #ff8c6e); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .booking-details { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #ff6b4a; }
            .playroom-details { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #4caf50; }
            .note { background: #fff3e0; padding: 15px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #ff9800; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .price { font-size: 24px; font-weight: bold; color: #ff6b4a; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Svet Igraonica</h1>
              <p>Vaša rezervacija je potvrđena!</p>
            </div>
            <div class="content">
              <p>Poštovani/a <strong>${user.ime} ${user.prezime}</strong>,</p>
              <p>Hvala vam što koristite našu platformu! Vaša rezervacija je uspešno kreirana.</p>
              
              <div class="booking-details">
                <h2>📅 Detalji rezervacije</h2>
                <p><strong>Datum:</strong> ${new Date(timeSlot.datum).toLocaleDateString("sr-RS", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                <p><strong>Vreme:</strong> ${timeSlot.vremeOd} - ${timeSlot.vremeDo}</p>
                <p><strong>Broj dece:</strong> ${booking.brojDece || 1}</p>
                <p><strong>Ukupna cena:</strong> <span class="price">${booking.ukupnaCena} RSD</span></p>
              </div>
              
              <div class="playroom-details">
                <h2>🏢 Podaci o igraonici</h2>
                <p><strong>Naziv:</strong> ${playroom.naziv}</p>
                <p><strong>Adresa:</strong> ${playroom.adresa}, ${playroom.grad}</p>
                <p><strong>Telefon:</strong> ${playroom.kontaktTelefon}</p>
                <p><strong>Email:</strong> ${playroom.kontaktEmail}</p>
              </div>
              
              ${
                booking.napomena
                  ? `
              <div class="note">
                <p><strong>📝 Vaša napomena:</strong></p>
                <p>${booking.napomena}</p>
              </div>
              `
                  : ""
              }
              
              <p>Molimo vas da dođete 10 minuta pre termina.</p>
              <p>Za sva pitanja, kontaktirajte igraonicu direktno.</p>
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

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email poslat roditelju na ${user.email}`);
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
exports.sendBookingConfirmationToOwner = async (
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
      subject: `🆕 Nova rezervacija - ${playroom.naziv}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #4caf50, #45a049); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .booking-details { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #4caf50; }
            .customer-details { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #ff6b4a; }
            .note { background: #fff3e0; padding: 15px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #ff9800; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .price { font-size: 24px; font-weight: bold; color: #ff6b4a; }
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
              
              <div class="booking-details">
                <h2>📅 Detalji rezervacije</h2>
                <p><strong>Datum:</strong> ${new Date(timeSlot.datum).toLocaleDateString("sr-RS", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                <p><strong>Vreme:</strong> ${timeSlot.vremeOd} - ${timeSlot.vremeDo}</p>
                <p><strong>Broj dece:</strong> ${booking.brojDece || 1}</p>
                <p><strong>Ukupna cena:</strong> <span class="price">${booking.ukupnaCena} RSD</span></p>
              </div>
              
              <div class="customer-details">
                <h2>👤 Podaci o roditelju</h2>
                <p><strong>Ime i prezime:</strong> ${roditelj.ime} ${roditelj.prezime}</p>
                <p><strong>Telefon:</strong> ${roditelj.telefon || "Nije uneto"}</p>
                <p><strong>Email:</strong> ${roditelj.email}</p>
              </div>
              
              ${
                booking.napomena
                  ? `
              <div class="note">
                <p><strong>📝 Napomena roditelja:</strong></p>
                <p>${booking.napomena}</p>
              </div>
              `
                  : ""
              }
              
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
