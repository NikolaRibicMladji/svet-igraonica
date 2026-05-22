export const getSafeExternalUrl = (url) => {
  const value = String(url || "").trim();

  if (!value) return "";

  try {
    const parsedUrl = new URL(value);

    if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
      return parsedUrl.href;
    }

    return "";
  } catch {
    return "";
  }
};
