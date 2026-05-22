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
        <label>📅 Izaberite datum</label>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          min={getLocalDate()}
          className="date-input"
        />

        <p className="date-display">{formatDateShortLat(selectedDate)}</p>
      </div>

      {!hasSelectedDate && (
        <div className="booking-info-box">
          Prvo izaberi datum da bi se prikazali slobodni termini i ostale opcije
          za rezervaciju.
        </div>
      )}
    </>
  );
};

export default BookingDateSelector;
