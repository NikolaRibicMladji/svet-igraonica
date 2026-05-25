import React from "react";

const WorkingHoursSection = ({
  dani = [],
  radnoVreme = {},
  toggleDan,
  handleRadnoVremeChange,
}) => {
  return (
    <div className="form-section">
      <h3>⏰ Radno vreme</h3>

      {dani.map((dan) => {
        const dayValue = radnoVreme[dan.key] || {};
        const checkboxId = `radno-vreme-${dan.key}`;
        const startInputId = `radno-vreme-${dan.key}-od`;
        const endInputId = `radno-vreme-${dan.key}-do`;

        return (
          <div key={dan.key} className="radno-vreme-row">
            <label className="dan-checkbox" htmlFor={checkboxId}>
              <input
                id={checkboxId}
                type="checkbox"
                checked={Boolean(dayValue.radi)}
                onChange={() => toggleDan(dan.key)}
              />
              <span className="dan-naziv">{dan.naziv}</span>
            </label>

            {dayValue.radi ? (
              <div className="vreme-inputs">
                <label className="sr-only" htmlFor={startInputId}>
                  Radno vreme od za {dan.naziv}
                </label>

                <input
                  id={startInputId}
                  type="time"
                  step="900"
                  value={dayValue.od || "09:00"}
                  onChange={(e) =>
                    handleRadnoVremeChange(dan.key, "od", e.target.value)
                  }
                  className="time-input"
                />

                <span className="time-separator">-</span>

                <label className="sr-only" htmlFor={endInputId}>
                  Radno vreme do za {dan.naziv}
                </label>

                <input
                  id={endInputId}
                  type="time"
                  step="900"
                  value={dayValue.do || "20:00"}
                  onChange={(e) =>
                    handleRadnoVremeChange(dan.key, "do", e.target.value)
                  }
                  className="time-input"
                />
              </div>
            ) : (
              <span className="closed-text">Zatvoreno</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default WorkingHoursSection;
