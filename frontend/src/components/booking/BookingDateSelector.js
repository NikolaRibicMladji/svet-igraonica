import React from "react";
import { formatDateShortLat, getLocalDate } from "../../utils/bookingUtils";

const BookingDateSelector = ({
  selectedDate = "",
  hasSelectedDate = false,
  onDateChange,
}) => {
  return (
    <>
      <div className="date-selector">
        <label htmlFor="booking-date">📅 Izaberite datum</label>

        <input
          id="booking-date"
          type="date"
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          min={getLocalDate()}
          className="date-input"
          aria-describedby="booking-date-display"
        />

        <p id="booking-date-display" className="date-display">
          {formatDateShortLat(selectedDate)}
        </p>
      </div>

      {!hasSelectedDate && (
        <div className="booking-info-box" role="status" aria-live="polite">
          Prvo izaberi datum da bi se prikazali slobodni termini i ostale opcije
          za rezervaciju.
        </div>
      )}
    </>
  );
};

export default BookingDateSelector;
