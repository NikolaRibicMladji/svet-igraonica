import React from "react";
import "../styles/CreatePlayroom.css";
import BasicInfoSection from "./playroom-form/BasicInfoSection";
import CapacitySection from "./playroom-form/CapacitySection";
import SocialLinksSection from "./playroom-form/SocialLinksSection";
import WorkingHoursSection from "./playroom-form/WorkingHoursSection";
import ImagesSection from "./playroom-form/ImagesSection";
import VideosSection from "./playroom-form/VideosSection";
import BookingModeSection from "./playroom-form/BookingModeSection";
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
    submitting,
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
    <>
      {submitting && (
        <div className="global-loading">
          <div className="global-spinner"></div>
        </div>
      )}
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

        <BookingModeSection formData={formData} handleChange={handleChange} />

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
            disabled={uploading || uploadingVideo || submitting}
          >
            {submitting ? (
              <>
                <span className="btn-spinner"></span>
                {isEditing ? "Čuvam promene..." : "Kreiram igraonicu..."}
              </>
            ) : uploading ? (
              "Uploadujem slike..."
            ) : uploadingVideo ? (
              "Uploadujem video..."
            ) : isEditing ? (
              "💾 Sačuvaj promene"
            ) : (
              "✨ Kreiraj igraonicu"
            )}
          </button>
        </div>
      </form>
    </>
  );
};

export default PlayroomForm;
