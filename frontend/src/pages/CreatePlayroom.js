import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PlayroomForm from "../components/PlayroomForm";
import { createPlayroom } from "../services/playroomService";
import { uploadImage, uploadVideo } from "../services/uploadService";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const getPlayroomId = (playroom) => playroom?._id || playroom?.id || "";

const uploadPendingMedia = async (playroomId, pendingMedia = {}) => {
  const errors = [];

  const profilnaFile = pendingMedia.profilnaSlikaFile || null;
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
        err?.response?.data?.message || "Profilna slika nije uploadovana.",
      );
    }
  }

  for (const file of imageFiles) {
    try {
      await uploadImage(playroomId, file);
    } catch (err) {
      errors.push(
        err?.response?.data?.message ||
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
  const navigate = useNavigate();

  useEffect(() => {
    const syncUserEmail = async () => {
      if (!loading && user && !user.email) {
        setSyncingUser(true);
        await loadUser();
        setSyncingUser(false);
      }
    };

    syncUserEmail();
  }, [loading, user, loadUser]);
  if (loading || syncingUser) {
    return <div className="container loading">Učitavanje...</div>;
  }

  const handleSubmit = async (data) => {
    const pendingMedia = data?._pendingMedia || {};
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
      />
    </div>
  );
};

export default CreatePlayroom;
