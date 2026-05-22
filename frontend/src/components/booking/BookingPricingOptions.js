import React from "react";
import { normalizeText } from "../../utils/normalizeText";
import { getPricingLabel } from "../../utils/bookingPriceUtils";

const BookingPricingOptions = ({
  playroom,
  pricingRef,
  selectedCenaIds = [],
  selectedPaketId = "",
  selectedUslugeIds = [],
  handleCenaToggle,
  handlePaketToggle,
  handleUslugaToggle,
}) => {
  return (
    <>
      {Array.isArray(playroom?.cene) && playroom.cene.length > 0 && (
        <div className="form-group" ref={pricingRef}>
          <label className="booking-section-title">Stavke iz cenovnika</label>

          <div className="booking-options-list booking-options-list--flat">
            {playroom.cene
              .filter((c) => {
                const naziv = normalizeText(c.naziv);
                return naziv !== "dete" && naziv !== "roditelj";
              })
              .map((cena) => (
                <div key={cena._id} className="option-card">
                  <label className="option-check-row">
                    <div>
                      <span>
                        <strong>{cena.naziv}</strong> - {cena.cena} RSD (
                        {getPricingLabel(cena)})
                      </span>

                      {cena.opis && (
                        <span className="item-opis">({cena.opis})</span>
                      )}
                    </div>

                    <input
                      type="checkbox"
                      checked={selectedCenaIds.includes(String(cena._id))}
                      onChange={() => handleCenaToggle(cena._id)}
                    />
                  </label>
                </div>
              ))}
          </div>
        </div>
      )}

      {Array.isArray(playroom?.paketi) && playroom.paketi.length > 0 && (
        <div className="form-group">
          <label className="booking-section-title">
            Izaberi paket <span className="inline-bracket-text">(opciono)</span>
          </label>

          <div className="booking-options-list booking-options-list--flat">
            {playroom.paketi.map((p) => (
              <div key={p._id} className="option-card">
                <label className="option-check-row">
                  <div>
                    <span>
                      {p.naziv} - {p.cena} RSD{" "}
                      <span className="inline-bracket-text">
                        ({getPricingLabel(p)})
                      </span>
                    </span>

                    {p.opis && <span className="item-opis">({p.opis})</span>}
                  </div>

                  <input
                    type="checkbox"
                    checked={selectedPaketId === String(p._id)}
                    onChange={() => handlePaketToggle(p._id)}
                  />
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {Array.isArray(playroom?.dodatneUsluge) &&
        playroom.dodatneUsluge.length > 0 && (
          <div className="form-group">
            <label className="booking-section-title">
              Dodatne usluge{" "}
              <span className="inline-bracket-text">(opciono)</span>
            </label>

            <div className="booking-options-list booking-options-list--flat">
              {playroom.dodatneUsluge.map((u) => (
                <div key={u._id} className="option-card">
                  <label className="option-check-row">
                    <div>
                      <span>
                        {u.naziv} - {u.cena} RSD{" "}
                        <span className="inline-bracket-text">
                          ({getPricingLabel(u)})
                        </span>
                      </span>

                      {u.opis && <span className="item-opis">({u.opis})</span>}
                    </div>

                    <input
                      type="checkbox"
                      checked={selectedUslugeIds.includes(String(u._id))}
                      onChange={() => handleUslugaToggle(u._id)}
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
    </>
  );
};

export default BookingPricingOptions;
