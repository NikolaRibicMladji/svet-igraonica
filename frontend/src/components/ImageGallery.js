import React, { useState } from "react";
import "../styles/ImageGallery.css";

const ImageGallery = ({ images, playroomName }) => {
  const [selectedImage, setSelectedImage] = useState(images[0] || null);
  const [modalOpen, setModalOpen] = useState(false);

  if (!images || images.length === 0) {
    return (
      <div className="image-gallery-empty">
        <div className="empty-image">🎪</div>
        <p>Još nema slika za ovu igraonicu</p>
      </div>
    );
  }

  const mainImage =
    selectedImage || images.find((img) => img.isMain) || images[0];
  const thumbnails = images.filter((img) => img.url !== mainImage?.url);

  const openModal = (image) => {
    setSelectedImage(image);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  return (
    <div className="image-gallery">
      {/* Glavna slika */}
      <div
        className="main-image-container"
        onClick={() => openModal(mainImage)}
      >
        <img src={mainImage.url} alt={playroomName} className="main-image" />
        <div className="image-overlay">
          <span className="zoom-icon">🔍</span>
        </div>
      </div>

      {/* Thumbnail galerija */}
      {thumbnails.length > 0 && (
        <div className="thumbnail-gallery">
          {thumbnails.map((image, index) => (
            <div
              key={index}
              className={`thumbnail ${selectedImage?.url === image.url ? "active" : ""}`}
              onClick={() => setSelectedImage(image)}
            >
              <img src={image.url} alt={`${playroomName} ${index + 1}`} />
            </div>
          ))}
        </div>
      )}

      {/* Modal za prikaz slike u punoj veličini */}
      {modalOpen && selectedImage && (
        <div className="image-modal" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>
              ✖
            </button>
            <img src={selectedImage.url} alt={playroomName} />
            <div className="modal-info">
              <p>{playroomName}</p>
              {selectedImage.width && (
                <p className="image-details">
                  {selectedImage.width} x {selectedImage.height} •{" "}
                  {Math.round(selectedImage.size / 1024)} KB
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
