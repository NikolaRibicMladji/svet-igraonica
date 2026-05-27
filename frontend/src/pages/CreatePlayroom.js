import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PlayroomForm from "../components/PlayroomForm";
import { createPlayroom } from "../services/playroomService";
import { uploadImage, uploadVideo } from "../services/uploadService";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const getPlayroomId = (playroom) => playroom?._id || playroom?.id || "";

const createGeneratedProfileImageFile = (playroomName = "Igraonica") =>
  new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const width = 1200;
    const height = 900;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Nije moguće generisati profilnu sliku."));
      return;
    }

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#ff6b4a");
    gradient.addColorStop(1, "#ff8c6e");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
    ctx.beginPath();
    ctx.arc(180, 160, 120, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(1030, 760, 180, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const safeName = String(playroomName || "Igraonica").trim() || "Igraonica";
    const words = safeName.split(/\s+/);
    const lines = [];
    let currentLine = "";

    ctx.font = "bold 86px Arial, sans-serif";

    words.forEach((word) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > width - 180 && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    const visibleLines = lines.slice(0, 3);
    const lineHeight = 104;
    const startY = height / 2 - ((visibleLines.length - 1) * lineHeight) / 2;

    visibleLines.forEach((line, index) => {
      ctx.fillText(line, width / 2, startY + index * lineHeight);
    });

    ctx.font = "500 34px Arial, sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillText("Svet Igraonica", width / 2, height - 110);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Nije moguće kreirati profilnu sliku."));
          return;
        }

        resolve(
          new File([blob], "generisana-profilna-slika.png", {
            type: "image/png",
          }),
        );
      },
      "image/png",
      0.92,
    );
  });

const uploadPendingMedia = async (playroomId, pendingMedia = {}) => {
  const errors = [];

  let profilnaFile = pendingMedia.profilnaSlikaFile || null;

  if (!profilnaFile) {
    profilnaFile = await createGeneratedProfileImageFile(
      pendingMedia.playroomName || "Igraonica",
    );
  }
  const imageFiles = Array.isArray(pendingMedia.imageFiles)
    ? pendingMedia.imageFiles
    : [];
  const videoItems = Array.isArray(pendingMedia.videoItems)
    ? pendingMedia.videoItems
    : [];

  if (profilnaFile) {
    try {
      await uploadImage(playroomId, profilnaFile);
    } catch (err) {
      errors.push(
        err?.response?.data?.message ||
          err?.message ||
          "Profilna slika nije uploadovana.",
      );
    }
  }

  for (const file of imageFiles) {
    try {
      await uploadImage(playroomId, file);
    } catch (err) {
      errors.push(
        err?.response?.data?.message ||
          err?.message ||
          `Slika "${file?.name || "nepoznata"}" nije uploadovana.`,
      );
    }
  }

  for (const item of videoItems) {
    if (!item?.file) continue;

    try {
      await uploadVideo(
        playroomId,
        item.file,
        item.naziv || item.file.name || "",
      );
    } catch (err) {
      errors.push(
        err?.response?.data?.message ||
          err?.message ||
          `Video "${item?.naziv || item.file?.name || "nepoznat"}" nije uploadovan.`,
      );
    }
  }

  return {
    attempted: Boolean(profilnaFile || imageFiles.length || videoItems.length),
    success: errors.length === 0,
    errors,
  };
};

const CreatePlayroom = () => {
  const { user, loading, loadUser } = useAuth();
  const { showToast } = useToast();
  const [syncingUser, setSyncingUser] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const syncUserEmail = async () => {
      if (!loading && user && !user.email) {
        setSyncingUser(true);

        try {
          await loadUser();
        } finally {
          setSyncingUser(false);
        }
      }
    };

    syncUserEmail();
  }, [loading, user, loadUser]);
  if (loading || syncingUser) {
    return <div className="container loading">Učitavanje...</div>;
  }

  const handleSubmit = async (data) => {
    if (submitting) return;

    setSubmitting(true);

    try {
      const pendingMedia = {
        ...(data?._pendingMedia || {}),
        playroomName: data?.naziv || "",
      };
      const { _pendingMedia, ...playroomPayload } = data;

      const result = await createPlayroom(playroomPayload);

      if (!result?.success) {
        throw new Error(result?.error || "Greška pri kreiranju igraonice");
      }

      const playroomId = getPlayroomId(result.data);

      if (!playroomId) {
        showToast(
          "Igraonica je kreirana, ali mediji nisu uploadovani jer backend nije vratio ID igraonice.",
          "error",
        );

        await loadUser();
        navigate("/manage-playroom", { replace: true });
        return;
      }

      const mediaResult = await uploadPendingMedia(playroomId, pendingMedia);

      if (mediaResult.attempted && !mediaResult.success) {
        showToast(
          "Igraonica je kreirana, ali neki fajlovi nisu uploadovani. Možete ih dodati iz stranice Moja igraonica.",
          "error",
        );
      } else {
        showToast("Igraonica je uspešno kreirana.", "success");
      }

      await loadUser();
      navigate("/manage-playroom", { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate("/");
  };

  const ownerEmail = (user?.email || "").trim().toLowerCase();

  // 🔒 Zaštita rute
  if (user?.role !== "vlasnik" && user?.role !== "admin") {
    return (
      <div className="container">
        <h1>Pristup zabranjen</h1>
        <p>Samo vlasnici mogu da kreiraju igraonice.</p>
      </div>
    );
  }

  if (!ownerEmail) {
    return (
      <div className="container">
        <h1>Nedostaje email naloga</h1>
        <p>Osvežite stranicu ili se prijavite ponovo.</p>
      </div>
    );
  }

  return (
    <div className="container">
      <PlayroomForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isEditing={false}
        ownerEmail={ownerEmail}
        submitting={submitting}
      />
    </div>
  );
};

export default CreatePlayroom;
