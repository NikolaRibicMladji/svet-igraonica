const { z } = require("zod");

const registerSchema = z.object({
  body: z.object({
    ime: z.string().min(2, "Ime mora imati bar 2 karaktera"),
    prezime: z.string().min(2, "Prezime mora imati bar 2 karaktera"),
    email: z.string().email("Neispravan format email adrese"),
    password: z.string().min(6, "Lozinka mora imati bar 6 karaktera"),
    telefon: z.string().min(8, "Telefon mora imati bar 8 cifara"),
    role: z.enum(["roditelj", "vlasnik"]).optional(),
    deca: z
      .array(
        z.object({
          ime: z.string(),
          godiste: z.number(),
        }),
      )
      .optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Neispravan format email adrese"),
    lozinka: z.string().min(1, "Lozinka je obavezna"),
  }),
});

module.exports = { registerSchema, loginSchema };
