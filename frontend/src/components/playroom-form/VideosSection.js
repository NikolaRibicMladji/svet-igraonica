import React from "react";
const VIDEO_MAX_COUNT = 3;

const VideosSection = ({
  uploadingVideo,
  videoGalerija,
  noviVideo,
  videoNaziv,
  setVideoNaziv,
  handleVideoChange,
  handleAddVideo,
  handleRemoveVideo,
}) => {
  return (
    <div className="form-section">
      <h3>🎥 Video galerija (maks. {VIDEO_MAX_COUNT})</h3>

      <p className="section-hint">
        Dodaj video snimke sa rođendana, događaja ili prikaza igraonice (maks.
        20 MB velicina i 30 sekundi duzina videa).
      </p>
      <p className="section-hint">
        Dodato: {videoGalerija.length}/{VIDEO_MAX_COUNT}
      </p>

      <div className="dynamic-input">
        <div className="add-item">
          <input
            type="text"
            placeholder="Naziv videa (npr. Rođendan 2024)"
            value={videoNaziv}
            disabled={uploadingVideo || videoGalerija.length >= VIDEO_MAX_COUNT}
            onChange={(e) => setVideoNaziv(e.target.value)}
          />

          <input
            type="file"
            accept="video/*"
            multiple
            onChange={handleVideoChange}
            disabled={uploadingVideo || videoGalerija.length >= VIDEO_MAX_COUNT}
          />

          <button
            type="button"
            onClick={handleAddVideo}
            disabled={
              noviVideo.length === 0 ||
              uploadingVideo ||
              videoGalerija.length >= VIDEO_MAX_COUNT
            }
          >
            {uploadingVideo ? "Uploadujem..." : "+ Dodaj"}
          </button>
        </div>

        {noviVideo.length > 0 && (
          <div className="items-list">
            {noviVideo.map((file, idx) => (
              <div key={`${file.name}-${idx}`} className="item">
                <span>{file.name}</span>
              </div>
            ))}
          </div>
        )}

        {videoGalerija.length > 0 && (
          <div className="videos-list">
            <h4>Postavljeni video snimci:</h4>
            {videoGalerija.map((video, idx) => (
              <div
                key={video.publicId || video.url || idx}
                className="video-item-preview"
              >
                <div className="video-preview">
                  <video
                    controls
                    className="video-preview-player"
                    src={video.url}
                  />
                  <div className="video-info">
                    <span className="video-name">
                      {video.naziv || `Video ${idx + 1}`}
                    </span>
                    {video.trajanje > 0 && (
                      <span className="video-duration">
                        {Math.floor(video.trajanje / 60)}:
                        {(video.trajanje % 60).toString().padStart(2, "0")}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveVideo(idx)}
                    className="remove-video"
                    disabled={uploadingVideo}
                  >
                    ✖ Obriši
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {videoGalerija.length === 0 && (
          <p className="section-hint">Još nema dodatih video snimaka.</p>
        )}

        {videoGalerija.length >= VIDEO_MAX_COUNT && (
          <p className="warning">Maksimalan broj video snimaka je dostignut.</p>
        )}
      </div>
    </div>
  );
};

export default VideosSection;
