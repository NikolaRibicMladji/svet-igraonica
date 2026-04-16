const TimeSlot = require("../models/TimeSlot");
const Booking = require("../models/Booking");
const BOOKING_STATUS = require("../constants/bookingStatus");
const ErrorResponse = require("../utils/errorResponse");
const mongoose = require("mongoose");
const Playroom = require("../models/Playroom");

const buildDateTime = (date, time) => {
  const [hour, minute] = String(time || "00:00")
    .split(":")
    .map((v) => parseInt(v, 10));

  const d = new Date(date);

  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    hour || 0,
    minute || 0,
    0,
    0,
  );
};

const timeToMinutes = (time) => {
  const [hour, minute] = String(time || "00:00")
    .split(":")
    .map((v) => parseInt(v, 10));

  return (hour || 0) * 60 + (minute || 0);
};

const minutesToTime = (minutes) => {
  const safeMinutes = Math.max(0, Number(minutes) || 0);
  const hour = Math.floor(safeMinutes / 60);
  const minute = safeMinutes % 60;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};
const getPreparationMinutes = (playroom) => {
  const value = Number(playroom?.vremePripremeTermina);
  return Number.isFinite(value) && value >= 0 ? value : 0;
};

const isOverlapping = (startA, endA, startB, endB) => {
  return startA < endB && endA > startB;
};

const getDayKeyFromDate = (date) => {
  const day = new Date(date).getDay();

  const map = {
    0: "nedelja",
    1: "ponedeljak",
    2: "utorak",
    3: "sreda",
    4: "cetvrtak",
    5: "petak",
    6: "subota",
  };

  return map[day];
};

const getWorkingHoursForDate = (playroom, date) => {
  const dayKey = getDayKeyFromDate(date);
  const dayConfig = playroom?.radnoVreme?.[dayKey];

  if (
    !dayConfig ||
    dayConfig.radi === false ||
    !dayConfig.od ||
    !dayConfig.do
  ) {
    return null;
  }

  return {
    vremeOd: dayConfig.od,
    vremeDo: dayConfig.do,
  };
};

const getActiveBookingsForDate = async ({
  playroomId,
  datum,
  session = null,
}) => {
  const startDate = new Date(datum);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(datum);
  endDate.setHours(23, 59, 59, 999);

  let query = Booking.find({
    playroomId,
    datum: { $gte: startDate, $lte: endDate },
    status: { $ne: BOOKING_STATUS.OTKAZANO },
  }).sort({ vremeOd: 1 });

  if (session) {
    query = query.session(session);
  }

  return query;
};

const buildDaySegments = ({
  workingHours,
  bookings,
  preparationMinutes = 0,
}) => {
  if (!workingHours) return [];

  const dayStart = timeToMinutes(workingHours.vremeOd);
  const dayEnd = timeToMinutes(workingHours.vremeDo);

  const sortedBookings = [...(bookings || [])].sort(
    (a, b) => timeToMinutes(a.vremeOd) - timeToMinutes(b.vremeOd),
  );

  const segments = [];
  let cursor = dayStart;

  for (const booking of sortedBookings) {
    const bookingStart = timeToMinutes(booking.vremeOd);
    const bookingEnd = Math.min(
      timeToMinutes(booking.vremeDo) + preparationMinutes,
      dayEnd,
    );

    if (bookingStart > cursor) {
      segments.push({
        tip: "slobodno",
        vremeOd: minutesToTime(cursor),
        vremeDo: minutesToTime(bookingStart),
      });
    }

    segments.push({
      tip: "zauzeto",
      vremeOd: booking.vremeOd,
      vremeDo: booking.vremeDo,
      booking,
    });

    cursor = Math.max(cursor, bookingEnd);
  }

  if (cursor < dayEnd) {
    segments.push({
      tip: "slobodno",
      vremeOd: minutesToTime(cursor),
      vremeDo: minutesToTime(dayEnd),
    });
  }

  return segments;
};

const reserveSlot = async ({
  slotId,
  user,
  payload,
  session: externalSession = null,
}) => {
  const ownSession = !externalSession;
  const session = externalSession || (await mongoose.startSession());
  let booking = null;

  try {
    console.log("📌 RESERVE SLOT:", {
      slotId,
      user: user?._id || null,
      time: new Date().toISOString(),
    });
    if (ownSession) {
      session.startTransaction();
    }

    if (
      !payload?.imeRoditelja ||
      !payload?.prezimeRoditelja ||
      !payload?.emailRoditelja ||
      !payload?.telefonRoditelja
    ) {
      throw new ErrorResponse("Nedostaju podaci za rezervaciju", 400);
    }
    if (!Array.isArray(payload?.cenaIds) || payload.cenaIds.length === 0) {
      throw new ErrorResponse("Izaberi bar jednu stavku iz cenovnika", 400);
    }

    if (!mongoose.Types.ObjectId.isValid(slotId)) {
      throw new ErrorResponse("Nevalidan slot ID", 400);
    }

    const slot = await TimeSlot.findOneAndUpdate(
      {
        _id: slotId,
        zauzeto: false,
        aktivno: true,
        vanRadnogVremena: false,
      },
      {
        $set: {
          zauzeto: true,
        },
      },
      {
        new: true,
        session,
      },
    );

    if (!slot) {
      throw new ErrorResponse("Termin je već zauzet ili ne postoji", 400);
    }

    const slotEnd = buildDateTime(slot.datum, slot.vremeDo);

    if (slotEnd <= new Date()) {
      await TimeSlot.findByIdAndUpdate(
        slot._id,
        { $set: { zauzeto: false } },
        { session },
      );

      throw new ErrorResponse("Ne možeš rezervisati prošli termin", 400);
    }

    const playroom = await Playroom.findById(slot.playroomId).session(session);

    const preparationMinutes = getPreparationMinutes(playroom);

    const existingBookings = await getActiveBookingsForDate({
      playroomId: slot.playroomId,
      datum: slot.datum,
      session,
    });

    const slotStartMinutes = timeToMinutes(slot.vremeOd);
    const slotEndMinutes = timeToMinutes(slot.vremeDo);

    const hasOverlap = existingBookings.some((existing) =>
      isOverlapping(
        slotStartMinutes,
        slotEndMinutes,
        timeToMinutes(existing.vremeOd),
        timeToMinutes(existing.vremeDo) + preparationMinutes,
      ),
    );

    if (hasOverlap) {
      await TimeSlot.findByIdAndUpdate(
        slot._id,
        { $set: { zauzeto: false } },
        { session },
      );

      throw new ErrorResponse(
        "Termin nije dostupan zbog vremena za pripremu između rezervacija",
        400,
      );
    }

    if (!playroom) {
      await TimeSlot.findByIdAndUpdate(
        slot._id,
        { $set: { zauzeto: false } },
        { session },
      );

      throw new ErrorResponse("Igraonica nije pronađena", 404);
    }

    const brojDece = payload.brojDece ? Number(payload.brojDece) : 0;
    const brojRoditelja = payload.brojRoditelja
      ? Number(payload.brojRoditelja)
      : 0;
    const trajanjeSati = (() => {
      const start = buildDateTime(slot.datum, slot.vremeOd);
      const end = buildDateTime(slot.datum, slot.vremeDo);
      const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return diff > 0 ? diff : 1;
    })();

    const selectedCenaIds = payload.cenaIds.map((id) => String(id));

    const selectedCene = Array.isArray(playroom.cene)
      ? playroom.cene.filter((c) => selectedCenaIds.includes(String(c._id)))
      : [];

    if (selectedCene.length === 0) {
      await TimeSlot.findByIdAndUpdate(
        slot._id,
        { $set: { zauzeto: false } },
        { session },
      );

      throw new ErrorResponse("Izabrane cene nisu pronađene", 400);
    }

    let ukupnaCena = 0;

    selectedCene.forEach((c) => {
      if (c.tip === "fiksno") {
        ukupnaCena += Number(c.cena) || 0;
      }

      if (c.tip === "po_osobi") {
        ukupnaCena += (Number(c.cena) || 0) * brojDece;
      }

      if (c.tip === "po_satu") {
        ukupnaCena += (Number(c.cena) || 0) * trajanjeSati;
      }
    });

    let selectedPaket = null;

    if (payload.paketId) {
      selectedPaket = Array.isArray(playroom.paketi)
        ? playroom.paketi.find((p) => String(p._id) === String(payload.paketId))
        : null;

      if (!selectedPaket) {
        throw new ErrorResponse("Izabrani paket nije pronađen", 400);
      }

      if (selectedPaket.tip === "fiksno" || !selectedPaket.tip) {
        ukupnaCena += Number(selectedPaket.cena) || 0;
      }

      if (selectedPaket.tip === "po_osobi") {
        ukupnaCena += (Number(selectedPaket.cena) || 0) * brojDece;
      }

      if (selectedPaket.tip === "po_satu") {
        ukupnaCena += (Number(selectedPaket.cena) || 0) * trajanjeSati;
      }
    }
    const selectedUsluge = [];

    const uniqueUslugeIds = Array.isArray(payload.usluge)
      ? [...new Set(payload.usluge.map((id) => String(id)))]
      : [];
    if (uniqueUslugeIds.length > 0) {
      for (const uslugaId of uniqueUslugeIds) {
        const usluga = Array.isArray(playroom.dodatneUsluge)
          ? playroom.dodatneUsluge.find(
              (u) => String(u._id) === String(uslugaId),
            )
          : null;

        if (!usluga) {
          await TimeSlot.findByIdAndUpdate(
            slot._id,
            { $set: { zauzeto: false } },
            { session },
          );

          throw new ErrorResponse(
            "Jedna od izabranih usluga nije pronađena",
            400,
          );
        }

        selectedUsluge.push({
          naziv: usluga.naziv,
          cena: Number(usluga.cena) || 0,
          tip: usluga.tip || "fiksno",
          opis: usluga.opis || "",
        });

        if (usluga.tip === "fiksno") {
          ukupnaCena += Number(usluga.cena) || 0;
        }

        if (usluga.tip === "po_osobi") {
          ukupnaCena += (Number(usluga.cena) || 0) * brojDece;
        }

        if (usluga.tip === "po_satu") {
          ukupnaCena += (Number(usluga.cena) || 0) * trajanjeSati;
        }
      }
    }

    const hasPerPerson = [
      ...selectedCene,
      ...(selectedPaket ? [selectedPaket] : []),
      ...selectedUsluge,
    ].some((item) => item?.tip === "po_osobi");

    if (hasPerPerson && (!brojDece || brojDece < 1)) {
      throw new ErrorResponse(
        "Broj dece je obavezan jer je izabrana stavka koja se naplaćuje po osobi",
        400,
      );
    }

    let created;

    try {
      created = await Booking.create(
        [
          {
            roditeljId: user?._id || null,
            playroomId: slot.playroomId,
            timeSlotId: slot._id,
            datum: slot.datum,
            vremeOd: slot.vremeOd,
            vremeDo: slot.vremeDo,
            ukupnaCena,
            status: BOOKING_STATUS.POTVRDJENO,
            napomena: payload.napomena || "",
            imeRoditelja: payload.imeRoditelja.trim(),
            prezimeRoditelja: payload.prezimeRoditelja.trim(),
            emailRoditelja: payload.emailRoditelja.trim().toLowerCase(),
            telefonRoditelja: payload.telefonRoditelja.trim(),
            brojDece,
            brojRoditelja,
            izabraneCene: selectedCene.map((c) => ({
              naziv: c.naziv,
              cena: Number(c.cena) || 0,
              tip: c.tip || "fiksno",
              opis: c.opis || "",
            })),
            izabraniPaket: selectedPaket
              ? {
                  naziv: selectedPaket.naziv,
                  cena: Number(selectedPaket.cena) || 0,
                  tip: selectedPaket.tip || "fiksno",
                  opis: selectedPaket.opis || "",
                }
              : null,
            izabraneUsluge: selectedUsluge,
          },
        ],
        { session },
      );
    } catch (err) {
      if (err.code === 11000) {
        await TimeSlot.findByIdAndUpdate(
          slot._id,
          { $set: { zauzeto: false } },
          { session },
        );

        throw new ErrorResponse("Termin je upravo zauzet, pokušaj ponovo", 400);
      }

      throw err;
    }

    booking = created[0];

    if (ownSession) {
      await session.commitTransaction();
    }

    console.log("✅ BOOKING CREATED:", {
      bookingId: booking._id,
      slotId,
      user: user?._id || null,
      time: new Date().toISOString(),
    });

    return booking;
  } catch (err) {
    if (ownSession) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    if (ownSession) {
      session.endSession();
    }
  }
};

const reserveCustomInterval = async ({
  playroomId,
  datum,
  vremeOd,
  vremeDo,
  user,
  payload,
  session: externalSession = null,
}) => {
  const ownSession = !externalSession;
  const session = externalSession || (await mongoose.startSession());
  let booking = null;

  try {
    if (ownSession) {
      session.startTransaction();
    }

    if (
      !payload?.imeRoditelja ||
      !payload?.prezimeRoditelja ||
      !payload?.emailRoditelja ||
      !payload?.telefonRoditelja
    ) {
      throw new ErrorResponse("Nedostaju podaci za rezervaciju", 400);
    }

    if (!Array.isArray(payload?.cenaIds) || payload.cenaIds.length === 0) {
      throw new ErrorResponse("Izaberi bar jednu stavku iz cenovnika", 400);
    }

    if (!mongoose.Types.ObjectId.isValid(playroomId)) {
      throw new ErrorResponse("Nevalidan ID igraonice", 400);
    }

    const bookingDate = new Date(datum);
    bookingDate.setHours(0, 0, 0, 0);

    const playroom = await Playroom.findById(playroomId).session(session);

    if (!playroom) {
      throw new ErrorResponse("Igraonica nije pronađena", 404);
    }

    const workingHours = getWorkingHoursForDate(playroom, bookingDate);

    if (!workingHours) {
      throw new ErrorResponse("Igraonica ne radi tog dana", 400);
    }

    const startMinutes = timeToMinutes(vremeOd);
    const endMinutes = timeToMinutes(vremeDo);
    const workingStart = timeToMinutes(workingHours.vremeOd);
    const workingEnd = timeToMinutes(workingHours.vremeDo);
    if (startMinutes % 15 !== 0 || endMinutes % 15 !== 0) {
      throw new ErrorResponse(
        "Vreme mora biti zadato u koracima od 15 minuta",
        400,
      );
    }

    if (endMinutes <= startMinutes) {
      throw new ErrorResponse(
        "Vreme završetka mora biti posle vremena početka",
        400,
      );
    }

    if (startMinutes < workingStart || endMinutes > workingEnd) {
      throw new ErrorResponse(
        "Rezervacija mora biti unutar radnog vremena igraonice",
        400,
      );
    }

    const bookingEndDate = buildDateTime(bookingDate, vremeDo);

    if (bookingEndDate <= new Date()) {
      throw new ErrorResponse("Ne možeš rezervisati prošli termin", 400);
    }

    const existingBookings = await getActiveBookingsForDate({
      playroomId,
      datum: bookingDate,
      session,
    });

    const preparationMinutes = getPreparationMinutes(playroom);

    const hasOverlap = existingBookings.some((existing) =>
      isOverlapping(
        startMinutes,
        endMinutes,
        timeToMinutes(existing.vremeOd),
        timeToMinutes(existing.vremeDo) + preparationMinutes,
      ),
    );

    if (hasOverlap) {
      throw new ErrorResponse(
        "Izabrani termin se preklapa sa postojećom rezervacijom",
        400,
      );
    }

    const brojDece = payload.brojDece ? Number(payload.brojDece) : 0;
    const brojRoditelja = payload.brojRoditelja
      ? Number(payload.brojRoditelja)
      : 0;
    const trajanjeSati = (endMinutes - startMinutes) / 60;

    const selectedCenaIds = payload.cenaIds.map((id) => String(id));

    const selectedCene = Array.isArray(playroom.cene)
      ? playroom.cene.filter((c) => selectedCenaIds.includes(String(c._id)))
      : [];

    if (selectedCene.length === 0) {
      throw new ErrorResponse("Izabrane cene nisu pronađene", 400);
    }

    let ukupnaCena = 0;

    selectedCene.forEach((c) => {
      if (c.tip === "fiksno") {
        ukupnaCena += Number(c.cena) || 0;
      }

      if (c.tip === "po_osobi") {
        ukupnaCena += (Number(c.cena) || 0) * brojDece;
      }

      if (c.tip === "po_satu") {
        ukupnaCena += (Number(c.cena) || 0) * trajanjeSati;
      }
    });

    let selectedPaket = null;

    if (payload.paketId) {
      selectedPaket = Array.isArray(playroom.paketi)
        ? playroom.paketi.find((p) => String(p._id) === String(payload.paketId))
        : null;

      if (!selectedPaket) {
        throw new ErrorResponse("Izabrani paket nije pronađen", 400);
      }

      if (selectedPaket.tip === "fiksno" || !selectedPaket.tip) {
        ukupnaCena += Number(selectedPaket.cena) || 0;
      }

      if (selectedPaket.tip === "po_osobi") {
        ukupnaCena += (Number(selectedPaket.cena) || 0) * brojDece;
      }

      if (selectedPaket.tip === "po_satu") {
        ukupnaCena += (Number(selectedPaket.cena) || 0) * trajanjeSati;
      }
    }

    const selectedUsluge = [];
    const uniqueUslugeIds = Array.isArray(payload.usluge)
      ? [...new Set(payload.usluge.map((id) => String(id)))]
      : [];

    for (const uslugaId of uniqueUslugeIds) {
      const usluga = Array.isArray(playroom.dodatneUsluge)
        ? playroom.dodatneUsluge.find((u) => String(u._id) === String(uslugaId))
        : null;

      if (!usluga) {
        throw new ErrorResponse(
          "Jedna od izabranih usluga nije pronađena",
          400,
        );
      }

      selectedUsluge.push({
        naziv: usluga.naziv,
        cena: Number(usluga.cena) || 0,
        tip: usluga.tip || "fiksno",
        opis: usluga.opis || "",
      });

      if (usluga.tip === "fiksno") {
        ukupnaCena += Number(usluga.cena) || 0;
      }

      if (usluga.tip === "po_osobi") {
        ukupnaCena += (Number(usluga.cena) || 0) * brojDece;
      }

      if (usluga.tip === "po_satu") {
        ukupnaCena += (Number(usluga.cena) || 0) * trajanjeSati;
      }
    }

    const hasPerPerson = [
      ...selectedCene,
      ...(selectedPaket ? [selectedPaket] : []),
      ...selectedUsluge,
    ].some((item) => item?.tip === "po_osobi");

    if (hasPerPerson && (!brojDece || brojDece < 1)) {
      throw new ErrorResponse(
        "Broj dece je obavezan jer je izabrana stavka koja se naplaćuje po osobi",
        400,
      );
    }

    const created = await Booking.create(
      [
        {
          roditeljId: user?._id || null,
          playroomId,
          timeSlotId: null,
          datum: bookingDate,
          vremeOd,
          vremeDo,
          ukupnaCena,
          status: BOOKING_STATUS.POTVRDJENO,
          napomena: payload.napomena || "",
          imeRoditelja: payload.imeRoditelja.trim(),
          prezimeRoditelja: payload.prezimeRoditelja.trim(),
          emailRoditelja: payload.emailRoditelja.trim().toLowerCase(),
          telefonRoditelja: payload.telefonRoditelja.trim(),
          brojDece,
          brojRoditelja,
          izabraneCene: selectedCene.map((c) => ({
            naziv: c.naziv,
            cena: Number(c.cena) || 0,
            tip: c.tip || "fiksno",
            opis: c.opis || "",
          })),
          izabraniPaket: selectedPaket
            ? {
                naziv: selectedPaket.naziv,
                cena: Number(selectedPaket.cena) || 0,
                tip: selectedPaket.tip || "fiksno",
                opis: selectedPaket.opis || "",
              }
            : null,
          izabraneUsluge: selectedUsluge,
        },
      ],
      { session },
    );

    booking = created[0];

    if (ownSession) {
      await session.commitTransaction();
    }

    return booking;
  } catch (err) {
    if (ownSession) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    if (ownSession) {
      session.endSession();
    }
  }
};

const {
  sendBookingConfirmation,
  sendBookingCancellation,
  sendBookingConfirmationToOwner,
} = require("../utils/emailService");

// 🔥 CENTRALIZOVANO SLANJE EMAILOVA
const handleBookingEmails = async (bookingId) => {
  try {
    const booking = await Booking.findById(bookingId)
      .populate({
        path: "playroomId",
        select: "naziv adresa grad vlasnikId",
        populate: {
          path: "vlasnikId",
          select: "ime prezime email",
        },
      })
      .populate("roditeljId", "ime prezime email telefon")
      .populate("timeSlotId");

    if (!booking) return;

    const userForEmail = booking.roditeljId || {
      ime: booking.imeRoditelja,
      prezime: booking.prezimeRoditelja,
      email: booking.emailRoditelja,
      telefon: booking.telefonRoditelja,
    };

    const playroom = booking.playroomId;

    const timeSlot = {
      datum: booking.datum,
      vremeOd: booking.vremeOd,
      vremeDo: booking.vremeDo,
    };

    if (userForEmail.email) {
      await sendBookingConfirmation(booking, userForEmail, playroom, timeSlot);
    }

    if (playroom?.vlasnikId?.email) {
      await sendBookingConfirmationToOwner(
        booking,
        userForEmail,
        playroom,
        timeSlot,
        playroom.vlasnikId,
      );
    }
  } catch (err) {
    console.error("EMAIL ERROR:", err.message);
  }
};

const createBookingWithEmails = async (data) => {
  const booking = await reserveSlot(data);

  setImmediate(async () => {
    try {
      await handleBookingEmails(booking._id);
    } catch (error) {
      console.error("Greška pri slanju booking emailova:", error.message);
    }
  });

  return booking;
};

const getBookingWithRelations = async (bookingId, session = null) => {
  let query = Booking.findById(bookingId)
    .populate({
      path: "playroomId",
      select: "naziv adresa grad vlasnikId",
      populate: {
        path: "vlasnikId",
        select: "ime prezime email",
      },
    })
    .populate("roditeljId", "ime prezime email telefon")
    .populate("timeSlotId");

  if (session) {
    query = query.session(session);
  }

  return query;
};

const canUserManageBooking = (booking, user) => {
  if (!booking || !user) return false;

  const isAdmin = user.role === "admin";

  const isOwnerOfBooking =
    booking.roditeljId &&
    booking.roditeljId._id &&
    booking.roditeljId._id.toString() === user.id;

  const isPlayroomOwner =
    booking.playroomId?.vlasnikId &&
    (booking.playroomId.vlasnikId._id?.toString() === user.id ||
      booking.playroomId.vlasnikId.toString() === user.id);

  return {
    isAdmin,
    isOwnerOfBooking,
    isPlayroomOwner,
  };
};

const canConfirmPastBooking = (booking) => {
  const bookingEnd = buildDateTime(booking.datum, booking.vremeDo);

  return bookingEnd > new Date();
};

const cancelBookingById = async ({ bookingId, currentUser }) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const booking = await getBookingWithRelations(bookingId, session);

    if (!booking) {
      throw new ErrorResponse("Rezervacija nije pronađena", 404);
    }

    const { isAdmin, isOwnerOfBooking, isPlayroomOwner } = canUserManageBooking(
      booking,
      currentUser,
    );

    if (!isOwnerOfBooking && !isPlayroomOwner && !isAdmin) {
      throw new ErrorResponse("Nemate pravo da otkažete ovu rezervaciju", 403);
    }

    if (booking.status === BOOKING_STATUS.OTKAZANO) {
      throw new ErrorResponse("Rezervacija je već otkazana", 400);
    }

    if (booking.status === BOOKING_STATUS.ZAVRSENO) {
      throw new ErrorResponse(
        "Završena rezervacija ne može biti otkazana",
        400,
      );
    }

    booking.status = BOOKING_STATUS.OTKAZANO;
    await booking.save({ session });

    const unlockedSlot = await unlockSlot(
      booking.timeSlotId?._id || booking.timeSlotId,
      session,
    );

    if (!unlockedSlot) {
      throw new ErrorResponse("Slot za ovu rezervaciju nije pronađen", 404);
    }

    await session.commitTransaction();

    console.log("❌ BOOKING CANCELED:", {
      bookingId,
      user: currentUser?.id || null,
      time: new Date().toISOString(),
    });

    setImmediate(async () => {
      try {
        await sendCancellationEmail(booking);

        if (booking.playroomId?.vlasnikId?.email) {
          await require("../utils/emailService").sendCancellationToOwner(
            booking,
            booking.roditeljId,
            booking.playroomId,
            {
              datum: booking.datum,
              vremeOd: booking.vremeOd,
              vremeDo: booking.vremeDo,
            },
            booking.playroomId.vlasnikId,
          );
        }
      } catch (error) {
        console.error(
          "Greška pri slanju emaila nakon otkazivanja rezervacije:",
          error.message,
        );
      }
    });

    return booking;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const confirmBookingById = async ({ bookingId, currentUser }) => {
  const booking = await getBookingWithRelations(bookingId);

  if (!booking) {
    throw new ErrorResponse("Rezervacija nije pronađena", 404);
  }

  const { isAdmin, isPlayroomOwner } = canUserManageBooking(
    booking,
    currentUser,
  );

  if (!isPlayroomOwner && !isAdmin) {
    throw new ErrorResponse("Nemate pravo da potvrdite ovu rezervaciju", 403);
  }

  if (booking.status === BOOKING_STATUS.OTKAZANO) {
    throw new ErrorResponse("Otkazana rezervacija ne može biti potvrđena", 400);
  }

  if (booking.status === BOOKING_STATUS.POTVRDJENO) {
    throw new ErrorResponse("Rezervacija je već potvrđena", 400);
  }

  if (booking.status === BOOKING_STATUS.ZAVRSENO) {
    throw new ErrorResponse(
      "Završena rezervacija ne može biti ponovo potvrđena",
      400,
    );
  }

  if (!canConfirmPastBooking(booking)) {
    throw new ErrorResponse("Prošli termin ne može biti potvrđen", 400);
  }

  booking.status = BOOKING_STATUS.POTVRDJENO;
  await booking.save();

  console.log("✅ BOOKING CONFIRMED:", {
    bookingId,
    user: currentUser?.id || null,
    time: new Date().toISOString(),
  });

  setImmediate(async () => {
    try {
      await sendConfirmationEmail(booking);

      if (booking.playroomId?.vlasnikId?.email) {
        await sendBookingConfirmationToOwner(
          booking,
          booking.roditeljId,
          booking.playroomId,
          {
            datum: booking.datum,
            vremeOd: booking.vremeOd,
            vremeDo: booking.vremeDo,
          },
          booking.playroomId.vlasnikId,
        );
      }
    } catch (error) {
      console.error(
        "Greška pri slanju emaila nakon potvrde rezervacije:",
        error.message,
      );
    }
  });

  return booking;
};

const sendCancellationEmail = async (booking) => {
  try {
    const userForEmail = booking.roditeljId || {
      ime: booking.imeRoditelja,
      prezime: booking.prezimeRoditelja,
      email: booking.emailRoditelja,
    };

    const playroom = booking.playroomId;

    const slot = {
      datum: booking.datum,
      vremeOd: booking.vremeOd,
      vremeDo: booking.vremeDo,
    };

    if (userForEmail.email) {
      await sendBookingCancellation(userForEmail, playroom, slot);
    }
  } catch (error) {
    console.error("Greška pri slanju emaila (cancel):", error.message);
  }
};

const sendConfirmationEmail = async (booking) => {
  try {
    const userForEmail = booking.roditeljId || {
      ime: booking.imeRoditelja,
      prezime: booking.prezimeRoditelja,
      email: booking.emailRoditelja,
    };

    const playroom = booking.playroomId;

    const slot = {
      datum: booking.datum,
      vremeOd: booking.vremeOd,
      vremeDo: booking.vremeDo,
    };

    if (userForEmail.email) {
      await sendBookingConfirmation(booking, userForEmail, playroom, slot);
    }
  } catch (error) {
    console.error("Greška pri slanju emaila (confirm):", error.message);
  }
};

const lockSlot = async (slotId) => {
  return TimeSlot.findOneAndUpdate(
    {
      _id: slotId,
      zauzeto: false,
      aktivno: true,
      vanRadnogVremena: false,
    },
    {
      $set: {
        zauzeto: true,
      },
    },
    { new: true },
  );
};

const unlockSlot = async (slotId, session = null) => {
  if (!slotId || !mongoose.Types.ObjectId.isValid(slotId)) {
    throw new ErrorResponse("Nevalidan slot ID za otključavanje", 400);
  }

  const options = { new: true };
  if (session) {
    options.session = session;
  }

  return TimeSlot.findByIdAndUpdate(
    slotId,
    {
      $set: {
        zauzeto: false,
      },
    },
    options,
  );
};

module.exports = {
  reserveSlot,
  createBookingWithEmails,
  handleBookingEmails,
  sendCancellationEmail,
  sendConfirmationEmail,
  lockSlot,
  unlockSlot,
  cancelBookingById,
  confirmBookingById,
  getBookingWithRelations,
  reserveCustomInterval,
  buildDaySegments,
  getActiveBookingsForDate,
  getWorkingHoursForDate,
  timeToMinutes,
  minutesToTime,
};
