import React from "react";

const BookingSubmitButton = ({
  submitting = false,
  isAuthenticated = false,
  onSubmit,
}) => {
  return (
    <button
      type="button"
      className="btn-book"
      onClick={onSubmit}
      disabled={submitting}
    >
      {submitting
        ? "Rezervišem..."
        : !isAuthenticated
          ? "✅ Registruj me i potvrdi rezervaciju"
          : "✅ Potvrdi rezervaciju"}
    </button>
  );
};

export default BookingSubmitButton;
