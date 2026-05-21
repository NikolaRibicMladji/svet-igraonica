const { z } = require("zod");

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "ID nije validan");

const cloudinaryPublicId = z
  .string()
  .trim()
  .min(1, "publicId slike je obavezan")
  .max(300, "publicId je predug")
  .regex(/^[a-zA-Z0-9/_-]+$/, "publicId nije validan");

const uploadPlayroomImageSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    playroomId: objectId,
  }),
  query: z.object({}).optional(),
});

const deletePlayroomImageSchema = z.object({
  body: z
    .object({
      publicId: cloudinaryPublicId,
    })
    .strict(),
  params: z.object({
    playroomId: objectId,
  }),
  query: z.object({}).optional(),
});

module.exports = {
  uploadPlayroomImageSchema,
  deletePlayroomImageSchema,
};
