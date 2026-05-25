import { getSafeExternalUrl } from "./urlUtils";

export const normalizeImageItem = (item) => {
  if (!item) return null;

  if (typeof item === "string") {
    const url = getSafeExternalUrl(item);

    return url ? { url } : null;
  }

  const url = getSafeExternalUrl(item.url || item.secure_url || item.path);

  if (!url) return null;

  return {
    ...item,
    url,
  };
};

export const normalizeVideoItem = (item) => {
  if (!item) return null;

  const url = getSafeExternalUrl(item.url || item.secure_url || item.path);

  if (!url) return null;

  return {
    ...item,
    url,
    publicId: item.publicId || item.public_id || "",
    thumbnail: getSafeExternalUrl(item.thumbnail),
    naziv: String(item.naziv || "").trim(),
    trajanje: Number(item.trajanje || item.duration || 0),
  };
};
