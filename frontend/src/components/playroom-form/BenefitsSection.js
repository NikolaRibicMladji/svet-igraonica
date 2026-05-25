import React from "react";

const BenefitsSection = ({
  novaPogodnost = "",
  setNovaPogodnost,
  besplatnePogodnosti = [],
  handleAddPogodnost,
  handleRemovePogodnost,
}) => {
  return (
    <div className="form-section">
      <h3>✨ Besplatne pogodnosti</h3>

      <div className="dynamic-input">
        <div className="add-item-simple">
          <input
            id="nova-pogodnost"
            type="text"
            aria-label="Naziv besplatne pogodnosti"
            placeholder="Naziv pogodnosti"
            value={novaPogodnost}
            onChange={(e) => setNovaPogodnost(e.target.value)}
          />
          <button type="button" onClick={handleAddPogodnost}>
            + Dodaj
          </button>
        </div>

        {besplatnePogodnosti.length > 0 && (
          <div className="items-list">
            {besplatnePogodnosti.map((item, idx) => (
              <div key={`${item}-${idx}`} className="item">
                <span>✓ {item}</span>
                <button
                  type="button"
                  onClick={() => handleRemovePogodnost(idx)}
                  aria-label={`Ukloni pogodnost ${item || idx + 1}`}
                >
                  ✖
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BenefitsSection;
