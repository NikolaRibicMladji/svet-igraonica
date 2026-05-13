import api from "./api";

export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append("image", file);

  const res = await api.post("/temp-upload/temp", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data.data;
};

export const uploadVideo = async (file) => {
  const formData = new FormData();
  formData.append("video", file);

  const res = await api.post("/upload/video", formData);

  return {
    url: res.data.data.url,
    publicId: res.data.data.publicId || res.data.data.public_id || "",
    thumbnail: res.data.data.thumbnail || "",
    trajanje: Number(res.data.data.duration || 0),
  };
};
