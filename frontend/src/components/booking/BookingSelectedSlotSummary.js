import React from "react";
import { formatDateLat } from "../../utils/bookingUtils";

const BookingSelectedSlotSummary = ({
  selectedDate = "",
  selectedStartTime = "",
  selectedEndTime = "",
  slotDurationLabel = "",
}) => {
  return (
    <div className="selected-slot-summary">
      <p>📅 Datum: {formatDateLat(selectedDate)}</p>

      <p>
        ⏰ Vreme: {selectedStartTime || "-"} - {selectedEndTime || "-"}
        {selectedStartTime && selectedEndTime && slotDurationLabel
          ? ` (${slotDurationLabel})`
          : ""}
      </p>
    </div>
  );
};

export default BookingSelectedSlotSummary;
