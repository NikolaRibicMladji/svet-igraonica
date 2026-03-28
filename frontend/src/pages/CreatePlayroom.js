import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPlayroom } from "../services/playroomService";
import { useAuth } from "../context/AuthContext";
import "../styles/CreatePlayroom.css";

const CreatePlayroom = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cenaRoditelja, setCenaRoditelja] = useState({
    tip: "ne_naplacuje",
    iznos: "",
  });

  // Osnovni podaci
  const [formData, setFormData] = useState({
    naziv: "",
    adresa: "",
    grad: "",
    opis: "",
    kontaktTelefon: "",
    kontaktEmail: "",
    kapacitet: {
      deca: "",
      roditelji: "",
    },
    osnovnaCena: "",
  });

  // Dinamičke liste
  const [cene, setCene] = useState([]);
  const [novaCena, setNovaCena] = useState({
    naziv: "",
    cena: "",
    opis: "",
    tip: "fiksno",
  });

  const [paketi, setPaketi] = useState([]);
  const [noviPaket, setNoviPaket] = useState({ naziv: "", cena: "", opis: "" });

  const [dodatneUsluge, setDodatneUsluge] = useState([]);
  const [novaUsluga, setNovaUsluga] = useState({
    naziv: "",
    cena: "",
    opis: "",
    tip: "fiksno",
  });

  const [drustveneMreze, setDrustveneMreze] = useState({
    instagram: "",
    facebook: "",
    tiktok: "",
    website: "",
  });

  const [besplatnePogodnosti, setBesplatnePogodnosti] = useState([]);
  const [novaPogodnost, setNovaPogodnost] = useState("");

  // Slike
  const [profilnaSlika, setProfilnaSlika] = useState(null);
  const [slike, setSlike] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Radno vreme
  const [radnoVreme, setRadnoVreme] = useState({
    ponedeljak: { od: "09:00", do: "20:00", radi: true },
    utorak: { od: "09:00", do: "20:00", radi: true },
    sreda: { od: "09:00", do: "20:00", radi: true },
    cetvrtak: { od: "09:00", do: "20:00", radi: true },
    petak: { od: "09:00", do: "20:00", radi: true },
    subota: { od: "10:00", do: "22:00", radi: true },
    nedelja: { od: "10:00", do: "21:00", radi: true },
  });

  const handleCenaRoditeljaChange = (e) => {
    const { name, value } = e.target;
    setCenaRoditelja((prev) => ({ ...prev, [name]: value }));
  };

  const handleDrustveneMrezeChange = (e) => {
    const { name, value } = e.target;
    setDrustveneMreze((prev) => ({ ...prev, [name]: value }));
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
    setRadnoVreme({
      ...radnoVreme,
      [dan]: {
        ...radnoVreme[dan],
        [tip]: value,
      },
    });
  };

  const toggleDan = (dan) => {
    setRadnoVreme({
      ...radnoVreme,
      [dan]: {
        ...radnoVreme[dan],
        radi: !radnoVreme[dan].radi,
      },
    });
  };

  // Dodavanje cene
  const handleAddCena = () => {
    if (novaCena.naziv.trim() && novaCena.cena) {
      setCene([
        ...cene,
        {
          naziv: novaCena.naziv.trim(),
          cena: parseInt(novaCena.cena),
          tip: novaCena.tip || "fiksno",
          opis: novaCena.opis || "",
        },
      ]);
      setNovaCena({ naziv: "", cena: "", opis: "", tip: "fiksno" });
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
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("http://localhost:5000/api/upload/temp", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
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
    }
  };

  const handleFileChange = (e, isProfilna = false) => {
    const file = e.target.files[0];
    if (file) {
      uploadImage(file, isProfilna);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const playroomData = {
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
      drustveneMreze: drustveneMreze,
      radnoVreme: {},
    };

    for (const [dan, vreme] of Object.entries(radnoVreme)) {
      if (vreme.radi) {
        playroomData.radnoVreme[dan] = {
          od: vreme.od,
          do: vreme.do,
          radi: true,
        };
      } else {
        playroomData.radnoVreme[dan] = { radi: false };
      }
    }

    const result = await createPlayroom(playroomData);

    if (result.success) {
      navigate("/manage-playroom");
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  if (user?.role !== "vlasnik" && user?.role !== "admin") {
    return (
      <div className="container">
        <h1>Pristup zabranjen</h1>
        <p>Samo vlasnici igraonica mogu da kreiraju nove igraonice.</p>
      </div>
    );
  }

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
    <div className="container">
      <div className="form-container create-playroom-form">
        <h2>✨ Dodaj novu igraonicu</h2>
        <p className="form-subtitle">Unesite sve podatke o vašoj igraonici</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
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
                  value={formData.kapacitet?.deca || ""}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Kapacitet roditelja (opciono)</label>
                <input
                  type="number"
                  name="kapacitet.roditelji"
                  value={formData.kapacitet?.roditelji || ""}
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
              <label>Profilna slika (glavna slika koja se vidi na listi)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, true)}
              />
              {profilnaSlika && (
                <div className="uploaded-image">
                  <img src={profilnaSlika.url} alt="Profilna" />
                  <span>Profilna slika postavljena</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>
                Ostale slike (maksimalno 10, prikazuju se na detaljima)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, false)}
                disabled={slike.length >= 10}
              />
              <div className="image-list">
                {slike.map((img, idx) => (
                  <div key={idx} className="image-item">
                    <img src={img.url} alt={`Slika ${idx + 1}`} />
                  </div>
                ))}
                {slike.length >= 10 && (
                  <p className="warning">Maksimalno 10 slika je dodato</p>
                )}
              </div>
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

          {/* Cena za roditelje */}
          <div className="form-section">
            <h3>👨‍👩‍👧 Cena za roditelje</h3>
            <p className="section-hint">
              Odredite da li se naplaćuje ulaz za roditelje
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
                <option value="po_osobi">
                  Po osobi (svaki roditelj posebno)
                </option>
              </select>
            </div>

            {cenaRoditelja.tip !== "ne_naplacuje" && (
              <div className="form-group">
                <label>Cena (RSD)</label>
                <input
                  type="number"
                  name="iznos"
                  value={cenaRoditelja.iznos}
                  onChange={handleCenaRoditeljaChange}
                  placeholder="Unesite cenu"
                  required
                />
                <small className="price-hint">
                  {cenaRoditelja.tip === "fiksno"
                    ? "Ova cena se dodaje jednom"
                    : "Ova cena se množi sa brojem roditelja"}
                </small>
              </div>
            )}
          </div>

          {/* Ostale cene */}
          <div className="form-section">
            <h3>💰 Ostale cene</h3>
            <p className="section-hint">
              Dodajte dodatne cene (npr. "Produženo vreme", "Vikend", "Cena po
              roditelju"...)
            </p>

            <div className="dynamic-input">
              <div className="add-item">
                <input
                  type="text"
                  placeholder="Naziv *"
                  value={novaCena.naziv}
                  onChange={(e) =>
                    setNovaCena({ ...novaCena, naziv: e.target.value })
                  }
                  style={{ flex: 2 }}
                />
                <input
                  type="number"
                  placeholder="Cena (RSD) *"
                  value={novaCena.cena}
                  onChange={(e) =>
                    setNovaCena({ ...novaCena, cena: e.target.value })
                  }
                  style={{ flex: 1 }}
                />
                <select
                  value={novaCena.tip || "fiksno"}
                  onChange={(e) =>
                    setNovaCena({ ...novaCena, tip: e.target.value })
                  }
                  style={{ flex: 1 }}
                >
                  <option value="fiksno">Fiksno</option>
                  <option value="po_osobi">Po osobi</option>
                </select>
                <input
                  type="text"
                  placeholder="Opis (opciono)"
                  value={novaCena.opis}
                  onChange={(e) =>
                    setNovaCena({ ...novaCena, opis: e.target.value })
                  }
                  style={{ flex: 2 }}
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
                        {item.tip === "po_osobi" && (
                          <span className="item-type"> (po osobi)</span>
                        )}
                      </span>
                      {item.opis && (
                        <span className="item-opis">({item.opis})</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveCena(idx)}
                      >
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
            <p className="section-hint">
              Dodajte pakete (npr. "Rođendanski paket", "Porodični paket"...)
            </p>

            <div className="dynamic-input">
              <div className="add-item">
                <input
                  type="text"
                  placeholder="Naziv paketa *"
                  value={noviPaket.naziv}
                  onChange={(e) =>
                    setNoviPaket({ ...noviPaket, naziv: e.target.value })
                  }
                />
                <input
                  type="number"
                  placeholder="Cena (RSD) *"
                  value={noviPaket.cena}
                  onChange={(e) =>
                    setNoviPaket({ ...noviPaket, cena: e.target.value })
                  }
                />
                <input
                  type="text"
                  placeholder="Opis (opciono)"
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
                      <button
                        type="button"
                        onClick={() => handleRemovePaket(idx)}
                      >
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
            <p className="section-hint">
              Dodajte usluge koje roditelj može da izabere (npr. "Animator",
              "Fotograf", "Torta"...)
            </p>

            <div className="dynamic-input">
              <div className="add-item">
                <input
                  type="text"
                  placeholder="Naziv usluge *"
                  value={novaUsluga.naziv}
                  onChange={(e) =>
                    setNovaUsluga({ ...novaUsluga, naziv: e.target.value })
                  }
                />
                <input
                  type="number"
                  placeholder="Cena (RSD) *"
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
                  placeholder="Opis (opciono)"
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
                      <button
                        type="button"
                        onClick={() => handleRemoveUsluga(idx)}
                      >
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
            <p className="section-hint">
              Dodajte šta igraonica nudi besplatno (npr. "Parking", "WiFi",
              "Kafić"...)
            </p>

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
            <button
              type="button"
              className="btn-cancel"
              onClick={() => navigate("/")}
            >
              Otkaži
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? "Kreiranje..." : "✅ Kreiraj igraonicu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePlayroom;
