import React from "react";

const ImagesSection = ({
  uploading,
  slike,
  profilnaSlika,
  handleFileChange,
  removeProfilna,
  removeImage,
}) => {
  return (
    <div className="form-section">
      <h3>🖼️ Slike</h3>

      <div className="form-group">
        <label>Profilna slika</label>
        <small className="upload-hint">Maks. 8 MB po slici</small>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleFileChange(e, true)}
          disabled={uploading}
        />
        {profilnaSlika?.url && (
          <div className="uploaded-image">
            <img src={profilnaSlika.url} alt="Profilna slika" />
            <button type="button" onClick={removeProfilna}>
              ✖ Ukloni
            </button>
          </div>
        )}
      </div>

      <div className="form-group">
        <label>Ostale slike (maks. 10)</label>
        <small className="upload-hint">Maks. 8 MB po slici</small>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFileChange(e, false)}
          disabled={slike.length >= 10 || uploading}
        />

        <div className="image-list">
          {slike.map((img, idx) => (
            <div
              key={img.publicId || img.public_id || img.url || idx}
              className="image-item"
            >
              <img src={img.url} alt={`Slika ${idx + 1}`} />
              <button type="button" onClick={() => removeImage(idx)}>
                ✖
              </button>
            </div>
          ))}
        </div>

        {slike.length >= 10 && <p className="warning">Maksimalno 10 slika.</p>}
      </div>
    </div>
  );
};

export default ImagesSection;
