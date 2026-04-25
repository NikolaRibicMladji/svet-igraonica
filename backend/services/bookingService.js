const TimeSlot = require("../models/TimeSlot");
const Booking = require("../models/Booking");
const BOOKING_STATUS = require("../constants/bookingStatus");
const ErrorResponse = require("../utils/errorResponse");
const mongoose = require("mongoose");
const Playroom = require("../models/Playroom");

const {
  APP_TIMEZONE,
  getNowInAppTimezone,
  startOfDayInAppTimezone,
  endOfDayInAppTimezone,
  buildDateTimeInAppTimezone,
  parseDateOnlyInAppTimezone,
} = require("../utils/dateTime");
const { formatInTimeZone } = require("date-fns-tz");

const buildDateTime = (date, time) => {
  return buildDateTimeInAppTimezone(date, time);
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
  const isoDay = formatInTimeZone(date, APP_TIMEZONE, "i");

  const map = {
    1: "ponedeljak",
    2: "utorak",
    3: "sreda",
    4: "cetvrtak",
    5: "petak",
    6: "subota",
    7: "nedelja",
  };

  return map[isoDay];
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

const parseValidDate = (dateString) => {
  if (!dateString) {
    throw new ErrorResponse("Datum nije validan", 400);
  }

  // ako je već Date
  if (dateString instanceof Date) {
    return new Date(dateString);
  }

  // ako je string "YYYY-MM-DD"
  const parsed = new Date(dateString + "T00:00:00");

  if (Number.isNaN(parsed.getTime())) {
    throw new ErrorResponse("Datum nije validan", 400);
  }

  return parsed;
};

const getBlockingStatuses = () => [
  BOOKING_STATUS.POTVRDJENO,
  BOOKING_STATUS.CEKANJE,
];

const getActiveBookingsForDate = async ({
  playroomId,
  datum,
  session = null,
}) => {
  const startDate = startOfDayInAppTimezone(datum);
  const endDate = endOfDayInAppTimezone(datum);

  let query = Booking.find({
    playroomId,
    datum: { $gte: startDate, $lte: endDate },
    status: { $in: getBlockingStatuses() },
  })
    .select("_id vremeOd vremeDo")
    .sort({ vremeOd: 1 });

  if (session) {
    query = query.session(session);
  }

  return query;
};

const findOverlappingActiveBooking = async ({
  playroomId,
  datum,
  vremeOd,
  vremeDo,
  excludeBookingId = null,
  session = null,
}) => {
  const startDate = startOfDayInAppTimezone(datum);
  const endDate = endOfDayInAppTimezone(datum);

  const queryObj = {
    playroomId,
    datum: { $gte: startDate, $lte: endDate },
    status: { $in: getBlockingStatuses() },
    vremeOd: { $lt: vremeDo },
    vremeDo: { $gt: vremeOd },
  };

  if (excludeBookingId) {
    queryObj._id = { $ne: excludeBookingId };
  }

  let query = Booking.findOne(queryObj);

  if (session) {
    query = query.session(session);
  }

  return query;
};

const findOverlappingBookingWithPreparation = async ({
  playroomId,
  datum,
  vremeOd,
  vremeDo,
  preparationMinutes = 0,
  excludeBookingId = null,
  session = null,
}) => {
  const startDate = startOfDayInAppTimezone(datum);
  const endDate = endOfDayInAppTimezone(datum);

  let query = Booking.find({
    playroomId,
    datum: { $gte: startDate, $lte: endDate },
    status: { $in: getBlockingStatuses() },
  })
    .select("_id vremeOd vremeDo")
    .sort({ vremeOd: 1 });

  if (session) {
    query = query.session(session);
  }

  const bookings = await query;

  const targetStart = timeToMinutes(vremeOd);
  const targetEnd = timeToMinutes(vremeDo);

  return (
    bookings.find((existing) => {
      if (
        excludeBookingId &&
        String(existing._id) === String(excludeBookingId)
      ) {
        return false;
      }

      return isOverlapping(
        targetStart,
        targetEnd,
        timeToMinutes(existing.vremeOd),
        timeToMinutes(existing.vremeDo) + preparationMinutes,
      );
    }) || null
  );
};

const ensureVirtualSlotForInterval = async ({
  playroomId,
  datum,
  vremeOd,
  vremeDo,
  cena = 0,
  session = null,
}) => {
  const normalizedDate =
    datum instanceof Date ? new Date(datum) : parseValidDate(datum);

  normalizedDate.setHours(0, 0, 0, 0);

  const existing = await TimeSlot.findOne({
    playroomId,
    datum: normalizedDate,
    vremeOd,
    vremeDo,
  }).session(session || null);

  if (existing) {
    return existing;
  }

  try {
    return await TimeSlot.create(
      [
        {
          playroomId,
          datum: normalizedDate,
          vremeOd,
          vremeDo,
          cena,
          zauzeto: false,
          aktivno: true,
          vanRadnogVremena: false,
          napomenaAdmin: "AUTO_FLEX_INTERVAL_LOCK",
        },
      ],
      { session },
    ).then((docs) => docs[0]);
  } catch (err) {
    if (err.code === 11000) {
      return await TimeSlot.findOne({
        playroomId,
        datum: normalizedDate,
        vremeOd,
        vremeDo,
      }).session(session || null);
    }
    throw err;
  }
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

    const overlapBooking = await findOverlappingBookingWithPreparation({
      playroomId: slot.playroomId,
      datum: slot.datum,
      vremeOd: slot.vremeOd,
      vremeDo: slot.vremeDo,
      preparationMinutes,
      session,
    });

    if (overlapBooking) {
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

    const brojDece = Number(payload.brojDece) || 0;
    const brojRoditelja = Number(payload.brojRoditelja) || 0;
    const trajanjeSati = (() => {
      const start = buildDateTime(slot.datum, slot.vremeOd);
      const end = buildDateTime(slot.datum, slot.vremeDo);
      const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return diff > 0 ? diff : 1;
    })();

    const selectedCenaIds = (payload.cenaIds || []).map((id) => String(id));

    const selectedCene = Array.isArray(playroom.cene)
      ? playroom.cene.filter((c) => selectedCenaIds.includes(String(c._id)))
      : [];

    let selectedPaket = null;

    if (payload.paketId) {
      selectedPaket = Array.isArray(playroom.paketi)
        ? playroom.paketi.find((p) => String(p._id) === String(payload.paketId))
        : null;

      if (!selectedPaket) {
        await TimeSlot.findByIdAndUpdate(
          slot._id,
          { $set: { zauzeto: false } },
          { session },
        );

        throw new ErrorResponse("Izabrani paket nije pronađen", 400);
      }
    }

    const hasValidCene = selectedCene.length > 0;
    const hasValidPaket = !!selectedPaket;

    if (!hasValidCene && !hasValidPaket) {
      await TimeSlot.findByIdAndUpdate(
        slot._id,
        { $set: { zauzeto: false } },
        { session },
      );

      throw new ErrorResponse(
        "Izaberi validnu stavku iz cenovnika ili paket",
        400,
      );
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

    if (selectedPaket) {
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

    const dodatneUslugeMap = new Map(
      Array.isArray(playroom.dodatneUsluge)
        ? playroom.dodatneUsluge.map((u) => [String(u._id), u])
        : [],
    );

    if (uniqueUslugeIds.length > 0) {
      for (const uslugaId of uniqueUslugeIds) {
        const usluga = dodatneUslugeMap.get(String(uslugaId)) || null;

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
      await TimeSlot.findByIdAndUpdate(
        slot._id,
        { $set: { zauzeto: false } },
        { session },
      );

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
      if (err?.code === 11000) {
        await TimeSlot.findByIdAndUpdate(
          slot._id,
          { $set: { zauzeto: false } },
          { session },
        );

        throw new ErrorResponse("Termin je upravo zauzet, pokušaj ponovo", 409);
      }

      throw err;
    }

    booking = created[0];

    if (ownSession) {
      await session.commitTransaction();
    }
    setImmediate(() => {
      handleBookingEmails(booking._id);
    });

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
  let lockedSlot = null;

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

    if (!mongoose.Types.ObjectId.isValid(playroomId)) {
      throw new ErrorResponse("Nevalidan ID igraonice", 400);
    }

    const bookingDate = parseValidDate(datum);

    if (!vremeOd || !vremeDo) {
      throw new ErrorResponse("Vreme od/do je obavezno", 400);
    }

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

    const preparationMinutes = getPreparationMinutes(playroom);

    const overlapBooking = await findOverlappingBookingWithPreparation({
      playroomId,
      datum: bookingDate,
      vremeOd,
      vremeDo,
      preparationMinutes,
      session,
    });

    if (overlapBooking) {
      throw new ErrorResponse(
        "Izabrani termin se preklapa sa postojećom rezervacijom",
        409,
      );
    }

    const virtualSlot = await ensureVirtualSlotForInterval({
      playroomId,
      datum: bookingDate,
      vremeOd,
      vremeDo,
      cena: playroom.osnovnaCena ?? 0,
      session,
    });

    lockedSlot = await TimeSlot.findOneAndUpdate(
      {
        _id: virtualSlot._id,
        zauzeto: false,
        aktivno: true,
        vanRadnogVremena: false,
      },
      {
        $set: { zauzeto: true },
      },
      {
        new: true,
        session,
      },
    );

    if (!lockedSlot) {
      throw new ErrorResponse("Termin je upravo zauzet, pokušaj ponovo", 409);
    }

    // Dodatna provera posle lock-a
    const overlappingAfterLock = await findOverlappingActiveBooking({
      playroomId,
      datum: bookingDate,
      vremeOd,
      vremeDo,
      session,
    });

    if (overlappingAfterLock) {
      await TimeSlot.findByIdAndUpdate(
        lockedSlot._id,
        { $set: { zauzeto: false } },
        { session },
      );

      throw new ErrorResponse(
        "Izabrani termin je upravo zauzet, pokušaj ponovo",
        409,
      );
    }

    const brojDece = Number(payload.brojDece) || 0;
    const brojRoditelja = Number(payload.brojRoditelja) || 0;
    const trajanjeSati = (endMinutes - startMinutes) / 60;

    const selectedCenaIds = (payload.cenaIds || []).map((id) => String(id));
    const selectedCene = Array.isArray(playroom.cene)
      ? playroom.cene.filter((c) => selectedCenaIds.includes(String(c._id)))
      : [];

    let selectedPaket = null;

    if (payload.paketId) {
      selectedPaket = Array.isArray(playroom.paketi)
        ? playroom.paketi.find((p) => String(p._id) === String(payload.paketId))
        : null;

      if (!selectedPaket) {
        await TimeSlot.findByIdAndUpdate(
          lockedSlot._id,
          { $set: { zauzeto: false } },
          { session },
        );

        throw new ErrorResponse("Izabrani paket nije pronađen", 400);
      }
    }

    const hasValidCene = selectedCene.length > 0;
    const hasValidPaket = !!selectedPaket;

    if (!hasValidCene && !hasValidPaket) {
      await TimeSlot.findByIdAndUpdate(
        lockedSlot._id,
        { $set: { zauzeto: false } },
        { session },
      );

      throw new ErrorResponse(
        "Izaberi validnu stavku iz cenovnika ili paket",
        400,
      );
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

    if (selectedPaket) {
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

    const dodatneUslugeMap = new Map(
      Array.isArray(playroom.dodatneUsluge)
        ? playroom.dodatneUsluge.map((u) => [String(u._id), u])
        : [],
    );

    for (const uslugaId of uniqueUslugeIds) {
      const usluga = dodatneUslugeMap.get(String(uslugaId)) || null;

      if (!usluga) {
        await TimeSlot.findByIdAndUpdate(
          lockedSlot._id,
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

    const hasPerPerson = [
      ...selectedCene,
      ...(selectedPaket ? [selectedPaket] : []),
      ...selectedUsluge,
    ].some((item) => item?.tip === "po_osobi");

    if (hasPerPerson && (!brojDece || brojDece < 1)) {
      await TimeSlot.findByIdAndUpdate(
        lockedSlot._id,
        { $set: { zauzeto: false } },
        { session },
      );

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
            playroomId,
            timeSlotId: lockedSlot._id,
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
    } catch (err) {
      if (err?.code === 11000) {
        await TimeSlot.findByIdAndUpdate(
          lockedSlot._id,
          { $set: { zauzeto: false } },
          { session },
        );

        throw new ErrorResponse("Termin je upravo zauzet, pokušaj ponovo", 409);
      }

      throw err;
    }

    booking = created[0];

    if (ownSession) {
      await session.commitTransaction();
    }
    setImmediate(() => {
      handleBookingEmails(booking._id);
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
      sendBookingConfirmation(booking, userForEmail, playroom, timeSlot).catch(
        (err) => console.error("MAIL USER ERROR:", err.message),
      );
    }

    if (playroom?.vlasnikId?.email) {
      sendBookingConfirmationToOwner(
        booking,
        userForEmail,
        playroom,
        timeSlot,
        playroom.vlasnikId,
      ).catch((err) => console.error("MAIL OWNER ERROR:", err.message));
    }
  } catch (err) {
    console.error("EMAIL ERROR:", err.message);
  }
};

const sendCancellationEmailById = async (bookingId) => {
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

    const { sendCancellationToOwner } = require("../utils/emailService");

    const userForEmail = booking.roditeljId || {
      ime: booking.imeRoditelja,
      prezime: booking.prezimeRoditelja,
      email: booking.emailRoditelja,
      telefon: booking.telefonRoditelja,
    };

    const timeSlot = {
      datum: booking.datum,
      vremeOd: booking.vremeOd,
      vremeDo: booking.vremeDo,
    };

    if (userForEmail.email) {
      sendBookingCancellation(
        booking,
        userForEmail,
        booking.playroomId,
        timeSlot,
      ).catch((err) => console.error("MAIL USER CANCEL ERROR:", err.message));
    }

    if (booking.playroomId?.vlasnikId?.email) {
      sendCancellationToOwner(
        booking,
        userForEmail,
        booking.playroomId,
        timeSlot,
        booking.playroomId.vlasnikId,
      ).catch((err) => console.error("MAIL OWNER CANCEL ERROR:", err.message));
    }
  } catch (err) {
    console.error("EMAIL ERROR (cancel):", err.message);
  }
};

const createBookingWithEmails = async (data) => {
  const booking = await reserveSlot(data);

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

  const isAdmin = user?.role === "admin";

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
  if (!booking?.datum || !booking?.vremeDo) {
    return false;
  }

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

    if (booking.timeSlotId) {
      const unlockedSlot = await unlockSlot(
        booking.timeSlotId?._id || booking.timeSlotId,
        session,
      );

      if (!unlockedSlot) {
        throw new ErrorResponse("Slot za ovu rezervaciju nije pronađen", 404);
      }
    }

    await session.commitTransaction();

    setImmediate(() => {
      sendCancellationEmailById(booking._id);
    });

    console.log("❌ BOOKING CANCELED:", {
      bookingId,
      user: currentUser?.id || null,
      time: new Date().toISOString(),
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

  return booking;
};

const lockSlot = async (slotId) => {
  if (!slotId || !mongoose.Types.ObjectId.isValid(slotId)) {
    throw new ErrorResponse("Nevalidan slot ID za zaključavanje", 400);
  }

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

  sendCancellationEmailById,

  lockSlot,
  unlockSlot,
  cancelBookingById,
  confirmBookingById,
  getBookingWithRelations,
  reserveCustomInterval,
  buildDaySegments,
  getActiveBookingsForDate,
  findOverlappingBookingWithPreparation,
  getWorkingHoursForDate,
  timeToMinutes,
  minutesToTime,
  buildDateTime,
  parseValidDate,
  getBlockingStatuses,
};
