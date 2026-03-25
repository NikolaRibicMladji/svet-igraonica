const dotenv = require("dotenv");
const path = require("path");

// Učitaj .env
dotenv.config({ path: path.join(__dirname, "../../.env") });

const nodemailer = require("nodemailer");

const testEmail = async () => {
  console.log("📧 Testiranje email konfiguracije...");
  console.log("Email user:", process.env.EMAIL_USER);
  console.log("Email pass:", process.env.EMAIL_PASS ? "Postoji" : "NEDOSTAJE!");

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error("❌ Email podaci nedostaju u .env fajlu!");
    console.log("Dodaj: EMAIL_USER=your_email@gmail.com");
    console.log("Dodaj: EMAIL_PASS=your_app_password");
    return;
  }

  // Kreiraj transporter
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Proveri konekciju
  try {
    await transporter.verify();
    console.log("✅ Email konekcija uspešna!");
  } catch (error) {
    console.error("❌ Greška pri konekciji:", error.message);
    return;
  }

  // Pošalji test email
  try {
    const info = await transporter.sendMail({
      from: `"Svet Igraonica Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Pošalji sebi
      subject: "Test email - Svet Igraonica",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #ff6b4a;">🎉 Test email radi!</h2>
          <p>Ovo je testni email sa tvoje platforme <strong>Svet Igraonica</strong>.</p>
          <p>Ako si primio/la ovaj email, email notifikacije su pravilno podešene.</p>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Datum: ${new Date().toLocaleString("sr-RS")}</p>
        </div>
      `,
    });

    console.log("✅ Test email poslat!");
    console.log("   ID poruke:", info.messageId);
    console.log("   Poslato na:", process.env.EMAIL_USER);
  } catch (error) {
    console.error("❌ Greška pri slanju emaila:", error.message);
  }
};

testEmail();
