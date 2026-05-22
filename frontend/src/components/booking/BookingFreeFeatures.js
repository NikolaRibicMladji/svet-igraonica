import React from "react";

const BookingFreeFeatures = ({ features = [] }) => {
  if (!Array.isArray(features) || features.length === 0) {
    return null;
  }

  return (
    <div className="free-features-section">
      <h4>✨ Besplatne pogodnosti</h4>

      <div className="free-features-list">
        {features.map((feature, index) => (
          <span key={`${feature}-${index}`} className="free-badge">
            ✓ {feature}
          </span>
        ))}
      </div>
    </div>
  );
};

export default BookingFreeFeatures;
