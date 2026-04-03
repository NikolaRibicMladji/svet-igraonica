import React from "react";
import "../styles/PlayroomCoverFallback.css";

const PlayroomCoverFallback = ({ naziv = "Igraonica" }) => {
  return (
    <div className="playroom-cover-fallback">
      <div className="playroom-cover-overlay" />
      <div className="playroom-cover-content">
        <div className="playroom-cover-badge">SVET IGRAONICA</div>
        <h2 className="playroom-cover-title">{naziv}</h2>
        <div className="playroom-cover-glow" />
      </div>
    </div>
  );
};

export default PlayroomCoverFallback;
