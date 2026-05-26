const { z } = require("zod");
const { parseDateOnlyInAppTimezone } = require("../utils/dateTime");

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "ID nije validan");

const timeRegex = /^([01]\d|2[0-3]):(00|15|30|45)$/;

const timeToMinutes = (time) => {
  const [hour, minute] = String(time).split(":").map(Number);
  return hour * 60 + minute;
};

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum mora biti u formatu YYYY-MM-DD")
  .refine(
    (value) => {
      try {
        parseDateOnlyInAppTimezone(value);
        return true;
      } catch {
        return false;
      }
    },
    {
      message: "Datum nije validan",
    },
  );

const timeSchema = z
  .string()
  .regex(timeRegex, "Vreme mora biti u formatu HH:mm i na 00/15/30/45");

const phoneSchema = z
  .string()
  .trim()
  .max(30, "Telefon je predug")
  .regex(
    /^\+?[0-9]+$/,
    "Telefon može sadržati samo brojeve i opcioni + na početku",
  )
  .refine((value) => value.replace("+", "").length >= 8, {
    message: "Telefon mora imati bar 8 cifara",
  });

const createTimeSlotSchema = z
  .object({
    body: z
      .object({
        playroomId: objectId,

        datum: dateOnlySchema,

        vremeOd: timeSchema,

        vremeDo: timeSchema,

        cena: z.coerce
          .number({
            required_error: "Cena je obavezna",
            invalid_type_error: "Cena mora biti broj",
          })
          .min(0, "Cena ne može biti negativna"),
      })
      .strict(),

    params: z.object({}).optional(),
    query: z.object({}).optional(),
  })
  .refine(
    (data) =>
      timeToMinutes(data.body.vremeDo) > timeToMinutes(data.body.vremeOd),
    {
      message: "vremeDo mora biti posle vremeOd",
      path: ["body", "vremeDo"],
    },
  );

const updateTimeSlotSchema = z.object({
  body: z
    .object({
      cena: z.coerce.number().min(0, "Cena ne može biti negativna").optional(),
      aktivno: z.boolean().optional(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: "Moraš poslati bar jedno polje za izmenu",
    }),

  params: z.object({
    id: objectId,
  }),

  query: z.object({}).optional(),
});

const manualBookTimeSlotSchema = z.object({
  body: z
    .object({
      cenaIds: z
        .array(objectId)
        .max(20, "Previše izabranih cena")
        .optional()
        .default([]),

      paketId: objectId.nullable().optional().default(null),

      usluge: z
        .array(objectId)
        .max(30, "Previše izabranih usluga")
        .optional()
        .default([]),

      brojDece: z.coerce.number().int().min(0).max(150).optional().default(0),

      brojRoditelja: z.coerce
        .number()
        .int()
        .min(0)
        .max(150)
        .optional()
        .default(0),

      imeRoditelja: z
        .string()
        .trim()
        .min(2, "Ime mora imati bar 2 karaktera")
        .max(100, "Ime je predugo"),

      prezimeRoditelja: z
        .string()
        .trim()
        .min(2, "Prezime mora imati bar 2 karaktera")
        .max(100, "Prezime je predugo"),

      emailRoditelja: z.string().trim().toLowerCase().email("Neispravan email"),

      telefonRoditelja: phoneSchema,

      napomena: z
        .string()
        .trim()
        .max(500, "Napomena može imati najviše 500 karaktera")
        .optional()
        .default(""),
    })
    .strict()
    .refine((data) => data.cenaIds.length > 0 || Boolean(data.paketId), {
      message: "Morate izabrati cenu ili paket",
      path: ["cenaIds"],
    }),

  params: z.object({
    id: objectId,
  }),

  query: z.object({}).optional(),
});

const playroomDateQuerySchema = z.object({
  body: z.object({}).optional(),

  params: z.object({
    playroomId: objectId,
  }),

  query: z.object({
    datum: dateOnlySchema,
  }),
});

const timeSlotIdParamSchema = z.object({
  body: z.object({}).optional(),

  params: z.object({
    id: objectId,
  }),

  query: z.object({}).optional(),
});

const playroomIdParamSchema = z.object({
  body: z.object({}).optional(),

  params: z.object({
    playroomId: objectId,
  }),

  query: z.object({}).optional(),
});

module.exports = {
  createTimeSlotSchema,
  updateTimeSlotSchema,
  manualBookTimeSlotSchema,
  playroomDateQuerySchema,
  timeSlotIdParamSchema,
  playroomIdParamSchema,
};
