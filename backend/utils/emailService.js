const nodemailer = require("nodemailer");

// 🔒 lazy transporter (da ne crashuje app ako env nije spreman)
let transporter;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
};

// ==============================
// 🧠 HTML GENERATOR
// ==============================
const generateEmailHtml = (
  title,
  subtitle,
  booking,
  roditelj,
  playroom,
  timeSlot,
  selectedOstaleCene = [],
  selectedUsluge = [],
  isOwner = false,
) => {
  const ukupnoOsoba = (booking?.brojDece || 0) + (booking?.brojRoditelja || 0);

  const formatExtras = (items = []) =>
    items
      .map((item) => {
        const price =
          item.tip === "po_osobi" ? item.cena * ukupnoOsoba : item.cena;

        return `
          <div class="price-item">
            <span>${item.naziv}</span>
            <strong>+${price} RSD</strong>
          </div>
        `;
      })
      .join("");

  const besplatne =
    playroom?.besplatnePogodnosti?.length > 0
      ? playroom.besplatnePogodnosti
          .map((p) => `<span class="free">✓ ${p}</span>`)
          .join("")
      : "Nema pogodnosti";

  return `
    <html>
      <body style="font-family:Arial;background:#f5f5f5;padding:20px;">
        <div style="max-width:600px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;">
          
          <div style="background:${
            isOwner ? "#4caf50" : "#ff6b4a"
          };color:#fff;padding:20px;text-align:center;">
            <h2>${title}</h2>
            <p>${subtitle}</p>
          </div>

          <div style="padding:20px;">
            <p><strong>${
              isOwner ? playroom?.vlasnikId?.ime || "" : roditelj?.ime || ""
            }</strong>,</p>

            <p>Igraonica: <strong>${playroom?.naziv}</strong></p>

            <p>📅 ${new Date(timeSlot?.datum).toLocaleDateString("sr-RS")}</p>
            <p>⏰ ${timeSlot?.vremeOd} - ${timeSlot?.vremeDo}</p>

            <hr/>

            <p>👶 Deca: ${booking?.brojDece}</p>
            <p>👨 Roditelji: ${booking?.brojRoditelja}</p>

            <hr/>

            ${formatExtras(selectedOstaleCene)}
            ${formatExtras(selectedUsluge)}

            <h3>💰 ${booking?.ukupnaCena} RSD</h3>

            <hr/>

            <div>${besplatne}</div>
          </div>

          <div style="padding:10px;text-align:center;color:#777;font-size:12px;">
            © Svet Igraonica
          </div>

        </div>
      </body>
    </html>
  `;
};

// ==============================
// 📩 SEND HELPER
// ==============================
const sendMail = async (options) => {
  try {
    const transporter = getTransporter();
    await transporter.sendMail(options);
    return true;
  } catch (err) {
    console.error("❌ Email error:", err.message);
    return false;
  }
};

// ==============================
// 📧 RODITELJ - POTVRDA
// ==============================
exports.sendBookingConfirmation = async (
  booking,
  roditelj,
  playroom,
  timeSlot,
  selectedOstaleCene,
  selectedUsluge,
) => {
  return sendMail({
    from: `"Svet Igraonica" <${process.env.EMAIL_USER}>`,
    to: roditelj.email,
    subject: `✅ Potvrda rezervacije - ${playroom.naziv}`,
    html: generateEmailHtml(
      "Rezervacija potvrđena",
      "",
      booking,
      roditelj,
      playroom,
      timeSlot,
      selectedOstaleCene,
      selectedUsluge,
      false,
    ),
  });
};

// ==============================
// 📧 VLASNIK - NOVA REZERVACIJA
// ==============================
exports.sendBookingConfirmationToOwner = async (
  booking,
  roditelj,
  playroom,
  timeSlot,
  vlasnik,
  selectedOstaleCene,
  selectedUsluge,
) => {
  return sendMail({
    from: `"Svet Igraonica" <${process.env.EMAIL_USER}>`,
    to: vlasnik.email,
    subject: `🆕 Nova rezervacija - ${playroom.naziv}`,
    html: generateEmailHtml(
      "Nova rezervacija",
      "",
      booking,
      roditelj,
      playroom,
      timeSlot,
      selectedOstaleCene,
      selectedUsluge,
      true,
    ),
  });
};

// ==============================
// ❌ OTKAZIVANJE
// ==============================
exports.sendBookingCancellation = async (user, playroom, timeSlot) => {
  return sendMail({
    from: `"Svet Igraonica" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `❌ Otkazivanje - ${playroom.naziv}`,
    html: `<p>Rezervacija otkazana (${playroom.naziv})</p>`,
  });
};

exports.sendCancellationToOwner = async (
  booking,
  roditelj,
  playroom,
  timeSlot,
  vlasnik,
) => {
  return sendMail({
    from: `"Svet Igraonica" <${process.env.EMAIL_USER}>`,
    to: vlasnik.email,
    subject: `❌ Otkazano - ${playroom.naziv}`,
    html: `<p>Rezervacija otkazana</p>`,
  });
};

exports.sendMail = sendMail;
