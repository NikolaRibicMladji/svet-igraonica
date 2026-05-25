import React from "react";

const AdditionalServicesSection = ({
  novaUsluga = {},
  setNovaUsluga,
  dodatneUsluge = [],
  handleAddUsluga,
  handleRemoveUsluga,
}) => {
  const safeNovaUsluga = {
    naziv: "",
    cena: "",
    tip: "fiksno",
    opis: "",
    ...novaUsluga,
  };

  const handleNumberKeyDown = (e) => {
    if (["e", "E", "+", "-", ".", ","].includes(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <div className="form-section">
      <h3>
        🎪 Dodatne usluge{" "}
        <span className="input-recommendation">
          (npr. animator, fotograf, maskota...)
        </span>
      </h3>

      <div className="dynamic-input">
        <div className="add-item">
          <input
            id="nova-usluga-naziv"
            type="text"
            aria-label="Naziv dodatne usluge"
            placeholder="Naziv usluge"
            value={safeNovaUsluga.naziv}
            onChange={(e) =>
              setNovaUsluga((prev) => ({ ...prev, naziv: e.target.value }))
            }
          />

          <input
            id="nova-usluga-cena"
            type="number"
            inputMode="numeric"
            min="1"
            placeholder="Cena (RSD)"
            aria-label="Cena dodatne usluge u dinarima"
            value={safeNovaUsluga.cena}
            onKeyDown={handleNumberKeyDown}
            onChange={(e) =>
              setNovaUsluga((prev) => ({ ...prev, cena: e.target.value }))
            }
          />

          <select
            id="nova-usluga-tip"
            aria-label="Tip cene dodatne usluge"
            value={safeNovaUsluga.tip}
            onChange={(e) =>
              setNovaUsluga((prev) => ({ ...prev, tip: e.target.value }))
            }
          >
            <option value="fiksno">Fiksna cena</option>
            <option value="po_osobi">Cena po osobi</option>
            <option value="po_satu">Cena po satu</option>
          </select>

          <input
            id="nova-usluga-opis"
            type="text"
            aria-label="Opis dodatne usluge"
            placeholder="Opis"
            value={safeNovaUsluga.opis}
            onChange={(e) =>
              setNovaUsluga((prev) => ({ ...prev, opis: e.target.value }))
            }
          />

          <button type="button" onClick={handleAddUsluga}>
            + Dodaj
          </button>
        </div>

        {dodatneUsluge.length > 0 && (
          <div className="items-list">
            {dodatneUsluge.map((item, idx) => (
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
                  onClick={() => handleRemoveUsluga(idx)}
                  aria-label={`Ukloni dodatnu uslugu ${item.naziv || idx + 1}`}
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

export default AdditionalServicesSection;
