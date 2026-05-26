import React from "react";
import { formatDateLat } from "../../utils/bookingUtils";
import BookingTimePicker from "./BookingTimePicker";

const BookingAvailabilitySection = ({
  selectedDate = "",
  loadingSlots = false,
  availability = null,
  startTimeRef,
  endTimeRef,
  isFiksno = false,
  trajanjeTermina = 60,
  startDropdownItems = [],
  endDropdownItems = [],
  selectedStartTime = "",
  selectedEndTime = "",
  onStartSelect,
  onEndSelect,
}) => {
  return (
    <div className="slots-section" aria-labelledby="booking-availability-title">
      <h3 id="booking-availability-title">
        Dostupnost za {formatDateLat(selectedDate)}
      </h3>

      {loadingSlots ? (
        <div className="loading-slots" role="status" aria-live="polite">
          Učitavanje termina...
        </div>
      ) : !availability?.workingHours ? (
        <div className="no-slots" role="status" aria-live="polite">
          <p>😢 Igraonica ne radi za izabrani datum.</p>
        </div>
      ) : (
        <>
          <div className="selected-slot-summary">
            <p>
              🕘 Radno vreme: {availability.workingHours.vremeOd} -{" "}
              {availability.workingHours.vremeDo}
            </p>
          </div>

          <BookingTimePicker
            startTimeRef={startTimeRef}
            endTimeRef={endTimeRef}
            isFiksno={isFiksno}
            trajanjeTermina={trajanjeTermina}
            startDropdownItems={startDropdownItems}
            endDropdownItems={endDropdownItems}
            selectedStartTime={selectedStartTime}
            selectedEndTime={selectedEndTime}
            onStartSelect={onStartSelect}
            onEndSelect={onEndSelect}
          />
        </>
      )}
    </div>
  );
};

export default BookingAvailabilitySection;
