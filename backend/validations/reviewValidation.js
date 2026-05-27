const { z } = require("zod");

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "ID nije validan");

const addReviewSchema = z.object({
  body: z
    .object({
      rating: z.coerce
        .number({
          required_error: "Ocena je obavezna",
          invalid_type_error: "Ocena mora biti broj",
        })
        .int("Ocena mora biti ceo broj")
        .min(1, "Minimalna ocena je 1")
        .max(5, "Maksimalna ocena je 5"),

      comment: z
        .string()
        .trim()
        .max(1000, "Komentar može imati najviše 1000 karaktera")
        .optional()
        .default(""),
    })
    .strict(),

  params: z.object({
    playroomId: objectId,
  }),

  query: z.object({}).optional(),
});

const getReviewsSchema = z.object({
  body: z.object({}).optional(),

  params: z.object({
    playroomId: objectId,
  }),

  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  }),
});

const getMyReviewStatusSchema = z.object({
  body: z.object({}).optional(),

  params: z.object({
    playroomId: objectId,
  }),

  query: z.object({}).optional(),
});

const deleteReviewSchema = z.object({
  body: z.object({}).optional(),

  params: z.object({
    id: objectId,
  }),

  query: z.object({}).optional(),
});

module.exports = {
  addReviewSchema,
  getReviewsSchema,
  getMyReviewStatusSchema,
  deleteReviewSchema,
};
