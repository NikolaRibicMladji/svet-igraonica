==================================================
booking-rules
==================================================

# Booking Rules

Jedan termin = jedna rezervacija.

Svi slotovi rade na:

- 00
- 15
- 30
- 45

Postoje 2 režima rezervacije:

## Fleksibilno

Korisnik bira:

- vremeOd
- vremeDo

Sistem proverava:

- dostupnost
- preklapanje
- preparation time
- busy intervale

## Fiksno

Korisnik bira:

- samo početak termina

Sistem automatski računa:

- vremeDo

na osnovu:

- trajanjeTermina

## Preparation Time

Preparation time:

- ulazi u busy intervale
- zaključava dodatni period
- sprečava preklapanje rezervacija

Preparation time:

- mora da se računa pri proveri dostupnosti
- mora da se vidi u busy intervalima

## Busy Intervals

Busy interval uključuje:

- aktivne rezervacije
- preparation time

Busy interval:

- blokira nove rezervacije

## Free Intervals

Korisnik mora videti:

- slobodne intervale
- zauzete intervale

## Zabranjeno

Ne sme postojati:

- dupla rezervacija
- preklapanje termina
- race condition problem
- rezervacija van radnog vremena

## Booking Service

Centralna booking logika mora biti u:

- bookingService.js

Ne sme postojati:

- duplirana booking logika
- booking logika u React komponentama
- booking logika direktno u controllerima

## Slot Pravila

Svi termini:

- moraju biti validirani
- moraju biti normalizovani
- moraju biti u koracima od 15 minuta

## API

Glavni endpoint:

GET /api/timeslots/playroom/:playroomId/available?datum=YYYY-MM-DD

Response:

- workingHours
- busyIntervals
- freeIntervals

## Production Pravila

Kritične booking operacije:

- koristiti transaction/session
- imati race condition zaštitu
- imati unique protection
- validirati sve inpute

## Frontend Pravila

Frontend mora prikazivati:

- busy intervale
- free intervale
- zaključane slotove
- preparation time efekte

UI mora biti:

- responsive
- brz
- jasan korisniku

==================================================
FILE: bookingService.js
==================================================
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

return (hour || 0) \* 60 + (minute || 0);
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
const parsed = parseDateOnlyInAppTimezone(dateString);

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
.select("\_id vremeOd vremeDo")
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
queryObj.\_id = { $ne: excludeBookingId };
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
.select("\_id vremeOd vremeDo")
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
String(existing.\_id) === String(excludeBookingId)
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
user: user?.\_id || null,
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

    const slotStart = buildDateTime(slot.datum, slot.vremeOd);

    if (slotStart <= getNowInAppTimezone()) {
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

    const bookingStartDate = buildDateTime(bookingDate, vremeOd);

    if (bookingStartDate <= getNowInAppTimezone()) {
      throw new ErrorResponse(
        "Nije moguće rezervisati termin u prošlosti",
        400,
      );
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
console.log("📧 EMAIL FLOW START:", bookingId);
const booking = await Booking.findById(bookingId)
.populate({
path: "playroomId",
select: "naziv adresa grad vlasnikId besplatnePogodnosti",
populate: {
path: "vlasnikId",
select: "ime prezime email",
},
})
.populate("roditeljId", "ime prezime email telefon")
.populate("timeSlotId");

    if (!booking) return;
    console.log("📧 EMAIL BOOKING FOUND:", {
      bookingId: booking._id,
      emailRoditelja: booking.emailRoditelja,
      roditeljIdEmail: booking.roditeljId?.email,
      ownerEmail: booking.playroomId?.vlasnikId?.email,
    });
    const userForEmail = {
      ime: booking.imeRoditelja || booking.roditeljId?.ime || "",
      prezime: booking.prezimeRoditelja || booking.roditeljId?.prezime || "",
      email: booking.emailRoditelja || booking.roditeljId?.email || "",
      telefon: booking.telefonRoditelja || booking.roditeljId?.telefon || "",
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
select: "naziv adresa grad vlasnikId besplatnePogodnosti",
populate: {
path: "vlasnikId",
select: "ime prezime email",
},
})
.populate("roditeljId", "ime prezime email telefon")
.populate("timeSlotId");

    if (!booking) return;

    const { sendCancellationToOwner } = require("../utils/emailService");

    const userForEmail = {
      ime: booking.imeRoditelja || booking.roditeljId?.ime || "",
      prezime: booking.prezimeRoditelja || booking.roditeljId?.prezime || "",
      email: booking.emailRoditelja || booking.roditeljId?.email || "",
      telefon: booking.telefonRoditelja || booking.roditeljId?.telefon || "",
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
booking.roditeljId.\_id &&
booking.roditeljId.\_id.toString() === user.id;

const isPlayroomOwner =
booking.playroomId?.vlasnikId &&
(booking.playroomId.vlasnikId.\_id?.toString() === user.id ||
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
\_id: slotId,
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

==================================================
FILE: bookingController.js
==================================================
const Booking = require("../models/Booking");

const Playroom = require("../models/Playroom");
const bookingService = require("../services/bookingService");
const User = require("../models/User");
const authService = require("../services/authService");
const mongoose = require("mongoose");

// @desc Kreiraj novu rezervaciju (ulogovan korisnik)
// @route POST /api/bookings
// @access Private
exports.createBooking = async (req, res, next) => {
try {
const {
playroomId,
datum,
vremeOd,
vremeDo,
cenaIds,
paketId,
usluge,
brojDece,
brojRoditelja,
imeRoditelja,
prezimeRoditelja,
emailRoditelja,
telefonRoditelja,
napomena,
} = req.validated.body;

    const booking = await bookingService.reserveCustomInterval({
      playroomId,
      datum,
      vremeOd,
      vremeDo,
      user: req.user || null,
      payload: {
        cenaIds,
        paketId,
        usluge,
        brojDece,
        brojRoditelja,
        imeRoditelja,
        prezimeRoditelja,
        emailRoditelja,
        telefonRoditelja,
        napomena,
      },
    });

    return res.status(201).json({
      success: true,
      data: booking,
      message: "Rezervacija uspešno kreirana",
    });

} catch (error) {
next(error);
}
};

// @desc Guest rezervacija + registracija + auto login
// @route POST /api/bookings/guest
// @access Public
exports.createGuestBooking = async (req, res, next) => {
const session = await mongoose.startSession();

try {
session.startTransaction();

    const {
      playroomId,
      datum,
      vremeOd,
      vremeDo,
      cenaIds,
      paketId,
      usluge,
      brojDece,
      brojRoditelja,
      ime,
      prezime,
      email,
      telefon,
      password,
      napomena,
      acceptedTerms,
    } = req.validated.body;

    const authResult = await authService.registerGuestParent(
      {
        ime,
        prezime,
        email,
        password,
        telefon,
        acceptedTerms,
      },
      session,
    );

    const createdUser = authResult.user;
    const accessToken = authResult.accessToken;
    const refreshToken = authResult.refreshToken;

    const createdBooking = await bookingService.reserveCustomInterval({
      playroomId,
      datum,
      vremeOd,
      vremeDo,
      user: createdUser,
      payload: {
        cenaIds,
        paketId,
        usluge,
        brojDece,
        brojRoditelja,
        imeRoditelja: createdUser.ime,
        prezimeRoditelja: createdUser.prezime,
        emailRoditelja: createdUser.email,
        telefonRoditelja: createdUser.telefon,
        napomena,
      },
      session,
    });

    await session.commitTransaction();

    res.cookie("refreshToken", refreshToken, authService.cookieOptions);

    return res.status(201).json({
      success: true,
      message: "Uspešna registracija i rezervacija",
      accessToken,
      user: {
        id: createdUser._id,
        ime: createdUser.ime,
        prezime: createdUser.prezime,
        email: createdUser.email,
        telefon: createdUser.telefon,
        role: createdUser.role,
      },
      data: createdBooking,
    });

} catch (error) {
await session.abortTransaction();
next(error);
} finally {
session.endSession();
}
};

// @desc Dohvati moje rezervacije (roditelj)
// @route GET /api/bookings/my
// @access Private (roditelj)
exports.getMyBookings = async (req, res, next) => {
try {
const bookings = await Booking.find({ roditeljId: req.user.id })
.populate("playroomId", "naziv adresa grad slike")
.populate("timeSlotId")
.sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });

} catch (error) {
next(error);
}
};

// @desc Dohvati rezervacije za moje igraonice (vlasnik)
// @route GET /api/bookings/owner
// @access Private (vlasnik)
exports.getOwnerBookings = async (req, res, next) => {
try {
const playrooms = await Playroom.find({ vlasnikId: req.user.id }).select(
"\_id",
);
const playroomIds = playrooms.map((p) => p.\_id);

    const bookings = await Booking.find({ playroomId: { $in: playroomIds } })
      .populate("roditeljId", "ime prezime email telefon")
      .populate("playroomId", "naziv adresa grad")
      .populate("timeSlotId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });

} catch (error) {
next(error);
}
};
// @desc Otkaži rezervaciju
// @route PUT /api/bookings/:id/cancel
// @access Private (roditelj ili vlasnik ili admin)
exports.cancelBooking = async (req, res, next) => {
try {
const { id } = req.validated.params;

    const canceledBooking = await bookingService.cancelBookingById({
      bookingId: id,
      currentUser: req.user,
    });

    await bookingService.sendCancellationEmailById(canceledBooking._id);

    return res.status(200).json({
      success: true,
      message: "Rezervacija je otkazana",
    });

} catch (error) {
next(error);
}
};

// @desc Dohvati jednu rezervaciju po ID
// @route GET /api/bookings/:id
// @access Private (roditelj ili vlasnik ili admin)
exports.getBookingById = async (req, res, next) => {
try {
const { id } = req.validated.params;

    const booking = await Booking.findById(id)
      .populate("roditeljId", "ime prezime email telefon")
      .populate(
        "playroomId",
        "naziv adresa grad kontaktTelefon kontaktEmail vlasnikId",
      )
      .populate("timeSlotId");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Rezervacija nije pronađena",
      });
    }

    const isAdmin = req.user.role === "admin";
    const isOwnerOfBooking =
      booking.roditeljId &&
      booking.roditeljId._id &&
      booking.roditeljId._id.toString() === req.user.id;
    const isPlayroomOwner =
      booking.playroomId?.vlasnikId &&
      booking.playroomId.vlasnikId.toString() === req.user.id;

    if (!isOwnerOfBooking && !isPlayroomOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Nemate pravo da vidite ovu rezervaciju",
      });
    }

    res.status(200).json({
      success: true,
      data: booking,
    });

} catch (error) {
next(error);
}
};

==================================================
FILE: timeSlotController.js
==================================================
const Playroom = require("../models/Playroom");
const Booking = require("../models/Booking");
const { generateTimeSlotsForPlayroom } = require("../utils/generateTimeSlots");
const BOOKING_STATUS = require("../constants/bookingStatus");
const timeSlotService = require("../services/timeSlotService");
const mongoose = require("mongoose");
const TimeSlot = require("../models/TimeSlot");
const bookingService = require("../services/bookingService");
const { getBlockingStatuses } = require("../services/bookingService");
const ErrorResponse = require("../utils/errorResponse");
const { getNowInAppTimezone } = require("../utils/dateTime");

// @desc Kreiraj novi termin (samo vlasnik igraonice)
// @route POST /api/timeslots
// @access Private (vlasnik)
exports.createTimeSlot = async (req, res, next) => {
try {
const { playroomId, datum, vremeOd, vremeDo, cena } = req.validated.body;

    const playroom = await Playroom.findById(playroomId);
    if (!playroom) {
      throw new ErrorResponse("Igraonica nije pronađena", 404);
    }

    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      throw new ErrorResponse(
        "Nemate pravo da dodajete termine za ovu igraonicu",
        403,
      );
    }

    const slotDate = new Date(datum);
    slotDate.setHours(0, 0, 0, 0);

    try {
      const timeSlot = await TimeSlot.create({
        playroomId,
        datum: slotDate,
        vremeOd,
        vremeDo,
        cena,
        zauzeto: false,
        aktivno: true,
        vanRadnogVremena: false,
      });

      return res.status(201).json({
        success: true,
        data: timeSlot,
      });
    } catch (err) {
      if (err.code === 11000) {
        throw new ErrorResponse("Termin već postoji", 400);
      }

      throw err;
    }

} catch (error) {
next(error);
}
};

// @desc Dohvati sve termine za igraonicu
// @route GET /api/timeslots/playroom/:playroomId
// @access Public
exports.getTimeSlotsByPlayroom = async (req, res, next) => {
try {
const { playroomId } = req.validated.params;
const { datum } = req.validated.query;

    const playroom = await Playroom.findById(playroomId);
    if (!playroom) {
      throw new ErrorResponse("Igraonica nije pronađena", 404);
    }

    const startDate = bookingService.parseValidDate(datum);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    const now = getNowInAppTimezone();

    const timeSlots = await TimeSlot.find({
      playroomId,
      datum: { $gte: startDate, $lte: endDate },
      aktivno: true,
      vanRadnogVremena: false,
    })
      .sort({ vremeOd: 1 })
      .lean();
    const isToday =
      startDate.getFullYear() === now.getFullYear() &&
      startDate.getMonth() === now.getMonth() &&
      startDate.getDate() === now.getDate();

    const filteredSlots = isToday
      ? timeSlots.filter((slot) => {
          const slotEnd = new Date(
            new Date(slot.datum).getFullYear(),
            new Date(slot.datum).getMonth(),
            new Date(slot.datum).getDate(),
            ...String(slot.vremeDo || "00:00")
              .split(":")
              .map((v) => parseInt(v, 10)),
          );

          return slotEnd > now;
        })
      : timeSlots;

    res.status(200).json({
      success: true,
      count: filteredSlots.length,
      data: filteredSlots,
    });

} catch (error) {
next(error);
}
};

// @desc Dohvati svoje termine (za vlasnika)
// @route GET /api/timeslots/my
// @access Private (vlasnik)
exports.getMyTimeSlots = async (req, res, next) => {
try {
const playrooms = await Playroom.find({ vlasnikId: req.user.id });
const playroomIds = playrooms.map((p) => p.\_id);

    const timeSlots = await TimeSlot.find({ playroomId: { $in: playroomIds } })
      .populate("playroomId", "naziv")
      .sort({ datum: -1, vremeOd: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: timeSlots.length,
      data: timeSlots,
    });

} catch (error) {
next(error);
}
};

// @desc Dohvati jedan termin po ID
// @route GET /api/timeslots/:id
// @access Public
exports.getTimeSlotById = async (req, res, next) => {
try {
const { id } = req.validated.params;
const timeSlot = await TimeSlot.findById(id).lean();

    if (!timeSlot) {
      throw new ErrorResponse("Termin nije pronađen", 404);
    }

    res.status(200).json({
      success: true,
      data: timeSlot,
    });

} catch (error) {
next(error);
}
};

// @desc Ažuriraj termin
// @route PUT /api/timeslots/:id
// @access Private (vlasnik ili admin)
exports.updateTimeSlot = async (req, res, next) => {
try {
const { id } = req.validated.params;
const { cena, aktivno } = req.validated.body;

    let timeSlot = await TimeSlot.findById(id);

    if (!timeSlot) {
      throw new ErrorResponse("Termin nije pronađen", 404);
    }

    const playroom = await Playroom.findById(timeSlot.playroomId);

    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      throw new ErrorResponse("Nemate pravo da menjate ovaj termin", 403);
    }

    if (cena !== undefined) {
      const parsedCena = Number(cena);

      if (!Number.isFinite(parsedCena) || parsedCena < 0) {
        throw new ErrorResponse(
          "Cena mora biti broj veći ili jednak nuli",
          400,
        );
      }

      const updated = await TimeSlot.findOneAndUpdate(
        {
          _id: timeSlot._id,
          zauzeto: false,
        },
        {
          $set: { cena: parsedCena },
        },
        { new: true },
      );

      if (!updated) {
        throw new ErrorResponse(
          "Ne možeš menjati cenu termina koji ima rezervaciju",
          400,
        );
      }

      timeSlot = updated;
    }

    if (aktivno !== undefined) {
      if (aktivno === false) {
        timeSlot = await timeSlotService.deactivateSlotIfAllowed(timeSlot);
      } else {
        const slotEnd = new Date(
          new Date(timeSlot.datum).getFullYear(),
          new Date(timeSlot.datum).getMonth(),
          new Date(timeSlot.datum).getDate(),
          ...String(timeSlot.vremeDo || "00:00")
            .split(":")
            .map((v) => parseInt(v, 10)),
        );

        if (slotEnd <= getNowInAppTimezone()) {
          throw new ErrorResponse(
            "Prošli termin ne može biti ponovo aktiviran",
            400,
          );
        }

        timeSlot.aktivno = true;
        await timeSlot.save();
      }
    }

    return res.status(200).json({
      success: true,
      data: timeSlot,
    });

} catch (error) {
next(error);
}
};

// @desc Obriši termin
// @route DELETE /api/timeslots/:id
// @access Private (vlasnik ili admin)
exports.deleteTimeSlot = async (req, res, next) => {
try {
const { id } = req.validated.params;
const timeSlot = await TimeSlot.findById(id);

    if (!timeSlot) {
      throw new ErrorResponse("Termin nije pronađen", 404);
    }

    const playroom = await Playroom.findById(timeSlot.playroomId);

    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      throw new ErrorResponse("Nemate pravo da obrišete ovaj termin", 403);
    }

    await timeSlotService.deleteSlotIfAllowed(timeSlot);

    res.status(200).json({
      success: true,
      message: "Termin je obrisan",
    });

} catch (error) {
next(error);
}
};

// @desc Ručno generiši termine za igraonicu
// @route POST /api/timeslots/generate/:playroomId
// @access Private (vlasnik)
exports.generateSlotsForPlayroom = async (req, res, next) => {
try {
const { playroomId } = req.validated.params;

    const playroom = await Playroom.findById(playroomId);
    if (!playroom) {
      throw new ErrorResponse("Igraonica nije pronađena", 404);
    }

    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      throw new ErrorResponse(
        "Nemate pravo da generišete termine za ovu igraonicu",
        403,
      );
    }

    const result = await generateTimeSlotsForPlayroom(playroomId);

    res.status(200).json({
      success: true,
      message: `Generisano ${result.createdCount || 0} novih termina`,
      data: result,
    });

} catch (error) {
next(error);
}
};

// @desc Dohvati slobodne termine za igraonicu
// @route GET /api/timeslots/playroom/:playroomId/available
// @access Public
exports.getAvailableTimeSlots = async (req, res, next) => {
try {
const { playroomId } = req.validated.params;
const { datum } = req.validated.query;

    const playroom = await Playroom.findById(playroomId);

    if (!playroom) {
      throw new ErrorResponse("Igraonica nije pronađena", 404);
    }

    const targetDate = bookingService.parseValidDate(datum);

    const workingHours = bookingService.getWorkingHoursForDate(
      playroom,
      targetDate,
    );

    if (!workingHours) {
      return res.status(200).json({
        success: true,
        data: {
          workingHours: null,
          busyIntervals: [],
          freeIntervals: [],
        },
      });
    }

    const bookings = await bookingService.getActiveBookingsForDate({
      playroomId,
      datum: targetDate,
    });

    const segments = bookingService.buildDaySegments({
      workingHours,
      preparationMinutes: Number(playroom.vremePripremeTermina) || 0,
      bookings: bookings.map((b) => ({
        vremeOd: b.vremeOd,
        vremeDo: b.vremeDo,
      })),
    });

    const busyIntervals = segments
      .filter((s) => s.tip === "zauzeto")
      .map((s) => ({
        vremeOd: s.vremeOd,
        vremeDo: s.vremeDo,
      }));

    const freeIntervals = segments
      .filter((s) => s.tip === "slobodno")
      .map((s) => ({
        vremeOd: s.vremeOd,
        vremeDo: s.vremeDo,
      }));

    res.status(200).json({
      success: true,
      data: {
        workingHours,
        busyIntervals,
        freeIntervals,
      },
    });

} catch (error) {
next(error);
}
};

// @desc Dohvati sve termine za vlasnika (sa detaljima)
// @route GET /api/timeslots/playroom/:playroomId/all
// @access Private (vlasnik)
exports.getAllTimeSlotsForOwner = async (req, res, next) => {
try {
const { playroomId } = req.validated.params;
const { datum } = req.validated.query;

    const playroom = await Playroom.findById(playroomId);
    if (!playroom) {
      throw new ErrorResponse("Igraonica nije pronađena", 404);
    }

    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      throw new ErrorResponse(
        "Nemate pravo da vidite termine za ovu igraonicu",
        403,
      );
    }

    const targetDate = bookingService.parseValidDate(datum);

    const workingHours = bookingService.getWorkingHoursForDate(
      playroom,
      targetDate,
    );

    if (!workingHours) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        playroom: {
          id: playroom._id,
          naziv: playroom.naziv,
          grad: playroom.grad,
        },
      });
    }

    const startDate = targetDate;
    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    const bookings = await Booking.find({
      playroomId,
      datum: {
        $gte: startDate,
        $lte: endDate,
      },
      status: { $in: getBlockingStatuses() },
    })
      .select(
        "_id roditeljId imeRoditelja prezimeRoditelja emailRoditelja telefonRoditelja napomena status createdAt ukupnaCena vremeOd vremeDo brojDece brojRoditelja izabraneCene izabraniPaket izabraneUsluge",
      )
      .populate("roditeljId", "ime prezime email telefon")
      .sort({ vremeOd: 1 })
      .lean();

    const segments = bookingService.buildDaySegments({
      workingHours,
      bookings: bookings.map((booking) => ({
        _id: booking._id,
        vremeOd: booking.vremeOd,
        vremeDo: booking.vremeDo,
        booking: {
          id: booking._id,
          roditelj: booking.roditeljId,
          imeRoditelja: booking.imeRoditelja,
          prezimeRoditelja: booking.prezimeRoditelja,
          emailRoditelja: booking.emailRoditelja,
          telefonRoditelja: booking.telefonRoditelja,
          ukupnaCena: booking.ukupnaCena,
          brojDece: booking.brojDece,
          brojRoditelja: booking.brojRoditelja,
          izabraneCene: booking.izabraneCene || [],
          izabraniPaket: booking.izabraniPaket || null,
          izabraneUsluge: booking.izabraneUsluge || [],
          napomena: booking.napomena,
          status: booking.status,
          createdAt: booking.createdAt,
        },
      })),
    });

    const normalizedSegments = segments.map((segment) => ({
      tip: segment.tip,
      vremeOd: segment.vremeOd,
      vremeDo: segment.vremeDo,
      booking: segment.booking?.booking || segment.booking || null,
    }));

    res.status(200).json({
      success: true,
      count: normalizedSegments.length,
      data: normalizedSegments,
      playroom: {
        id: playroom._id,
        naziv: playroom.naziv,
        grad: playroom.grad,
      },
    });

} catch (error) {
next(error);
}
};

// @desc Ručno zauzmi termin (vlasnik rezerviše)
// @route POST /api/timeslots/:id/manual-book
// @access Private (vlasnik)
exports.manualBookTimeSlot = async (req, res, next) => {
const session = await mongoose.startSession();

try {
session.startTransaction();

    const { id } = req.validated.params;
    const {
      cenaIds,
      paketId,
      usluge,
      brojDece,
      brojRoditelja,
      imeRoditelja,
      prezimeRoditelja,
      emailRoditelja,
      telefonRoditelja,
      napomena,
    } = req.validated.body;

    const timeSlot = await TimeSlot.findById(id).session(session);

    if (!timeSlot) {
      throw new ErrorResponse("Termin nije pronađen", 404);
    }

    const playroom = await Playroom.findById(timeSlot.playroomId).session(
      session,
    );

    if (!playroom) {
      throw new ErrorResponse("Igraonica nije pronađena", 404);
    }

    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      throw new ErrorResponse("Nemate pravo da zauzmete ovaj termin", 403);
    }

    const booking = await bookingService.reserveSlot({
      slotId: timeSlot._id,
      user: null,
      payload: {
        cenaIds,
        paketId,
        usluge,
        brojDece,
        brojRoditelja,
        imeRoditelja,
        prezimeRoditelja,
        emailRoditelja,
        telefonRoditelja,
        napomena,
      },
      session,
    });

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      data: booking,
      message: `Termin je uspešno zauzet. Ukupno: ${booking.ukupnaCena} RSD`,
    });

} catch (error) {
if (session.inTransaction()) {
await session.abortTransaction();
}
next(error);
} finally {
session.endSession();
}
};

exports.manualBookInterval = async (req, res, next) => {
const session = await mongoose.startSession();

try {
session.startTransaction();

    const {
      playroomId,
      datum,
      vremeOd,
      vremeDo,
      cenaIds,
      paketId,
      usluge,
      brojDece,
      brojRoditelja,
      imeRoditelja,
      prezimeRoditelja,
      emailRoditelja,
      telefonRoditelja,
      napomena,
    } = req.validated.body;

    const playroom = await Playroom.findById(playroomId).session(session);

    if (!playroom) {
      throw new ErrorResponse("Igraonica nije pronađena", 404);
    }

    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      throw new ErrorResponse(
        "Nemate pravo da ručno rezervišete za ovu igraonicu",
        403,
      );
    }

    const booking = await bookingService.reserveCustomInterval({
      playroomId,
      datum,
      vremeOd,
      vremeDo,
      user: null,
      payload: {
        cenaIds,
        paketId,
        usluge,
        brojDece,
        brojRoditelja,
        imeRoditelja,
        prezimeRoditelja,
        emailRoditelja,
        telefonRoditelja,
        napomena,
      },
      session,
    });

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      data: booking,
      message: "Termin je uspešno ručno zauzet.",
    });

} catch (error) {
if (session.inTransaction()) {
await session.abortTransaction();
}
next(error);
} finally {
session.endSession();
}
};

==================================================
FILE: generateTimeSlots.js
==================================================
const TimeSlot = require("../models/TimeSlot");
const Playroom = require("../models/Playroom");
const PLAYROOM_STATUS = require("../constants/playroomStatus");

const DAY_MAP = {
monday: "ponedeljak",
tuesday: "utorak",
wednesday: "sreda",
thursday: "cetvrtak",
friday: "petak",
saturday: "subota",
sunday: "nedelja",
};

const DEFAULT_CAPACITY = 20;
const DEFAULT_PRICE = 800;

const getStartOfDay = (date) => {
const d = new Date(date);
d.setHours(0, 0, 0, 0);
return d;
};

const getEndOfDay = (date) => {
const d = new Date(date);
d.setHours(23, 59, 59, 999);
return d;
};

const getDateKey = (date) => {
return getStartOfDay(date).toISOString().split("T")[0];
};

const parseTimeToMinutes = (time = "") => {
const [hours, minutes] = String(time)
.split(":")
.map((v) => parseInt(v, 10));
if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
return hours \* 60 + minutes;
};

const formatMinutesToTime = (minutes) => {
const h = Math.floor(minutes / 60);
const m = minutes % 60;
return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const getSlotSettings = (playroom) => {
const slotDuration = Number(playroom?.trajanjeTermina) || 60;
const prepDuration = Number(playroom?.vremePripremeTermina) || 0;
const slotStep = slotDuration + prepDuration;

return {
slotDuration,
prepDuration,
slotStep,
};
};

const getWorkingHoursForDate = (playroom, date) => {
const weekday = date
.toLocaleDateString("en-US", { weekday: "long" })
.toLowerCase();

const dayKey = DAY_MAP[weekday];
const radnoVreme = playroom.radnoVreme?.[dayKey];

if (!radnoVreme) {
return { works: false, reason: "Nema radnog vremena" };
}

if (radnoVreme.radi === false) {
return { works: false, reason: "Neradni dan" };
}

if (!radnoVreme.od || !radnoVreme.do) {
return { works: false, reason: "Nedostaje od/do" };
}

const startMinutes = parseTimeToMinutes(radnoVreme.od);
const endMinutes = parseTimeToMinutes(radnoVreme.do);

if (
startMinutes === null ||
endMinutes === null ||
startMinutes >= endMinutes
) {
return { works: false, reason: "Neispravno radno vreme" };
}

return {
works: true,
startMinutes,
endMinutes,
};
};

const buildExpectedSlotsForDate = (playroom, date) => {
const workingHours = getWorkingHoursForDate(playroom, date);

if (!workingHours.works) return [];

const { slotDuration, slotStep } = getSlotSettings(playroom);
const slots = [];

for (
let current = workingHours.startMinutes;
current + slotDuration <= workingHours.endMinutes;
current += slotStep
) {
const vremeOd = formatMinutesToTime(current);
const vremeDo = formatMinutesToTime(current + slotDuration);

    slots.push({
      datum: getStartOfDay(date),
      vremeOd,
      vremeDo,
      key: `${getDateKey(date)}_${vremeOd}_${vremeDo}`,
    });

}

return slots;
};

const createSlotPayload = (playroom, date, vremeOd, vremeDo) => ({
playroomId: playroom.\_id,
datum: getStartOfDay(date),
vremeOd,
vremeDo,

cena: playroom.osnovnaCena ?? DEFAULT_PRICE,
zauzeto: false,
aktivno: true,
vanRadnogVremena: false,
napomenaAdmin: "",
});

/\*\*

- Generiši termine za jednu igraonicu za narednih N dana
  \*/
  const generateTimeSlotsForPlayroom = async (playroomId, days = 30) => {
  try {
  const playroom = await Playroom.findById(playroomId);
  if (!playroom) {
  return {
  createdCount: 0,
  existingCount: 0,
  skippedDays: 0,
  error: "Igraonica nije pronađena",
  };
  }

      if (!playroom.radnoVreme) {
        return {
          createdCount: 0,
          existingCount: 0,
          skippedDays: 0,
          error: "Nema definisano radno vreme",
        };
      }

      const startDate = getStartOfDay(new Date());
      const endDate = getEndOfDay(
        new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000),
      );

      let createdCount = 0;
      let existingCount = 0;
      let skippedDays = 0;

      for (
        let d = new Date(startDate);
        d <= endDate;
        d.setDate(d.getDate() + 1)
      ) {
        const currentDate = new Date(d);
        const expectedSlots = buildExpectedSlotsForDate(playroom, currentDate);

        if (expectedSlots.length === 0) {
          skippedDays++;
          continue;
        }

        const startOfDay = getStartOfDay(currentDate);
        const endOfDay = getEndOfDay(currentDate);

        const existingSlots = await TimeSlot.find({
          playroomId: playroom._id,
          datum: { $gte: startOfDay, $lte: endOfDay },
        }).select("_id vremeOd vremeDo");

        const existingKeys = new Set(
          existingSlots.map(
            (slot) =>
              `${getDateKey(currentDate)}_${slot.vremeOd}_${slot.vremeDo}`,
          ),
        );

        for (const slotData of expectedSlots) {
          if (existingKeys.has(slotData.key)) {
            existingCount++;
            continue;
          }

          try {
            await TimeSlot.create(
              createSlotPayload(
                playroom,
                currentDate,
                slotData.vremeOd,
                slotData.vremeDo,
              ),
            );
            createdCount++;
          } catch (err) {
            if (err.code === 11000) {
              existingCount++;
            } else {
              throw err;
            }
          }
        }
      }

      return {
        createdCount,
        existingCount,
        skippedDays,
      };

  } catch (error) {
  console.error("Greška pri generisanju termina:", error);
  return {
  createdCount: 0,
  existingCount: 0,
  skippedDays: 0,
  error: error.message,
  };
  }
  };

/\*\*

- Generiši termine za sve verifikovane igraonice
  \*/
  const generateAllTimeSlots = async (days = 30) => {
  try {
  const playrooms = await Playroom.find({
  verifikovan: true,
  status: PLAYROOM_STATUS.AKTIVAN,
  });

      if (playrooms.length === 0) {
        return { totalCreated: 0, totalExisting: 0, results: [] };
      }

      let totalCreated = 0;
      let totalExisting = 0;
      const results = [];

      for (const playroom of playrooms) {
        const result = await generateTimeSlotsForPlayroom(playroom._id, days);

        totalCreated += result.createdCount || 0;
        totalExisting += result.existingCount || 0;

        results.push({
          playroomId: playroom._id,
          naziv: playroom.naziv,
          ...result,
        });
      }

      return { totalCreated, totalExisting, results };

  } catch (error) {
  console.error("Greška pri generisanju termina za sve igraonice:", error);
  return {
  totalCreated: 0,
  totalExisting: 0,
  error: error.message,
  results: [],
  };
  }
  };

/\*\*

- Obriši sve termine za igraonicu bez aktivnih rezervacija
  \*/
  const deleteAllTimeSlotsForPlayroom = async (playroomId) => {
  try {
  const result = await TimeSlot.deleteMany({
  playroomId,
  zauzeto: false,
  aktivno: false,
  });

      return { deletedCount: result.deletedCount };

  } catch (error) {
  console.error("Greška pri brisanju termina:", error);
  return { error: error.message };
  }
  };

/\*\*

- Resetuj termine za igraonicu (samo slotovi bez rezervacija)
  \*/
  const resetTimeSlotsForPlayroom = async (playroomId, days = 30) => {
  try {
  await deleteAllTimeSlotsForPlayroom(playroomId);
  return await generateTimeSlotsForPlayroom(playroomId, days);
  } catch (error) {
  console.error("Greška pri resetovanju termina:", error);
  return { error: error.message };
  }
  };

/\*\*

- Generiši termine samo za jedan dan
  \*/
  const generateTimeSlotsForDay = async (playroomId, datum) => {
  try {
  const playroom = await Playroom.findById(playroomId);
  if (!playroom) {
  return {
  createdCount: 0,
  existingCount: 0,
  error: "Igraonica nije pronađena",
  };
  }

      const targetDate = getStartOfDay(new Date(datum));
      const expectedSlots = buildExpectedSlotsForDate(playroom, targetDate);

      if (expectedSlots.length === 0) {
        return {
          createdCount: 0,
          existingCount: 0,
          message: "Igraonica ne radi ovog dana",
        };
      }

      const startOfDay = getStartOfDay(targetDate);
      const endOfDay = getEndOfDay(targetDate);

      const existingSlots = await TimeSlot.find({
        playroomId,
        datum: { $gte: startOfDay, $lte: endOfDay },
      }).select("_id vremeOd vremeDo");

      const existingKeys = new Set(
        existingSlots.map(
          (slot) => `${getDateKey(targetDate)}_${slot.vremeOd}_${slot.vremeDo}`,
        ),
      );

      let createdCount = 0;
      let existingCount = 0;

      for (const slotData of expectedSlots) {
        if (existingKeys.has(slotData.key)) {
          existingCount++;
          continue;
        }

        try {
          await TimeSlot.create(
            createSlotPayload(
              playroom,
              targetDate,
              slotData.vremeOd,
              slotData.vremeDo,
            ),
          );
          createdCount++;
        } catch (err) {
          if (err.code === 11000) {
            existingCount++;
          } else {
            throw err;
          }
        }
      }

      return {
        createdCount,
        existingCount,
        message: `Generisano ${createdCount} termina za ${datum}`,
      };

  } catch (error) {
  console.error("Greška pri generisanju termina za dan:", error);
  return { error: error.message };
  }
  };

/\*\*

- Sinhronizuj termine sa radnim vremenom bez brisanja slotova sa rezervacijama
  \*/
  const syncTimeSlotsWithWorkingHours = async (playroomId, days = 30) => {
  try {
  const playroom = await Playroom.findById(playroomId);
  if (!playroom) {
  return { success: false, message: "Igraonica nije pronađena" };
  }

      const startDate = getStartOfDay(new Date());
      const endDate = getEndOfDay(
        new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000),
      );

      const expectedKeys = new Set();

      let createdCount = 0;
      let deactivatedCount = 0;
      let conflictCount = 0;
      let reactivatedCount = 0;

      for (
        let d = new Date(startDate);
        d <= endDate;
        d.setDate(d.getDate() + 1)
      ) {
        const currentDate = new Date(d);
        const expectedSlots = buildExpectedSlotsForDate(playroom, currentDate);

        for (const slotData of expectedSlots) {
          expectedKeys.add(slotData.key);
        }

        const startOfDay = getStartOfDay(currentDate);
        const endOfDay = getEndOfDay(currentDate);

        const existingSlots = await TimeSlot.find({
          playroomId,
          datum: { $gte: startOfDay, $lte: endOfDay },
        });

        const existingMap = new Map(
          existingSlots.map((slot) => [
            `${getDateKey(currentDate)}_${slot.vremeOd}_${slot.vremeDo}`,
            slot,
          ]),
        );

        for (const slotData of expectedSlots) {
          const existingSlot = existingMap.get(slotData.key);

          if (!existingSlot) {
            try {
              await TimeSlot.create(
                createSlotPayload(
                  playroom,
                  currentDate,
                  slotData.vremeOd,
                  slotData.vremeDo,
                ),
              );
              createdCount++;
            } catch (err) {
              if (err.code === 11000) {
                // slot je u međuvremenu već kreiran
              } else {
                throw err;
              }
            }
            continue;
          }

          const updates = {};
          let shouldUpdate = false;

          if (existingSlot.aktivno === false) {
            updates.aktivno = true;
            shouldUpdate = true;
          }

          if (existingSlot.vanRadnogVremena === true) {
            updates.vanRadnogVremena = false;
            shouldUpdate = true;
          }

          if (existingSlot.napomenaAdmin) {
            updates.napomenaAdmin = "";
            shouldUpdate = true;
          }

          if (
            (existingSlot.maxDece || 0) !==
            (playroom.kapacitet?.deca || DEFAULT_CAPACITY)
          ) {
            updates.maxDece = playroom.kapacitet?.deca || DEFAULT_CAPACITY;
            shouldUpdate = true;
          }

          if (
            (existingSlot.cena || 0) !== (playroom.osnovnaCena ?? DEFAULT_PRICE)
          ) {
            updates.cena = playroom.osnovnaCena ?? DEFAULT_PRICE;
            shouldUpdate = true;
          }

          if (shouldUpdate) {
            await TimeSlot.findByIdAndUpdate(existingSlot._id, updates);
            reactivatedCount++;
          }
        }
      }

      const allSlotsInRange = await TimeSlot.find({
        playroomId,
        datum: { $gte: startDate, $lte: endDate },
      });

      for (const slot of allSlotsInRange) {
        const slotKey = `${getDateKey(slot.datum)}_${slot.vremeOd}_${slot.vremeDo}`;
        const shouldExist = expectedKeys.has(slotKey);

        if (shouldExist) continue;

        if (slot.zauzeto) {
          await TimeSlot.findByIdAndUpdate(slot._id, {
            vanRadnogVremena: true,
            napomenaAdmin:
              "Slot je van novog radnog vremena, ali ima postojeću rezervaciju.",
          });
          conflictCount++;
        } else {
          await TimeSlot.findByIdAndUpdate(slot._id, {
            aktivno: false,
            vanRadnogVremena: true,
            napomenaAdmin: "Slot deaktiviran zbog promene radnog vremena.",
          });
          deactivatedCount++;
        }
      }

      return {
        success: true,
        createdCount,
        deactivatedCount,
        conflictCount,
        reactivatedCount,
      };

  } catch (error) {
  console.error("Greška pri sinhronizaciji termina:", error);
  return {
  success: false,
  message: error.message,
  };
  }
  };

module.exports = {
generateTimeSlotsForPlayroom,
generateAllTimeSlots,
deleteAllTimeSlotsForPlayroom,
resetTimeSlotsForPlayroom,
generateTimeSlotsForDay,
syncTimeSlotsWithWorkingHours,
};
