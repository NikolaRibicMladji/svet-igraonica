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
  const trimmed = String(value || "").trim();

  if (!trimmed) return "";

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
};

const SocialLinksSection = ({
  drustveneMreze = {},
  handleDrustveneMrezeChange,
}) => {
  const safeDrustveneMreze = {
    instagram: "",
    facebook: "",
    tiktok: "",
    website: "",
    ...drustveneMreze,
  };

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
        <label htmlFor="social-instagram">📸 Instagram</label>
        <input
          id="social-instagram"
          type="url"
          name="instagram"
          value={safeDrustveneMreze.instagram}
          onChange={handleChange}
          onBlur={handleBlur}
          onInvalid={handleInvalid}
          placeholder="instagram.com/ime_profila"
        />
      </div>

      <div className="form-group">
        <label htmlFor="social-facebook">📘 Facebook</label>
        <input
          id="social-facebook"
          type="url"
          name="facebook"
          value={safeDrustveneMreze.facebook}
          onChange={handleChange}
          onBlur={handleBlur}
          onInvalid={handleInvalid}
          placeholder="facebook.com/ime_stranice"
        />
      </div>

      <div className="form-group">
        <label htmlFor="social-tiktok">🎵 TikTok</label>
        <input
          id="social-tiktok"
          type="url"
          name="tiktok"
          value={safeDrustveneMreze.tiktok}
          onChange={handleChange}
          onBlur={handleBlur}
          onInvalid={handleInvalid}
          placeholder="tiktok.com/@ime_profila"
        />
      </div>

      <div className="form-group">
        <label htmlFor="social-website">🌐 Web sajt</label>
        <input
          id="social-website"
          type="url"
          name="website"
          value={safeDrustveneMreze.website}
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
