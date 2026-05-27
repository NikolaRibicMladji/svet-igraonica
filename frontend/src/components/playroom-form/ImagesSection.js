import React from "react";

const IMAGE_MAX_COUNT = 10;

const ImagesSection = ({
  uploading = false,
  slike = [],
  profilnaSlika = null,
  handleFileChange,
  removeProfilna,
  removeImage,
}) => {
  return (
    <div className="form-section">
      <h3>🖼️ Slike</h3>

      <div className="form-group">
        <label htmlFor="profilna-slika-upload">Profilna slika</label>
        <small className="upload-hint">Maks. 5 MB po slici</small>
        <small className="upload-hint">
          Ako ne dodate profilnu sliku, prva uploadovana slika će biti korišćena
          kao profilna.
        </small>

        <input
          id="profilna-slika-upload"
          type="file"
          accept="image/*"
          onChange={(e) => handleFileChange(e, true)}
          disabled={uploading}
        />

        {profilnaSlika?.url && (
          <div className="uploaded-image">
            <img src={profilnaSlika.url} alt="Profilna slika" loading="lazy" />
            <button type="button" onClick={removeProfilna} disabled={uploading}>
              ✖ Ukloni
            </button>
          </div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="galerija-slika-upload">
          Ostale slike (maks. {IMAGE_MAX_COUNT})
        </label>

        <small className="upload-hint">
          Dodato: {slike.length}/{IMAGE_MAX_COUNT}
        </small>

        <input
          id="galerija-slika-upload"
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFileChange(e, false)}
          disabled={slike.length >= IMAGE_MAX_COUNT || uploading}
        />

        <div className="image-list">
          {slike.map((img, idx) => (
            <div
              key={img.publicId || img.public_id || img.url || idx}
              className="image-item"
            >
              <img src={img.url} alt={`Slika ${idx + 1}`} loading="lazy" />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                disabled={uploading}
                aria-label={`Ukloni sliku ${idx + 1}`}
              >
                ✖
              </button>
            </div>
          ))}
        </div>

        {slike.length === 0 && (
          <p className="upload-hint">Još nema dodatih slika.</p>
        )}

        {slike.length >= IMAGE_MAX_COUNT && (
          <p className="warning">Maksimalno {IMAGE_MAX_COUNT} slika.</p>
        )}
      </div>
    </div>
  );
};

export default ImagesSection;
