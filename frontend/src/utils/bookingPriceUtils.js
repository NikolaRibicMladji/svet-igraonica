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

export const calculateBookingTotal = ({
  selectedCene = [],
  selectedPaket = null,
  selectedUsluge = [],
  brojDece = "",
  slotDurationHours = 1,
}) => {
  let total = 0;
  const trajanjeSati = Number(slotDurationHours) || 1;
  const broj = brojDece === "" ? 0 : Number(brojDece);

  selectedCene.forEach((c) => {
    const cena = Number(c.cena) || 0;

    if (c.tip === "po_satu") {
      total += cena * trajanjeSati;
      return;
    }

    if (c.tip === "po_osobi") {
      total += cena * broj;
      return;
    }

    total += cena;
  });

  if (selectedPaket) {
    const cena = Number(selectedPaket.cena) || 0;

    if (selectedPaket.tip === "po_satu") {
      total += cena * trajanjeSati;
    } else if (selectedPaket.tip === "po_osobi") {
      total += cena * broj;
    } else {
      total += cena;
    }
  }

  selectedUsluge.forEach((u) => {
    const cena = Number(u.cena) || 0;

    if (u.tip === "po_satu") {
      total += cena * trajanjeSati;
      return;
    }

    if (u.tip === "po_osobi") {
      total += cena * broj;
      return;
    }

    total += cena;
  });

  return total;
};
