const { z } = require("zod");

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "ID nije validan");

const adminPlayroomIdParamSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: objectIdSchema,
  }),
  query: z.object({}).optional(),
});

const rejectPlayroomSchema = z.object({
  body: z
    .object({
      reason: z
        .string()
        .trim()
        .min(5, "Razlog odbijanja mora imati bar 5 karaktera")
        .max(1000, "Razlog odbijanja može imati najviše 1000 karaktera"),
    })
    .strict(),

  params: z.object({
    id: objectIdSchema,
  }),

  query: z.object({}).optional(),
});

const adminUsersQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  }),
});

module.exports = {
  adminPlayroomIdParamSchema,
  rejectPlayroomSchema,
  adminUsersQuerySchema,
};
