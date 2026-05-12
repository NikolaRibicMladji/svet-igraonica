const { z } = require("zod");

const PHONE_REGEX = /^\+?[0-9]+$/;
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

const phoneSchema = z
  .string()
  .trim()
  .regex(
    PHONE_REGEX,
    "Telefon može sadržati samo brojeve i opcioni + na početku",
  )
  .refine((value) => value.replace("+", "").length >= 8, {
    message: "Telefon mora imati bar 8 cifara",
  });

const priceTypeSchema = z.enum(["fiksno", "po_osobi", "po_satu"]);

const priceItemSchema = z.object({
  naziv: z.string().trim().min(1, "Naziv cene je obavezan").max(100),
  cena: z.number().min(0, "Cena ne može biti negativna"),
  tip: priceTypeSchema.default("fiksno"),
  opis: z.string().trim().max(500).optional().default(""),
});

const workingDaySchema = z
  .object({
    od: z.string().trim().optional().default(""),
    do: z.string().trim().optional().default(""),
    radi: z.boolean().default(true),
  })
  .refine((data) => !data.radi || (data.od && data.do), {
    message: "Radno vreme mora imati vreme od i do",
  });

const radnoVremeSchema = z.object({
  ponedeljak: workingDaySchema.optional(),
  utorak: workingDaySchema.optional(),
  sreda: workingDaySchema.optional(),
  cetvrtak: workingDaySchema.optional(),
  petak: workingDaySchema.optional(),
  subota: workingDaySchema.optional(),
  nedelja: workingDaySchema.optional(),
});

const imageSchema = z.object({
  url: z.string().trim().url("URL slike nije validan"),
  publicId: z.string().trim().min(1, "Public ID slike je obavezan"),
  width: z.number().optional(),
  height: z.number().optional(),
  size: z.number().optional(),
  format: z.string().trim().optional(),
});

const profileImageSchema = z
  .object({
    url: z.string().trim().optional().default(""),
    publicId: z.string().trim().optional().default(""),
  })
  .optional()
  .nullable();

const videoSchema = z.object({
  url: z
    .string()
    .trim()
    .url("URL videa nije validan")
    .optional()
    .or(z.literal("")),
  publicId: z.string().trim().optional().default(""),
  thumbnail: z.string().trim().optional().default(""),
  naziv: z.string().trim().max(150).optional().default(""),
  trajanje: z.number().min(0).optional(),
});

const socialLinksSchema = z
  .object({
    instagram: z.string().trim().max(300).optional().default(""),
    facebook: z.string().trim().max(300).optional().default(""),
    tiktok: z.string().trim().max(300).optional().default(""),
    website: z.string().trim().max(300).optional().default(""),
  })
  .optional()
  .default({});

const playroomBodySchema = z.object({
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

  rezimRezervacije: z.enum(["fleksibilno", "fiksno"]).default("fleksibilno"),

  trajanjeTermina: z.coerce
    .number()
    .refine((value) => [15, 30, 45, 60, 90, 120, 150, 180].includes(value), {
      message: "Trajanje termina nije validno",
    }),

  vremePripremeTermina: z.coerce
    .number()
    .refine((value) => [0, 5, 10, 15, 20, 25, 30].includes(value), {
      message: "Vreme pripreme termina nije validno",
    }),

  kapacitet: z
    .object({
      deca: z.coerce.number().min(0, "Kapacitet dece ne može biti negativan"),
      roditelji: z.coerce
        .number()
        .min(0, "Kapacitet roditelja ne može biti negativan"),
    })
    .default({ deca: 0, roditelji: 0 }),

  cene: z.array(priceItemSchema).optional().default([]),
  paketi: z.array(priceItemSchema).optional().default([]),
  dodatneUsluge: z.array(priceItemSchema).optional().default([]),

  besplatnePogodnosti: z
    .array(z.string().trim().min(1).max(100))
    .optional()
    .default([]),

  profilnaSlika: profileImageSchema,
  slike: z
    .array(imageSchema)
    .max(10, "Maksimalno 10 slika")
    .optional()
    .default([]),
  videoGalerija: z
    .array(videoSchema)
    .max(3, "Maksimalno 3 videa")
    .optional()
    .default([]),

  drustveneMreze: socialLinksSchema,
  radnoVreme: radnoVremeSchema.optional().default({}),
});

const createPlayroomSchema = z.object({
  body: playroomBodySchema,
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const updatePlayroomSchema = z.object({
  body: playroomBodySchema.partial(),
  params: z.object({
    id: z.string().min(1, "ID igraonice je obavezan"),
  }),
  query: z.object({}).optional(),
});

module.exports = {
  createPlayroomSchema,
  updatePlayroomSchema,
};
