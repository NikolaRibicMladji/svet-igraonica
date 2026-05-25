import React from "react";

const AdditionalPricesSection = ({
  novaCena = {},
  setNovaCena,
  cene = [],
  handleAddCena,
  handleRemoveCena,
}) => {
  const safeNovaCena = {
    naziv: "",
    cena: "",
    tip: "fiksno",
    opis: "",
    ...novaCena,
  };

  const isDuplicateCena =
    safeNovaCena.naziv.trim() &&
    cene.some(
      (item) =>
        String(item?.naziv || "")
          .trim()
          .toLowerCase() === safeNovaCena.naziv.trim().toLowerCase(),
    );

  const handleNumberKeyDown = (e) => {
    if (["e", "E", "+", "-", ".", ","].includes(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <div className="form-section">
      <h3>
        💰 Cene{" "}
        <span className="input-recommendation">(npr. Prostor, po satu...)</span>
      </h3>

      <div className="dynamic-input">
        <div className="add-item">
          <input
            id="nova-cena-naziv"
            type="text"
            aria-label="Naziv cene"
            placeholder="Naziv (npr. Prostor, Dete, Roditelj...)"
            value={safeNovaCena.naziv}
            onChange={(e) =>
              setNovaCena((prev) => ({ ...prev, naziv: e.target.value }))
            }
          />

          <input
            id="nova-cena-iznos"
            type="number"
            inputMode="numeric"
            min="1"
            placeholder="Cena (RSD)"
            aria-label="Iznos cene u dinarima"
            value={safeNovaCena.cena}
            onKeyDown={handleNumberKeyDown}
            onChange={(e) =>
              setNovaCena((prev) => ({ ...prev, cena: e.target.value }))
            }
          />

          <select
            id="nova-cena-tip"
            aria-label="Tip cene"
            value={safeNovaCena.tip}
            onChange={(e) =>
              setNovaCena((prev) => ({ ...prev, tip: e.target.value }))
            }
          >
            <option value="fiksno">Fiksna cena</option>
            <option value="po_osobi">Cena po osobi</option>
            <option value="po_satu">Cena po satu</option>
          </select>

          <input
            id="nova-cena-opis"
            type="text"
            aria-label="Opis cene"
            placeholder="Opis cene"
            value={safeNovaCena.opis}
            onChange={(e) =>
              setNovaCena((prev) => ({ ...prev, opis: e.target.value }))
            }
          />
          {isDuplicateCena && (
            <div className="error-message" role="alert">
              Cena za "{safeNovaCena.naziv}" je već dodata.
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

                <button
                  type="button"
                  onClick={() => handleRemoveCena(idx)}
                  aria-label={`Ukloni cenu ${item.naziv || idx + 1}`}
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

export default AdditionalPricesSection;
