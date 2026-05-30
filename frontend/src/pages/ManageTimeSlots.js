import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const ManageTimeSlots = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/owner/timeslots", { replace: true });
  }, [navigate]);

  return (
    <div className="container loading" role="status" aria-live="polite">
      Preusmeravanje na novi pregled termina...
    </div>
  );
};

export default ManageTimeSlots;
