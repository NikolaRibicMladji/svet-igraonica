const { z } = require("zod");
const ROLES = require("../constants/roles");
const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "ID nije validan");

const notificationTargetRoleSchema = z.enum(
  ["svi", ROLES.VLASNIK, ROLES.RODITELJ],
  {
    errorMap: () => ({
      message: "Primaoci mogu biti: svi, vlasnik ili roditelj",
    }),
  },
);

const notificationPrioritySchema = z.enum(["info", "vazno", "hitno"], {
  errorMap: () => ({
    message: "Prioritet može biti: info, vazno ili hitno",
  }),
});

const notificationTargetTypeSchema = z.enum(["role", "playroom"], {
  errorMap: () => ({
    message: "Tip primaoca može biti: role ili playroom",
  }),
});

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

const adminPlayroomsSearchQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    q: z
      .string()
      .trim()
      .min(2, "Pretraga mora imati najmanje 2 karaktera")
      .max(100, "Pretraga može imati najviše 100 karaktera"),
    limit: z.coerce.number().int().min(1).max(20).optional().default(10),
  }),
});

const createAdminNotificationSchema = z
  .object({
    body: z
      .object({
        title: z
          .string()
          .trim()
          .min(3, "Naslov mora imati bar 3 karaktera")
          .max(120, "Naslov može imati najviše 120 karaktera"),

        message: z
          .string()
          .trim()
          .min(5, "Tekst mora imati bar 5 karaktera")
          .max(3000, "Tekst može imati najviše 3000 karaktera"),

        targetType: notificationTargetTypeSchema.optional().default("role"),

        targetRole: notificationTargetRoleSchema.optional(),

        targetPlayroomId: objectIdSchema.optional(),

        priority: notificationPrioritySchema.optional().default("info"),

        expiresAt: z.coerce
          .date()
          .optional()
          .nullable()
          .refine(
            (value) => !value || value > new Date(),
            "Datum isteka mora biti u budućnosti",
          ),
      })
      .strict(),

    params: z.object({}).optional(),
    query: z.object({}).optional(),
  })
  .superRefine((data, ctx) => {
    const body = data.body || {};

    if (body.targetType === "role" && !body.targetRole) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["body", "targetRole"],
        message: "Primaoci su obavezni za slanje po roli.",
      });
    }

    if (body.targetType === "playroom" && !body.targetPlayroomId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["body", "targetPlayroomId"],
        message: "Igraonica je obavezna za ciljano obaveštenje.",
      });
    }
  });

const adminNotificationsQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(50).optional().default(10),
    targetRole: notificationTargetRoleSchema.optional(),
    targetType: notificationTargetTypeSchema.optional(),
    targetPlayroomId: objectIdSchema.optional(),
    priority: notificationPrioritySchema.optional(),
    active: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => {
        if (value === "true") return true;
        if (value === "false") return false;
        return undefined;
      }),
  }),
});

const adminNotificationIdParamSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: objectIdSchema,
  }),
  query: z.object({}).optional(),
});

module.exports = {
  adminPlayroomIdParamSchema,
  rejectPlayroomSchema,
  adminUsersQuerySchema,
  adminPlayroomsSearchQuerySchema,
  createAdminNotificationSchema,
  adminNotificationsQuerySchema,
  adminNotificationIdParamSchema,
};
