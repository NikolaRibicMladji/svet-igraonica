import React, { useMemo, useState } from "react";
import { getSafeExternalUrl } from "../utils/urlUtils";

const normalizeVideo = (video) => {
  if (!video) return null;

  const url = getSafeExternalUrl(video.url || video.secure_url || video.path);
  const thumbnail = getSafeExternalUrl(video.thumbnail);

  if (!url) return null;

  return {
    url,
    thumbnail,
    naziv: String(video.naziv || "").trim(),
  };
};

const VideoPlayer = ({ video }) => {
  const normalizedVideo = useMemo(() => normalizeVideo(video), [video]);
  const [isPlaying, setIsPlaying] = useState(false);

  if (!normalizedVideo || !normalizedVideo.url) {
    return null;
  }

  const handlePlay = () => {
    setIsPlaying(true);
  };

  return (
    <div className="video-gallery-item">
      {!isPlaying ? (
        <button
          type="button"
          className="video-thumbnail"
          onClick={handlePlay}
          aria-label={`Pokreni video ${normalizedVideo.naziv || "video"}`}
        >
          {normalizedVideo.thumbnail ? (
            <img
              src={normalizedVideo.thumbnail}
              alt={normalizedVideo.naziv || "Video thumbnail"}
              loading="lazy"
            />
          ) : (
            <div className="video-placeholder">🎬</div>
          )}

          <div className="play-button-overlay">
            <div className="play-icon">▶</div>
          </div>
        </button>
      ) : (
        <video
          controls
          autoPlay
          preload="metadata"
          className="video-player-inline"
          src={normalizedVideo.url}
          aria-label={normalizedVideo.naziv || "Video"}
        />
      )}

      <div className="video-title">{normalizedVideo.naziv || "Video"}</div>
    </div>
  );
};

export default VideoPlayer;
