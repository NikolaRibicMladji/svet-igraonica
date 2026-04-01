const { z } = require("zod");

const createBookingSchema = z.object({
  slotId: z.string().min(1, "slotId je obavezan"),

  ime: z.string().min(2, "Ime mora imati bar 2 karaktera"),

  telefon: z
    .string()
    .min(6, "Telefon mora imati bar 6 cifara")
    .regex(/^[0-9+ ]+$/, "Telefon može sadržati samo brojeve"),

  brojDece: z
    .number({
      required_error: "Broj dece je obavezan",
    })
    .min(1, "Mora biti bar 1 dete")
    .max(50, "Previše dece"),

  napomena: z.string().optional(),
});

module.exports = {
  createBookingSchema,
};
