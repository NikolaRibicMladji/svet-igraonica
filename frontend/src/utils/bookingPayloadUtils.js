import { formatDateForBackend } from "./bookingUtils";

const normalizeId = (value) => String(value || "").trim();

const normalizeIdList = (items) =>
  Array.isArray(items) ? items.map(normalizeId).filter(Boolean) : [];

const toSafeNumber = (value) => {
  if (value === "") return 0;

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

export const buildBookingPayload = ({
  playroomId,
  selectedDate,
  selectedStartTime,
  selectedEndTime,
  selectedCenaIds = [],
  selectedPaketId = "",
  selectedUslugeIds = [],
  brojDece = "",
  brojRoditelja = "",
  korisnikPodaci = {},
  telefon = "",
  napomena = "",
}) => ({
  playroomId: normalizeId(playroomId),
  datum: formatDateForBackend(selectedDate),
  vremeOd: selectedStartTime,
  vremeDo: selectedEndTime,
  cenaIds: normalizeIdList(selectedCenaIds),
  paketId: normalizeId(selectedPaketId) || null,
  usluge: normalizeIdList(selectedUslugeIds),
  brojDece: toSafeNumber(brojDece),
  brojRoditelja: toSafeNumber(brojRoditelja),
  ime: korisnikPodaci.ime?.trim() || "",
  prezime: korisnikPodaci.prezime?.trim() || "",
  email: korisnikPodaci.email?.trim().toLowerCase() || "",
  telefon: String(telefon || "").trim(),
  napomena: String(napomena || "").trim(),
});
