import api from "./api";
import { normalizeImageItem, normalizeVideoItem } from "../utils/media";

const IMAGE_MAX_SIZE_MB = 5;
const VIDEO_MAX_SIZE_MB = 20;
const VIDEO_NAME_MAX_LENGTH = 80;

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
  const image = data?.image || data?.slika || data?.profilnaSlika || data;

  return normalizeImageItem(image);
};

export const uploadVideo = async (playroomId, file, naziv = "") => {
  const safePlayroomId = normalizeId(playroomId);

  if (!safePlayroomId) {
    throw new Error("Nedostaje ID igraonice za upload videa.");
  }

  validateVideoFile(file);

  const formData = new FormData();
  formData.append("video", file);

  const safeNaziv = String(naziv || "")
    .trim()
    .slice(0, VIDEO_NAME_MAX_LENGTH);

  if (safeNaziv) {
    formData.append("naziv", safeNaziv);
  }

  const res = await api.post(
    `/upload/playroom/${encodeURIComponent(safePlayroomId)}/video`,
    formData,
  );

  const data = res.data?.data || {};
  const video = data?.video || data;

  return normalizeVideoItem({
    ...video,
    thumbnail: video.thumbnail || video.thumbnailUrl || "",
  });
};

export const deleteImage = async (playroomId, publicId) => {
  const safePlayroomId = normalizeId(playroomId);
  const safePublicId = String(publicId || "").trim();

  if (!safePlayroomId) {
    throw new Error("Nedostaje ID igraonice za brisanje slike.");
  }

  if (!safePublicId) {
    throw new Error("Nedostaje publicId slike za brisanje.");
  }

  const res = await api.delete(
    `/upload/playroom/${encodeURIComponent(safePlayroomId)}/image`,
    {
      data: {
        publicId: safePublicId,
      },
    },
  );

  return {
    success: Boolean(res.data?.success ?? true),
    message: res.data?.message || "Slika je obrisana.",
    data: res.data?.data || null,
  };
};

export const deleteVideo = async (playroomId, publicId) => {
  const safePlayroomId = normalizeId(playroomId);
  const safePublicId = String(publicId || "").trim();

  if (!safePlayroomId) {
    throw new Error("Nedostaje ID igraonice za brisanje videa.");
  }

  if (!safePublicId) {
    throw new Error("Nedostaje publicId videa za brisanje.");
  }

  const res = await api.delete(
    `/upload/playroom/${encodeURIComponent(safePlayroomId)}/video`,
    {
      data: {
        publicId: safePublicId,
      },
    },
  );

  return {
    success: Boolean(res.data?.success ?? true),
    message: res.data?.message || "Video je obrisan.",
    data: res.data?.data || null,
  };
};

export const setProfileImage = async (playroomId, publicId) => {
  const safePlayroomId = normalizeId(playroomId);
  const safePublicId = String(publicId || "").trim();

  if (!safePlayroomId) {
    throw new Error("Nedostaje ID igraonice za profilnu sliku.");
  }

  if (!safePublicId) {
    throw new Error("Nedostaje publicId profilne slike.");
  }

  const res = await api.put(
    `/upload/playroom/${encodeURIComponent(safePlayroomId)}/profile-image`,
    {
      publicId: safePublicId,
    },
  );

  const data = res.data?.data || {};

  return {
    success: Boolean(res.data?.success ?? true),
    message: res.data?.message || "Profilna slika je ažurirana.",
    profilnaSlika: normalizeImageItem(data.profilnaSlika || data),
  };
};
