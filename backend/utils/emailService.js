const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Pošalji email za potvrdu rezervacije
exports.sendBookingConfirmation = async (booking, user, playroom, timeSlot) => {
  try {
    const mailOptions = {
      from: `"Svet Igraonica" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `Potvrda rezervacije - ${playroom.naziv}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ff6b4a;">🎉 Rezervacija potvrđena!</h2>
          <p>Poštovani/a ${user.ime} ${user.prezime},</p>
          <p>Vaša rezervacija za igraonicu <strong>${playroom.naziv}</strong> je uspešno kreirana.</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 10px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0;">📅 Detalji rezervacije:</h3>
            <p><strong>Datum:</strong> ${new Date(timeSlot.datum).toLocaleDateString("sr-RS")}</p>
            <p><strong>Vreme:</strong> ${timeSlot.vremeOd} - ${timeSlot.vremeDo}</p>
            <p><strong>Broj dece:</strong> ${booking.brojDece || 1}</p>
            <p><strong>Ukupna cena:</strong> ${booking.ukupnaCena} RSD</p>
          </div>
          
          <div style="background: #f9f9f9; padding: 15px; border-radius: 10px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0;">📍 Podaci o igraonici:</h3>
            <p><strong>Adresa:</strong> ${playroom.adresa}, ${playroom.grad}</p>
            <p><strong>Telefon:</strong> ${playroom.kontaktTelefon}</p>
            <p><strong>Email:</strong> ${playroom.kontaktEmail}</p>
          </div>
          
          <p>Hvala što koristite Svet Igraonica!</p>
          <p style="color: #666; font-size: 12px;">Ovo je automatski generisana poruka, molimo ne odgovarajte na nju.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email poslat na ${user.email}`);
    return true;
  } catch (error) {
    console.error("Greška pri slanju emaila:", error);
    return false;
  }
};

// Pošalji email za otkazivanje rezervacije
exports.sendBookingCancellation = async (user, playroom, timeSlot) => {
  try {
    const mailOptions = {
      from: `"Svet Igraonica" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `Otkazivanje rezervacije - ${playroom.naziv}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ff6b4a;">❌ Rezervacija otkazana</h2>
          <p>Poštovani/a ${user.ime} ${user.prezime},</p>
          <p>Vaša rezervacija za igraonicu <strong>${playroom.naziv}</strong> je otkazana.</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 10px; margin: 20px 0;">
            <p><strong>Datum:</strong> ${new Date(timeSlot.datum).toLocaleDateString("sr-RS")}</p>
            <p><strong>Vreme:</strong> ${timeSlot.vremeOd} - ${timeSlot.vremeDo}</p>
          </div>
          
          <p>Ako niste tražili otkazivanje, molimo kontaktirajte nas.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Greška:", error);
    return false;
  }
};
