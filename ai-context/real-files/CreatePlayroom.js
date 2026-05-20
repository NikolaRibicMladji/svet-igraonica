import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PlayroomForm from "../components/PlayroomForm";
import { createPlayroom } from "../services/playroomService";
import { useAuth } from "../context/AuthContext";

const CreatePlayroom = () => {
  const { user, loading, loadUser } = useAuth();
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
    const result = await createPlayroom(data);

    if (result?.success) {
      navigate("/manage-playroom");
    } else {
      throw new Error(result?.error || "Greška pri kreiranju igraonice");
    }
  };

  const handleCancel = () => {
    navigate("/");
  };

  // 🔒 Zaštita rute
  if (user?.role !== "vlasnik" && user?.role !== "admin") {
    return (
      <div className="container">
        <h1>Pristup zabranjen</h1>
        <p>Samo vlasnici mogu da kreiraju igraonice.</p>
      </div>
    );
  }

  const ownerEmail = (
    user?.email ||
    localStorage.getItem("pendingOwnerEmail") ||
    ""
  )
    .trim()
    .toLowerCase();

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
