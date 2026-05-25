import React from "react";

const CapacitySection = ({ formData = {}, handleChange, errors = {} }) => {
  const kapacitet = formData.kapacitet || {};

  const handleNumberKeyDown = (e) => {
    if (["e", "E", "+", "-", ".", ","].includes(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <div className="form-section">
      <h3>👥 Kapacitet</h3>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="kapacitet-deca">Kapacitet dece (opciono)</label>
          <input
            id="kapacitet-deca"
            type="number"
            inputMode="numeric"
            min="1"
            name="kapacitet.deca"
            value={kapacitet.deca || ""}
            onKeyDown={handleNumberKeyDown}
            onChange={handleChange}
            className={errors["kapacitet.deca"] ? "input-error" : ""}
          />

          {errors["kapacitet.deca"] && (
            <div className="field-error" role="alert">
              {errors["kapacitet.deca"]}
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="kapacitet-roditelji">
            Kapacitet roditelja (opciono)
          </label>
          <input
            id="kapacitet-roditelji"
            type="number"
            inputMode="numeric"
            min="0"
            name="kapacitet.roditelji"
            value={kapacitet.roditelji || ""}
            onKeyDown={handleNumberKeyDown}
            onChange={handleChange}
            className={errors["kapacitet.roditelji"] ? "input-error" : ""}
          />

          {errors["kapacitet.roditelji"] && (
            <div className="field-error" role="alert">
              {errors["kapacitet.roditelji"]}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CapacitySection;
