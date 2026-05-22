import React, { useEffect, useMemo, useState } from "react";
import "../styles/ImageGallery.css";
import { getSafeExternalUrl } from "../utils/urlUtils";

const normalizeImage = (image) => {
  if (!image) return null;

  if (typeof image === "string") {
    const url = getSafeExternalUrl(image);

    if (!url) return null;

    return {
      url,
      isMain: false,
      width: null,
      height: null,
      size: null,
      public_id: url,
    };
  }

  const url = getSafeExternalUrl(image.url || image.secure_url || image.path);

  if (!url) return null;

  return {
    url,
    isMain: Boolean(image.isMain),
    width: image.width || null,
    height: image.height || null,
    size: image.size || null,
    public_id: image.public_id || image.id || url,
  };
};

const ImageGallery = ({ images = [], playroomName = "Igraonica" }) => {
  const normalizedImages = useMemo(() => {
    return (Array.isArray(images) ? images : [])
      .map(normalizeImage)
      .filter((img) => img && img.url);
  }, [images]);

  const initialMainImage = useMemo(() => {
    return (
      normalizedImages.find((img) => img.isMain) || normalizedImages[0] || null
    );
  }, [normalizedImages]);

  const [selectedImage, setSelectedImage] = useState(initialMainImage);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setSelectedImage(initialMainImage);
  }, [initialMainImage]);

  useEffect(() => {
    if (!modalOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setModalOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  if (normalizedImages.length === 0) {
    return (
      <div className="image-gallery-empty">
        <div className="empty-image">🎪</div>
        <p>Još nema slika za ovu igraonicu.</p>
      </div>
    );
  }

  const mainImage = selectedImage || initialMainImage;
  const thumbnails = normalizedImages.filter(
    (img) => img.url !== mainImage?.url,
  );

  const openModal = (image) => {
    if (!image?.url) return;
    setSelectedImage(image);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  return (
    <div className="image-gallery">
      <div
        className="main-image-container"
        onClick={() => openModal(mainImage)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openModal(mainImage);
          }
        }}
        aria-label={`Otvori glavnu sliku igraonice ${playroomName}`}
      >
        <img
          src={mainImage.url}
          alt={playroomName}
          className="main-image"
          loading="lazy"
        />
        <div className="image-overlay">
          <span className="zoom-icon">🔍</span>
        </div>
      </div>

      {thumbnails.length > 0 && (
        <div className="thumbnail-gallery">
          {thumbnails.map((image, index) => (
            <div
              key={image.public_id || image.url || index}
              className={`thumbnail ${
                selectedImage?.url === image.url ? "active" : ""
              }`}
              onClick={() => setSelectedImage(image)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedImage(image);
                }
              }}
              aria-label={`Prikaži sliku ${index + 1} za igraonicu ${playroomName}`}
            >
              <img
                src={image.url}
                alt={`${playroomName} ${index + 1}`}
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}

      {modalOpen && selectedImage && (
        <div className="image-modal" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close"
              onClick={closeModal}
              aria-label="Zatvori prikaz slike"
            >
              ✖
            </button>

            <img src={selectedImage.url} alt={playroomName} loading="eager" />

            <div className="modal-info">
              <p>{playroomName}</p>

              {(selectedImage.width ||
                selectedImage.height ||
                selectedImage.size) && (
                <p className="image-details">
                  {selectedImage.width && selectedImage.height
                    ? `${selectedImage.width} x ${selectedImage.height}`
                    : "Dimenzije nisu dostupne"}
                  {selectedImage.size
                    ? ` • ${Math.round(selectedImage.size / 1024)} KB`
                    : ""}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGallery;
