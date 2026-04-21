const { z } = require("zod");

const registerSchema = z.object({
  body: z.object({
    ime: z.string().min(2, "Ime mora imati bar 2 karaktera").trim(),
    prezime: z.string().min(2, "Prezime mora imati bar 2 karaktera").trim(),
    email: z
      .string()
      .email("Neispravan format email adrese")
      .toLowerCase()
      .trim(),
    password: z
      .string()
      .min(6, "Lozinka mora imati bar 6 karaktera")
      .max(50, "Lozinka je preduga"),
    telefon: z
      .string()
      .trim()
      .regex(/^[0-9]+$/, "Telefon može sadržati samo brojeve")
      .min(8, "Telefon mora imati bar 8 cifara"),

    role: z.enum(["roditelj", "vlasnik"]).optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email("Neispravan format email adrese")
      .toLowerCase()
      .trim(),
    password: z.string().min(1, "Lozinka je obavezna"),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email("Neispravan format email adrese")
      .toLowerCase()
      .trim(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const resetPasswordSchema = z
  .object({
    body: z.object({
      password: z
        .string()
        .min(6, "Lozinka mora imati bar 6 karaktera")
        .max(50, "Lozinka je preduga"),
      confirmPassword: z
        .string()
        .min(6, "Potvrda lozinke mora imati bar 6 karaktera"),
    }),
    params: z.object({
      token: z.string().min(1, "Token je obavezan"),
    }),
    query: z.object({}).optional(),
  })
  .refine((data) => data.body.password === data.body.confirmPassword, {
    message: "Lozinke se ne poklapaju",
    path: ["body", "confirmPassword"],
  });

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
