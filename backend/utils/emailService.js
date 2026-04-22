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
  isOwner = false,
) => {
  const safeValue = (value, fallback = "Nije uneto") => {
    if (value === null || value === undefined || value === "") return fallback;
    return value;
  };

  const formatDate = (date) => {
    if (!date) return "Nije dostupno";

    try {
      return new Intl.DateTimeFormat("sr-RS", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(date));
    } catch {
      return "Nije dostupno";
    }
  };

  const formatCurrency = (value) => {
    const amount = Number(value) || 0;
    return `${amount} RSD`;
  };
  const getDurationHours = () => {
    if (!booking?.vremeOd || !booking?.vremeDo) return 1;

    const [h1, m1] = booking.vremeOd.split(":").map(Number);
    const [h2, m2] = booking.vremeDo.split(":").map(Number);

    const start = h1 * 60 + m1;
    const end = h2 * 60 + m2;
    const diff = end - start;

    if (!Number.isFinite(diff) || diff <= 0) return 1;

    return diff / 60;
  };

  const getItemCalculationText = (item) => {
    if (!item) return "0 RSD";

    const cena = Number(item.cena) || 0;
    const tip = item.tip || "fiksno";
    const brojDece = Number(booking?.brojDece) || 0;
    const sati = getDurationHours();

    if (tip === "po_satu" || tip === "poSatu") {
      return `${cena} RSD × ${sati}h = ${cena * sati} RSD`;
    }

    if (tip === "po_osobi" || tip === "poOsobi") {
      return `${cena} RSD × ${brojDece} = ${cena * brojDece} RSD`;
    }

    return `${cena} RSD`;
  };

  const renderStackedList = (items = []) => {
    if (!Array.isArray(items) || items.length === 0) {
      return `
      <div style="font-size:14px;color:#667085;line-height:1.5;">
        Nema izabranih stavki
      </div>
    `;
    }

    return items
      .map(
        (item, index) => `
        <div style="${
          index < items.length - 1
            ? "padding-bottom:12px;margin-bottom:12px;border-bottom:1px solid #eaecf0;"
            : ""
        }">
          <div style="font-size:14px;font-weight:700;color:#101828;line-height:1.5;word-break:break-word;">
            ${safeValue(item.naziv, "Stavka")}
          </div>

          ${
            item?.opis
              ? `<div style="margin-top:4px;font-size:13px;color:#667085;line-height:1.6;word-break:break-word;">
                   ${item.opis}
                 </div>`
              : ""
          }

          <div style="margin-top:6px;font-size:14px;color:#101828;line-height:1.6;word-break:break-word;">
            ${getItemCalculationText(item)}
          </div>
        </div>
      `,
      )
      .join("");
  };

  const getItemCalculationHtml = (item) => {
    if (!item) {
      return `
      <div style="font-size:14px;font-weight:700;color:#101828;line-height:1.4;">
        0 RSD
      </div>
    `;
    }

    const cena = Number(item.cena) || 0;
    const tip = item.tip || "fiksno";
    const brojDece = Number(booking?.brojDece) || 0;
    const sati = getDurationHours();

    if (tip === "po_satu") {
      return `
      <div style="font-size:14px;font-weight:700;color:#101828;line-height:1.4;word-break:break-word;">
        ${cena} RSD
      </div>
      <div style="margin-top:4px;font-size:13px;color:#667085;line-height:1.5;word-break:break-word;">
        × ${sati}h = ${cena * sati} RSD
      </div>
    `;
    }

    if (tip === "po_osobi") {
      return `
      <div style="font-size:14px;font-weight:700;color:#101828;line-height:1.4;word-break:break-word;">
        ${cena} RSD
      </div>
      <div style="margin-top:4px;font-size:13px;color:#667085;line-height:1.5;word-break:break-word;">
        × ${brojDece} = ${cena * brojDece} RSD
      </div>
    `;
    }

    return `
    <div style="font-size:14px;font-weight:700;color:#101828;line-height:1.4;word-break:break-word;">
      ${cena} RSD
    </div>
  `;
  };

  const renderList = (items = []) => {
    if (!Array.isArray(items) || items.length === 0) {
      return `
        <tr>
          <td style="padding:10px 0;color:#667085;font-size:14px;">
            Nema izabranih stavki
          </td>
        </tr>
      `;
    }

    return items
      .map(
        (item) => `
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #eaecf0;vertical-align:top;width:58%;word-break:break-word;">
              <div style="font-size:14px;font-weight:600;color:#101828;line-height:1.4;">
                ${safeValue(item.naziv, "Stavka")}
              </div>
              ${
                item?.opis
                  ? `<div style="margin-top:4px;font-size:13px;color:#667085;line-height:1.5;">
                       ${item.opis}
                     </div>`
                  : ""
              }
            </td>
           <td style="padding:10px 0;border-bottom:1px solid #eaecf0;text-align:right;vertical-align:top;width:42%;max-width:220px;">
  ${getItemCalculationHtml(item)}
</td>
          </tr>
        `,
      )
      .join("");
  };

  const renderPaket = booking?.izabraniPaket
    ? `
    <div>
      <div style="font-size:14px;font-weight:700;color:#101828;line-height:1.5;word-break:break-word;">
        ${safeValue(booking.izabraniPaket.naziv, "Paket")}
      </div>

      ${
        booking?.izabraniPaket?.opis
          ? `<div style="margin-top:4px;font-size:13px;color:#667085;line-height:1.6;word-break:break-word;">
               ${booking.izabraniPaket.opis}
             </div>`
          : ""
      }

      <div style="margin-top:6px;font-size:14px;color:#101828;line-height:1.6;word-break:break-word;">
        ${getItemCalculationText(booking.izabraniPaket)}
      </div>
    </div>
  `
    : `<div style="font-size:14px;color:#667085;line-height:1.5;">Nema izabranog paketa</div>`;

  const besplatne =
    Array.isArray(playroom?.besplatnePogodnosti) &&
    playroom.besplatnePogodnosti.length > 0
      ? playroom.besplatnePogodnosti
          .map(
            (p) => `
              <span style="display:inline-block;margin:4px 6px 0 0;padding:8px 12px;border-radius:999px;background:#f2f4f7;color:#344054;font-size:13px;font-weight:600;">
                ✓ ${p}
              </span>
            `,
          )
          .join("")
      : `<div style="font-size:14px;color:#667085;line-height:1.5;">Nema besplatnih pogodnosti</div>`;

  const imeZaPrikaz = isOwner
    ? safeValue(playroom?.vlasnikId?.ime || "Vlasniče")
    : safeValue(roditelj?.ime || booking?.imeRoditelja || "Korisniče");

  return `
    <html>
      <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#101828;">
        <div style="width:100%;background:#f4f6f8;padding:24px 12px;box-sizing:border-box;">
          <div style="max-width:680px;width:100%;margin:0 auto;background:#ffffff;border:1px solid #eaecf0;border-radius:20px;overflow:hidden;box-shadow:0 8px 24px rgba(16,24,40,0.08);">

            <div style="background:${isOwner ? "#16a34a" : "#ff6b4a"};padding:28px 20px;text-align:center;">
              <div style="font-size:28px;font-weight:800;line-height:1.2;color:#ffffff;">
                ${title}
              </div>
              ${
                subtitle
                  ? `<div style="margin-top:8px;font-size:14px;line-height:1.5;color:rgba(255,255,255,0.92);">${subtitle}</div>`
                  : ""
              }
            </div>

            <div style="padding:28px 20px 8px 20px;">
              <div style="font-size:18px;font-weight:700;color:#101828;">
                ${imeZaPrikaz},
              </div>
<div style="margin-top:8px;font-size:14px;color:#475467;line-height:1.6;">
  U nastavku su svi detalji rezervacije.
</div>
            </div>

            <div style="padding:16px 20px 28px 20px;">

              <div style="border:1px solid #eaecf0;border-radius:16px;padding:18px 16px 8px 16px;margin-bottom:18px;background:#fcfcfd;">
                <div style="font-size:15px;font-weight:800;color:#101828;margin-bottom:14px;">
                  Osnovni podaci
                </div>

                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:8px 0;color:#667085;font-size:14px;vertical-align:top;">Igraonica</td>
                    <td style="padding:8px 0;text-align:right;color:#101828;font-size:14px;font-weight:700;vertical-align:top;">
                      ${safeValue(playroom?.naziv)}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#667085;font-size:14px;vertical-align:top;">Adresa</td>
                    <td style="padding:8px 0;text-align:right;color:#101828;font-size:14px;font-weight:700;vertical-align:top;">
                      ${safeValue(playroom?.adresa)}${playroom?.grad ? `, ${playroom.grad}` : ""}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#667085;font-size:14px;vertical-align:top;">Datum</td>
                    <td style="padding:8px 0;text-align:right;color:#101828;font-size:14px;font-weight:700;vertical-align:top;">
                      ${formatDate(timeSlot?.datum || booking?.datum)}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#667085;font-size:14px;vertical-align:top;">Vreme</td>
                    <td style="padding:8px 0;text-align:right;color:#101828;font-size:14px;font-weight:700;vertical-align:top;">
                      ${safeValue(timeSlot?.vremeOd || booking?.vremeOd)} - ${safeValue(
                        timeSlot?.vremeDo || booking?.vremeDo,
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#667085;font-size:14px;vertical-align:top;">Broj dece</td>
                    <td style="padding:8px 0;text-align:right;color:#101828;font-size:14px;font-weight:700;vertical-align:top;">
                      ${Number(booking?.brojDece) || 0}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#667085;font-size:14px;vertical-align:top;">Broj roditelja</td>
                    <td style="padding:8px 0;text-align:right;color:#101828;font-size:14px;font-weight:700;vertical-align:top;">
                      ${Number(booking?.brojRoditelja) || 0}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#667085;font-size:14px;vertical-align:top;">Ukupna cena</td>
                    <td style="padding:8px 0;text-align:right;color:#101828;font-size:16px;font-weight:800;vertical-align:top;">
                      ${formatCurrency(booking?.ukupnaCena)}
                    </td>
                  </tr>
                </table>
              </div>

              <div style="border:1px solid #eaecf0;border-radius:16px;padding:18px 16px 8px 16px;margin-bottom:18px;background:#ffffff;">
                <div style="font-size:15px;font-weight:800;color:#101828;margin-bottom:14px;">
                  Podaci o roditelju
                </div>

                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:8px 0;color:#667085;font-size:14px;vertical-align:top;">Ime i prezime</td>
                    <td style="padding:8px 0;text-align:right;color:#101828;font-size:14px;font-weight:700;vertical-align:top;">
                      ${safeValue(
                        `${booking?.imeRoditelja || roditelj?.ime || ""} ${booking?.prezimeRoditelja || roditelj?.prezime || ""}`.trim(),
                        "Nije uneto",
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#667085;font-size:14px;vertical-align:top;">Email</td>
                    <td style="padding:8px 0;text-align:right;color:#101828;font-size:14px;font-weight:700;vertical-align:top;">
                      ${safeValue(booking?.emailRoditelja || roditelj?.email)}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#667085;font-size:14px;vertical-align:top;">Telefon</td>
                    <td style="padding:8px 0;text-align:right;color:#101828;font-size:14px;font-weight:700;vertical-align:top;">
                      ${safeValue(booking?.telefonRoditelja || roditelj?.telefon)}
                    </td>
                  </tr>
                </table>
              </div>

             <div style="border:1px solid #eaecf0;border-radius:16px;padding:18px 16px 18px 16px;margin-bottom:18px;background:#ffffff;">
  <div style="font-size:15px;font-weight:800;color:#101828;margin-bottom:14px;">
    Stavke iz cenovnika
  </div>
  ${renderStackedList(booking?.izabraneCene || [])}
</div>

              <div style="border:1px solid #eaecf0;border-radius:16px;padding:18px 16px 18px 16px;margin-bottom:18px;background:#ffffff;">
                <div style="font-size:15px;font-weight:800;color:#101828;margin-bottom:14px;">
                  Izabrani paket
                </div>
                ${renderPaket}
              </div>

           <div style="border:1px solid #eaecf0;border-radius:16px;padding:18px 16px 18px 16px;margin-bottom:18px;background:#ffffff;">
  <div style="font-size:15px;font-weight:800;color:#101828;margin-bottom:14px;">
    Dodatne usluge
  </div>
  ${renderStackedList(booking?.izabraneUsluge || [])}
</div>

              <div style="border:1px solid #eaecf0;border-radius:16px;padding:18px 16px 18px 16px;margin-bottom:18px;background:#ffffff;">
                <div style="font-size:15px;font-weight:800;color:#101828;margin-bottom:14px;">
                  Napomena
                </div>
                <div style="font-size:14px;color:#475467;line-height:1.6;">
                  ${booking?.napomena ? booking.napomena : "Nema dodatne napomene."}
                </div>
              </div>

              <div style="border:1px solid #eaecf0;border-radius:16px;padding:18px 16px 18px 16px;background:#ffffff;">
                <div style="font-size:15px;font-weight:800;color:#101828;margin-bottom:14px;">
                  Besplatne pogodnosti
                </div>
                <div>
                  ${besplatne}
                </div>
              </div>

            </div>

            <div style="padding:18px 20px;text-align:center;border-top:1px solid #eaecf0;background:#fcfcfd;color:#667085;font-size:12px;line-height:1.6;">
              © Svet Igraonica<br />
              Ovaj email je automatski generisan. Molimo vas da ne odgovarate direktno na ovu poruku.
            </div>

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
      true,
    ),
  });
};
// ==============================
// ❌ OTKAZIVANJE
// ==============================
exports.sendBookingCancellation = async (
  booking,
  roditelj,
  playroom,
  timeSlot,
) => {
  return sendMail({
    from: `"Svet Igraonica" <${process.env.EMAIL_USER}>`,
    to: roditelj.email,
    subject: `❌ Otkazivanje rezervacije - ${playroom.naziv}`,
    html: generateEmailHtml(
      "Rezervacija otkazana",
      "Vaša rezervacija je uspešno otkazana.",
      booking,
      roditelj,
      playroom,
      timeSlot,
      false,
    ),
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
    subject: `❌ Otkazana rezervacija - ${playroom.naziv}`,
    html: generateEmailHtml(
      "Rezervacija otkazana",
      "Jedna rezervacija je otkazana.",
      booking,
      roditelj,
      playroom,
      timeSlot,
      true,
    ),
  });
};

exports.sendMail = sendMail;
