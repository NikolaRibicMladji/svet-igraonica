import React, { useEffect, useMemo, useState } from "react";
import "../styles/CreatePlayroom.css";

const DEFAULT_RADNO_VREME = {
  ponedeljak: { od: "09:00", do: "20:00", radi: true },
  utorak: { od: "09:00", do: "20:00", radi: true },
  sreda: { od: "09:00", do: "20:00", radi: true },
  cetvrtak: { od: "09:00", do: "20:00", radi: true },
  petak: { od: "09:00", do: "20:00", radi: true },
  subota: { od: "10:00", do: "22:00", radi: true },
  nedelja: { od: "10:00", do: "21:00", radi: true },
};

const DEFAULT_DRUSTVENE_MREZE = {
  instagram: "",
  facebook: "",
  tiktok: "",
  website: "",
};

const DEFAULT_CENA_RODITELJA = {
  tip: "ne_naplacuje",
  iznos: "",
};

const API_BASE_URL =
  process.env.REACT_APP_API_URL?.replace(/\/$/, "") || "http://localhost:5000";

const IMAGE_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const VIDEO_MAX_SIZE = 50 * 1024 * 1024; // 50MB

const getAuthToken = () =>
  localStorage.getItem("accessToken") || localStorage.getItem("token") || "";

const toNumberOrZero = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const sanitizeText = (value) => (typeof value === "string" ? value.trim() : "");

const normalizeImageItem = (item) => {
  if (!item) return null;

  if (typeof item === "string") {
    return { url: item };
  }

  return {
    ...item,
    url: item.url || item.secure_url || item.path || "",
  };
};

const normalizeVideoItem = (item) => {
  if (!item) return null;

  return {
    ...item,
    url: item.url || item.secure_url || item.path || "",
    publicId: item.publicId || item.public_id || "",
    thumbnail: item.thumbnail || "",
    naziv: item.naziv || "",
    trajanje: Number(item.trajanje || item.duration || 0),
  };
};

const PlayroomForm = ({
  initialData,
  onSubmit,
  onCancel,
  isEditing = false,
}) => {
  const initialFormData = useMemo(
    () => ({
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
    }),
    [initialData],
  );

  const [formData, setFormData] = useState(initialFormData);
  const [cene, setCene] = useState(
    Array.isArray(initialData?.cene) ? initialData.cene : [],
  );
  const [novaCena, setNovaCena] = useState({
    naziv: "",
    cena: "",
    opis: "",
    tip: "fiksno",
  });

  const [videoGalerija, setVideoGalerija] = useState(
    Array.isArray(initialData?.videoGalerija)
      ? initialData.videoGalerija
          .map(normalizeVideoItem)
          .filter((item) => item?.url)
      : [],
  );
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [noviVideo, setNoviVideo] = useState([]);
  const [videoNaziv, setVideoNaziv] = useState("");

  const [error, setError] = useState("");
  const [paketi, setPaketi] = useState(
    Array.isArray(initialData?.paketi) ? initialData.paketi : [],
  );
  const [noviPaket, setNoviPaket] = useState({ naziv: "", cena: "", opis: "" });

  const [cenaRoditelja, setCenaRoditelja] = useState(
    initialData?.cenaRoditelja || DEFAULT_CENA_RODITELJA,
  );

  const [dodatneUsluge, setDodatneUsluge] = useState(
    Array.isArray(initialData?.dodatneUsluge) ? initialData.dodatneUsluge : [],
  );
  const [novaUsluga, setNovaUsluga] = useState({
    naziv: "",
    cena: "",
    opis: "",
    tip: "fiksno",
  });

  const [besplatnePogodnosti, setBesplatnePogodnosti] = useState(
    Array.isArray(initialData?.besplatnePogodnosti)
      ? initialData.besplatnePogodnosti
      : [],
  );
  const [novaPogodnost, setNovaPogodnost] = useState("");

  const [profilnaSlika, setProfilnaSlika] = useState(
    normalizeImageItem(initialData?.profilnaSlika),
  );
  const [slike, setSlike] = useState(
    Array.isArray(initialData?.slike)
      ? initialData.slike.map(normalizeImageItem).filter((item) => item?.url)
      : [],
  );
  const [uploading, setUploading] = useState(false);

  const [drustveneMreze, setDrustveneMreze] = useState({
    ...DEFAULT_DRUSTVENE_MREZE,
    ...(initialData?.drustveneMreze || {}),
  });

  const [radnoVreme, setRadnoVreme] = useState({
    ...DEFAULT_RADNO_VREME,
    ...(initialData?.radnoVreme || {}),
  });

  useEffect(() => {
    setFormData(initialFormData);
  }, [initialFormData]);

  useEffect(() => {
    if (!error) return;

    const timer = setTimeout(() => {
      setError("");
    }, 6000);

    return () => clearTimeout(timer);
  }, [error]);

  const handleCenaRoditeljaChange = (e) => {
    const { name, value } = e.target;
    setCenaRoditelja((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "tip" && value === "ne_naplacuje" ? { iznos: "" } : {}),
    }));
  };

  const uploadVideo = async (file) => {
    if (!file) return null;

    const formDataUpload = new FormData();
    formDataUpload.append("video", file);

    const response = await fetch(`${API_BASE_URL}/api/upload/video`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: formDataUpload,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data?.message || "Greška pri uploadu videa.");
    }

    return {
      url: data.data.url,
      publicId: data.data.publicId || data.data.public_id || "",
      thumbnail: data.data.thumbnail || "",
      naziv: sanitizeText(videoNaziv) || file.name || "Video",
      trajanje: Number(data.data.duration || 0),
    };
  };

  const handleDrustveneMrezeChange = (e) => {
    const { name, value } = e.target;
    setDrustveneMreze((prev) => ({ ...prev, [name]: value }));
  };

  const handleVideoChange = (e) => {
    const files = Array.from(e.target.files || []);

    if (!files.length) return;

    const remainingSlots = Math.max(0, 3 - videoGalerija.length);

    if (remainingSlots === 0) {
      setError("Možete imati najviše 3 videa.");
      e.target.value = "";
      return;
    }

    const selectedFiles = files.slice(0, remainingSlots);
    const validFiles = [];
    const oversizedFiles = [];

    for (const file of selectedFiles) {
      if (file.size > VIDEO_MAX_SIZE) {
        oversizedFiles.push(file.name);
      } else {
        validFiles.push(file);
      }
    }

    if (oversizedFiles.length > 0) {
      setError(
        `Ovi video fajlovi prelaze 50 MB: ${oversizedFiles.join(", ")}.`,
      );
    } else if (files.length > remainingSlots) {
      setError(`Možete dodati još samo ${remainingSlots} video snimka.`);
    } else {
      setError("");
    }

    setNoviVideo(validFiles);
    e.target.value = "";
  };

  const handleAddVideo = async () => {
    if (!noviVideo.length) {
      setError("Izaberi bar jedan video fajl.");
      return;
    }

    if (videoGalerija.length >= 3) {
      setError("Maksimalno 3 video snimka mogu biti dodata.");
      return;
    }

    const remainingSlots = 3 - videoGalerija.length;
    const filesToUpload = noviVideo.slice(0, remainingSlots);

    setUploadingVideo(true);
    setError("");

    try {
      const uploadedVideos = [];

      for (const file of filesToUpload) {
        const uploadedVideo = await uploadVideo(file);
        if (uploadedVideo) {
          uploadedVideos.push(uploadedVideo);
        }
      }

      setVideoGalerija((prev) => [...prev, ...uploadedVideos]);
      setNoviVideo([]);
      setVideoNaziv("");
    } catch (err) {
      console.error("Greška pri uploadu videa:", err);
      setError(err.message || "Upload videa nije uspeo.");
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleRemoveVideo = (index) => {
    setVideoGalerija((prev) => prev.filter((_, i) => i !== index));
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
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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

  const handleAddCena = () => {
    const naziv = sanitizeText(novaCena.naziv);
    const cena = Number(novaCena.cena);

    if (!naziv || !Number.isFinite(cena) || cena <= 0) return;

    setCene((prev) => [
      ...prev,
      {
        naziv,
        cena,
        tip: novaCena.tip || "fiksno",
        opis: sanitizeText(novaCena.opis),
      },
    ]);

    setNovaCena({ naziv: "", cena: "", opis: "", tip: "fiksno" });
  };

  const handleRemoveCena = (index) => {
    setCene((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddPaket = () => {
    const naziv = sanitizeText(noviPaket.naziv);
    const cena = Number(noviPaket.cena);

    if (!naziv || !Number.isFinite(cena) || cena <= 0) return;

    setPaketi((prev) => [
      ...prev,
      {
        naziv,
        cena,
        opis: sanitizeText(noviPaket.opis),
      },
    ]);

    setNoviPaket({ naziv: "", cena: "", opis: "" });
  };

  const handleRemovePaket = (index) => {
    setPaketi((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddUsluga = () => {
    const naziv = sanitizeText(novaUsluga.naziv);
    const cena = Number(novaUsluga.cena);

    if (!naziv || !Number.isFinite(cena) || cena <= 0) return;

    setDodatneUsluge((prev) => [
      ...prev,
      {
        naziv,
        cena,
        opis: sanitizeText(novaUsluga.opis),
        tip: novaUsluga.tip || "fiksno",
      },
    ]);

    setNovaUsluga({ naziv: "", cena: "", opis: "", tip: "fiksno" });
  };

  const handleRemoveUsluga = (index) => {
    setDodatneUsluge((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddPogodnost = () => {
    const vrednost = sanitizeText(novaPogodnost);
    if (!vrednost) return;
    if (besplatnePogodnosti.includes(vrednost)) {
      setNovaPogodnost("");
      return;
    }

    setBesplatnePogodnosti((prev) => [...prev, vrednost]);
    setNovaPogodnost("");
  };

  const handleRemovePogodnost = (index) => {
    setBesplatnePogodnosti((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImage = async (file, isProfilna = false) => {
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append("image", file);

    setUploading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/temp-upload/temp`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: formDataUpload,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data?.message || "Greška pri uploadu slike.");
      }

      if (isProfilna) {
        setProfilnaSlika(data.data);
      } else {
        setSlike((prev) => [...prev, data.data]);
      }
    } catch (err) {
      console.error("Greška pri uploadu slike:", err);
      setError(err.message || "Upload slike nije uspeo.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (e, isProfilna = false) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setError("");

    if (isProfilna) {
      const file = files[0];

      if (file.size > IMAGE_MAX_SIZE) {
        setError("Profilna slika ne sme biti veća od 10 MB.");
        e.target.value = "";
        return;
      }

      await uploadImage(file, true);
      e.target.value = "";
      return;
    }

    if (slike.length >= 10) {
      setError("Maksimalno 10 slika može biti dodato.");
      e.target.value = "";
      return;
    }

    const remainingSlots = 10 - slike.length;
    const filesToUpload = files.slice(0, remainingSlots);

    for (const file of filesToUpload) {
      if (file.size > IMAGE_MAX_SIZE) {
        setError(`Slika "${file.name}" je veća od 10 MB.`);
        continue;
      }

      await uploadImage(file, false);
    }

    if (files.length > remainingSlots) {
      setError(`Možete dodati još samo ${remainingSlots} slika.`);
    }

    e.target.value = "";
  };

  const removeImage = (index) => {
    setSlike((prev) => prev.filter((_, i) => i !== index));
  };

  const removeProfilna = () => {
    setProfilnaSlika(null);
  };

  const validateForm = () => {
    if (!sanitizeText(formData.naziv)) return "Naziv igraonice je obavezan.";
    if (!sanitizeText(formData.adresa)) return "Adresa je obavezna.";
    if (!sanitizeText(formData.grad)) return "Grad je obavezan.";
    if (!sanitizeText(formData.opis)) return "Opis je obavezan.";
    if (!sanitizeText(formData.kontaktTelefon))
      return "Kontakt telefon je obavezan.";
    if (!sanitizeText(formData.kontaktEmail))
      return "Kontakt email je obavezan.";

    const kapacitetDece = Number(formData.kapacitet.deca);
    if (!Number.isFinite(kapacitetDece) || kapacitetDece < 1) {
      return "Kapacitet dece mora biti najmanje 1.";
    }

    const osnovnaCena = Number(formData.osnovnaCena);
    if (!Number.isFinite(osnovnaCena) || osnovnaCena < 0) {
      return "Osnovna cena mora biti validan broj.";
    }

    if (
      cenaRoditelja.tip !== "ne_naplacuje" &&
      (!Number.isFinite(Number(cenaRoditelja.iznos)) ||
        Number(cenaRoditelja.iznos) < 0)
    ) {
      return "Cena za roditelje mora biti validan broj.";
    }

    for (const [dan, vreme] of Object.entries(radnoVreme)) {
      if (vreme?.radi && vreme.od && vreme.do && vreme.od >= vreme.do) {
        return `Radno vreme nije ispravno za dan: ${dan}.`;
      }
    }

    return "";
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    const validationMessage = validateForm();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    const submitData = {
      ...formData,
      naziv: sanitizeText(formData.naziv),
      adresa: sanitizeText(formData.adresa),
      grad: sanitizeText(formData.grad),
      opis: sanitizeText(formData.opis),
      kontaktTelefon: sanitizeText(formData.kontaktTelefon),
      kontaktEmail: sanitizeText(formData.kontaktEmail),
      kapacitet: {
        deca: toNumberOrZero(formData.kapacitet.deca),
        roditelji: formData.kapacitet.roditelji
          ? toNumberOrZero(formData.kapacitet.roditelji)
          : 0,
      },
      osnovnaCena: toNumberOrZero(formData.osnovnaCena),
      cene,
      paketi,
      dodatneUsluge,
      besplatnePogodnosti,
      profilnaSlika,
      slike,
      videoGalerija,
      drustveneMreze: {
        instagram: sanitizeText(drustveneMreze.instagram),
        facebook: sanitizeText(drustveneMreze.facebook),
        tiktok: sanitizeText(drustveneMreze.tiktok),
        website: sanitizeText(drustveneMreze.website),
      },
      cenaRoditelja: {
        tip: cenaRoditelja.tip,
        iznos:
          cenaRoditelja.tip === "ne_naplacuje"
            ? 0
            : toNumberOrZero(cenaRoditelja.iznos),
      },
      radnoVreme: {},
    };

    for (const [dan, vreme] of Object.entries(radnoVreme)) {
      if (vreme.radi) {
        submitData.radnoVreme[dan] = {
          od: vreme.od,
          do: vreme.do,
          radi: true,
        };
      } else {
        submitData.radnoVreme[dan] = {
          radi: false,
        };
      }
    }

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

      {error && <div className="error-message">{error}</div>}

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

      <div className="form-section">
        <h3>👥 Kapacitet</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Kapacitet dece *</label>
            <input
              type="number"
              min="1"
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
              min="0"
              name="kapacitet.roditelji"
              value={formData.kapacitet.roditelji}
              onChange={handleChange}
              placeholder="0 = neograničeno"
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>🖼️ Slike</h3>

        <div className="form-group">
          <label>Profilna slika</label>
          <small className="upload-hint">Maks. 10 MB po slici</small>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, true)}
            disabled={uploading}
          />
          {profilnaSlika?.url && (
            <div className="uploaded-image">
              <img src={profilnaSlika.url} alt="Profilna slika" />
              <button type="button" onClick={removeProfilna}>
                ✖ Ukloni
              </button>
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Ostale slike (maks. 10)</label>
          <small className="upload-hint">Maks. 10 MB po slici</small>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFileChange(e, false)}
            disabled={slike.length >= 10 || uploading}
          />

          <div className="image-list">
            {slike.map((img, idx) => (
              <div
                key={img.publicId || img.public_id || img.url || idx}
                className="image-item"
              >
                <img src={img.url} alt={`Slika ${idx + 1}`} />
                <button type="button" onClick={() => removeImage(idx)}>
                  ✖
                </button>
              </div>
            ))}
          </div>

          {slike.length >= 10 && (
            <p className="warning">Maksimalno 10 slika.</p>
          )}
        </div>
      </div>

      <div className="form-section">
        <h3>🎥 Video galerija (maks. 3)</h3>

        <p className="section-hint">
          Dodaj video snimke sa rođendana, događaja ili prikaza igraonice (maks.
          50 MB po videu).
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
              multiple
              onChange={handleVideoChange}
              disabled={uploadingVideo || videoGalerija.length >= 3}
            />

            <button
              type="button"
              onClick={handleAddVideo}
              disabled={
                noviVideo.length === 0 ||
                uploadingVideo ||
                videoGalerija.length >= 3
              }
            >
              {uploadingVideo ? "Uploadujem..." : "+ Dodaj video"}
            </button>
          </div>

          {noviVideo.length > 0 && (
            <div className="items-list">
              {noviVideo.map((file, idx) => (
                <div key={`${file.name}-${idx}`} className="item">
                  <span>{file.name}</span>
                </div>
              ))}
            </div>
          )}

          {videoGalerija.length > 0 && (
            <div className="videos-list">
              <h4>Postavljeni video snimci:</h4>
              {videoGalerija.map((video, idx) => (
                <div
                  key={video.publicId || video.url || idx}
                  className="video-item-preview"
                >
                  <div className="video-preview">
                    <video
                      controls
                      className="video-preview-player"
                      src={video.url}
                      style={{ width: "200px", borderRadius: "8px" }}
                    />
                    <div className="video-info">
                      <span className="video-name">
                        {video.naziv || `Video ${idx + 1}`}
                      </span>
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
              Maksimalan broj video snimaka je dostignut.
            </p>
          )}
        </div>
      </div>

      <div className="form-section">
        <h3>💰 Osnovna cena</h3>
        <div className="form-group">
          <label>Osnovna cena po detetu (RSD) *</label>
          <input
            type="number"
            min="0"
            name="osnovnaCena"
            value={formData.osnovnaCena}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="form-section">
        <h3>👨‍👩‍👧 Cena za roditelje</h3>
        <p className="section-hint">
          Odredi da li se naplaćuje ulaz za roditelje.
        </p>

        <div className="form-group">
          <label>Način naplate</label>
          <select
            name="tip"
            value={cenaRoditelja.tip}
            onChange={handleCenaRoditeljaChange}
          >
            <option value="ne_naplacuje">Ne naplaćuje se</option>
            <option value="fiksno">
              Fiksno (bez obzira na broj roditelja)
            </option>
            <option value="po_osobi">Po osobi (svaki roditelj posebno)</option>
          </select>
        </div>

        {cenaRoditelja.tip !== "ne_naplacuje" && (
          <div className="form-group">
            <label>Cena (RSD)</label>
            <input
              type="number"
              min="0"
              name="iznos"
              value={cenaRoditelja.iznos}
              onChange={handleCenaRoditeljaChange}
              placeholder="Unesite cenu"
            />
            <small className="price-hint">
              {cenaRoditelja.tip === "fiksno"
                ? "Ova cena se dodaje jednom."
                : "Ova cena se množi sa brojem roditelja."}
            </small>
          </div>
        )}
      </div>

      <div className="form-section">
        <h3>💰 Ostale cene</h3>
        <p className="section-hint">
          Dodaj dodatne cene, na primer produženo vreme ili vikend cenu.
        </p>

        <div className="dynamic-input">
          <div className="add-item">
            <input
              type="text"
              placeholder="Naziv"
              value={novaCena.naziv}
              onChange={(e) =>
                setNovaCena((prev) => ({ ...prev, naziv: e.target.value }))
              }
            />
            <input
              type="number"
              min="0"
              placeholder="Cena (RSD)"
              value={novaCena.cena}
              onChange={(e) =>
                setNovaCena((prev) => ({ ...prev, cena: e.target.value }))
              }
            />
            <select
              value={novaCena.tip || "fiksno"}
              onChange={(e) =>
                setNovaCena((prev) => ({ ...prev, tip: e.target.value }))
              }
              style={{ flex: 1 }}
            >
              <option value="fiksno">Fiksno</option>
              <option value="po_osobi">Po osobi</option>
            </select>
            <input
              type="text"
              placeholder="Opis"
              value={novaCena.opis}
              onChange={(e) =>
                setNovaCena((prev) => ({ ...prev, opis: e.target.value }))
              }
            />
            <button type="button" onClick={handleAddCena}>
              + Dodaj
            </button>
          </div>

          {cene.length > 0 && (
            <div className="items-list">
              {cene.map((item, idx) => (
                <div key={`${item.naziv}-${idx}`} className="item">
                  <span>
                    <strong>{item.naziv}</strong> - {item.cena} RSD
                    {item.tip === "po_osobi" && (
                      <span className="item-type"> (po osobi)</span>
                    )}
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

      <div className="form-section">
        <h3>🎁 Paketi</h3>
        <div className="dynamic-input">
          <div className="add-item">
            <input
              type="text"
              placeholder="Naziv paketa"
              value={noviPaket.naziv}
              onChange={(e) =>
                setNoviPaket((prev) => ({ ...prev, naziv: e.target.value }))
              }
            />
            <input
              type="number"
              min="0"
              placeholder="Cena (RSD)"
              value={noviPaket.cena}
              onChange={(e) =>
                setNoviPaket((prev) => ({ ...prev, cena: e.target.value }))
              }
            />
            <input
              type="text"
              placeholder="Opis"
              value={noviPaket.opis}
              onChange={(e) =>
                setNoviPaket((prev) => ({ ...prev, opis: e.target.value }))
              }
            />
            <button type="button" onClick={handleAddPaket}>
              + Dodaj paket
            </button>
          </div>

          {paketi.length > 0 && (
            <div className="items-list">
              {paketi.map((item, idx) => (
                <div key={`${item.naziv}-${idx}`} className="item">
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

      <div className="form-section">
        <h3>🎪 Dodatne usluge</h3>
        <div className="dynamic-input">
          <div className="add-item">
            <input
              type="text"
              placeholder="Naziv usluge"
              value={novaUsluga.naziv}
              onChange={(e) =>
                setNovaUsluga((prev) => ({ ...prev, naziv: e.target.value }))
              }
            />
            <input
              type="number"
              min="0"
              placeholder="Cena (RSD)"
              value={novaUsluga.cena}
              onChange={(e) =>
                setNovaUsluga((prev) => ({ ...prev, cena: e.target.value }))
              }
            />
            <select
              value={novaUsluga.tip}
              onChange={(e) =>
                setNovaUsluga((prev) => ({ ...prev, tip: e.target.value }))
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
                setNovaUsluga((prev) => ({ ...prev, opis: e.target.value }))
              }
            />
            <button type="button" onClick={handleAddUsluga}>
              + Dodaj
            </button>
          </div>

          {dodatneUsluge.length > 0 && (
            <div className="items-list">
              {dodatneUsluge.map((item, idx) => (
                <div key={`${item.naziv}-${idx}`} className="item">
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
                <div key={`${item}-${idx}`} className="item">
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

      <div className="form-section">
        <h3>🌐 Društvene mreže</h3>
        <p className="section-hint">Dodaj linkove ka profilima ili sajtu.</p>

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

      <div className="form-section">
        <h3>⏰ Radno vreme</h3>
        {dani.map((dan) => (
          <div key={dan.key} className="radno-vreme-row">
            <label className="dan-checkbox">
              <input
                type="checkbox"
                checked={Boolean(radnoVreme[dan.key]?.radi)}
                onChange={() => toggleDan(dan.key)}
              />
              <span className="dan-naziv">{dan.naziv}</span>
            </label>

            {radnoVreme[dan.key]?.radi ? (
              <div className="vreme-inputs">
                <input
                  type="time"
                  value={radnoVreme[dan.key]?.od || "09:00"}
                  onChange={(e) =>
                    handleRadnoVremeChange(dan.key, "od", e.target.value)
                  }
                  className="time-input"
                />
                <span className="time-separator">-</span>
                <input
                  type="time"
                  value={radnoVreme[dan.key]?.do || "20:00"}
                  onChange={(e) =>
                    handleRadnoVremeChange(dan.key, "do", e.target.value)
                  }
                  className="time-input"
                />
              </div>
            ) : (
              <span className="closed-text">Zatvoreno</span>
            )}
          </div>
        ))}
      </div>

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
