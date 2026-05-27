import { formatDateForBackend } from "./bookingUtils";

const normalizeId = (value) => String(value || "").trim();

const normalizeIdList = (items) =>
  Array.isArray(items) ? items.map(normalizeId).filter(Boolean) : [];

const toSafeNumber = (value) => {
  if (value === "" || value === null || value === undefined) return 0;

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue < 0) return 0;

  return Math.floor(numberValue);
};

const normalizeBookingMode = (value) => {
  const safeValue = String(value || "")
    .trim()
    .toLowerCase();

  return ["fiksno", "fleksibilno"].includes(safeValue) ? safeValue : "";
};

export const buildBookingPayload = ({
  playroomId,
  bookingMode = "",
  selectedTimeSlotId = "",
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
}) => {
  const mode = normalizeBookingMode(bookingMode);

  const basePayload = {
    playroomId: normalizeId(playroomId),
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
    mode,
  };

  if (mode === "fiksno") {
    return {
      ...basePayload,
      timeSlotId: normalizeId(selectedTimeSlotId),
    };
  }

  return {
    ...basePayload,
    datum: formatDateForBackend(selectedDate),
    vremeOd: selectedStartTime,
    vremeDo: selectedEndTime,
  };
};
