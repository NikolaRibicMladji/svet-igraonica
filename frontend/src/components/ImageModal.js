import React, { useCallback, useEffect, useMemo, useState } from "react";
import "../styles/ImageModal.css";
import { getSafeExternalUrl } from "../utils/urlUtils";

const normalizeImage = (image) => {
  if (!image) return null;

  if (typeof image === "string") {
    const url = getSafeExternalUrl(image);

    if (!url) return null;

    return {
      url,
      alt: "",
    };
  }

  const url = getSafeExternalUrl(image.url || image.secure_url || image.path);

  if (!url) return null;

  return {
    url,
    alt: image.alt || "",
  };
};

const ImageModal = ({ images = [], currentIndex = 0, onClose }) => {
  const normalizedImages = useMemo(() => {
    return (Array.isArray(images) ? images : [])
      .map(normalizeImage)
      .filter((img) => img && img.url);
  }, [images]);

  const getSafeIndex = useCallback(
    (value) => {
      if (!normalizedImages.length) return 0;
      if (value < 0) return normalizedImages.length - 1;
      if (value >= normalizedImages.length) return 0;
      return value;
    },
    [normalizedImages.length],
  );

  const [index, setIndex] = useState(getSafeIndex(currentIndex));

  useEffect(() => {
    setIndex(getSafeIndex(currentIndex));
  }, [currentIndex, getSafeIndex]);

  const handlePrev = useCallback(() => {
    setIndex((prev) => (prev > 0 ? prev - 1 : normalizedImages.length - 1));
  }, [normalizedImages.length]);

  const handleNext = useCallback(() => {
    setIndex((prev) => (prev < normalizedImages.length - 1 ? prev + 1 : 0));
  }, [normalizedImages.length]);

  useEffect(() => {
    if (!normalizedImages.length) return;

    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handlePrev, handleNext, normalizedImages.length, onClose]);

  if (!normalizedImages.length) return null;

  const currentImage = normalizedImages[index];

  return (
    <div
      className="image-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Prikaz slike"
    >
      <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Zatvori prikaz slike"
        >
          ✖
        </button>

        {normalizedImages.length > 1 && (
          <button
            type="button"
            className="modal-nav prev"
            onClick={handlePrev}
            aria-label="Prethodna slika"
          >
            ❮
          </button>
        )}

        <div className="modal-image-container">
          <img
            src={currentImage.url}
            alt={currentImage.alt || `Slika ${index + 1}`}
            loading="eager"
          />
          <div className="image-counter">
            {index + 1} / {normalizedImages.length}
          </div>
        </div>

        {normalizedImages.length > 1 && (
          <button
            type="button"
            className="modal-nav next"
            onClick={handleNext}
            aria-label="Sledeća slika"
          >
            ❯
          </button>
        )}
      </div>
    </div>
  );
};

export default ImageModal;
