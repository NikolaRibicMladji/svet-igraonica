import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/BookingSuccess.css";

const BookingSuccess = () => {
  const navigate = useNavigate();

  return (
    <div className="success-container">
      <div className="success-icon">✅</div>

      <h1 className="success-title">Rezervacija je uspešna!</h1>

      <p className="success-text">
        Vaša rezervacija je evidentirana u sistemu i biće poslata na vaš email.
      </p>

      <p className="success-text">Hvala vam što koristite Svet Igraonica!</p>

      <div className="success-actions">
        <button
          type="button"
          className="success-button secondary"
          onClick={() => navigate("/my-bookings")}
        >
          Moje rezervacije
        </button>

        <Link to="/playrooms" className="success-button">
          Pogledaj druge igraonice
        </Link>
      </div>
    </div>
  );
};

export default BookingSuccess;
