import { useEffect, useMemo, useState } from "react";
import { uploadImage, uploadVideo } from "../services/uploadService";
import { normalizeImageItem, normalizeVideoItem } from "../utils/media";

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

export const DEFAULT_DANI = [
  { key: "ponedeljak", naziv: "Ponedeljak" },
  { key: "utorak", naziv: "Utorak" },
  { key: "sreda", naziv: "Sreda" },
  { key: "cetvrtak", naziv: "Četvrtak" },
  { key: "petak", naziv: "Petak" },
  { key: "subota", naziv: "Subota" },
  { key: "nedelja", naziv: "Nedelja" },
];

const IMAGE_MAX_SIZE = 10 * 1024 * 1024;
const VIDEO_MAX_SIZE = 50 * 1024 * 1024;

const toNumberOrZero = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const sanitizeText = (value) => (typeof value === "string" ? value.trim() : "");

export const usePlayroomForm = ({ initialData, onSubmit }) => {
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
    tip: "fiksno",
    opis: "",
  });
  const [submitting, setSubmitting] = useState(false);
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
  const [errors, setErrors] = useState({});
  const clearFieldError = (fieldName) => {
    setErrors((prev) => {
      if (!prev[fieldName]) return prev;
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  };
  const [paketi, setPaketi] = useState(
    Array.isArray(initialData?.paketi) ? initialData.paketi : [],
  );
  const [noviPaket, setNoviPaket] = useState({
    naziv: "",
    cena: "",
    opis: "",
    tip: "fiksno",
  });

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
    setCene(Array.isArray(initialData?.cene) ? initialData.cene : []);
    setNovaCena({
      naziv: "",
      cena: "",
      opis: "",
      tip: "fiksno",
    });

    setVideoGalerija(
      Array.isArray(initialData?.videoGalerija)
        ? initialData.videoGalerija
            .map(normalizeVideoItem)
            .filter((item) => item?.url)
        : [],
    );
    setUploadingVideo(false);
    setNoviVideo([]);
    setVideoNaziv("");

    setPaketi(Array.isArray(initialData?.paketi) ? initialData.paketi : []);
    setNoviPaket({
      naziv: "",
      cena: "",
      opis: "",
      tip: "fiksno",
    });

    setDodatneUsluge(
      Array.isArray(initialData?.dodatneUsluge)
        ? initialData.dodatneUsluge
        : [],
    );
    setNovaUsluga({
      naziv: "",
      cena: "",
      opis: "",
      tip: "fiksno",
    });

    setBesplatnePogodnosti(
      Array.isArray(initialData?.besplatnePogodnosti)
        ? initialData.besplatnePogodnosti
        : [],
    );
    setNovaPogodnost("");

    setProfilnaSlika(normalizeImageItem(initialData?.profilnaSlika));
    setSlike(
      Array.isArray(initialData?.slike)
        ? initialData.slike.map(normalizeImageItem).filter((item) => item?.url)
        : [],
    );
    setUploading(false);

    setDrustveneMreze({
      ...DEFAULT_DRUSTVENE_MREZE,
      ...(initialData?.drustveneMreze || {}),
    });

    setRadnoVreme({
      ...DEFAULT_RADNO_VREME,
      ...(initialData?.radnoVreme || {}),
    });

    setError("");
    setErrors({});
  }, [initialData, initialFormData]);

  useEffect(() => {
    if (!error) return;

    const timer = setTimeout(() => {
      setError("");
    }, 6000);

    return () => clearTimeout(timer);
  }, [error]);

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
          uploadedVideos.push({
            ...uploadedVideo,
            naziv: sanitizeText(videoNaziv) || file.name || "Video",
          });
        }
      }

      setVideoGalerija((prev) => [...prev, ...uploadedVideos]);
      setNoviVideo([]);
      setVideoNaziv("");
    } catch (err) {
      console.error("Greška pri uploadu videa:", err);
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Upload videa nije uspeo.",
      );
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

      clearFieldError(name);
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    clearFieldError(name);
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
    const cena = toNumberOrZero(novaCena.cena);
    const dozvoljeniNazivi = ["Dete", "Roditelj"];

    if (!naziv) {
      setError("Izaberi naziv cene.");
      return;
    }

    if (!dozvoljeniNazivi.includes(naziv)) {
      setError('Naziv cene može biti samo "Dete" ili "Roditelj".');
      return;
    }

    if (cene.some((item) => item.naziv === naziv)) {
      setError(`Cena za "${naziv}" već postoji.`);
      return;
    }

    if (cena <= 0) {
      setError("Unesi ispravnu cenu.");
      return;
    }

    setCene((prev) => [
      ...prev,
      {
        naziv,
        cena,
        tip: novaCena.tip || "fiksno",
        opis: sanitizeText(novaCena.opis),
      },
    ]);

    setNovaCena({
      naziv: "",
      cena: "",
      tip: "fiksno",
      opis: "",
    });

    setError("");
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
        tip: noviPaket.tip || "fiksno",
      },
    ]);

    setNoviPaket({
      naziv: "",
      cena: "",
      opis: "",
      tip: "fiksno",
    });
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

    if (
      besplatnePogodnosti.some(
        (p) => p.toLowerCase() === vrednost.toLowerCase(),
      )
    ) {
      setNovaPogodnost("");
      return;
    }

    setBesplatnePogodnosti((prev) => [...prev, vrednost]);
    setNovaPogodnost("");
  };

  const handleRemovePogodnost = (index) => {
    setBesplatnePogodnosti((prev) => prev.filter((_, i) => i !== index));
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

      setUploading(true);

      try {
        const uploaded = await uploadImage(file);
        setProfilnaSlika(uploaded);
      } catch (err) {
        console.error("Greška pri uploadu slike:", err);
        setError(
          err?.response?.data?.message ||
            err.message ||
            "Upload slike nije uspeo.",
        );
      } finally {
        setUploading(false);
      }

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

    setUploading(true);

    try {
      for (const file of filesToUpload) {
        if (file.size > IMAGE_MAX_SIZE) {
          setError(`Slika "${file.name}" je veća od 10 MB.`);
          continue;
        }

        const uploaded = await uploadImage(file);
        setSlike((prev) => [...prev, uploaded]);
      }
    } catch (err) {
      console.error("Greška pri uploadu slike:", err);
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Upload slike nije uspeo.",
      );
    } finally {
      setUploading(false);
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
    const newErrors = {};

    if (!sanitizeText(formData.naziv)) {
      newErrors.naziv = "Naziv je obavezan.";
    }

    if (!sanitizeText(formData.adresa)) {
      newErrors.adresa = "Adresa je obavezna.";
    }

    if (!sanitizeText(formData.grad)) {
      newErrors.grad = "Grad je obavezan.";
    }

    if (!sanitizeText(formData.opis)) {
      newErrors.opis = "Opis je obavezan.";
    }

    if (!sanitizeText(formData.kontaktTelefon)) {
      newErrors.kontaktTelefon = "Telefon je obavezan.";
    } else if (!/^[0-9+ ]+$/.test(formData.kontaktTelefon)) {
      newErrors.kontaktTelefon = "Telefon može sadržati samo brojeve.";
    }

    if (!sanitizeText(formData.kontaktEmail)) {
      newErrors.kontaktEmail = "Email je obavezan.";
    } else if (!/\S+@\S+\.\S+/.test(formData.kontaktEmail)) {
      newErrors.kontaktEmail = "Email nije validan.";
    }

    if (formData.kapacitet.deca) {
      const kapacitetDece = Number(formData.kapacitet.deca);
      if (!Number.isFinite(kapacitetDece) || kapacitetDece < 0) {
        newErrors["kapacitet.deca"] = "Kapacitet dece ne može biti negativan.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (uploading || uploadingVideo || submitting) {
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
    setError("");

    if (!validateForm()) return;

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

      cene: cene.map((c) => ({
        naziv: sanitizeText(c.naziv),
        cena: toNumberOrZero(c.cena),
        tip: c.tip || "fiksno",
        opis: sanitizeText(c.opis),
      })),
      paketi: paketi.map((p) => ({
        naziv: sanitizeText(p.naziv),
        cena: toNumberOrZero(p.cena),
        opis: sanitizeText(p.opis),
        tip: p.tip || "fiksno",
      })),
      dodatneUsluge: dodatneUsluge.map((u) => ({
        naziv: sanitizeText(u.naziv),
        cena: toNumberOrZero(u.cena),
        opis: sanitizeText(u.opis),
        tip: u.tip || "fiksno",
      })),
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

    setSubmitting(true);

    try {
      await onSubmit(submitData);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Greška pri čuvanju igraonice.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return {
    formData,
    error,
    errors,
    uploading,
    uploadingVideo,
    submitting,
    slike,
    profilnaSlika,
    videoGalerija,
    noviVideo,
    videoNaziv,
    cene,
    novaCena,
    paketi,
    noviPaket,

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
  };
};
