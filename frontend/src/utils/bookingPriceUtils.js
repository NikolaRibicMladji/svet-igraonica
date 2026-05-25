export const getPricingLabel = (item) => {
  if (!item) return "";

  if (item.tip === "po_osobi") return "po osobi";
  if (item.tip === "po_satu") return "po satu";

  return "fiksna cena";
};

export const formatBrojDece = (broj) => {
  const n = Number(broj) || 0;

  if (n === 1) return "1 dete";

  return `${n} dece`;
};

const toSafeNumber = (value, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const calculateItemPrice = (item, brojDece, slotDurationHours) => {
  if (!item) return 0;

  const cena = toSafeNumber(item.cena);
  const trajanjeSati = toSafeNumber(slotDurationHours, 1);
  const broj = toSafeNumber(brojDece);

  if (item.tip === "po_satu") {
    return cena * trajanjeSati;
  }

  if (item.tip === "po_osobi") {
    return cena * broj;
  }

  return cena;
};

export const calculateBookingTotal = ({
  selectedCene = [],
  selectedPaket = null,
  selectedUsluge = [],
  brojDece = "",
  slotDurationHours = 1,
}) => {
  const ceneTotal = Array.isArray(selectedCene)
    ? selectedCene.reduce(
        (sum, item) =>
          sum + calculateItemPrice(item, brojDece, slotDurationHours),
        0,
      )
    : 0;

  const paketTotal = selectedPaket
    ? calculateItemPrice(selectedPaket, brojDece, slotDurationHours)
    : 0;

  const uslugeTotal = Array.isArray(selectedUsluge)
    ? selectedUsluge.reduce(
        (sum, item) =>
          sum + calculateItemPrice(item, brojDece, slotDurationHours),
        0,
      )
    : 0;

  return ceneTotal + paketTotal + uslugeTotal;
};
