import React from "react";

const PackagesSection = ({
  noviPaket = {},
  setNoviPaket,
  paketi = [],
  handleAddPaket,
  handleRemovePaket,
}) => {
  const safeNoviPaket = {
    naziv: "",
    cena: "",
    tip: "fiksno",
    opis: "",
    ...noviPaket,
  };

  const isDuplicatePaket =
    safeNoviPaket.naziv.trim() &&
    paketi.some(
      (item) =>
        String(item?.naziv || "")
          .trim()
          .toLowerCase() === safeNoviPaket.naziv.trim().toLowerCase(),
    );

  const handleNumberKeyDown = (e) => {
    if (["e", "E", "+", "-", ".", ","].includes(e.key)) {
      e.preventDefault();
    }
  };
  return (
    <div className="form-section">
      <h3>
        🎁 Paketi{" "}
        <span className="input-recommendation">
          (npr. porodični, rođendanski, VIP...)
        </span>
      </h3>

      <div className="dynamic-input">
        <div className="add-item">
          <input
            id="novi-paket-naziv"
            type="text"
            aria-label="Naziv paketa"
            placeholder="Naziv paketa"
            value={safeNoviPaket.naziv}
            onChange={(e) =>
              setNoviPaket((prev) => ({ ...prev, naziv: e.target.value }))
            }
          />

          <input
            id="novi-paket-cena"
            type="number"
            inputMode="numeric"
            min="1"
            placeholder="Cena (RSD)"
            aria-label="Cena paketa u dinarima"
            value={safeNoviPaket.cena}
            onKeyDown={handleNumberKeyDown}
            onChange={(e) =>
              setNoviPaket((prev) => ({ ...prev, cena: e.target.value }))
            }
          />
          <select
            id="novi-paket-tip"
            aria-label="Tip cene paketa"
            value={safeNoviPaket.tip}
            onChange={(e) =>
              setNoviPaket((prev) => ({ ...prev, tip: e.target.value }))
            }
          >
            <option value="fiksno">Fiksna cena</option>
            <option value="po_osobi">Cena po osobi</option>
            <option value="po_satu">Cena po satu</option>
          </select>

          <input
            id="novi-paket-opis"
            type="text"
            aria-label="Opis paketa"
            placeholder="Opis"
            value={safeNoviPaket.opis}
            onChange={(e) =>
              setNoviPaket((prev) => ({ ...prev, opis: e.target.value }))
            }
          />
          {isDuplicatePaket && (
            <div className="error-message" role="alert">
              Paket "{safeNoviPaket.naziv}" je već dodat.
            </div>
          )}

          <button
            type="button"
            onClick={handleAddPaket}
            disabled={
              !safeNoviPaket.naziv.trim() ||
              !safeNoviPaket.cena ||
              Boolean(isDuplicatePaket)
            }
          >
            + Dodaj
          </button>
        </div>

        {paketi.length > 0 && (
          <div className="items-list">
            {paketi.map((item, idx) => (
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
                  onClick={() => handleRemovePaket(idx)}
                  aria-label={`Ukloni paket ${item.naziv || idx + 1}`}
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

export default PackagesSection;
