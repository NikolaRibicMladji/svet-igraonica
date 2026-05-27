require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Playroom = require("../models/Playroom");
const TimeSlot = require("../models/TimeSlot");
const ROLES = require("../constants/roles");

const PASSWORD = "Test12345!";
const DAYS_TO_SEED = 14;

const radnoVreme = {
  ponedeljak: { radi: true, od: "10:00", do: "20:00" },
  utorak: { radi: true, od: "10:00", do: "20:00" },
  sreda: { radi: true, od: "10:00", do: "20:00" },
  cetvrtak: { radi: true, od: "10:00", do: "20:00" },
  petak: { radi: true, od: "10:00", do: "20:00" },
  subota: { radi: true, od: "10:00", do: "20:00" },
  nedelja: { radi: true, od: "12:00", do: "18:00" },
};

const dayKeys = [
  "nedelja",
  "ponedeljak",
  "utorak",
  "sreda",
  "cetvrtak",
  "petak",
  "subota",
];

const cities = [
  "Beograd",
  "Novi Sad",
  "Niš",
  "Kragujevac",
  "Subotica",
  "Zrenjanin",
  "Pančevo",
  "Čačak",
  "Kraljevo",
  "Leskovac",
];

const timeToMinutes = (time) => {
  const [hours, minutes] = String(time).split(":").map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

const getSeedDate = (daysFromToday) => {
  const date = new Date();

  date.setDate(date.getDate() + daysFromToday);
  date.setHours(0, 0, 0, 0);

  return date;
};

const createFixedSlotsForPlayroom = async (playroom) => {
  if (playroom.rezimRezervacije !== "fiksno") {
    return;
  }

  const slots = [];

  for (let dayOffset = 0; dayOffset < DAYS_TO_SEED; dayOffset += 1) {
    const datum = getSeedDate(dayOffset);
    const dayKey = dayKeys[datum.getDay()];
    const workingDay = playroom.radnoVreme?.[dayKey];

    if (!workingDay?.radi || !workingDay?.od || !workingDay?.do) {
      continue;
    }

    const start = timeToMinutes(workingDay.od);
    const end = timeToMinutes(workingDay.do);
    const duration = Number(playroom.trajanjeTermina) || 120;
    const prep = Number(playroom.vremePripremeTermina) || 0;
    const step = duration + prep;

    for (let current = start; current + duration <= end; current += step) {
      const vremeOd = minutesToTime(current);
      const vremeDo = minutesToTime(current + duration);

      slots.push({
        playroomId: playroom._id,
        datum,
        vremeOd,
        vremeDo,
        zauzeto: false,
        aktivno: true,
        cena: Number(playroom.cene?.[0]?.cena) || 8000,
        vanRadnogVremena: false,
        napomenaAdmin: "Seed termin",
      });
    }
  }

  if (slots.length > 0) {
    await TimeSlot.insertMany(slots, { ordered: false });
  }
};

const createSeedData = async () => {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (let i = 1; i <= 10; i += 1) {
    const ownerEmail = `seed-vlasnik${i}@test.com`;
    const playroomEmail = `seed-igraonica${i}@test.com`;
    const city = cities[i - 1];

    const owner = await User.create({
      ime: `Vlasnik ${i}`,
      prezime: "Seed",
      email: ownerEmail,
      password: passwordHash,
      telefon: `06100000${String(i).padStart(2, "0")}`,
      role: ROLES.VLASNIK || "vlasnik",
      acceptedTerms: true,
      acceptedTermsAt: new Date(),
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });

    const playroom = await Playroom.create({
      vlasnikId: owner._id,
      naziv: `Seed Igraonica ${i}`,
      adresa: `Seed Adresa ${i}`,
      grad: city,
      opis: "Test igraonica kreirana seed skriptom za proveru liste, filtera, detalja i booking flow-a.",
      kontaktTelefon: `+38164111${String(i).padStart(4, "0")}`,
      kontaktEmail: playroomEmail,

      radnoVreme,

      rezimRezervacije: i % 2 === 0 ? "fleksibilno" : "fiksno",
      trajanjeTermina: 120,
      vremePripremeTermina: i % 3 === 0 ? 15 : 0,

      kapacitet: {
        deca: 20 + i,
        roditelji: 10 + i,
      },

      cene: [
        {
          naziv: "Prostor",
          cena: 8000 + i * 500,
          tip: "fiksno",
          opis: "Osnovni zakup prostora.",
        },
        {
          naziv: "Dete",
          cena: 500,
          tip: "po_osobi",
          opis: "Cena po detetu.",
        },
      ],

      paketi: [
        {
          naziv: "Rođendanski paket",
          cena: 15000 + i * 700,
          tip: "fiksno",
          opis: "Paket za proslavu rođendana.",
        },
      ],

      dodatneUsluge: [
        {
          naziv: "Animator",
          cena: 4000,
          tip: "fiksno",
          opis: "Animator za decu.",
        },
        {
          naziv: "Fotograf",
          cena: 3000,
          tip: "fiksno",
          opis: "Fotografisanje događaja.",
        },
      ],

      besplatnePogodnosti: ["WiFi", "Parking", "Klima", "Toalet"],

      profilnaSlika: {
        url: `https://picsum.photos/seed/svet-igraonica-${i}/900/600`,
        publicId: `seed/profile-${i}`,
      },

      slike: [
        {
          url: `https://picsum.photos/seed/svet-galerija-${i}-1/900/600`,
          publicId: `seed/gallery-${i}-1`,
          width: 900,
          height: 600,
          size: 0,
          format: "jpg",
        },
      ],

      videoGalerija: [],

      drustveneMreze: {
        instagram: "",
        facebook: "",
        tiktok: "",
        website: "",
      },

      verifikovan: true,
      status: "aktivan",
      rating: Number((3.5 + (i % 5) * 0.3).toFixed(1)),
      reviewCount: i % 4,
    });

    await createFixedSlotsForPlayroom(playroom);
  }
};

const run = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI nije podešen u .env fajlu.");
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected");

    const seedPlayrooms = await Playroom.find({
      kontaktEmail: /^seed-igraonica\d+@test\.com$/,
    }).select("_id");

    const seedPlayroomIds = seedPlayrooms.map((playroom) => playroom._id);

    if (seedPlayroomIds.length > 0) {
      await TimeSlot.deleteMany({
        playroomId: { $in: seedPlayroomIds },
      });
    }

    await Playroom.deleteMany({
      kontaktEmail: /^seed-igraonica\d+@test\.com$/,
    });

    await User.deleteMany({
      email: /^seed-vlasnik\d+@test\.com$/,
    });

    await createSeedData();

    console.log("Seed gotovo:");
    console.log("- 10 vlasnika");
    console.log("- 10 igraonica");
    console.log("- fiksni slotovi za narednih 14 dana");
    console.log(`Password za sve seed vlasnike: ${PASSWORD}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Seed greška:", error);

    await mongoose.disconnect();
    process.exit(1);
  }
};

run();
