import React from "react";
import { useNavigate } from "react-router-dom";
import PlayroomForm from "../components/PlayroomForm";
import { createPlayroom } from "../services/playroomService";
import { useAuth } from "../context/AuthContext";

const CreatePlayroom = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div className="container">
      <PlayroomForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isEditing={false}
      />
    </div>
  );
};

export default CreatePlayroom;
