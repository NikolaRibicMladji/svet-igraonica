import { normalizeText } from "./normalizeText";

export const isOverlapBookingError = (failure) => {
  const status = failure?.status || failure?.response?.status;
  const message =
    failure?.error ||
    failure?.response?.data?.message ||
    failure?.message ||
    "";

  const normalizedMessage = normalizeText(message);

  return (
    status === 409 ||
    normalizedMessage.includes("preklap") ||
    normalizedMessage.includes("zauzet") ||
    normalizedMessage.includes("overlap")
  );
};

export const getBookingFailureMessage = (failure) => {
  if (isOverlapBookingError(failure)) {
    return "Termin je u međuvremenu zauzet. Izaberite drugi slobodan termin.";
  }

  return (
    failure?.error ||
    failure?.response?.data?.message ||
    failure?.message ||
    "Rezervacija nije uspela."
  );
};

export const validatePhone = (phone) => {
  const cleanedPhone = String(phone || "").trim();

  if (!cleanedPhone) {
    return {
      success: false,
      error: "Unesite telefon.",
    };
  }

  const phoneRegex = /^\+?[0-9]+$/;

  if (!phoneRegex.test(cleanedPhone)) {
    return {
      success: false,
      error: "Telefon može sadržati samo brojeve i znak + na početku.",
    };
  }

  const digitsOnly = cleanedPhone.replace(/\D/g, "");

  if (digitsOnly.length < 6) {
    return {
      success: false,
      error: "Telefon mora imati bar 6 cifara.",
    };
  }

  return {
    success: true,
    value: cleanedPhone,
  };
};

export const validateGuestPassword = ({
  password = "",
  confirmPassword = "",
}) => {
  if (!password.trim()) {
    return {
      success: false,
      field: "password",
      error: "Unesite lozinku.",
    };
  }

  if (password.trim().length < 8) {
    return {
      success: false,
      field: "password",
      error: "Lozinka mora imati najmanje 8 karaktera.",
    };
  }

  if (!confirmPassword.trim()) {
    return {
      success: false,
      field: "confirmPassword",
      error: "Potvrdite lozinku.",
    };
  }

  if (password !== confirmPassword) {
    return {
      success: false,
      field: "confirmPassword",
      error: "Lozinke se ne poklapaju.",
    };
  }

  return {
    success: true,
  };
};
