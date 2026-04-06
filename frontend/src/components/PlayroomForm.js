import React from "react";
import "../styles/CreatePlayroom.css";
import BasicInfoSection from "./playroom-form/BasicInfoSection";
import CapacitySection from "./playroom-form/CapacitySection";
import SocialLinksSection from "./playroom-form/SocialLinksSection";
import WorkingHoursSection from "./playroom-form/WorkingHoursSection";
import ImagesSection from "./playroom-form/ImagesSection";
import VideosSection from "./playroom-form/VideosSection";
import ParentPricingSection from "./playroom-form/ParentPricingSection";
import AdditionalPricesSection from "./playroom-form/AdditionalPricesSection";
import PackagesSection from "./playroom-form/PackagesSection";
import AdditionalServicesSection from "./playroom-form/AdditionalServicesSection";
import BenefitsSection from "./playroom-form/BenefitsSection";
import { DEFAULT_DANI, usePlayroomForm } from "../hooks/usePlayroomForm";

const PlayroomForm = ({
  initialData,
  onSubmit,
  onCancel,
  isEditing = false,
}) => {
  const {
    formData,
    error,
    errors,
    uploading,
    uploadingVideo,
    slike,
    profilnaSlika,
    videoGalerija,
    noviVideo,
    videoNaziv,
    cene,
    novaCena,
    paketi,
    noviPaket,
    cenaRoditelja,
    dodatneUsluge,
    novaUsluga,
    besplatnePogodnosti,
    novaPogodnost,
    drustveneMreze,
    radnoVreme,
    setVideoNaziv,
    setNovaCena,
    setNoviPaket,
    setNovaUsluga,
    setNovaPogodnost,
    handleChange,
    handleCenaRoditeljaChange,
    handleDrustveneMrezeChange,
    handleVideoChange,
    handleAddVideo,
    handleRemoveVideo,
    handleRadnoVremeChange,
    toggleDan,
    handleAddCena,
    handleRemoveCena,
    handleAddPaket,
    handleRemovePaket,
    handleAddUsluga,
    handleRemoveUsluga,
    handleAddPogodnost,
    handleRemovePogodnost,
    handleFileChange,
    removeImage,
    removeProfilna,
    handleSubmit,
  } = usePlayroomForm({
    initialData,
    onSubmit,
  });

  return (
    <form onSubmit={handleSubmit} className="edit-form full-form">
      <h2>{isEditing ? "✏️ Uredi igraonicu" : "✨ Dodaj novu igraonicu"}</h2>

      {error && <div className="error-message">{error}</div>}

      <BasicInfoSection
        formData={formData}
        handleChange={handleChange}
        errors={errors}
      />

      <CapacitySection
        formData={formData}
        handleChange={handleChange}
        errors={errors}
      />

      <ImagesSection
        uploading={uploading}
        slike={slike}
        profilnaSlika={profilnaSlika}
        handleFileChange={handleFileChange}
        removeProfilna={removeProfilna}
        removeImage={removeImage}
      />

      <VideosSection
        uploadingVideo={uploadingVideo}
        videoGalerija={videoGalerija}
        noviVideo={noviVideo}
        videoNaziv={videoNaziv}
        setVideoNaziv={setVideoNaziv}
        handleVideoChange={handleVideoChange}
        handleAddVideo={handleAddVideo}
        handleRemoveVideo={handleRemoveVideo}
      />

      <div className="form-group">
        <label>Osnovna cena po detetu (RSD) *</label>
        <input
          type="number"
          min="0"
          name="osnovnaCena"
          value={formData.osnovnaCena}
          onChange={handleChange}
          className={errors.osnovnaCena ? "input-error" : ""}
        />
        {errors.osnovnaCena && (
          <div className="field-error">{errors.osnovnaCena}</div>
        )}
      </div>

      <ParentPricingSection
        cenaRoditelja={cenaRoditelja}
        handleCenaRoditeljaChange={handleCenaRoditeljaChange}
      />

      <AdditionalPricesSection
        novaCena={novaCena}
        setNovaCena={setNovaCena}
        cene={cene}
        handleAddCena={handleAddCena}
        handleRemoveCena={handleRemoveCena}
      />

      <PackagesSection
        noviPaket={noviPaket}
        setNoviPaket={setNoviPaket}
        paketi={paketi}
        handleAddPaket={handleAddPaket}
        handleRemovePaket={handleRemovePaket}
      />

      <AdditionalServicesSection
        novaUsluga={novaUsluga}
        setNovaUsluga={setNovaUsluga}
        dodatneUsluge={dodatneUsluge}
        handleAddUsluga={handleAddUsluga}
        handleRemoveUsluga={handleRemoveUsluga}
      />

      <BenefitsSection
        novaPogodnost={novaPogodnost}
        setNovaPogodnost={setNovaPogodnost}
        besplatnePogodnosti={besplatnePogodnosti}
        handleAddPogodnost={handleAddPogodnost}
        handleRemovePogodnost={handleRemovePogodnost}
      />

      <SocialLinksSection
        drustveneMreze={drustveneMreze}
        handleDrustveneMrezeChange={handleDrustveneMrezeChange}
      />

      <WorkingHoursSection
        dani={DEFAULT_DANI}
        radnoVreme={radnoVreme}
        toggleDan={toggleDan}
        handleRadnoVremeChange={handleRadnoVremeChange}
      />

      <div className="form-actions">
        <button type="button" className="btn-cancel" onClick={onCancel}>
          Otkaži
        </button>
        <button
          type="submit"
          className="btn-submit"
          disabled={uploading || uploadingVideo}
        >
          {uploading
            ? "Uploadujem slike..."
            : uploadingVideo
              ? "Uploadujem video..."
              : isEditing
                ? "💾 Sačuvaj promene"
                : "✨ Kreiraj igraonicu"}
        </button>
      </div>
    </form>
  );
};

export default PlayroomForm;
