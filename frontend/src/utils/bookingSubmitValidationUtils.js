import { isPastSlotTime, isQuarterHour, timeToMinutes } from "./bookingUtils";
import { doesOverlapBusyInterval } from "./bookingAvailabilityUtils";
import { validateGuestPassword, validatePhone } from "./bookingValidationUtils";

export const validateBookingSubmit = ({
  selectedStartTime = "",
  selectedEndTime = "",
  selectedDate = "",
  hasPerPersonPricing = false,
  brojDece = "",
  availability = null,
  selectedCenaIds = [],
  selectedPaketId = "",
  korisnikPodaci = {},
  isAuthenticated = false,
  acceptedTerms = false,
}) => {
  if (!selectedStartTime || !selectedEndTime) {
    return {
      success: false,
      field: "startTime",
      error: "Izaberite vreme početka i završetka.",
    };
  }

  if (
    isPastSlotTime(selectedStartTime, selectedDate) ||
    isPastSlotTime(selectedEndTime, selectedDate)
  ) {
    return {
      success: false,
      field: "startTime",
      error: "Nije moguće rezervisati termin u prošlosti.",
    };
  }

  if (hasPerPersonPricing && (!Number(brojDece) || Number(brojDece) < 1)) {
    return {
      success: false,
      field: "brojDece",
      error:
        "Broj dece je obavezan jer je izabrana stavka koja se naplaćuje po osobi.",
    };
  }

  if (timeToMinutes(selectedEndTime) <= timeToMinutes(selectedStartTime)) {
    return {
      success: false,
      field: "endTime",
      error: "Vreme završetka mora biti posle vremena početka.",
    };
  }

  if (!availability?.workingHours) {
    return {
      success: false,
      field: "startTime",
      error: "Igraonica ne radi tog dana.",
    };
  }

  if (
    timeToMinutes(selectedStartTime) <
      timeToMinutes(availability.workingHours.vremeOd) ||
    timeToMinutes(selectedEndTime) >
      timeToMinutes(availability.workingHours.vremeDo)
  ) {
    return {
      success: false,
      field: "startTime",
      error: "Izabrani termin mora biti unutar radnog vremena.",
    };
  }

  if (
    doesOverlapBusyInterval(availability, selectedStartTime, selectedEndTime)
  ) {
    return {
      success: false,
      field: "startTime",
      error: "Izabrani termin se preklapa sa zauzetim terminom.",
    };
  }

  if (
    (!Array.isArray(selectedCenaIds) || selectedCenaIds.length === 0) &&
    !selectedPaketId
  ) {
    return {
      success: false,
      field: "pricing",
      error: "Izaberi bar jednu stavku iz cenovnika ili paket.",
    };
  }

  if (!korisnikPodaci.ime?.trim()) {
    return {
      success: false,
      field: "ime",
      error: "Unesite ime.",
    };
  }

  if (!korisnikPodaci.prezime?.trim()) {
    return {
      success: false,
      field: "prezime",
      error: "Unesite prezime.",
    };
  }

  const email = korisnikPodaci.email?.trim().toLowerCase() || "";

  if (!email) {
    return {
      success: false,
      field: "email",
      error: "Unesite email.",
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return {
      success: false,
      field: "email",
      error: "Unesite ispravnu email adresu.",
    };
  }

  const phoneValidation = validatePhone(korisnikPodaci.telefon);

  if (!phoneValidation.success) {
    return {
      success: false,
      field: "telefon",
      error: phoneValidation.error,
    };
  }

  if (!isAuthenticated) {
    const passwordValidation = validateGuestPassword({
      password: korisnikPodaci.password,
      confirmPassword: korisnikPodaci.confirmPassword,
    });

    if (!passwordValidation.success) {
      return {
        success: false,
        field: passwordValidation.field,
        error: passwordValidation.error,
      };
    }
  }

  if (!acceptedTerms) {
    return {
      success: false,
      field: "terms",
      error: "Morate prihvatiti uslove korišćenja i politiku privatnosti.",
    };
  }

  if (!isQuarterHour(selectedStartTime) || !isQuarterHour(selectedEndTime)) {
    return {
      success: false,
      field: "startTime",
      error: "Vreme mora biti u koracima od 15 minuta.",
    };
  }

  return {
    success: true,
    phone: phoneValidation.value,
  };
};
