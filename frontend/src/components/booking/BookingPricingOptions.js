import React, { useMemo } from "react";

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
  const visibleCene = useMemo(() => {
    if (!Array.isArray(playroom?.cene)) return [];

    return playroom.cene;
  }, [playroom?.cene]);

  const hasVisibleCene = visibleCene.length > 0;
  const hasPaketi =
    Array.isArray(playroom?.paketi) && playroom.paketi.length > 0;
  const hasDodatneUsluge =
    Array.isArray(playroom?.dodatneUsluge) && playroom.dodatneUsluge.length > 0;

  if (!hasVisibleCene && !hasPaketi && !hasDodatneUsluge) {
    return null;
  }

  return (
    <div className="pricing-options-section" ref={pricingRef}>
      {hasVisibleCene && (
        <div className="form-group">
          <div id="booking-cene-title" className="booking-section-title">
            Stavke iz cenovnika
          </div>

          <div
            className="booking-options-list booking-options-list--flat"
            role="group"
            aria-labelledby="booking-cene-title"
          >
            {visibleCene.map((cena) => (
              <div key={cena._id} className="option-card">
                <label className="option-check-row">
                  <div className="option-card-content">
                    <div className="option-card-main">
                      <span className="option-card-title">
                        <strong>{cena.naziv}</strong> - {cena.cena} RSD
                      </span>

                      <span className="option-card-meta">
                        ({getPricingLabel(cena)})
                      </span>
                    </div>

                    {cena.opis && (
                      <span className="item-opis">({cena.opis})</span>
                    )}
                  </div>

                  <input
                    type="checkbox"
                    checked={selectedCenaIds.includes(String(cena._id))}
                    onChange={() => handleCenaToggle?.(String(cena._id))}
                  />
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasPaketi && (
        <div className="form-group">
          <div id="booking-paketi-title" className="booking-section-title">
            Izaberi paket <span className="inline-bracket-text">(opciono)</span>
          </div>

          <div
            className="booking-options-list booking-options-list--flat"
            role="group"
            aria-labelledby="booking-paketi-title"
          >
            {playroom.paketi.map((p) => (
              <div key={p._id} className="option-card">
                <label className="option-check-row">
                  <div className="option-card-content">
                    <div className="option-card-main">
                      <span className="option-card-title">
                        {p.naziv} - {p.cena} RSD
                      </span>

                      <span className="option-card-meta">
                        ({getPricingLabel(p)})
                      </span>
                    </div>

                    {p.opis && <span className="item-opis">({p.opis})</span>}
                  </div>

                  <input
                    type="checkbox"
                    checked={selectedPaketId === String(p._id)}
                    onChange={() => handlePaketToggle?.(String(p._id))}
                  />
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasDodatneUsluge && (
        <div className="form-group">
          <div id="booking-usluge-title" className="booking-section-title">
            Dodatne usluge{" "}
            <span className="inline-bracket-text">(opciono)</span>
          </div>

          <div
            className="booking-options-list booking-options-list--flat"
            role="group"
            aria-labelledby="booking-usluge-title"
          >
            {playroom.dodatneUsluge.map((u) => (
              <div key={u._id} className="option-card">
                <label className="option-check-row">
                  <div className="option-card-content">
                    <div className="option-card-main">
                      <span className="option-card-title">
                        {u.naziv} - {u.cena} RSD
                      </span>

                      <span className="option-card-meta">
                        ({getPricingLabel(u)})
                      </span>
                    </div>

                    {u.opis && <span className="item-opis">({u.opis})</span>}
                  </div>

                  <input
                    type="checkbox"
                    checked={selectedUslugeIds.includes(String(u._id))}
                    onChange={() => handleUslugaToggle?.(String(u._id))}
                  />
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingPricingOptions;
