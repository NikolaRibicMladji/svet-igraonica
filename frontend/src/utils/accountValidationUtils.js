export const validateChangePasswordForm = ({
  currentPassword = "",
  newPassword = "",
  confirmNewPassword = "",
}) => {
  if (!currentPassword.trim()) {
    return { success: false, error: "Unesite trenutnu lozinku." };
  }

  if (!newPassword.trim()) {
    return { success: false, error: "Unesite novu lozinku." };
  }

  if (newPassword.trim().length < 8) {
    return {
      success: false,
      error: "Nova lozinka mora imati najmanje 8 karaktera.",
    };
  }

  if (!confirmNewPassword.trim()) {
    return { success: false, error: "Potvrdite novu lozinku." };
  }

  if (newPassword !== confirmNewPassword) {
    return { success: false, error: "Nove lozinke se ne poklapaju." };
  }

  if (currentPassword === newPassword) {
    return {
      success: false,
      error: "Nova lozinka mora biti različita od trenutne.",
    };
  }

  return { success: true };
};

export const validateChangeEmailForm = ({
  currentPassword = "",
  newEmail = "",
}) => {
  const email = String(newEmail || "")
    .trim()
    .toLowerCase();

  if (!email) {
    return { success: false, error: "Unesite novu email adresu." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return { success: false, error: "Unesite ispravnu email adresu." };
  }

  if (!currentPassword.trim()) {
    return { success: false, error: "Unesite trenutnu lozinku." };
  }

  return {
    success: true,
    value: {
      newEmail: email,
      currentPassword,
    },
  };
};

export const validateDeleteAccountForm = ({ currentPassword = "" }) => {
  if (!currentPassword.trim()) {
    return { success: false, error: "Unesite trenutnu lozinku." };
  }

  return { success: true };
};
