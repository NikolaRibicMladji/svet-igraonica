import React from "react";

const CapacitySection = ({ formData, handleChange, errors }) => {
  return (
    <div className="form-section">
      <h3>👥 Kapacitet</h3>

      <div className="form-row">
        <div className="form-group">
          <label>Kapacitet dece *</label>
          <input
            type="number"
            min="1"
            name="kapacitet.deca"
            value={formData.kapacitet.deca}
            onChange={handleChange}
            className={errors["kapacitet.deca"] ? "input-error" : ""}
          />
          {errors["kapacitet.deca"] && (
            <div className="field-error">{errors["kapacitet.deca"]}</div>
          )}
        </div>

        <div className="form-group">
          <label>Kapacitet roditelja (opciono)</label>
          <input
            type="number"
            min="0"
            name="kapacitet.roditelji"
            value={formData.kapacitet.roditelji}
            onChange={handleChange}
            placeholder="0 = neograničeno"
          />
        </div>
      </div>
    </div>
  );
};

export default CapacitySection;
