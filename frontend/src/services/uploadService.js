import api from "./api";

export const uploadImage = async (playroomId, file) => {
  if (!playroomId) {
    throw new Error("Nedostaje ID igraonice za upload slike.");
  }

  if (!file) {
    throw new Error("Slika nije izabrana.");
  }
  const formData = new FormData();
  formData.append("image", file);

  const res = await api.post(`/upload/playroom/${playroomId}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  const data = res.data?.data || null;
  return data?.image || data?.slika || data?.profilnaSlika || data;
};

export const uploadVideo = async (playroomId, file, naziv = "") => {
  if (!playroomId) {
    throw new Error("Nedostaje ID igraonice za upload videa.");
  }

  if (!file) {
    throw new Error("Video nije izabran.");
  }
  const formData = new FormData();
  formData.append("video", file);

  if (naziv.trim()) {
    formData.append("naziv", naziv.trim());
  }

  const res = await api.post(`/upload/playroom/${playroomId}/video`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  const data = res.data?.data || {};
  const video = data?.video || data;

  return {
    ...video,
    url: video.url,
    publicId: video.publicId || video.public_id || "",
    thumbnail: video.thumbnail || "",
    trajanje: Number(video.trajanje ?? video.duration ?? 0),
  };
};
