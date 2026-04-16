import React from "react";

const getErrorMessage = (name) => {
  switch (name) {
    case "instagram":
      return "Unesite ispravan Instagram link.";
    case "facebook":
      return "Unesite ispravan Facebook link.";
    case "tiktok":
      return "Unesite ispravan TikTok link.";
    case "website":
      return "Unesite ispravan link sajta.";
    default:
      return "Unesite ispravan link.";
  }
};

const normalizeUrl = (value) => {
  const trimmed = value.trim();

  if (!trimmed) return "";

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
};

const SocialLinksSection = ({ drustveneMreze, handleDrustveneMrezeChange }) => {
  const handleInvalid = (e) => {
    e.target.setCustomValidity(getErrorMessage(e.target.name));
  };

  const handleChange = (e) => {
    e.target.setCustomValidity("");
    handleDrustveneMrezeChange(e);
  };

  const handleBlur = (e) => {
    const normalizedValue = normalizeUrl(e.target.value);

    if (normalizedValue === e.target.value) return;

    handleDrustveneMrezeChange({
      target: {
        name: e.target.name,
        value: normalizedValue,
      },
    });
  };

  return (
    <div className="form-section">
      <h3>🌐 Društvene mreže</h3>
      <p className="section-hint">Dodaj linkove ka profilima ili sajtu.</p>

      <div className="form-group">
        <label>📸 Instagram</label>
        <input
          type="url"
          name="instagram"
          value={drustveneMreze.instagram}
          onChange={handleChange}
          onBlur={handleBlur}
          onInvalid={handleInvalid}
          placeholder="instagram.com/ime_profila"
        />
      </div>

      <div className="form-group">
        <label>📘 Facebook</label>
        <input
          type="url"
          name="facebook"
          value={drustveneMreze.facebook}
          onChange={handleChange}
          onBlur={handleBlur}
          onInvalid={handleInvalid}
          placeholder="facebook.com/ime_stranice"
        />
      </div>

      <div className="form-group">
        <label>🎵 TikTok</label>
        <input
          type="url"
          name="tiktok"
          value={drustveneMreze.tiktok}
          onChange={handleChange}
          onBlur={handleBlur}
          onInvalid={handleInvalid}
          placeholder="tiktok.com/@ime_profila"
        />
      </div>

      <div className="form-group">
        <label>🌐 Veb sajt</label>
        <input
          type="url"
          name="website"
          value={drustveneMreze.website}
          onChange={handleChange}
          onBlur={handleBlur}
          onInvalid={handleInvalid}
          placeholder="vas-sajt.com"
        />
      </div>
    </div>
  );
};

export default SocialLinksSection;
