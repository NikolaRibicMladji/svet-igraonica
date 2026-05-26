import React from "react";
import { formatBrojDece } from "../../utils/bookingPriceUtils";

const toSafeNumber = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const getItemPriceText = (item, brojDece, slotDurationHours) => {
  const cena = toSafeNumber(item?.cena);
  const safeSlotDurationHours = toSafeNumber(slotDurationHours) || 1;
  const safeBrojDece = toSafeNumber(brojDece);

  if (item?.tip === "po_satu") {
    return `${cena} RSD × ${safeSlotDurationHours}h = ${
      cena * safeSlotDurationHours
    } RSD`;
  }

  if (item?.tip === "po_osobi") {
    return `${cena} RSD × ${formatBrojDece(safeBrojDece)} = ${
      cena * safeBrojDece
    } RSD`;
  }

  return `${cena} RSD`;
};

const BookingOrderSummary = ({
  selectedCene = [],
  selectedPaket = null,
  selectedUsluge = [],
  brojDece = "",
  brojRoditelja = "",
  slotDurationHours = 1,
  totalPrice = 0,
}) => {
  const safeSelectedCene = Array.isArray(selectedCene) ? selectedCene : [];
  const safeSelectedUsluge = Array.isArray(selectedUsluge)
    ? selectedUsluge
    : [];
  const safeBrojDece = toSafeNumber(brojDece);
  const safeBrojRoditelja = toSafeNumber(brojRoditelja);
  const safeTotalPrice = toSafeNumber(totalPrice);

  return (
    <div
      className="order-summary"
      aria-labelledby="booking-order-summary-title"
    >
      <h4 id="booking-order-summary-title">🛒 Pregled rezervacije</h4>
      {safeBrojDece > 0 && (
        <div className="summary-item">
          <span>👶 Broj dece</span>
          <span>{safeBrojDece}</span>
        </div>
      )}

      {safeBrojRoditelja > 0 && (
        <div className="summary-item">
          <span>🧑 Broj roditelja</span>
          <span>{safeBrojRoditelja}</span>
        </div>
      )}
      {safeSelectedCene.length > 0 && (
        <div className="reservation-summary-items">
          {safeSelectedCene.map((item) => (
            <div key={item._id || item.naziv} className="summary-item">
              <span>{item.naziv}</span>
              <span>{getItemPriceText(item, brojDece, slotDurationHours)}</span>
            </div>
          ))}
        </div>
      )}
      {selectedPaket && (
        <div className="summary-item">
          <span>{selectedPaket.naziv}</span>
          <span>
            {getItemPriceText(selectedPaket, brojDece, slotDurationHours)}
          </span>
        </div>
      )}
      {safeSelectedUsluge.map((u) => (
        <div className="summary-item" key={u._id || u.naziv}>
          <span>{u.naziv}</span>
          <span>{getItemPriceText(u, brojDece, slotDurationHours)}</span>
        </div>
      ))}

      <div className="summary-total">
        <span>Ukupno za plaćanje:</span>
        <strong>{safeTotalPrice} RSD</strong>
      </div>
    </div>
  );
};

export default BookingOrderSummary;
