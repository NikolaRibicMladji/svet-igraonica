import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { verifyEmailAddress } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import "../styles/global.css";

const REDIRECT_DELAY_MS = 2000;

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const verificationStartedRef = useRef(false);
  const authRef = useRef({
    isAuthenticated: false,
    user: null,
  });

  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Potvrđujemo vašu email adresu...");

  useEffect(() => {
    authRef.current = {
      isAuthenticated,
      user,
    };
  }, [isAuthenticated, user]);

  useEffect(() => {
    let isMounted = true;
    let redirectTimer = null;

    if (verificationStartedRef.current) {
      return undefined;
    }

    verificationStartedRef.current = true;

    const handleVerifyEmail = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Verifikacioni token nije pronađen.");
        return;
      }

      setStatus("loading");
      setMessage("Potvrđujemo vašu email adresu...");

      const result = await verifyEmailAddress(token);

      if (!isMounted) return;

      if (result?.success) {
        setStatus("success");
        setMessage(result.message || "Email adresa je uspešno potvrđena.");

        sessionStorage.removeItem("pendingVerificationEmail");

        redirectTimer = setTimeout(() => {
          const currentAuth = authRef.current;

          if (
            currentAuth.isAuthenticated &&
            currentAuth.user?.role === "roditelj"
          ) {
            navigate("/my-bookings", {
              replace: true,
              state: {
                successMessage:
                  "Email je uspešno potvrđen. Vaš zahtev za rezervaciju je poslat.",
              },
            });

            return;
          }

          navigate("/login", {
            replace: true,
            state: {
              registrationSuccess:
                "Email je uspešno potvrđen. Prijavite se da vidite vaše rezervacije.",
              from: "/my-bookings",
            },
          });
        }, REDIRECT_DELAY_MS);

        return;
      }

      setStatus("error");
      setMessage(
        result?.error || "Verifikacioni link nije validan ili je istekao.",
      );
    };

    handleVerifyEmail();

    return () => {
      isMounted = false;

      if (redirectTimer) {
        clearTimeout(redirectTimer);
      }
    };
  }, [token, navigate]);

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
          role={status === "error" ? "alert" : "status"}
          aria-live={status === "error" ? "assertive" : "polite"}
        >
          {message}
        </div>

        {status === "success" && (
          <p className="auth-switch-text">
            Preusmeravamo vas na vaše rezervacije...
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
