import { isPastSlotTime, isQuarterHour, timeToMinutes } from "./bookingUtils";
import { doesOverlapBusyInterval } from "./bookingAvailabilityUtils";
import { validateGuestPassword, validatePhone } from "./bookingValidationUtils";

export const validateBookingSubmit = ({
  bookingMode = "",
  selectedTimeSlotId = "",
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
  const isFiksno = bookingMode === "fiksno" || availability?.mode === "fiksno";

  if (!selectedDate) {
    return {
      success: false,
      field: "startTime",
      error: "Izaberite datum rezervacije.",
    };
  }

  if (!availability?.workingHours) {
    return {
      success: false,
      field: "startTime",
      error: "Igraonica ne radi tog dana.",
    };
  }

  if (isFiksno) {
    if (!selectedTimeSlotId) {
      return {
        success: false,
        field: "startTime",
        error: "Izaberite slobodan termin.",
      };
    }

    const selectedSlot = Array.isArray(availability?.slots)
      ? availability.slots.find(
          (slot) => String(slot._id) === String(selectedTimeSlotId),
        )
      : null;

    if (
      !selectedSlot ||
      selectedSlot.available !== true ||
      selectedSlot.zauzeto === true
    ) {
      return {
        success: false,
        field: "startTime",
        error: "Izabrani termin više nije dostupan.",
      };
    }

    if (isPastSlotTime(selectedSlot.vremeOd, selectedDate)) {
      return {
        success: false,
        field: "startTime",
        error: "Nije moguće rezervisati termin u prošlosti.",
      };
    }
  } else {
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

    if (timeToMinutes(selectedEndTime) <= timeToMinutes(selectedStartTime)) {
      return {
        success: false,
        field: "endTime",
        error: "Vreme završetka mora biti posle vremena početka.",
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

    if (!isQuarterHour(selectedStartTime) || !isQuarterHour(selectedEndTime)) {
      return {
        success: false,
        field: "startTime",
        error: "Vreme mora biti u koracima od 15 minuta.",
      };
    }
  }

  const safeBrojDece = Number(brojDece);

  if (
    hasPerPersonPricing &&
    (!Number.isInteger(safeBrojDece) || safeBrojDece < 1 || safeBrojDece > 200)
  ) {
    return {
      success: false,
      field: "brojDece",
      error:
        "Broj dece je obavezan i mora biti ceo broj između 1 i 200 jer je izabrana stavka koja se naplaćuje po osobi.",
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

  return {
    success: true,
    phone: phoneValidation.value,
  };
};
