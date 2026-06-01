const { z } = require("zod");

const registerSchema = z.object({
  body: z.object({
    ime: z
      .string()
      .trim()
      .min(2, "Ime mora imati bar 2 karaktera")
      .max(100, "Ime je predugo"),

    prezime: z
      .string()
      .trim()
      .min(2, "Prezime mora imati bar 2 karaktera")
      .max(100, "Prezime je predugo"),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Neispravan format email adrese"),
    password: z
      .string()
      .min(8, "Lozinka mora imati najmanje 8 karaktera")
      .max(50, "Lozinka je preduga"),
    telefon: z
      .string()
      .trim()
      .max(30, "Telefon je predug")
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
      .trim()
      .toLowerCase()
      .email("Neispravan format email adrese"),
    password: z
      .string()
      .min(1, "Lozinka je obavezna")
      .max(128, "Lozinka je preduga"),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Neispravan format email adrese"),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const resetPasswordSchema = z
  .object({
    body: z.object({
      password: z
        .string()
        .min(8, "Lozinka mora imati najmanje 8 karaktera")
        .max(50, "Lozinka je preduga"),
      confirmPassword: z
        .string()
        .min(8, "Potvrda lozinke mora imati bar 8 karaktera")
        .max(50, "Potvrda lozinke je preduga"),
    }),
    params: z.object({
      token: z.string().regex(/^[a-fA-F0-9]{64}$/, "Token nije validan"),
    }),
    query: z.object({}).optional(),
  })
  .refine((data) => data.body.password === data.body.confirmPassword, {
    message: "Lozinke se ne poklapaju",
    path: ["body", "confirmPassword"],
  });

const verifyEmailSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    token: z.string().regex(/^[a-fA-F0-9]{64}$/, "Token nije validan"),
  }),
  query: z.object({}).optional(),
});

const resendVerificationSchema = z.object({
  body: z.object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Neispravan format email adrese"),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const changePasswordSchema = z
  .object({
    body: z.object({
      currentPassword: z
        .string()
        .min(1, "Trenutna lozinka je obavezna")
        .max(128, "Trenutna lozinka je preduga"),
      newPassword: z
        .string()
        .min(8, "Nova lozinka mora imati bar 8 karaktera")
        .max(50, "Nova lozinka je preduga"),
      confirmNewPassword: z
        .string()
        .min(8, "Potvrda nove lozinke mora imati bar 8 karaktera")
        .max(50, "Potvrda nove lozinke je preduga"),
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
    currentPassword: z
      .string()
      .min(1, "Trenutna lozinka je obavezna")
      .max(128, "Trenutna lozinka je preduga"),
    newEmail: z
      .string()
      .trim()
      .toLowerCase()
      .email("Neispravan format email adrese"),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const deleteAccountSchema = z.object({
  body: z.object({
    currentPassword: z
      .string()
      .min(1, "Trenutna lozinka je obavezna")
      .max(128, "Trenutna lozinka je preduga"),
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
  verifyEmailSchema,
  resendVerificationSchema,
};
