const { z } = require("zod");

const PHONE_REGEX = /^\+?[0-9]+$/;
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

const REQUIRED_PRICE_MESSAGE = "Morate dodati bar jednu cenu ili jedan paket";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "ID nije validan");

const phoneSchema = z
  .string()
  .trim()
  .max(30, "Telefon je predug")
  .regex(
    PHONE_REGEX,
    "Telefon može sadržati samo brojeve i opcioni + na početku",
  )
  .refine((value) => value.replace("+", "").length >= 8, {
    message: "Telefon mora imati bar 8 cifara",
  });

const priceTypeSchema = z.enum(["fiksno", "po_osobi", "po_satu"]);

const priceItemSchema = z.object({
  naziv: z.string().trim().min(1, "Naziv je obavezan").max(100),
  cena: z.coerce.number().min(0, "Cena ne može biti negativna"),
  tip: priceTypeSchema.default("fiksno"),
  opis: z.string().trim().max(500).optional().default(""),
});

const TIME_REGEX = /^([01]\d|2[0-3]):(00|15|30|45)$/;

const workingDaySchema = z
  .object({
    od: z
      .union([
        z.string().trim().regex(TIME_REGEX, "Vreme od nije validno"),
        z.literal(""),
      ])
      .optional()
      .default(""),

    do: z
      .union([
        z.string().trim().regex(TIME_REGEX, "Vreme do nije validno"),
        z.literal(""),
      ])
      .optional()
      .default(""),
    radi: z.boolean().default(true),
  })
  .refine((data) => !data.radi || (data.od && data.do), {
    message: "Radno vreme mora imati vreme od i do",
  })
  .refine(
    (data) => {
      if (!data.radi) {
        return true;
      }

      return data.od < data.do;
    },
    {
      message: "Vreme od mora biti pre vremena do",
    },
  );

const radnoVremeSchema = z.object({
  ponedeljak: workingDaySchema.optional(),
  utorak: workingDaySchema.optional(),
  sreda: workingDaySchema.optional(),
  cetvrtak: workingDaySchema.optional(),
  petak: workingDaySchema.optional(),
  subota: workingDaySchema.optional(),
  nedelja: workingDaySchema.optional(),
});

const optionalUrlSchema = z
  .union([z.string().trim().url("URL nije validan"), z.literal("")])
  .optional()
  .default("");

const socialLinksSchema = z
  .object({
    instagram: optionalUrlSchema,
    facebook: optionalUrlSchema,
    tiktok: optionalUrlSchema,
    website: optionalUrlSchema,
  })
  .optional()
  .default({});

const basePlayroomBodySchema = z.object({
  naziv: z.string().trim().min(2, "Naziv je obavezan").max(150),
  adresa: z.string().trim().min(2, "Adresa je obavezna").max(200),
  grad: z.string().trim().min(2, "Grad je obavezan").max(100),
  opis: z.string().trim().min(10, "Opis mora imati bar 10 karaktera").max(3000),

  kontaktTelefon: phoneSchema,

  kontaktEmail: z
    .string()
    .trim()
    .toLowerCase()
    .regex(EMAIL_REGEX, "Kontakt email nije validan"),

  rezimRezervacije: z.enum(["fleksibilno", "fiksno"], {
    required_error: "Način rezervacije je obavezan",
  }),

  trajanjeTermina: z.coerce
    .number()
    .refine(
      (value) => [60, 90, 120, 150, 180, 210, 240, 270, 300].includes(value),
      {
        message: "Trajanje termina nije validno",
      },
    ),

  vremePripremeTermina: z.coerce
    .number()
    .refine(
      (value) =>
        [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60].includes(value),
      {
        message: "Vreme pripreme termina nije validno",
      },
    ),

  kapacitet: z
    .object({
      deca: z.coerce.number().min(0, "Kapacitet dece ne može biti negativan"),
      roditelji: z.coerce
        .number()
        .min(0, "Kapacitet roditelja ne može biti negativan"),
    })
    .default({ deca: 0, roditelji: 0 }),

  cene: z.array(priceItemSchema).max(50, "Maksimalno 50 cena"),
  paketi: z.array(priceItemSchema).max(50, "Maksimalno 50 paketa"),
  dodatneUsluge: z
    .array(priceItemSchema)
    .max(50, "Maksimalno 50 dodatnih usluga"),

  besplatnePogodnosti: z
    .array(z.string().trim().min(1).max(100))
    .max(50, "Maksimalno 50 pogodnosti")
    .optional()
    .default([]),

  drustveneMreze: socialLinksSchema,
  radnoVreme: radnoVremeSchema.optional().default({}),
});

const createPlayroomBodySchema = basePlayroomBodySchema
  .strict()
  .refine((data) => data.cene.length > 0 || data.paketi.length > 0, {
    message: REQUIRED_PRICE_MESSAGE,
    path: ["cenePaketi"],
  });

const updatePlayroomBodySchema = basePlayroomBodySchema
  .partial()
  .strict()
  .refine(
    (data) => {
      if (
        !Object.prototype.hasOwnProperty.call(data, "cene") &&
        !Object.prototype.hasOwnProperty.call(data, "paketi")
      ) {
        return true;
      }

      const cene = data.cene || [];
      const paketi = data.paketi || [];

      return cene.length > 0 || paketi.length > 0;
    },
    {
      message: REQUIRED_PRICE_MESSAGE,
      path: ["cenePaketi"],
    },
  );

const createPlayroomSchema = z.object({
  body: createPlayroomBodySchema,
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const updatePlayroomSchema = z.object({
  body: updatePlayroomBodySchema,
  params: z.object({
    id: objectIdSchema,
  }),
  query: z.object({}).optional(),
});

const deactivatePlayroomSchema = z.object({
  body: z
    .object({
      password: z
        .string()
        .min(1, "Lozinka je obavezna")
        .max(128, "Lozinka je predugačka"),
    })
    .strict(),

  params: z.object({
    id: objectIdSchema,
  }),

  query: z.object({}).optional(),
});

const playroomIdParamSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: objectIdSchema,
  }),
  query: z.object({}).optional(),
});

const playroomListQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    grad: z.string().trim().max(100).optional(),
    search: z.string().trim().max(100).optional(),
    sortBy: z.enum(["newest", "rating"]).optional().default("newest"),
    minRating: z
      .union([z.literal("sve"), z.coerce.number().int().min(1).max(5)])
      .optional()
      .default("sve"),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(50).optional().default(12),
  }),
});

module.exports = {
  createPlayroomSchema,
  updatePlayroomSchema,
  deactivatePlayroomSchema,
  playroomIdParamSchema,
  playroomListQuerySchema,
};
