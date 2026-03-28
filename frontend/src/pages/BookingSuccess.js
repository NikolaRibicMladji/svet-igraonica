import React from "react";
import { Link } from "react-router-dom";
import "../styles/BookingSuccess.css";

const BookingSuccess = () => {
  return (
    <div className="success-container">
      <div className="success-icon">✅</div>
      <h1 className="success-title">Rezervacija uspešna!</h1>
      <p className="success-text">
        Potvrda rezervacije je poslata na vaš email.
      </p>
      <p className="success-text">Hvala vam što koristite Svet Igraonica!</p>
      <Link to="/playrooms" className="success-button">
        Pogledaj druge igraonice
      </Link>
    </div>
  );
};

export default BookingSuccess;
