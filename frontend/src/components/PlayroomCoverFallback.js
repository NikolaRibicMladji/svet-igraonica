import React from "react";
import "../styles/PlayroomCoverFallback.css";

const PlayroomCoverFallback = ({ naziv = "Igraonica" }) => {
  return (
    <div
      className="playroom-cover-fallback"
      role="img"
      aria-label={`Placeholder slika za igraonicu ${naziv}`}
    >
      <div className="playroom-cover-overlay" />
      <div className="playroom-cover-content">
        <div className="playroom-cover-badge">SVET IGRAONICA</div>
        <div className="playroom-cover-title">{naziv}</div>
        <div className="playroom-cover-glow" />
      </div>
    </div>
  );
};

export default PlayroomCoverFallback;
