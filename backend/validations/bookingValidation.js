const { z } = require("zod");

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "ID nije validan");

const createBookingSchema = z.object({
  body: z.object({
    slotId: objectId,

    imeRoditelja: z.string().min(2, "Ime mora imati bar 2 karaktera").trim(),

    prezimeRoditelja: z
      .string()
      .min(2, "Prezime mora imati bar 2 karaktera")
      .trim(),

    emailRoditelja: z.string().email("Neispravan email").toLowerCase().trim(),

    telefonRoditelja: z
      .string()
      .min(6, "Telefon mora imati bar 6 cifara")
      .regex(/^[0-9]+$/, "Telefon može sadržati samo brojeve")
      .trim(),

    napomena: z
      .string()
      .max(500, "Napomena može imati najviše 500 karaktera")
      .optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const createGuestBookingSchema = z
  .object({
    body: z.object({
      slotId: objectId,

      ime: z.string().min(2, "Ime mora imati bar 2 karaktera").trim(),

      prezime: z.string().min(2, "Prezime mora imati bar 2 karaktera").trim(),

      email: z.string().email("Neispravan email").toLowerCase().trim(),

      telefon: z
        .string()
        .min(6, "Telefon mora imati bar 6 cifara")
        .regex(/^[0-9]+$/, "Telefon može sadržati samo brojeve")
        .trim(),

      password: z.string().min(6, "Lozinka mora imati bar 6 karaktera"),

      confirmPassword: z
        .string()
        .min(6, "Potvrda lozinke mora imati bar 6 karaktera"),

      napomena: z
        .string()
        .max(500, "Napomena može imati najviše 500 karaktera")
        .optional(),
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
    imeRoditelja: z.string().min(2),
    prezimeRoditelja: z.string().min(2),
    emailRoditelja: z.string().email(),
    telefonRoditelja: z.string().regex(/^[0-9]+$/),
    napomena: z.string().optional(),
  }),
});

module.exports = {
  createBookingSchema,
  createGuestBookingSchema,
  bookingIdParamSchema,
};
