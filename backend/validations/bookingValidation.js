const { z } = require("zod");
const { parseDateOnlyInAppTimezone } = require("../utils/dateTime");
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "ID nije validan");
const BOOKING_STATUS = require("../constants/bookingStatus");
const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const isQuarterHour = (value) => {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;

  const [hours, minutes] = value.split(":").map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return false;
  if (hours < 0 || hours > 23) return false;
  if (minutes < 0 || minutes > 59) return false;

  return [0, 15, 30, 45].includes(minutes);
};

const createBookingSchema = z
  .object({
    body: z.object({
      playroomId: objectId,
      datum: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum mora biti u formatu YYYY-MM-DD")
        .refine(
          (val) => {
            try {
              parseDateOnlyInAppTimezone(val);
              return true;
            } catch {
              return false;
            }
          },
          {
            message: "Datum nije validan",
          },
        ),
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
      brojDece: z.coerce.number().int().min(0).max(150).optional().default(0),
      brojRoditelja: z.coerce
        .number()
        .int()
        .min(0)
        .max(100)
        .optional()
        .default(0),
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
        .trim()
        .max(500, "Napomena može imati najviše 500 karaktera")
        .optional()
        .default(""),
    }),
    params: z.object({}).optional(),
    query: z.object({}).optional(),
  })
  .refine(
    (data) =>
      timeToMinutes(data.body.vremeDo) > timeToMinutes(data.body.vremeOd),
    {
      message: "Vreme završetka mora biti posle vremena početka",
      path: ["body", "vremeDo"],
    },
  );

const createGuestBookingSchema = z
  .object({
    body: z.object({
      playroomId: objectId,

      datum: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum mora biti u formatu YYYY-MM-DD")
        .refine(
          (val) => {
            try {
              parseDateOnlyInAppTimezone(val);
              return true;
            } catch {
              return false;
            }
          },
          {
            message: "Datum nije validan",
          },
        ),
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
      brojDece: z.coerce.number().int().min(0).max(150).optional().default(0),
      brojRoditelja: z.coerce
        .number()
        .int()
        .min(0)
        .max(100)
        .optional()
        .default(0),
      ime: z.string().min(2, "Ime mora imati bar 2 karaktera").trim(),
      prezime: z.string().min(2, "Prezime mora imati bar 2 karaktera").trim(),
      email: z.string().email("Neispravan email").toLowerCase().trim(),
      telefon: z
        .string()
        .min(6, "Telefon mora imati bar 6 cifara")
        .regex(/^\+?[0-9]+$/, "Telefon sadrži nedozvoljene karaktere")
        .trim(),
      password: z.string().min(8, "Lozinka mora imati najmanje 8 karaktera"),
      confirmPassword: z
        .string()
        .min(8, "Lozinka mora imati najmanje 8 karaktera"),
      napomena: z
        .string()
        .trim()
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
  })
  .refine(
    (data) =>
      timeToMinutes(data.body.vremeDo) > timeToMinutes(data.body.vremeOd),
    {
      message: "Vreme završetka mora biti posle vremena početka",
      path: ["body", "vremeDo"],
    },
  );
const bookingIdParamSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: objectId,
  }),
  query: z.object({}).optional(),
});

const manualBookingSchema = z
  .object({
    body: z.object({
      playroomId: objectId,
      datum: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum mora biti u formatu YYYY-MM-DD")
        .refine(
          (val) => {
            try {
              parseDateOnlyInAppTimezone(val);
              return true;
            } catch {
              return false;
            }
          },
          {
            message: "Datum nije validan",
          },
        ),
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
      brojDece: z.coerce.number().int().min(0).max(150).optional().default(0),
      brojRoditelja: z.coerce
        .number()
        .int()
        .min(0)
        .max(100)
        .optional()
        .default(0),
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
        .trim()
        .max(500, "Napomena može imati najviše 500 karaktera")
        .optional()
        .default(""),
    }),
    params: z.object({}).optional(),
    query: z.object({}).optional(),
  })
  .refine(
    (data) =>
      timeToMinutes(data.body.vremeDo) > timeToMinutes(data.body.vremeOd),
    {
      message: "Vreme završetka mora biti posle vremena početka",
      path: ["body", "vremeDo"],
    },
  );

const bookingListQuerySchema = z.object({
  body: z.object({}).optional(),

  params: z.object({}).optional(),

  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),

    limit: z.coerce.number().int().min(1).max(100).optional().default(10),

    status: z.enum(Object.values(BOOKING_STATUS)).optional(),

    datumOd: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine(
        (val) => {
          try {
            parseDateOnlyInAppTimezone(val);
            return true;
          } catch {
            return false;
          }
        },
        {
          message: "datumOd nije validan",
        },
      )
      .optional(),

    datumDo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine(
        (val) => {
          try {
            parseDateOnlyInAppTimezone(val);
            return true;
          } catch {
            return false;
          }
        },
        {
          message: "datumDo nije validan",
        },
      )
      .optional(),

    playroomId: objectId.optional(),
  }),
});

module.exports = {
  createBookingSchema,
  createGuestBookingSchema,
  bookingIdParamSchema,
  manualBookingSchema,
  bookingListQuerySchema,
};
