import React from "react";

const AdditionalPricesSection = ({
  novaCena,
  setNovaCena,
  cene,
  handleAddCena,
  handleRemoveCena,
}) => {
  return (
    <div className="form-section">
      <h3>
        💰 Cene{" "}
        <span className="input-recommendation">(npr. Prostor, po satu...)</span>
      </h3>

      <div className="dynamic-input">
        <div className="add-item">
          <input
            type="text"
            placeholder="Naziv (npr. Prostor, Dete, Roditelj...)"
            value={novaCena.naziv}
            onChange={(e) =>
              setNovaCena((prev) => ({ ...prev, naziv: e.target.value }))
            }
          />

          <input
            type="number"
            min="0"
            placeholder="Cena (RSD)"
            value={novaCena.cena}
            onChange={(e) =>
              setNovaCena((prev) => ({ ...prev, cena: e.target.value }))
            }
          />

          <select
            value={novaCena.tip}
            onChange={(e) =>
              setNovaCena((prev) => ({ ...prev, tip: e.target.value }))
            }
          >
            <option value="fiksno">Fiksna cena</option>
            <option value="po_osobi">Cena po osobi</option>
            <option value="po_satu">Cena po satu</option>
          </select>

          <input
            type="text"
            placeholder="Opis cene"
            value={novaCena.opis}
            onChange={(e) =>
              setNovaCena((prev) => ({ ...prev, opis: e.target.value }))
            }
          />
          {cene.some(
            (item) =>
              item.naziv.toLowerCase() === novaCena.naziv.trim().toLowerCase(),
          ) &&
            novaCena.naziv.trim() && (
              <div className="error-message">
                Cena za "{novaCena.naziv}" je već dodata.
              </div>
            )}
          <button type="button" onClick={handleAddCena}>
            + Dodaj
          </button>
        </div>

        {cene.length > 0 && (
          <div className="items-list">
            {cene.map((item, idx) => (
              <div key={`${item.naziv}-${idx}`} className="item">
                <span>
                  <strong>{item.naziv}</strong> - {item.cena} RSD
                </span>

                <span className="item-type">
                  {item.tip === "po_osobi"
                    ? "(po osobi)"
                    : item.tip === "po_satu"
                      ? "(po satu)"
                      : "(fiksno)"}
                </span>

                {item.opis && <span className="item-opis">({item.opis})</span>}

                <button type="button" onClick={() => handleRemoveCena(idx)}>
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

export default AdditionalPricesSection;
