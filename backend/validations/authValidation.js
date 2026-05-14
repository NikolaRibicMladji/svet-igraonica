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
      .regex(
        /^\+?[0-9]+$/,
        "Telefon može sadržati samo brojeve i opcioni + na početku",
      )
      .refine((value) => value.replace("+", "").length >= 8, {
        message: "Telefon mora imati bar 8 cifara",
      }),
    acceptedTerms: z.literal(true, {
      errorMap: () => ({
        message: "Morate prihvatiti uslove korišćenja i politiku privatnosti.",
      }),
    }),
    role: z.enum(["roditelj", "vlasnik"], {
      required_error: "Tip korisnika je obavezan",
    }),
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

const changePasswordSchema = z
  .object({
    body: z.object({
      currentPassword: z.string().min(1, "Trenutna lozinka je obavezna"),
      newPassword: z
        .string()
        .min(6, "Nova lozinka mora imati bar 6 karaktera")
        .max(50, "Nova lozinka je preduga"),
      confirmNewPassword: z
        .string()
        .min(6, "Potvrda nove lozinke mora imati bar 6 karaktera"),
    }),
    params: z.object({}).optional(),
    query: z.object({}).optional(),
  })
  .refine((data) => data.body.newPassword === data.body.confirmNewPassword, {
    message: "Nove lozinke se ne poklapaju",
    path: ["body", "confirmNewPassword"],
  });

const changeEmailSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Trenutna lozinka je obavezna"),
    newEmail: z
      .string()
      .email("Neispravan format email adrese")
      .toLowerCase()
      .trim(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const deleteAccountSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Trenutna lozinka je obavezna"),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  changeEmailSchema,
  deleteAccountSchema,
};
