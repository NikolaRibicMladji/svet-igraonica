import api from "./api";

export const forgotPassword = async (email) => {
  const safeEmail = String(email || "")
    .trim()
    .toLowerCase();

  if (!safeEmail) {
    return {
      success: false,
      error: "Email adresa je obavezna.",
    };
  }

  try {
    const response = await api.post("/auth/forgot-password", {
      email: safeEmail,
    });

    const success = Boolean(response.data?.success);

    return {
      success,
      message: success
        ? response.data?.message ||
          "Ako nalog postoji, poslali smo link za reset lozinke."
        : "",
      error: success
        ? ""
        : response.data?.message || "Greška pri slanju reset linka.",
    };
  } catch (err) {
    return {
      success: false,
      status: err.response?.status,
      error: err.response?.data?.message || "Greška pri slanju reset linka.",
    };
  }
};

export const resetPassword = async (token, password, confirmPassword) => {
  const safeToken = String(token || "").trim();
  const safePassword = String(password || "");
  const safeConfirmPassword = String(confirmPassword || "");

  if (!safeToken) {
    return {
      success: false,
      error: "Nedostaje token za reset lozinke.",
    };
  }

  if (safePassword.length < 8) {
    return {
      success: false,
      error: "Lozinka mora imati najmanje 8 karaktera.",
    };
  }

  if (safePassword !== safeConfirmPassword) {
    return {
      success: false,
      error: "Lozinke se ne podudaraju.",
    };
  }

  try {
    const response = await api.put(
      `/auth/reset-password/${encodeURIComponent(safeToken)}`,
      {
        password: safePassword,
        confirmPassword: safeConfirmPassword,
      },
    );

    const success = Boolean(response.data?.success);

    return {
      success,
      message: success
        ? response.data?.message || "Lozinka je uspešno promenjena."
        : "",
      error: success
        ? ""
        : response.data?.message || "Greška pri promeni lozinke.",
    };
  } catch (err) {
    return {
      success: false,
      status: err.response?.status,
      error: err.response?.data?.message || "Greška pri promeni lozinke.",
    };
  }
};

export const verifyEmailAddress = async (token) => {
  const safeToken = String(token || "").trim();

  if (!safeToken) {
    return {
      success: false,
      error: "Verifikacioni token nije pronađen.",
    };
  }

  try {
    const response = await api.get(
      `/auth/verify-email/${encodeURIComponent(safeToken)}`,
    );

    const success = Boolean(response.data?.success);

    return {
      success,
      message: success
        ? response.data?.message || "Email adresa je uspešno potvrđena."
        : "",
      error: success
        ? ""
        : response.data?.message ||
          "Verifikacioni link nije validan ili je istekao.",
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status,
      error:
        error.response?.data?.message ||
        "Verifikacioni link nije validan ili je istekao.",
    };
  }
};
