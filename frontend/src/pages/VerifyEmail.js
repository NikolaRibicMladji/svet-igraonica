import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";
import "../styles/global.css";
import { useNavigate } from "react-router-dom";

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Potvrđujemo vašu email adresu...");

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const response = await api.get(`/auth/verify-email/${token}`);

        setStatus("success");
        setMessage(
          response?.data?.message || "Email adresa je uspešno potvrđena.",
        );

        localStorage.removeItem("pendingVerificationEmail");

        setTimeout(() => {
          navigate("/login", {
            replace: true,
            state: {
              registrationSuccess: "Email je uspešno potvrđen. Prijavite se.",
            },
          });
        }, 2000);
      } catch (error) {
        setStatus("error");
        setMessage(
          error?.response?.data?.message ||
            "Verifikacioni link nije validan ili je istekao.",
        );
      }
    };

    if (token) {
      verifyEmail();
    } else {
      setStatus("error");
      setMessage("Verifikacioni token nije pronađen.");
    }
  }, [token]);

  return (
    <div className="container auth-page">
      <div className="auth-card">
        <h1>Potvrda email adrese</h1>

        <div
          className={
            status === "success"
              ? "success-message"
              : status === "error"
                ? "error-message"
                : "info-message"
          }
        >
          {message}
        </div>

        {status === "success" && (
          <p className="auth-switch-text">
            <Link to="/login">Prijavite se</Link>
          </p>
        )}

        {status === "error" && (
          <p className="auth-switch-text">
            Link je istekao? <Link to="/login">Zatražite novi link</Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
