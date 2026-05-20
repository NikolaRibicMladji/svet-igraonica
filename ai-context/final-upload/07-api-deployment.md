==================================================
api-response-rules
==================================================

# API & Response Rules

## Opšta API Pravila

API mora biti:

- konzistentan
- predvidiv
- siguran
- validiran
- production-ready

Svi endpointi:

- koriste validation middleware
- imaju proper status codes
- imaju konzistentan response format

## Response Format

Uspešan response:

```json
{
  "success": true,
  "message": "Poruka",
  "data": {}
}
```

Error response:

```json
{
  "success": false,
  "message": "Greška",
  "errors": []
}
```

## Status Codes

Koristiti:

- 200 OK
- 201 Created
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 409 Conflict
- 422 Validation Error
- 500 Internal Server Error

Ne koristiti:

- random status kodove
- 200 za error response

## Validation Pravila

Validation mora proveravati:

- body
- params
- query

Validation:

- mora biti pre controllera
- mora vraćati jasne error poruke

## Booking Endpoint Pravila

Booking endpoint:

- mora proveravati preklapanje
- mora proveravati availability
- mora proveravati preparation time
- mora koristiti transaction/session

## Auth Endpoint Pravila

Auth endpointi:

- ne vraćaju sensitive podatke
- koriste secure cookie
- koriste refresh rotation

## Error Handling

Sve greške:

- prolaze kroz centralizovan error middleware

Ne vraćati:

- stack trace
- Mongo interne greške
- sensitive podatke

## Database Pravila

Koristiti:

- optimized queries
- indexes
- lean() gde ima smisla

Izbegavati:

- N+1 problem
- nepotrebne populate pozive

## Frontend API Pravila

Frontend koristi:

- centralizovan api.js
- axios instance
- interceptor
- withCredentials true

API pozivi:

- ne smeju biti razbacani svuda

## Loading & Error State

Frontend mora imati:

- loading state
- error state
- retry gde ima smisla

## Zabranjeno

Ne sme:

- direktni fetch svuda
- raw req.body korišćenje
- nevalidirani input
- nekonzistentni response
- duplicated API logic

==================================================
database-performance-rules
==================================================

# Database & Performance Rules

## Database Pravila

Koristi:

- MongoDB
- Mongoose

Svi modeli moraju:

- imati validaciju
- imati proper indekse
- koristiti semantic naming

## Index Pravila

Obavezno koristiti indekse za:

- booking pretrage
- datume
- playroomId
- userId
- aktivne rezervacije

Booking sistem mora biti optimizovan za:

- proveru dostupnosti
- busy intervale
- free intervale
- owner dashboard

## Query Pravila

Koristiti:

- lean() gde nije potreban full mongoose document
- select() za ograničavanje podataka
- pagination gde ima smisla

Izbegavati:

- N+1 query problem
- nepotrebne populate pozive
- vraćanje ogromnih datasetova

## Booking Performance

Booking sistem mora:

- biti brz
- sprečiti race condition
- koristiti transaction/session za kritične operacije

Busy interval kalkulacije:

- moraju biti optimizovane
- ne smeju imati nepotrebne petlje
- ne smeju raditi ogromne query-je

## Frontend Performance

Frontend mora:

- izbegavati nepotrebne rerender-e
- koristiti memoization gde ima smisla
- koristiti lazy loading gde ima smisla

Ne raditi:

- ogromne useEffect blokove
- nepotrebne API pozive
- duplicated fetch logiku

## API Performance

API mora:

- vraćati samo potrebne podatke
- koristiti pagination
- koristiti filtering
- koristiti optimized queries

## File & Image Pravila

Slike:

- optimizovane
- kompresovane
- responsive

Ne uploadovati:

- ogromne fajlove
- neoptimizovane slike

## Scalability Pravila

Kod mora biti:

- modularan
- lako proširiv
- lako održiv

Business logika:

- centralizovana
- reusable

## Zabranjeno

Ne sme:

- duplicated database logika
- ogromni query blokovi u controllerima
- business logika u modelima
- nepotrebni populate svuda
- vraćanje svih podataka bez limita
- hardcoded query logika

==================================================
deployment-production-rules
==================================================

# Deployment & Production Rules

## Deploy Platforme

Frontend:

- Vercel

Backend:

- Render

## Frontend Env

Frontend koristi:

- REACT_APP_API_URL

Frontend:

- koristi axios
- koristi withCredentials true
- koristi Authorization Bearer token

## Backend Env

Backend koristi:

- MONGO_URI
- JWT_SECRET
- REFRESH_TOKEN_SECRET
- NODE_ENV

Nikada:

- ne hardcodovati secrets
- ne commitovati .env fajlove

## Backend Start

Backend start:

```bash
node server.js
```

Frontend start:

```bash
npm start
```

## Auth Production Pravila

Auth koristi:

- access token
- refresh token cookie
- refresh token rotation

Refresh token:

- httpOnly cookie
- secure cookie u production
- sameSite pravilno podešen

## Cookie Pravila

Production cookie:

- secure: true
- httpOnly: true

Development:

- secure false gde je potrebno lokalno

## CORS Pravila

CORS:

- mora dozvoliti frontend domen
- credentials moraju biti enabled

Koristiti:

```js
credentials: true;
```

Ne koristiti:

- wildcard origin sa credentials

## Security Middleware

Backend mora koristiti:

- helmet
- express-rate-limit
- mongo-sanitize
- xss-clean

## Production Pravila

Production kod:

- mora imati proper logging
- mora imati centralizovan error handling
- mora biti optimizovan

## Database Pravila

Mongo konekcija:

- koristiti proper error handling
- koristiti reconnect strategiju gde ima smisla

## Frontend Production Pravila

Frontend:

- ne sme imati hardcoded API URL
- ne sme imati debug console logove
- mora koristiti environment variables

## Backend Production Pravila

Backend:

- ne sme vraćati stack trace u production
- ne sme leak-ovati sensitive podatke
- mora koristiti validation middleware

## Zabranjeno

Ne sme:

- hardcoded secrets
- hardcoded API URL
- disabled security middleware
- open CORS policy
- insecure cookies
- raw production errors

==================================================
FILE: app.js
==================================================
const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const errorHandler = require("./middleware/errorMiddleware");

const app = express();

app.set("trust proxy", 1);

// Security
app.use(helmet());
app.use(mongoSanitize());
app.use(xss());

// Rate limit
const apiLimiter = rateLimit({
windowMs: 15 _ 60 _ 1000,
max: 200,
standardHeaders: true,
legacyHeaders: false,
message: {
success: false,
message: "Previše zahteva, pokušajte ponovo kasnije",
},
});

const authLimiter = rateLimit({
windowMs: 15 _ 60 _ 1000,
max: 15,
standardHeaders: true,
legacyHeaders: false,
message: {
success: false,
message:
"Previše pokušaja prijave ili registracije. Pokušajte ponovo kasnije.",
},
});

const passwordResetLimiter = rateLimit({
windowMs: 15 _ 60 _ 1000,
max: 5,
standardHeaders: true,
legacyHeaders: false,
message: {
success: false,
message: "Previše zahteva za reset lozinke. Pokušajte ponovo kasnije.",
},
});

// 🔥 REQUEST LOGGER
app.use((req, res, next) => {
req.requestId = Math.random().toString(36).substring(2, 10);

if (process.env.NODE_ENV !== "development") {
return next();
}

const start = Date.now();

console.log(
`➡️ [${req.requestId}] ${req.method} ${req.originalUrl} - ${new Date().toLocaleString("sr-RS")}`,
);

res.on("finish", () => {
const duration = Date.now() - start;

    console.log(
      `⬅️ [${req.requestId}] ${res.statusCode} ${req.method} ${req.originalUrl} (${duration}ms)`,
    );

});

next();
});
// Core middleware
app.use(cookieParser());

app.use(
cors({
origin:
process.env.NODE_ENV === "production"
? process.env.FRONTEND_URL
: "http://localhost:3000",
credentials: true,
}),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static files
app.use("/uploads", express.static(path.join(\_\_dirname, "uploads")));

// Health check
app.get("/api/health", (req, res) => {
res.status(200).json({
success: true,
message: "API radi",
});
});

// API rute
app.use("/api/auth/forgot-password", passwordResetLimiter);
app.use("/api/auth/reset-password", passwordResetLimiter);
app.use("/api/auth", authLimiter, require("./routes/authRoutes"));

app.use("/api/playrooms", apiLimiter, require("./routes/playroomRoutes"));
app.use("/api/timeslots", apiLimiter, require("./routes/timeSlotRoutes"));
app.use("/api/bookings", apiLimiter, require("./routes/bookingRoutes"));
app.use("/api/admin", apiLimiter, require("./routes/adminRoutes"));
app.use("/api/reviews", apiLimiter, require("./routes/reviewRoutes"));
app.use("/api/upload", apiLimiter, require("./routes/uploadRoutes"));
app.use("/api/temp-upload", apiLimiter, require("./routes/tempUploadRoutes"));

// Root ruta za API servis
app.get("/", (req, res) => {
res.status(200).json({
success: true,
message: `Svet igraonica API radi u ${
      process.env.NODE_ENV || "development"
    } modu!`,
});
});

// Error handler mora poslednji
app.use(errorHandler);

module.exports = app;

==================================================
FILE: server.js
==================================================
const dotenv = require("dotenv");
const path = require("path");

// Load env
dotenv.config({ path: path.join(\_\_dirname, "../.env") });

const connectDB = require("./config/db");
const app = require("./app");

const requiredEnv = [
"MONGO_URI",
"JWT_SECRET",
"REFRESH_TOKEN_SECRET",
"CLOUDINARY_CLOUD_NAME",
"CLOUDINARY_API_KEY",
"CLOUDINARY_API_SECRET",
"RESEND_API_KEY",
"EMAIL_FROM",
];

for (const key of requiredEnv) {
if (!process.env[key]) {
console.error(`❌ Nedostaje obavezna ENV promenljiva: ${key}`);
process.exit(1);
}
}

const PORT = process.env.PORT || 5000;

let server;

const startServer = async () => {
try {
await connectDB();

    // Cron (ne u testu)
    if (process.env.NODE_ENV !== "test") {
      require("./jobs/completeBookings");
      require("./jobs/emailQueueWorker");
      require("./jobs/cleanupEmailQueue");
    }

    server = app.listen(PORT, () => {
      console.log(
        `🚀 Server pokrenut na portu ${PORT} u ${
          process.env.NODE_ENV || "development"
        } modu`,
      );
    });

} catch (error) {
console.error("❌ Greška pri pokretanju servera:", error.message);
process.exit(1);
}
};

startServer();

// 🔥 GRACEFUL SHUTDOWN
process.on("unhandledRejection", (err) => {
console.error("❌ UNHANDLED REJECTION:", {
message: err.message,
stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
time: new Date().toISOString(),
});
if (server) {
server.close(() => process.exit(1));
} else {
process.exit(1);
}
});

process.on("uncaughtException", (err) => {
console.error("❌ UNCAUGHT EXCEPTION:", {
message: err.message,
stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
time: new Date().toISOString(),
});
process.exit(1);
});

==================================================
FILE: bookingRoutes.js
==================================================
const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");

const {
createBookingSchema,
createGuestBookingSchema,
bookingIdParamSchema,
} = require("../validations/bookingValidation");

const {
createBooking,
createGuestBooking,
getMyBookings,
getOwnerBookings,
cancelBooking,

getBookingById,
} = require("../controllers/bookingController");

// gost: registracija + login + rezervacija
router.post("/guest", validate(createGuestBookingSchema), createGuestBooking);

// ulogovan roditelj: standardna rezervacija
router.post("/", protect, validate(createBookingSchema), createBooking);

// sve ispod traži login
router.use(protect);

router.get("/my", getMyBookings);
router.get("/owner", getOwnerBookings);

router.get("/:id", validate(bookingIdParamSchema), getBookingById);

router.put("/:id/cancel", validate(bookingIdParamSchema), cancelBooking);

module.exports = router;

==================================================
FILE: bookingValidation.js
==================================================
const { z } = require("zod");

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "ID nije validan");

const isQuarterHour = (value) => {
if (!/^\d{2}:\d{2}$/.test(value)) return false;

const [hours, minutes] = value.split(":").map(Number);

if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return false;
if (hours < 0 || hours > 23) return false;
if (minutes < 0 || minutes > 59) return false;

return [0, 15, 30, 45].includes(minutes);
};

const createBookingSchema = z.object({
body: z.object({
playroomId: objectId,
datum: z
.string()
.regex(/^\d{4}-\d{2}-\d{2}$/, "Datum mora biti u formatu YYYY-MM-DD")
      .refine((val) => !isNaN(new Date(val).getTime()), {
        message: "Datum nije validan",
      }),
    vremeOd: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Vreme od nije validno")
.refine(isQuarterHour, "Vreme od mora biti u koracima od 15 minuta"),

    vremeDo: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Vreme do nije validno")
      .refine(isQuarterHour, "Vreme do mora biti u koracima od 15 minuta"),
    cenaIds: z.array(objectId).optional().default([]),
    paketId: objectId.nullable().optional().default(null),
    usluge: z.array(objectId).optional().default([]),
    brojDece: z.coerce.number().min(0).optional().default(0),
    brojRoditelja: z.coerce.number().min(0).optional().default(0),
    imeRoditelja: z.string().min(2, "Ime mora imati bar 2 karaktera").trim(),
    prezimeRoditelja: z
      .string()
      .min(2, "Prezime mora imati bar 2 karaktera")
      .trim(),
    emailRoditelja: z.string().email("Neispravan email").toLowerCase().trim(),
    telefonRoditelja: z
      .string()
      .min(6, "Telefon mora imati bar 6 cifara")
      .regex(/^\+?[0-9]+$/, "Telefon sadrži nedozvoljene karaktere")
      .trim(),
    napomena: z
      .string()
      .max(500, "Napomena može imati najviše 500 karaktera")
      .optional()
      .default(""),

}),
params: z.object({}).optional(),
query: z.object({}).optional(),
});

const createGuestBookingSchema = z
.object({
body: z.object({
playroomId: objectId,

      datum: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum mora biti u formatu YYYY-MM-DD")
        .refine((val) => !isNaN(new Date(val).getTime()), {
          message: "Datum nije validan",
        }),
      vremeOd: z
        .string()
        .regex(/^\d{2}:\d{2}$/, "Vreme od nije validno")
        .refine(isQuarterHour, "Vreme od mora biti u koracima od 15 minuta"),

      vremeDo: z
        .string()
        .regex(/^\d{2}:\d{2}$/, "Vreme do nije validno")
        .refine(isQuarterHour, "Vreme do mora biti u koracima od 15 minuta"),
      cenaIds: z.array(objectId).optional().default([]),
      paketId: objectId.nullable().optional().default(null),
      usluge: z.array(objectId).optional().default([]),
      brojDece: z.coerce.number().min(0).optional().default(0),
      brojRoditelja: z.coerce.number().min(0).optional().default(0),
      ime: z.string().min(2, "Ime mora imati bar 2 karaktera").trim(),
      prezime: z.string().min(2, "Prezime mora imati bar 2 karaktera").trim(),
      email: z.string().email("Neispravan email").toLowerCase().trim(),
      telefon: z
        .string()
        .min(6, "Telefon mora imati bar 6 cifara")
        .regex(/^\+?[0-9]+$/, "Telefon sadrži nedozvoljene karaktere")
        .trim(),
      password: z.string().min(6, "Lozinka mora imati bar 6 karaktera"),
      confirmPassword: z
        .string()
        .min(6, "Potvrda lozinke mora imati bar 6 karaktera"),
      napomena: z
        .string()
        .max(500, "Napomena može imati najviše 500 karaktera")
        .optional()
        .default(""),
      acceptedTerms: z.literal(true, {
        errorMap: () => ({
          message:
            "Morate prihvatiti uslove korišćenja i politiku privatnosti.",
        }),
      }),
    }),
    params: z.object({}).optional(),
    query: z.object({}).optional(),

})
.refine((data) => data.body.password === data.body.confirmPassword, {
message: "Lozinke se ne poklapaju",
path: ["body", "confirmPassword"],
});

const bookingIdParamSchema = z.object({
body: z.object({}).optional(),
params: z.object({
id: objectId,
}),
query: z.object({}).optional(),
});

const manualBookingSchema = z.object({
body: z.object({
playroomId: objectId,
datum: z.string().min(1),
vremeOd: z
.string()
.regex(/^\d{2}:\d{2}$/, "Vreme od nije validno")
      .refine(isQuarterHour, "Vreme od mora biti u koracima od 15 minuta"),
    vremeDo: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Vreme do nije validno")
.refine(isQuarterHour, "Vreme do mora biti u koracima od 15 minuta"),
cenaIds: z.array(objectId).optional().default([]),
paketId: objectId.nullable().optional().default(null),
usluge: z.array(objectId).optional().default([]),
brojDece: z.coerce.number().min(0).optional().default(0),
brojRoditelja: z.coerce.number().min(0).optional().default(0),
imeRoditelja: z.string().min(2, "Ime mora imati bar 2 karaktera").trim(),
prezimeRoditelja: z
.string()
.min(2, "Prezime mora imati bar 2 karaktera")
.trim(),
emailRoditelja: z.string().email("Neispravan email").trim().toLowerCase(),
telefonRoditelja: z
.string()
.min(6, "Telefon mora imati bar 6 cifara")
.regex(/^\+?[0-9]+$/, "Telefon sadrži nedozvoljene karaktere")
.trim(),
napomena: z
.string()
.max(500, "Napomena može imati najviše 500 karaktera")
.optional()
.default(""),
}),
params: z.object({}).optional(),
query: z.object({}).optional(),
});

module.exports = {
createBookingSchema,
createGuestBookingSchema,
bookingIdParamSchema,
manualBookingSchema,
};
