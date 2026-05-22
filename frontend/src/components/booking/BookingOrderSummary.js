import React from "react";
import { formatBrojDece } from "../../utils/bookingPriceUtils";

const BookingOrderSummary = ({
  selectedCene = [],
  selectedPaket = null,
  selectedUsluge = [],
  brojDece = "",
  brojRoditelja = "",
  slotDurationHours = 1,
  totalPrice = 0,
}) => {
  return (
    <div className="order-summary">
      <h4>🛒 Pregled rezervacije</h4>
      {Number(brojDece) > 0 && (
        <div className="summary-item">
          <span>👶 Broj dece</span>
          <span>{Number(brojDece)}</span>
        </div>
      )}

      {Number(brojRoditelja) > 0 && (
        <div className="summary-item">
          <span>🧑 Broj roditelja</span>
          <span>{Number(brojRoditelja)}</span>
        </div>
      )}
      {selectedCene.length > 0 && (
        <div className="reservation-summary-items">
          {selectedCene.map((item) => (
            <div key={item._id} className="summary-item">
              <span>{item.naziv}</span>
              <span>
                {item.tip === "po_satu"
                  ? `${item.cena} RSD × ${slotDurationHours}h = ${
                      (Number(item.cena) || 0) * slotDurationHours
                    } RSD`
                  : item.tip === "po_osobi"
                    ? `${item.cena} RSD × ${formatBrojDece(brojDece)} = ${(item.cena || 0) * (Number(brojDece) || 0)} RSD`
                    : `${item.cena} RSD`}
              </span>
            </div>
          ))}
        </div>
      )}
      {selectedPaket && (
        <div className="summary-item">
          <span>{selectedPaket.naziv}</span>
          <span>
            {selectedPaket.tip === "po_satu"
              ? `${selectedPaket.cena} RSD × ${slotDurationHours}h = ${
                  (Number(selectedPaket.cena) || 0) * slotDurationHours
                } RSD`
              : selectedPaket.tip === "po_osobi"
                ? `${selectedPaket.cena} RSD × ${formatBrojDece(brojDece)} = ${
                    (Number(selectedPaket.cena) || 0) * (Number(brojDece) || 0)
                  } RSD`
                : `${selectedPaket.cena} RSD`}
          </span>
        </div>
      )}
      {selectedUsluge.map((u) => (
        <div className="summary-item" key={u._id}>
          <span>{u.naziv}</span>
          <span>
            {u.tip === "po_satu"
              ? `${u.cena} RSD × ${slotDurationHours}h = ${
                  (Number(u.cena) || 0) * slotDurationHours
                } RSD`
              : u.tip === "po_osobi"
                ? `${u.cena} RSD × ${formatBrojDece(brojDece)} = ${
                    (Number(u.cena) || 0) * (Number(brojDece) || 0)
                  } RSD`
                : `${u.cena} RSD`}
          </span>
        </div>
      ))}

      <div className="summary-total">
        <span>Ukupno za plaćanje:</span>
        <strong>{totalPrice} RSD</strong>
      </div>
    </div>
  );
};

export default BookingOrderSummary;
