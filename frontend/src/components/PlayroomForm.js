import React, { useState } from "react";
import "../styles/CreatePlayroom.css";

const PlayroomForm = ({ initialData, onSubmit, onCancel, isEditing }) => {
  const [formData, setFormData] = useState({
    naziv: initialData?.naziv || "",
    adresa: initialData?.adresa || "",
    grad: initialData?.grad || "",
    opis: initialData?.opis || "",
    kontaktTelefon: initialData?.kontaktTelefon || "",
    kontaktEmail: initialData?.kontaktEmail || "",
    kapacitet: {
      deca: initialData?.kapacitet?.deca || "",
      roditelji: initialData?.kapacitet?.roditelji || "",
    },
    osnovnaCena: initialData?.osnovnaCena || "",
  });

  const [cene, setCene] = useState(initialData?.cene || []);
  const [novaCena, setNovaCena] = useState({ naziv: "", cena: "", opis: "" });
  const [videoGalerija, setVideoGalerija] = useState(
    initialData?.videoGalerija || [],
  );
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [noviVideo, setNoviVideo] = useState(null);
  const [videoNaziv, setVideoNaziv] = useState("");
  const [paketi, setPaketi] = useState(initialData?.paketi || []);
  const [noviPaket, setNoviPaket] = useState({ naziv: "", cena: "", opis: "" });

  const [dodatneUsluge, setDodatneUsluge] = useState(
    initialData?.dodatneUsluge || [],
  );
  const [novaUsluga, setNovaUsluga] = useState({
    naziv: "",
    cena: "",
    opis: "",
    tip: "fiksno",
  });

  const [besplatnePogodnosti, setBesplatnePogodnosti] = useState(
    initialData?.besplatnePogodnosti || [],
  );
  const [novaPogodnost, setNovaPogodnost] = useState("");

  const [profilnaSlika, setProfilnaSlika] = useState(
    initialData?.profilnaSlika || null,
  );
  const [slike, setSlike] = useState(initialData?.slike || []);
  const [uploading, setUploading] = useState(false);
  const [drustveneMreze, setDrustveneMreze] = useState(
    initialData?.drustveneMreze || {
      instagram: "",
      facebook: "",
      tiktok: "",
      website: "",
    },
  );
  const [radnoVreme, setRadnoVreme] = useState(
    initialData?.radnoVreme || {
      ponedeljak: { od: "09:00", do: "20:00", radi: true },
      utorak: { od: "09:00", do: "20:00", radi: true },
      sreda: { od: "09:00", do: "20:00", radi: true },
      cetvrtak: { od: "09:00", do: "20:00", radi: true },
      petak: { od: "09:00", do: "20:00", radi: true },
      subota: { od: "10:00", do: "22:00", radi: true },
      nedelja: { od: "10:00", do: "21:00", radi: true },
    },
  );

  const uploadVideo = async (file) => {
    if (videoGalerija.length >= 3) {
      alert("Maksimalno 3 video snimka mogu biti dodata!");
      return;
    }

    const formData = new FormData();
    formData.append("video", file);
    setUploadingVideo(true);

    try {
      const response = await fetch("http://localhost:5000/api/upload/video", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });
      console.log("Odgovor:", response); // DODAJ OVO
      const data = await response.json();
      console.log("Podaci:", data); // DODAJ OVO
      if (data.success) {
        setVideoGalerija([
          ...videoGalerija,
          {
            url: data.data.url,
            publicId: data.data.publicId,
            thumbnail: data.data.thumbnail || "",
            naziv: videoNaziv || `Video ${videoGalerija.length + 1}`,
            trajanje: data.data.duration || 0,
          },
        ]);
        setNoviVideo(null);
        setVideoNaziv("");
      }
    } catch (error) {
      console.error("Greška pri uploadu videa:", error);
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleDrustveneMrezeChange = (e) => {
    const { name, value } = e.target;
    setDrustveneMreze((prev) => ({ ...prev, [name]: value }));
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNoviVideo(file);
    }
  };

  const handleAddVideo = () => {
    if (noviVideo) {
      uploadVideo(noviVideo);
    }
  };

  const handleRemoveVideo = (index) => {
    setVideoGalerija(videoGalerija.filter((_, i) => i !== index));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleRadnoVremeChange = (dan, tip, value) => {
    setRadnoVreme((prev) => ({
      ...prev,
      [dan]: {
        ...prev[dan],
        [tip]: value,
      },
    }));
  };

  const toggleDan = (dan) => {
    setRadnoVreme((prev) => ({
      ...prev,
      [dan]: {
        ...prev[dan],
        radi: !prev[dan].radi,
      },
    }));
  };

  // Dodavanje cene
  const handleAddCena = () => {
    if (novaCena.naziv.trim() && novaCena.cena) {
      setCene([
        ...cene,
        {
          naziv: novaCena.naziv.trim(),
          cena: parseInt(novaCena.cena),
          opis: novaCena.opis || "",
        },
      ]);
      setNovaCena({ naziv: "", cena: "", opis: "" });
    }
  };

  const handleRemoveCena = (index) => {
    setCene(cene.filter((_, i) => i !== index));
  };

  // Dodavanje paketa
  const handleAddPaket = () => {
    if (noviPaket.naziv.trim() && noviPaket.cena) {
      setPaketi([
        ...paketi,
        {
          naziv: noviPaket.naziv.trim(),
          cena: parseInt(noviPaket.cena),
          opis: noviPaket.opis || "",
        },
      ]);
      setNoviPaket({ naziv: "", cena: "", opis: "" });
    }
  };

  const handleRemovePaket = (index) => {
    setPaketi(paketi.filter((_, i) => i !== index));
  };

  // Dodavanje dodatne usluge
  const handleAddUsluga = () => {
    if (novaUsluga.naziv.trim() && novaUsluga.cena) {
      setDodatneUsluge([
        ...dodatneUsluge,
        {
          naziv: novaUsluga.naziv.trim(),
          cena: parseInt(novaUsluga.cena),
          opis: novaUsluga.opis || "",
          tip: novaUsluga.tip,
        },
      ]);
      setNovaUsluga({ naziv: "", cena: "", opis: "", tip: "fiksno" });
    }
  };

  const handleRemoveUsluga = (index) => {
    setDodatneUsluge(dodatneUsluge.filter((_, i) => i !== index));
  };

  // Dodavanje besplatne pogodnosti
  const handleAddPogodnost = () => {
    if (novaPogodnost.trim()) {
      setBesplatnePogodnosti([...besplatnePogodnosti, novaPogodnost.trim()]);
      setNovaPogodnost("");
    }
  };

  const handleRemovePogodnost = (index) => {
    setBesplatnePogodnosti(besplatnePogodnosti.filter((_, i) => i !== index));
  };

  // Upload slike
  const uploadImage = async (file, isProfilna = false) => {
    const formDataUpload = new FormData();
    formDataUpload.append("image", file);
    setUploading(true);

    try {
      const response = await fetch("http://localhost:5000/api/upload/temp", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formDataUpload,
      });
      const data = await response.json();
      if (data.success) {
        if (isProfilna) {
          setProfilnaSlika(data.data);
        } else {
          setSlike([...slike, data.data]);
        }
      }
    } catch (error) {
      console.error("Greška pri uploadu:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e, isProfilna = false) => {
    const file = e.target.files[0];
    if (file) {
      uploadImage(file, isProfilna);
    }
  };

  const removeImage = (index) => {
    setSlike(slike.filter((_, i) => i !== index));
  };

  const removeProfilna = () => {
    setProfilnaSlika(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const submitData = {
      ...formData,
      kapacitet: {
        deca: parseInt(formData.kapacitet.deca),
        roditelji: formData.kapacitet.roditelji
          ? parseInt(formData.kapacitet.roditelji)
          : 0,
      },
      osnovnaCena: parseInt(formData.osnovnaCena),
      cene: cene,
      paketi: paketi,
      dodatneUsluge: dodatneUsluge,
      besplatnePogodnosti: besplatnePogodnosti,
      profilnaSlika: profilnaSlika,
      slike: slike,
      videoGalerija: videoGalerija,
      drustveneMreze: drustveneMreze,
      radnoVreme: {},
    };

    for (const [dan, vreme] of Object.entries(radnoVreme)) {
      if (vreme.radi) {
        submitData.radnoVreme[dan] = { od: vreme.od, do: vreme.do, radi: true };
      } else {
        submitData.radnoVreme[dan] = { radi: false };
      }
    }

    console.log("Šaljem podatke:", {
      ...submitData,
      videoGalerija: videoGalerija,
    });
    onSubmit(submitData);
  };

  const dani = [
    { key: "ponedeljak", naziv: "Ponedeljak" },
    { key: "utorak", naziv: "Utorak" },
    { key: "sreda", naziv: "Sreda" },
    { key: "cetvrtak", naziv: "Četvrtak" },
    { key: "petak", naziv: "Petak" },
    { key: "subota", naziv: "Subota" },
    { key: "nedelja", naziv: "Nedelja" },
  ];

  return (
    <form onSubmit={handleSubmit} className="edit-form full-form">
      <h2>{isEditing ? "✏️ Uredi igraonicu" : "✨ Dodaj novu igraonicu"}</h2>

      {/* Osnovni podaci */}
      <div className="form-section">
        <h3>📋 Osnovni podaci</h3>
        <div className="form-group">
          <label>Naziv igraonice *</label>
          <input
            type="text"
            name="naziv"
            value={formData.naziv}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Adresa *</label>
            <input
              type="text"
              name="adresa"
              value={formData.adresa}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Grad *</label>
            <input
              type="text"
              name="grad"
              value={formData.grad}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        <div className="form-group">
          <label>Opis *</label>
          <textarea
            name="opis"
            rows="4"
            value={formData.opis}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Kontakt telefon *</label>
            <input
              type="tel"
              name="kontaktTelefon"
              value={formData.kontaktTelefon}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Kontakt email *</label>
            <input
              type="email"
              name="kontaktEmail"
              value={formData.kontaktEmail}
              onChange={handleChange}
              required
            />
          </div>
        </div>
      </div>

      {/* Kapacitet */}
      <div className="form-section">
        <h3>👥 Kapacitet</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Kapacitet dece *</label>
            <input
              type="number"
              name="kapacitet.deca"
              value={formData.kapacitet.deca}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Kapacitet roditelja (opciono)</label>
            <input
              type="number"
              name="kapacitet.roditelji"
              value={formData.kapacitet.roditelji}
              onChange={handleChange}
              placeholder="0 = neograničeno"
            />
          </div>
        </div>
      </div>

      {/* Slike */}
      <div className="form-section">
        <h3>🖼️ Slike</h3>
        <div className="form-group">
          <label>Profilna slika</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, true)}
            disabled={uploading}
          />
          {profilnaSlika && (
            <div className="uploaded-image">
              <img src={profilnaSlika.url} alt="Profilna" />
              <button type="button" onClick={removeProfilna}>
                ✖ Ukloni
              </button>
            </div>
          )}
        </div>
        <div className="form-group">
          <label>Ostale slike (maks. 10)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, false)}
            disabled={slike.length >= 10 || uploading}
          />
          <div className="image-list">
            {slike.map((img, idx) => (
              <div key={idx} className="image-item">
                <img src={img.url} alt={`Slika ${idx + 1}`} />
                <button type="button" onClick={() => removeImage(idx)}>
                  ✖
                </button>
              </div>
            ))}
          </div>
          {slike.length >= 10 && <p className="warning">Maksimalno 10 slika</p>}
        </div>
      </div>

      {/* Video galerija */}
      <div className="form-section">
        <h3>🎥 Video galerija (maks. 3)</h3>
        <p className="section-hint">
          Dodajte video snimke sa rođendana, događaja ili prikaza igraonice
        </p>

        <div className="dynamic-input">
          <div className="add-item">
            <input
              type="text"
              placeholder="Naziv videa (npr. Rođendan 2024)"
              value={videoNaziv}
              onChange={(e) => setVideoNaziv(e.target.value)}
            />
            <input
              type="file"
              accept="video/*"
              onChange={handleVideoChange}
              disabled={uploadingVideo || videoGalerija.length >= 3}
            />
            <button
              type="button"
              onClick={handleAddVideo}
              disabled={
                !noviVideo || uploadingVideo || videoGalerija.length >= 3
              }
            >
              {uploadingVideo ? "Upload..." : "+ Dodaj video"}
            </button>
          </div>

          {videoGalerija.length > 0 && (
            <div className="videos-list">
              <h4>Postavljeni video snimci:</h4>
              {videoGalerija.map((video, idx) => (
                <div key={idx} className="video-item-preview">
                  <div className="video-preview">
                    <video
                      controls
                      className="video-preview-player"
                      src={video.url}
                      style={{ width: "200px", borderRadius: "8px" }}
                    />
                    <div className="video-info">
                      <span className="video-name">{video.naziv}</span>
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
                    >
                      ✖ Obriši
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {videoGalerija.length >= 3 && (
            <p className="warning">
              Maksimalan broj video snimaka (3) je dostignut.
            </p>
          )}
        </div>
      </div>

      {/* Osnovna cena */}
      <div className="form-section">
        <h3>💰 Osnovna cena</h3>
        <div className="form-group">
          <label>Osnovna cena po detetu (RSD) *</label>
          <input
            type="number"
            name="osnovnaCena"
            value={formData.osnovnaCena}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      {/* Ostale cene */}
      <div className="form-section">
        <h3>💰 Ostale cene</h3>
        <div className="dynamic-input">
          <div className="add-item">
            <input
              type="text"
              placeholder="Naziv"
              value={novaCena.naziv}
              onChange={(e) =>
                setNovaCena({ ...novaCena, naziv: e.target.value })
              }
            />
            <input
              type="number"
              placeholder="Cena (RSD)"
              value={novaCena.cena}
              onChange={(e) =>
                setNovaCena({ ...novaCena, cena: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="Opis"
              value={novaCena.opis}
              onChange={(e) =>
                setNovaCena({ ...novaCena, opis: e.target.value })
              }
            />
            <button type="button" onClick={handleAddCena}>
              + Dodaj
            </button>
          </div>
          {cene.length > 0 && (
            <div className="items-list">
              {cene.map((item, idx) => (
                <div key={idx} className="item">
                  <span>
                    <strong>{item.naziv}</strong> - {item.cena} RSD
                  </span>
                  {item.opis && (
                    <span className="item-opis">({item.opis})</span>
                  )}
                  <button type="button" onClick={() => handleRemoveCena(idx)}>
                    ✖
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Paketi */}
      <div className="form-section">
        <h3>🎁 Paketi</h3>
        <div className="dynamic-input">
          <div className="add-item">
            <input
              type="text"
              placeholder="Naziv paketa"
              value={noviPaket.naziv}
              onChange={(e) =>
                setNoviPaket({ ...noviPaket, naziv: e.target.value })
              }
            />
            <input
              type="number"
              placeholder="Cena (RSD)"
              value={noviPaket.cena}
              onChange={(e) =>
                setNoviPaket({ ...noviPaket, cena: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="Opis"
              value={noviPaket.opis}
              onChange={(e) =>
                setNoviPaket({ ...noviPaket, opis: e.target.value })
              }
            />
            <button type="button" onClick={handleAddPaket}>
              + Dodaj paket
            </button>
          </div>
          {paketi.length > 0 && (
            <div className="items-list">
              {paketi.map((item, idx) => (
                <div key={idx} className="item">
                  <span>
                    <strong>{item.naziv}</strong> - {item.cena} RSD
                  </span>
                  {item.opis && (
                    <span className="item-opis">({item.opis})</span>
                  )}
                  <button type="button" onClick={() => handleRemovePaket(idx)}>
                    ✖
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dodatne usluge */}
      <div className="form-section">
        <h3>🎪 Dodatne usluge</h3>
        <div className="dynamic-input">
          <div className="add-item">
            <input
              type="text"
              placeholder="Naziv usluge"
              value={novaUsluga.naziv}
              onChange={(e) =>
                setNovaUsluga({ ...novaUsluga, naziv: e.target.value })
              }
            />
            <input
              type="number"
              placeholder="Cena (RSD)"
              value={novaUsluga.cena}
              onChange={(e) =>
                setNovaUsluga({ ...novaUsluga, cena: e.target.value })
              }
            />
            <select
              value={novaUsluga.tip}
              onChange={(e) =>
                setNovaUsluga({ ...novaUsluga, tip: e.target.value })
              }
            >
              <option value="fiksno">Fiksna cena</option>
              <option value="po_osobi">Cena po osobi</option>
            </select>
            <input
              type="text"
              placeholder="Opis"
              value={novaUsluga.opis}
              onChange={(e) =>
                setNovaUsluga({ ...novaUsluga, opis: e.target.value })
              }
            />
            <button type="button" onClick={handleAddUsluga}>
              + Dodaj
            </button>
          </div>
          {dodatneUsluge.length > 0 && (
            <div className="items-list">
              {dodatneUsluge.map((item, idx) => (
                <div key={idx} className="item">
                  <span>
                    <strong>{item.naziv}</strong> - {item.cena} RSD
                  </span>
                  <span className="item-type">
                    {item.tip === "po_osobi" ? "(po osobi)" : "(fiksno)"}
                  </span>
                  {item.opis && (
                    <span className="item-opis">({item.opis})</span>
                  )}
                  <button type="button" onClick={() => handleRemoveUsluga(idx)}>
                    ✖
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Besplatne pogodnosti */}
      <div className="form-section">
        <h3>✨ Besplatne pogodnosti</h3>
        <div className="dynamic-input">
          <div className="add-item-simple">
            <input
              type="text"
              placeholder="Naziv pogodnosti"
              value={novaPogodnost}
              onChange={(e) => setNovaPogodnost(e.target.value)}
            />
            <button type="button" onClick={handleAddPogodnost}>
              + Dodaj
            </button>
          </div>
          {besplatnePogodnosti.length > 0 && (
            <div className="items-list">
              {besplatnePogodnosti.map((item, idx) => (
                <div key={idx} className="item">
                  <span>✓ {item}</span>
                  <button
                    type="button"
                    onClick={() => handleRemovePogodnost(idx)}
                  >
                    ✖
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Društvene mreže */}
      <div className="form-section">
        <h3>🌐 Društvene mreže</h3>
        <p className="section-hint">
          Dodajte linkove ka vašim profilima (opciono)
        </p>

        <div className="form-group">
          <label>📸 Instagram</label>
          <input
            type="url"
            name="instagram"
            value={drustveneMreze.instagram}
            onChange={handleDrustveneMrezeChange}
            placeholder="https://www.instagram.com/vas_profil/"
          />
        </div>

        <div className="form-group">
          <label>📘 Facebook</label>
          <input
            type="url"
            name="facebook"
            value={drustveneMreze.facebook}
            onChange={handleDrustveneMrezeChange}
            placeholder="https://www.facebook.com/vas_profil/"
          />
        </div>

        <div className="form-group">
          <label>🎵 TikTok</label>
          <input
            type="url"
            name="tiktok"
            value={drustveneMreze.tiktok}
            onChange={handleDrustveneMrezeChange}
            placeholder="https://www.tiktok.com/@vas_profil"
          />
        </div>

        <div className="form-group">
          <label>🌐 Veb sajt</label>
          <input
            type="url"
            name="website"
            value={drustveneMreze.website}
            onChange={handleDrustveneMrezeChange}
            placeholder="https://www.vas-sajt.com"
          />
        </div>
      </div>

      {/* Radno vreme */}
      <div className="form-section">
        <h3>⏰ Radno vreme</h3>
        {dani.map((dan) => (
          <div key={dan.key} className="radno-vreme-row">
            <label className="dan-checkbox">
              <input
                type="checkbox"
                checked={radnoVreme[dan.key].radi}
                onChange={() => toggleDan(dan.key)}
              />
              <span className="dan-naziv">{dan.naziv}</span>
            </label>
            {radnoVreme[dan.key].radi && (
              <div className="vreme-inputs">
                <input
                  type="time"
                  value={radnoVreme[dan.key].od}
                  onChange={(e) =>
                    handleRadnoVremeChange(dan.key, "od", e.target.value)
                  }
                  className="time-input"
                />
                <span className="time-separator">-</span>
                <input
                  type="time"
                  value={radnoVreme[dan.key].do}
                  onChange={(e) =>
                    handleRadnoVremeChange(dan.key, "do", e.target.value)
                  }
                  className="time-input"
                />
              </div>
            )}
            {!radnoVreme[dan.key].radi && (
              <span className="closed-text">Zatvoreno</span>
            )}
          </div>
        ))}
      </div>

      <div className="form-actions">
        <button type="button" className="btn-cancel" onClick={onCancel}>
          Otkaži
        </button>
        <button type="submit" className="btn-submit" disabled={uploading}>
          {uploading ? "Upload slika..." : "💾 Sačuvaj promene"}
        </button>
      </div>
    </form>
  );
};

export default PlayroomForm;
