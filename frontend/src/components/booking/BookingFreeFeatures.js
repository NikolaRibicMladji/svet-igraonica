import React from "react";

const BookingFreeFeatures = ({ features = [] }) => {
  const safeFeatures = Array.isArray(features)
    ? features.map((feature) => String(feature || "").trim()).filter(Boolean)
    : [];

  if (safeFeatures.length === 0) {
    return null;
  }

  return (
    <div
      className="free-features-section"
      aria-labelledby="booking-free-features-title"
    >
      <h4 id="booking-free-features-title">✨ Besplatne pogodnosti</h4>

      <div className="free-features-list">
        {safeFeatures.map((feature, index) => (
          <span key={`${feature}-${index}`} className="free-badge">
            ✓ {feature}
          </span>
        ))}
      </div>
    </div>
  );
};

export default BookingFreeFeatures;
