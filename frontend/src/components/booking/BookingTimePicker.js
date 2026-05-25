import React from "react";

const BookingTimePicker = ({
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
  const hasFreeStartTimes = startDropdownItems.some(
    (item) => item.type === "free",
  );

  const hasFreeEndTimes = endDropdownItems.some((item) => item.type === "free");

  return (
    <div className="form-row time-row">
      <div className="form-group" ref={startTimeRef}>
        <div id="booking-start-time-label" className="booking-section-title">
          Vreme od *
        </div>

        <div
          className="time-picker-grid"
          role="group"
          aria-labelledby="booking-start-time-label"
        >
          {startDropdownItems.map((item) => (
            <button
              type="button"
              key={item.key}
              disabled={item.type !== "free"}
              className={`time-pill ${
                selectedStartTime === item.value ? "active" : ""
              } ${item.type !== "free" ? "disabled" : ""}`}
              onClick={() => onStartSelect(item.value)}
              aria-pressed={selectedStartTime === item.value}
            >
              {item.type === "free" ? item.value : item.label}
            </button>
          ))}

          {!hasFreeStartTimes && (
            <p className="booking-info-box">Nema dostupnih termina.</p>
          )}
        </div>
      </div>

      {!isFiksno ? (
        <div className="form-group" ref={endTimeRef}>
          <div id="booking-end-time-label" className="booking-section-title">
            Vreme do *
          </div>

          <div
            className="time-picker-grid"
            role="group"
            aria-labelledby="booking-end-time-label"
          >
            {endDropdownItems.map((item) => (
              <button
                type="button"
                key={item.key}
                disabled={item.type !== "free"}
                className={`time-pill ${
                  selectedEndTime === item.value ? "active" : ""
                } ${item.type !== "free" ? "disabled" : ""}`}
                onClick={() => onEndSelect(item.value)}
                aria-pressed={selectedEndTime === item.value}
              >
                {item.type === "free" ? item.value : item.label}
              </button>
            ))}

            {selectedStartTime && !hasFreeEndTimes && (
              <p className="booking-info-box">
                Nema dostupnih završetaka za izabrani početak.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="form-group">
          <label htmlFor="booking-duration">Trajanje termina</label>
          <input
            id="booking-duration"
            type="text"
            value={`${trajanjeTermina} minuta`}
            disabled
            readOnly
            className="date-input"
          />
        </div>
      )}
    </div>
  );
};

export default BookingTimePicker;
