import api from "./api";

const IMAGE_MAX_SIZE_MB = 5;
const VIDEO_MAX_SIZE_MB = 20;

const IMAGE_MAX_SIZE_BYTES = IMAGE_MAX_SIZE_MB * 1024 * 1024;
const VIDEO_MAX_SIZE_BYTES = VIDEO_MAX_SIZE_MB * 1024 * 1024;

const normalizeId = (id) => String(id || "").trim();

const validateImageFile = (file) => {
  if (!file) {
    throw new Error("Slika nije izabrana.");
  }

  if (!file.type?.startsWith("image/")) {
    throw new Error("Dozvoljen je samo upload slike.");
  }

  if (file.size > IMAGE_MAX_SIZE_BYTES) {
    throw new Error(`Slika ne sme biti veća od ${IMAGE_MAX_SIZE_MB} MB.`);
  }
};

const validateVideoFile = (file) => {
  if (!file) {
    throw new Error("Video nije izabran.");
  }

  if (!file.type?.startsWith("video/")) {
    throw new Error("Dozvoljen je samo upload video fajla.");
  }

  if (file.size > VIDEO_MAX_SIZE_BYTES) {
    throw new Error(`Video ne sme biti veći od ${VIDEO_MAX_SIZE_MB} MB.`);
  }
};

export const uploadImage = async (playroomId, file) => {
  const safePlayroomId = normalizeId(playroomId);

  if (!safePlayroomId) {
    throw new Error("Nedostaje ID igraonice za upload slike.");
  }

  validateImageFile(file);

  const formData = new FormData();
  formData.append("image", file);

  const res = await api.post(
    `/upload/playroom/${encodeURIComponent(safePlayroomId)}`,
    formData,
  );

  const data = res.data?.data || null;
  return data?.image || data?.slika || data?.profilnaSlika || data;
};

export const uploadVideo = async (playroomId, file, naziv = "") => {
  const safePlayroomId = normalizeId(playroomId);

  if (!safePlayroomId) {
    throw new Error("Nedostaje ID igraonice za upload videa.");
  }

  validateVideoFile(file);

  const formData = new FormData();
  formData.append("video", file);

  const safeNaziv = String(naziv || "").trim();

  if (safeNaziv) {
    formData.append("naziv", safeNaziv);
  }

  const res = await api.post(
    `/upload/playroom/${encodeURIComponent(safePlayroomId)}/video`,
    formData,
  );

  const data = res.data?.data || {};
  const video = data?.video || data;

  return {
    ...video,
    url: video.url || video.secure_url || video.path || "",
    publicId: video.publicId || video.public_id || "",
    thumbnail: video.thumbnail || video.thumbnailUrl || "",
    trajanje: Number(video.trajanje ?? video.duration ?? 0),
  };
};
