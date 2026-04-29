import React from "react";
import { Link } from "react-router-dom";
import "../styles/Footer.css";

const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="container site-footer-container">
        <p>© Svet Igraonica</p>

        <div className="site-footer-links">
          <Link to="/privacy-policy">Politika privatnosti</Link>
          <Link to="/terms-of-service">Uslovi korišćenja</Link>
          <Link to="/booking-policy">Pravila rezervacije</Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
