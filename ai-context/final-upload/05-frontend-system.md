==================================================
frontend-ui-rules
==================================================

# Frontend UI/UX Rules

## Opšta Pravila

Frontend mora biti:

- responsive
- profesionalan
- moderan
- brz
- čist
- production-ready

UI mora dobro raditi na:

- telefonu
- tabletu
- desktopu

## CSS Pravila

CSS:

- ide u posebne fajlove
- ne koristiti inline style osim ako baš mora
- koristiti konzistentan spacing
- ništa ne sme biti zalepljeno uz ivice

## Responsive Pravila

Obavezno:

- mobile-first pristup
- fleksibilni grid/layout
- responsive typography
- responsive buttons
- responsive modali

## Komponente

Komponente moraju:

- biti modularne
- imati jasnu odgovornost
- ne biti ogromne
- biti reusable gde ima smisla

Ne stavljati:

- business logiku u UI komponentu
- ogromne useEffect blokove
- previše state logike u jednoj komponenti

## Stranice

Glavne stranice:

- Home
- Playrooms
- PlayroomDetails
- Book
- MyBookings
- OwnerDashboard
- AdminPanel
- CreatePlayroom
- ManagePlayroom

## Booking UI

Booking UI mora:

- jasno prikazivati slobodne termine
- jasno prikazivati zauzete termine
- prikazivati preparation time efekte
- biti brz i intuitivan

Korisnik mora odmah razumeti:

- šta je slobodno
- šta je zauzeto
- šta može kliknuti
- šta ne može

## Forme

Sve forme moraju imati:

- validaciju
- jasne error poruke
- loading state
- disabled state tokom submit-a

## Toast Sistem

Toast poruke:

- moraju biti jasne
- ne smeju spamovati korisnika
- koristiti centralizovani ToastContext

## Modal Pravila

Modali:

- moraju biti responsive
- zatvaranje na ESC
- zatvaranje klikom van modala
- proper scroll handling

## API Pozivi

Frontend:

- ne sme direktno koristiti fetch svuda
- koristiti centralizovane services
- koristiti axios instance

## Auth UI

Auth flow:

- automatski refresh token
- protected routes
- proper loading state
- proper logout flow

## Performance Pravila

Izbegavati:

- nepotrebne rerender-e
- ogromne komponente
- duplirane API pozive
- previše state-a

Koristiti:

- memoizaciju gde ima smisla
- lazy loading gde ima smisla
- reusable hooks

## Zabranjeno

Ne sme:

- inline CSS svuda
- hardcoded boje svuda po komponentama
- business logika u page komponentama
- direktni API pozivi iz mnogo mesta
- nekonzistentan spacing
- loš mobile UI

==================================================
FILE: Book.js
==================================================
import React, {
useEffect,
useRef,
useCallback,
useState,
useMemo,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
getAvailableTimeSlots,
createBooking,
createGuestBooking,
} from "../services/bookingService";
import { getPlayroomById } from "../services/playroomService";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import "../styles/Book.css";
import { normalizeText } from "../utils/normalizeText";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const getLocalDate = () => {
const d = new Date();
const year = d.getFullYear();
const month = String(d.getMonth() + 1).padStart(2, "0");
const day = String(d.getDate()).padStart(2, "0");
return `${year}-${month}-${day}`;
};

const formatDateForBackend = (date) => {
if (!date) return "";

// date je već YYYY-MM-DD string
// ne koristiti toISOString zbog timezone shift problema
if (typeof date === "string") {
return date;
}

const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, "0");
const day = String(date.getDate()).padStart(2, "0");

return `${year}-${month}-${day}`;
};

const Book = () => {
const { id } = useParams();
const navigate = useNavigate();
const location = useLocation();
const queryParams = new URLSearchParams(location.search);

const prefillDate = queryParams.get("datum") || "";
const prefillStart = queryParams.get("vremeOd") || "";
const prefillEnd = queryParams.get("vremeDo") || "";
const isOwnerBooking = queryParams.get("mode") === "owner";
const {
user,
isAuthenticated,
loading: authLoading,
handleAuthSuccess,
} = useAuth();
const toast = useToast();
const [selectedCenaIds, setSelectedCenaIds] = useState([]);
const [selectedPaketId, setSelectedPaketId] = useState("");
const [selectedUslugeIds, setSelectedUslugeIds] = useState([]);
const [openStartDropdown, setOpenStartDropdown] = useState(false);
const [openEndDropdown, setOpenEndDropdown] = useState(false);
const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);

const topRef = useRef(null);
const [acceptedTerms, setAcceptedTerms] = useState(false);
const [playroom, setPlayroom] = useState(null);
const [availability, setAvailability] = useState(null);
const [selectedStartTime, setSelectedStartTime] = useState(prefillStart);
const [selectedEndTime, setSelectedEndTime] = useState(prefillEnd);
const startDropdownRef = useRef(null);
const endDropdownRef = useRef(null);
const startTimeRef = useRef(null);
const endTimeRef = useRef(null);
const brojDeceWrapperRef = useRef(null);
const pricingRef = useRef(null);
const imeRef = useRef(null);
const prezimeRef = useRef(null);
const emailRef = useRef(null);
const telefonRef = useRef(null);
const passwordRef = useRef(null);
const confirmPasswordRef = useRef(null);
const termsRef = useRef(null);
const [napomena, setNapomena] = useState("");
const [brojDece, setBrojDece] = useState("");
const [brojRoditelja, setBrojRoditelja] = useState("");
const [loading, setLoading] = useState(true);
const [loadingSlots, setLoadingSlots] = useState(false);
const [submitting, setSubmitting] = useState(false);
const [error, setError] = useState("");
const brojDeceRef = useRef(null);
const [selectedDate, setSelectedDate] = useState(
prefillDate || getLocalDate(),
);

const [korisnikPodaci, setKorisnikPodaci] = useState({
ime: "",
prezime: "",
email: "",
telefon: "",
password: "",
confirmPassword: "",
});

const formatDateShortLat = (date) => {
if (!date) return "";

    return new Intl.DateTimeFormat("sr-Latn-RS", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(date));

};

const formatDateLat = (date) => {
if (!date) return "";

    return new Intl.DateTimeFormat("sr-Latn-RS", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(date));

};

const hasPerPersonPricing = useMemo(() => {
const izabraneCene = Array.isArray(playroom?.cene)
? playroom.cene.filter((item) =>
selectedCenaIds.includes(String(item.\_id)),
)
: [];

    const izabranPaket =
      Array.isArray(playroom?.paketi) && selectedPaketId
        ? playroom.paketi.find(
            (item) => String(item._id) === String(selectedPaketId),
          )
        : null;

    const izabraneUsluge = Array.isArray(playroom?.dodatneUsluge)
      ? playroom.dodatneUsluge.filter((item) =>
          selectedUslugeIds.includes(String(item._id)),
        )
      : [];

    const sveIzabrano = [
      ...izabraneCene,
      ...(izabranPaket ? [izabranPaket] : []),
      ...izabraneUsluge,
    ];

    return sveIzabrano.some((item) => item?.tip === "po_osobi");

}, [playroom, selectedCenaIds, selectedPaketId, selectedUslugeIds]);

const showBrojDeceRequiredNotice = () => {
toast.error(
"Broj dece je obavezan jer je izabrana stavka koja se naplaćuje po osobi.",
);
};

const focusBrojDeceField = () => {
if (brojDeceRef.current) {
const elementTop =
brojDeceRef.current.getBoundingClientRect().top + window.pageYOffset;

      const offset = 140; // promeni na 120 ili 160 ako hoćeš malo više/manje
      const targetTop = elementTop - offset;

      window.scrollTo({
        top: targetTop,
        behavior: "smooth",
      });

      setTimeout(() => {
        brojDeceRef.current.focus();
      }, 450);
    }

};

const hasSelectedDate = Boolean(selectedDate);

const handleCenaToggle = (cenaId) => {
setError("");
const clickedCena = Array.isArray(playroom?.cene)
? playroom.cene.find((item) => String(item.\_id) === String(cenaId))
: null;

    const wasSelected = selectedCenaIds.includes(String(cenaId));

    setSelectedCenaIds((prev) =>
      wasSelected
        ? prev.filter((id) => id !== String(cenaId))
        : [...prev, String(cenaId)],
    );

    if (!wasSelected && clickedCena?.tip === "po_osobi" && !Number(brojDece)) {
      showBrojDeceRequiredNotice();
      focusBrojDeceField();
    }

};

const handlePaketToggle = (paketId) => {
setError("");
const clickedPaket = Array.isArray(playroom?.paketi)
? playroom.paketi.find((item) => String(item.\_id) === String(paketId))
: null;

    const isSameSelected = String(selectedPaketId) === String(paketId);

    if (isSameSelected) {
      setSelectedPaketId("");
      return;
    }

    setSelectedPaketId(String(paketId));

    if (clickedPaket?.tip === "po_osobi" && !Number(brojDece)) {
      showBrojDeceRequiredNotice();
      focusBrojDeceField();
    }

};

const handleUslugaToggle = (uslugaId) => {
setError("");
const clickedUsluga = Array.isArray(playroom?.dodatneUsluge)
? playroom.dodatneUsluge.find(
(item) => String(item.\_id) === String(uslugaId),
)
: null;

    const wasSelected = selectedUslugeIds.includes(String(uslugaId));

    setSelectedUslugeIds((prev) =>
      wasSelected
        ? prev.filter((id) => id !== String(uslugaId))
        : [...prev, String(uslugaId)],
    );

    if (
      !wasSelected &&
      clickedUsluga?.tip === "po_osobi" &&
      !Number(brojDece)
    ) {
      showBrojDeceRequiredNotice();
      focusBrojDeceField();
    }

};

const loadPlayroom = useCallback(async () => {
setLoading(true);
setError("");

    try {
      const result = await getPlayroomById(id);

      if (result?.success) {
        setPlayroom(result.data);
      } else {
        setError(result?.error || "Greška pri učitavanju igraonice.");
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Greška pri učitavanju igraonice.",
      );
    } finally {
      setLoading(false);
    }

}, [id]);

const loadTimeSlots = useCallback(async () => {
setLoadingSlots(true);
setError("");
if (!isOwnerBooking) {
setSelectedStartTime("");
setSelectedEndTime("");
setError("");
}

    try {
      const result = await getAvailableTimeSlots(
        id,
        formatDateForBackend(selectedDate),
      );

      if (result?.success) {
        setAvailability(result.data || null);
      } else {
        setAvailability(null);
        setError(result?.error || "Greška pri učitavanju termina.");
      }
    } catch (err) {
      setAvailability(null);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Greška pri učitavanju termina.",
      );
    } finally {
      setLoadingSlots(false);
    }

}, [id, selectedDate]);

useEffect(() => {
if (isOwnerBooking && prefillStart && prefillEnd) {
setSelectedStartTime(prefillStart);
setSelectedEndTime(prefillEnd);
}
}, [isOwnerBooking, prefillStart, prefillEnd]);

useEffect(() => {
if (isOwnerBooking) {
setKorisnikPodaci({
ime: "",
prezime: "",
email: "",
telefon: "",
password: "",
confirmPassword: "",
});

      return;
    }

    if (!authLoading && isAuthenticated && user) {
      setKorisnikPodaci((prev) => ({
        ...prev,
        ime: user.ime || prev.ime || "",
        prezime: user.prezime || prev.prezime || "",
        email: user.email || prev.email || "",
        telefon: user.telefon || prev.telefon || "",
        password: "",
        confirmPassword: "",
      }));
    }

}, [authLoading, isAuthenticated, user, isOwnerBooking]);

useEffect(() => {
loadPlayroom();
}, [loadPlayroom]);

useEffect(() => {
if (playroom?.\_id && selectedDate) {
loadTimeSlots();
} else {
setAvailability(null);
setSelectedStartTime("");
setSelectedEndTime("");
}
}, [playroom?._id, selectedDate, loadTimeSlots]);

useEffect(() => {
const handleClickOutside = (event) => {
if (
startDropdownRef.current &&
!startDropdownRef.current.contains(event.target)
) {
setOpenStartDropdown(false);
}

      if (
        endDropdownRef.current &&
        !endDropdownRef.current.contains(event.target)
      ) {
        setOpenEndDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };

}, []);

const scrollToTop = () => {
setTimeout(() => {
if (topRef.current) {
topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
} else {
window.scrollTo({ top: 0, behavior: "smooth" });
}
}, 100);
};

const scrollToField = (ref) => {
if (!ref?.current) {
scrollToTop();
return;
}

    const elementTop =
      ref.current.getBoundingClientRect().top + window.pageYOffset;

    window.scrollTo({
      top: elementTop - 120,
      behavior: "smooth",
    });

    setTimeout(() => {
      const input = ref.current.querySelector("input, textarea, select");
      if (input) input.focus();
    }, 400);

};

const selectedCene = Array.isArray(playroom?.cene)
? playroom.cene.filter((c) => selectedCenaIds.includes(String(c.\_id)))
: [];

const selectedPaket = Array.isArray(playroom?.paketi)
? playroom.paketi.find((p) => String(p.\_id) === String(selectedPaketId))
: null;

const selectedUsluge = Array.isArray(playroom?.dodatneUsluge)
? playroom.dodatneUsluge.filter((u) =>
selectedUslugeIds.includes(String(u.\_id)),
)
: [];

const isFiksno = playroom?.rezimRezervacije === "fiksno";
const trajanjeTermina = Number(playroom?.trajanjeTermina) || 60;

const timeToMinutes = (time) => {
const [h, m] = String(time || "00:00")
.split(":")
.map(Number);
return h \* 60 + m;
};

const minutesToTime = (minutes) => {
const safeMinutes = Math.max(0, Number(minutes) || 0);
const hour = Math.floor(safeMinutes / 60);
const minute = safeMinutes % 60;

    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

};

const slotDurationHours = useMemo(() => {
if (!selectedStartTime || !selectedEndTime) return 1;

    const startMinutes = timeToMinutes(selectedStartTime);
    const endMinutes = timeToMinutes(selectedEndTime);
    const diff = endMinutes - startMinutes;

    if (!Number.isFinite(diff) || diff <= 0) return 1;

    return diff / 60;

}, [selectedStartTime, selectedEndTime]);

const slotDurationLabel = useMemo(() => {
if (!selectedStartTime || !selectedEndTime) return "";

    const startMinutes = timeToMinutes(selectedStartTime);
    const endMinutes = timeToMinutes(selectedEndTime);
    const diff = endMinutes - startMinutes;

    if (!Number.isFinite(diff) || diff <= 0) return "";

    const sati = Math.floor(diff / 60);
    const minuti = diff % 60;

    if (sati > 0 && minuti > 0) {
      return `${sati}h ${minuti}min`;
    }

    if (sati > 0) {
      return `${sati}h`;
    }

    return `${minuti}min`;

}, [selectedStartTime, selectedEndTime]);

const calculateTotal = useCallback(() => {
let total = 0;
const trajanjeSati = slotDurationHours;

    if (Array.isArray(selectedCene)) {
      selectedCene.forEach((c) => {
        if (c.tip === "fiksno") {
          total += Number(c.cena) || 0;
        }

        if (c.tip === "po_satu") {
          total += (Number(c.cena) || 0) * trajanjeSati;
        }

        if (c.tip === "po_osobi") {
          const broj = brojDece === "" ? 0 : Number(brojDece);

          total += (Number(c.cena) || 0) * broj;
        }
      });
    }

    if (selectedPaket) {
      if (selectedPaket.tip === "fiksno" || !selectedPaket.tip) {
        total += Number(selectedPaket.cena) || 0;
      }

      if (selectedPaket.tip === "po_osobi") {
        const broj = brojDece === "" ? 0 : Number(brojDece);
        total += (Number(selectedPaket.cena) || 0) * broj;
      }

      if (selectedPaket.tip === "po_satu") {
        total += (Number(selectedPaket.cena) || 0) * slotDurationHours;
      }
    }

    selectedUsluge.forEach((u) => {
      if (u.tip === "fiksno") {
        total += Number(u.cena) || 0;
      }

      if (u.tip === "po_osobi") {
        const broj = brojDece === "" ? 0 : Number(brojDece);
        total += (Number(u.cena) || 0) * broj;
      }

      if (u.tip === "po_satu") {
        total += (Number(u.cena) || 0) * trajanjeSati;
      }
    });

    return total;

}, [
selectedCene,
selectedPaket,
selectedUsluge,
brojDece,
slotDurationHours,
]);

const totalPrice = useMemo(() => calculateTotal(), [calculateTotal]);

const isToday = (date) => {
if (!date) return false;

    const today = new Date();

    const todayString = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");

    return date === todayString;

};

const isPastTime = (time) => {
if (!selectedDate || !isToday(selectedDate)) {
return false;
}

    const now = new Date();

    const [year, month, day] = selectedDate.split("-").map(Number);
    const [hours, minutes] = String(time || "00:00")
      .split(":")
      .map(Number);

    const slotDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

    return slotDate <= now;

};

const isQuarterHour = (time) => {
const [h, m] = String(time || "00:00")
.split(":")
.map(Number);

    if (!Number.isFinite(h) || !Number.isFinite(m)) return false;

    return [0, 15, 30, 45].includes(m);

};

const generateQuarterHourOptions = (startTime, endTime) => {
if (!startTime || !endTime) return [];

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    const options = [];

    for (let current = startMinutes; current <= endMinutes; current += 15) {
      const hours = String(Math.floor(current / 60)).padStart(2, "0");
      const minutes = String(current % 60).padStart(2, "0");
      options.push(`${hours}:${minutes}`);
    }

    return options;

};

const doesOverlapBusyInterval = (start, end) => {
const busyIntervals = Array.isArray(availability?.busyIntervals)
? availability.busyIntervals
: [];

    const startMinutes = timeToMinutes(start);
    const endMinutes = timeToMinutes(end);
    const preparationMinutes = Number(playroom?.vremePripremeTermina) || 0;

    return busyIntervals.some((interval) => {
      const busyStart = timeToMinutes(interval.vremeOd);
      const busyEnd = timeToMinutes(interval.vremeDo) + preparationMinutes;

      return startMinutes < busyEnd && endMinutes > busyStart;
    });

};

const buildAvailabilitySegments = () => {
if (!availability?.workingHours) return [];

    const workingStart = timeToMinutes(availability.workingHours.vremeOd);
    const workingEnd = timeToMinutes(availability.workingHours.vremeDo);
    const preparationMinutes = Number(playroom?.vremePripremeTermina) || 0;

    const busyIntervals = Array.isArray(availability?.busyIntervals)
      ? [...availability.busyIntervals].sort(
          (a, b) => timeToMinutes(a.vremeOd) - timeToMinutes(b.vremeOd),
        )
      : [];

    const segments = [];
    let cursor = workingStart;

    for (const interval of busyIntervals) {
      const busyStart = timeToMinutes(interval.vremeOd);
      const busyEnd = timeToMinutes(interval.vremeDo);
      const busyEndWithPrep = Math.min(
        busyEnd + preparationMinutes,
        workingEnd,
      );

      if (busyStart > cursor) {
        segments.push({
          tip: "slobodno",
          vremeOd: minutesToTime(cursor),
          vremeDo: minutesToTime(busyStart),
        });
      }

      segments.push({
        tip: "zauzeto",
        vremeOd: interval.vremeOd,
        vremeDo: interval.vremeDo,
        pripremaOd: busyEnd < busyEndWithPrep ? interval.vremeDo : null,
        pripremaDo:
          busyEnd < busyEndWithPrep ? minutesToTime(busyEndWithPrep) : null,
      });

      cursor = Math.max(cursor, busyEndWithPrep);
    }

    if (cursor < workingEnd) {
      segments.push({
        tip: "slobodno",
        vremeOd: minutesToTime(cursor),
        vremeDo: minutesToTime(workingEnd),
      });
    }

    return segments;

};

const buildStartDropdownItems = () => {
if (!availability?.workingHours) return [];

    const items = [];

    availabilitySegments.forEach((segment, index) => {
      if (segment.tip === "zauzeto") {
        items.push({
          type: "busy",
          key: `busy-${index}-${segment.vremeOd}-${segment.vremeDo}`,
          label: `❌ Zauzeto: ${segment.vremeOd} - ${segment.vremeDo}${
            segment.pripremaOd && segment.pripremaDo
              ? ` + priprema ${segment.pripremaOd} - ${segment.pripremaDo}`
              : ""
          }`,
        });
        return;
      }

      const intervalOptions = generateQuarterHourOptions(
        segment.vremeOd,
        segment.vremeDo,
      ).slice(0, -1);

      intervalOptions.forEach((time) => {
        const startMinutes = timeToMinutes(time);
        const endMinutes =
          startMinutes +
          (playroom?.rezimRezervacije === "fiksno"
            ? Number(playroom?.trajanjeTermina) || 60
            : 15);

        const calculatedEndTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;

        const isValid =
          timeToMinutes(calculatedEndTime) <=
            timeToMinutes(availability.workingHours.vremeDo) &&
          !doesOverlapBusyInterval(time, calculatedEndTime);

        if (isValid) {
          const isPast = isPastTime(time);

          items.push({
            type: isPast ? "busy" : "free",
            key: `free-${index}-${time}`,
            value: time,
            label: isPast ? `❌ Prošlo: ${time}` : `✅ ${time}`,
          });
        }
      });
    });

    return items;

};

const buildEndDropdownItems = () => {
if (!availability?.workingHours || !selectedStartTime) return [];

    const items = [];

    availabilitySegments.forEach((segment, index) => {
      if (segment.tip === "zauzeto") {
        items.push({
          type: "busy",
          key: `end-busy-${index}-${segment.vremeOd}-${segment.vremeDo}`,
          label: `❌ Zauzeto: ${segment.vremeOd} - ${segment.vremeDo}${
            segment.pripremaOd && segment.pripremaDo
              ? ` + priprema ${segment.pripremaOd} - ${segment.pripremaDo}`
              : ""
          }`,
        });
        return;
      }

      const intervalOptions = generateQuarterHourOptions(
        segment.vremeOd,
        segment.vremeDo,
      );

      intervalOptions.forEach((time) => {
        const startMinutes = timeToMinutes(selectedStartTime);
        const endMinutes = timeToMinutes(time);

        if (endMinutes <= startMinutes) return;
        if (endMinutes > timeToMinutes(availability.workingHours.vremeDo))
          return;

        if (playroom?.rezimRezervacije === "fiksno") {
          if (endMinutes !== startMinutes + trajanjeTermina) return;
        }

        if (!doesOverlapBusyInterval(selectedStartTime, time)) {
          const isPast = isPastTime(time);

          items.push({
            type: isPast ? "busy" : "free",
            key: `end-free-${index}-${time}`,
            value: time,
            label: isPast ? `❌ Prošlo: ${time}` : `✅ ${time}`,
          });
        }
      });
    });

    return items;

};

const availabilitySegments = useMemo(
() => buildAvailabilitySegments(),
[availability, playroom],
);
const startDropdownItems = useMemo(
() => buildStartDropdownItems(),
[availability, availabilitySegments, playroom, selectedDate],
);

const endDropdownItems = useMemo(
() => buildEndDropdownItems(),
[
availability,
availabilitySegments,
playroom,
selectedStartTime,
trajanjeTermina,
],
);
const handleBook = async () => {
setError("");

    if (!selectedStartTime || !selectedEndTime) {
      setError("Izaberite vreme početka i završetka.");
      scrollToField(startTimeRef);
      return;
    }
    if (isPastTime(selectedStartTime) || isPastTime(selectedEndTime)) {
      setError("Nije moguće rezervisati termin u prošlosti.");
      scrollToField(startTimeRef);
      return;
    }

    if (hasPerPersonPricing && (!Number(brojDece) || Number(brojDece) < 1)) {
      setError(
        "Broj dece je obavezan jer je izabrana stavka koja se naplaćuje po osobi.",
      );

      showBrojDeceRequiredNotice();
      focusBrojDeceField();

      return;
    }

    if (timeToMinutes(selectedEndTime) <= timeToMinutes(selectedStartTime)) {
      setError("Vreme završetka mora biti posle vremena početka.");
      scrollToField(endTimeRef);
      return;
    }

    if (!availability?.workingHours) {
      setError("Igraonica ne radi tog dana.");
      scrollToField(startTimeRef);
      return;
    }

    if (
      timeToMinutes(selectedStartTime) <
        timeToMinutes(availability.workingHours.vremeOd) ||
      timeToMinutes(selectedEndTime) >
        timeToMinutes(availability.workingHours.vremeDo)
    ) {
      setError("Izabrani termin mora biti unutar radnog vremena.");
      scrollToField(startTimeRef);
      return;
    }

    if (doesOverlapBusyInterval(selectedStartTime, selectedEndTime)) {
      setError("Izabrani termin se preklapa sa zauzetim terminom.");
      scrollToField(startTimeRef);
      return;
    }

    if (selectedCenaIds.length === 0 && !selectedPaketId) {
      setError("Izaberi bar jednu stavku iz cenovnika ili paket.");
      scrollToField(pricingRef);
      return;
    }

    if (!korisnikPodaci.ime.trim()) {
      setError("Unesite ime.");
      scrollToField(imeRef);
      return;
    }

    if (!korisnikPodaci.prezime.trim()) {
      setError("Unesite prezime.");
      scrollToField(prezimeRef);
      return;
    }

    if (!korisnikPodaci.email.trim()) {
      setError("Unesite email.");
      scrollToField(emailRef);
      return;
    }

    if (!korisnikPodaci.telefon.trim()) {
      setError("Unesite telefon.");
      scrollToField(telefonRef);
      return;
    }
    const cleanedPhone = korisnikPodaci.telefon.trim();

    const phoneRegex = /^\+?[0-9]+$/;

    if (!phoneRegex.test(cleanedPhone)) {
      setError("Telefon može sadržati samo brojeve i znak + na početku.");
      scrollToField(telefonRef);
      return;
    }

    const digitsOnly = cleanedPhone.replace(/\D/g, "");

    if (digitsOnly.length < 6) {
      setError("Telefon mora imati bar 6 cifara.");
      scrollToField(telefonRef);
      return;
    }

    if (!isAuthenticated) {
      if (!korisnikPodaci.password.trim()) {
        setError("Unesite lozinku.");
        scrollToField(passwordRef);
        return;
      }

      if (korisnikPodaci.password.trim().length < 6) {
        setError("Lozinka mora imati najmanje 6 karaktera.");
        scrollToField(passwordRef);
        return;
      }

      if (!korisnikPodaci.confirmPassword.trim()) {
        setError("Potvrdite lozinku.");
        scrollToField(confirmPasswordRef);
        return;
      }

      if (korisnikPodaci.password !== korisnikPodaci.confirmPassword) {
        setError("Lozinke se ne poklapaju.");
        scrollToField(confirmPasswordRef);
        return;
      }
    }
    if (!acceptedTerms) {
      setError("Morate prihvatiti uslove korišćenja i politiku privatnosti.");
      scrollToField(termsRef);
      return;
    }
    if (!isQuarterHour(selectedStartTime) || !isQuarterHour(selectedEndTime)) {
      setError("Vreme mora biti u koracima od 15 minuta.");
      scrollToField(startTimeRef);
      return;
    }

    setSubmitting(true);

    try {
      const bookingPayload = {
        playroomId: id,
        datum: formatDateForBackend(selectedDate),
        vremeOd: selectedStartTime,
        vremeDo: selectedEndTime,
        cenaIds: selectedCenaIds,
        paketId: selectedPaketId || null,
        usluge: selectedUslugeIds,
        brojDece: brojDece === "" ? 0 : Number(brojDece),
        brojRoditelja: brojRoditelja === "" ? 0 : Number(brojRoditelja),
        ime: korisnikPodaci.ime.trim(),
        prezime: korisnikPodaci.prezime.trim(),
        email: korisnikPodaci.email.trim().toLowerCase(),
        telefon: korisnikPodaci.telefon.trim(),
        napomena: napomena.trim(),
      };

      let result;

      if (isAuthenticated) {
        result = await createBooking({
          ...bookingPayload,
          acceptedTerms,
        });
      } else {
        result = await createGuestBooking({
          ...bookingPayload,
          password: korisnikPodaci.password,
          confirmPassword: korisnikPodaci.confirmPassword,
          acceptedTerms,
        });
      }

      if (result?.success) {
        setOpenStartDropdown(false);
        setOpenEndDropdown(false);

        if (!isAuthenticated) {
          const authResult = handleAuthSuccess({
            data: {
              accessToken: result.accessToken,
              user: result.user,
            },
          });

          if (!authResult?.success) {
            setError(
              "Rezervacija je uspešna, ali automatska prijava nije uspela.",
            );
            scrollToField(termsRef);
            return;
          }

          navigate("/booking-success", { replace: true });
          return;
        }

        await loadTimeSlots();
        navigate("/booking-success");
      } else {
        setError(result?.error || "Rezervacija nije uspela.");
        scrollToField(startTimeRef);
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Rezervacija nije uspela.",
      );
      scrollToField(startTimeRef);
    } finally {
      setSubmitting(false);
    }

};

const handleKorisnikChange = (e) => {
setError("");

    const { name, value } = e.target;

    const normalizedValue =
      name === "email" ? value.trim().toLowerCase() : value;

    setKorisnikPodaci((prev) => ({
      ...prev,
      [name]: normalizedValue,
    }));

};

const getPricingLabel = (item) => {
if (!item) return "";

    if (item.tip === "po_osobi") {
      return "po osobi";
    }

    if (item.tip === "po_satu") {
      return "po satu";
    }

    return "fiksna cena";

};

const formatBrojDece = (broj) => {
const n = Number(broj) || 0;

    if (n === 1) return "1 dete";

    return `${n} dece`;

};

if (loading) {
return <div className="container loading">Učitavanje...</div>;
}

if (!playroom) {
return (

<div className="container loading">
Nije moguće učitati podatke o igraonici.
</div>
);
}

return (

<div className="container book-page" ref={topRef}>
<button
className="back-link"
onClick={() => navigate(`/playrooms/${id}`)} >
← Nazad na igraonicu
</button>

      <div className="book-card">
        <div className="book-header">
          <h1>Rezerviši termin</h1>
          <div className="playroom-badge">
            <h2>{playroom.naziv}</h2>
            <p className="location">
              📍 {playroom.adresa}, {playroom.grad}
            </p>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="date-selector">
          <label>📅 Izaberite datum</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              const value = e.target.value;
              setOpenStartDropdown(false);
              setOpenEndDropdown(false);
              setSelectedDate(value);
              setSelectedStartTime("");
              setSelectedEndTime("");
              setSelectedCenaIds([]);
              setSelectedPaketId("");
              setSelectedUslugeIds([]);
              setBrojDece("");
              setBrojRoditelja("");
              setNapomena("");
              setError("");
            }}
            min={getLocalDate()}
            className="date-input"
          />
          <p className="date-display">{formatDateShortLat(selectedDate)}</p>
        </div>
        {!hasSelectedDate && (
          <div className="booking-info-box">
            Prvo izaberi datum da bi se prikazali slobodni termini i ostale
            opcije za rezervaciju.
          </div>
        )}

        {hasSelectedDate && (
          <>
            <div className="slots-section">
              <h3>Dostupnost za {formatDateLat(selectedDate)}</h3>

              {loadingSlots ? (
                <div className="loading-slots">Učitavanje termina...</div>
              ) : !availability?.workingHours ? (
                <div className="no-slots">
                  <p>😢 Igraonica ne radi za izabrani datum.</p>
                </div>
              ) : (
                <>
                  <div className="selected-slot-summary">
                    <p>
                      🕘 Radno vreme: {availability.workingHours.vremeOd} -{" "}
                      {availability.workingHours.vremeDo}
                    </p>
                  </div>

                  <div className="form-row time-row">
                    <div className="form-group" ref={startTimeRef}>
                      <label>Vreme od *</label>
                      <div
                        className="custom-time-dropdown"
                        ref={startDropdownRef}
                      >
                        <button
                          type="button"
                          className="custom-time-trigger"
                          disabled={loadingSlots}
                          onClick={() => setOpenStartDropdown((prev) => !prev)}
                        >
                          {selectedStartTime || "Izaberi vreme"}
                        </button>

                        {openStartDropdown && (
                          <div className="custom-time-menu">
                            <div
                              className="custom-time-item clear"
                              onClick={() => {
                                setSelectedStartTime("");
                                setSelectedEndTime("");
                                setError("");
                                setOpenStartDropdown(false);
                                setOpenEndDropdown(false);
                              }}
                            >
                              ✖ Reset
                            </div>

                            {startDropdownItems.length > 0 ? (
                              startDropdownItems.map((item) => (
                                <div
                                  key={item.key}
                                  className={`custom-time-item ${
                                    item.type === "busy" ? "busy" : "free"
                                  }`}
                                  onClick={() => {
                                    setError("");
                                    if (item.type !== "free") {
                                      setError(
                                        "Ovaj termin nije dostupan za rezervaciju.",
                                      );
                                      setOpenStartDropdown(false);
                                      return;
                                    }

                                    setSelectedStartTime(item.value);
                                    setOpenStartDropdown(false);
                                    setOpenEndDropdown(false);

                                    if (
                                      playroom?.rezimRezervacije === "fiksno"
                                    ) {
                                      const endMinutes =
                                        timeToMinutes(item.value) +
                                        trajanjeTermina;
                                      const endTime = `${String(
                                        Math.floor(endMinutes / 60),
                                      ).padStart(2, "0")}:${String(
                                        endMinutes % 60,
                                      ).padStart(2, "0")}`;
                                      setSelectedEndTime(endTime);
                                    } else {
                                      setSelectedEndTime("");
                                    }
                                  }}
                                >
                                  {item.label}
                                </div>
                              ))
                            ) : (
                              <div className="custom-time-item busy">
                                Nema dostupnih termina
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {!isFiksno ? (
                      <div className="form-group" ref={endTimeRef}>
                        <label>Vreme do *</label>

                        <div
                          className="custom-time-dropdown"
                          ref={endDropdownRef}
                        >
                          <button
                            type="button"
                            className="custom-time-trigger"
                            onClick={() => {
                              if (!selectedStartTime) return;
                              setOpenEndDropdown((prev) => !prev);
                            }}
                            disabled={!selectedStartTime || loadingSlots}
                          >
                            {selectedEndTime || "Izaberi vreme"}
                          </button>

                          {openEndDropdown && (
                            <div className="custom-time-menu">
                              <div
                                className="custom-time-item clear"
                                onClick={() => {
                                  setSelectedEndTime("");
                                  setError("");
                                  setOpenEndDropdown(false);
                                }}
                              >
                                ✖ Reset
                              </div>
                              {endDropdownItems.length > 0 ? (
                                endDropdownItems.map((item) => (
                                  <div
                                    key={item.key}
                                    className={`custom-time-item ${
                                      item.type === "busy" ? "busy" : "free"
                                    }`}
                                    onClick={() => {
                                      setError("");
                                      if (item.type !== "free") {
                                        setError(
                                          "Ovaj termin nije dostupan za rezervaciju.",
                                        );
                                        setOpenEndDropdown(false);
                                        return;
                                      }

                                      setSelectedEndTime(item.value);
                                      setOpenEndDropdown(false);
                                    }}
                                  >
                                    {item.label}
                                  </div>
                                ))
                              ) : (
                                <div className="custom-time-item busy">
                                  Nema dostupnih završetaka termina
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="form-group">
                        <label>Trajanje termina</label>
                        <input
                          type="text"
                          value={`${trajanjeTermina} minuta`}
                          disabled
                          className="date-input"
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {availability?.workingHours && !loadingSlots && (
              <div className="booking-form">
                <h3>Detalji rezervacije</h3>

                <div className="selected-slot-summary">
                  <p>📅 Datum: {formatDateLat(selectedDate)}</p>
                  <p>
                    ⏰ Vreme: {selectedStartTime || "-"} -{" "}
                    {selectedEndTime || "-"}
                    {selectedStartTime && selectedEndTime
                      ? ` (${slotDurationLabel})`
                      : ""}
                  </p>
                </div>

                {Array.isArray(playroom.cene) && playroom.cene.length > 0 && (
                  <div className="form-group" ref={pricingRef}>
                    <label className="booking-section-title">
                      Stavke iz cenovnika
                    </label>

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
                                  <strong>{cena.naziv}</strong> - {cena.cena}{" "}
                                  RSD ({getPricingLabel(cena)})
                                </span>

                                {cena.opis && (
                                  <span className="item-opis">
                                    ({cena.opis})
                                  </span>
                                )}
                              </div>

                              <input
                                type="checkbox"
                                checked={selectedCenaIds.includes(
                                  String(cena._id),
                                )}
                                onChange={() => handleCenaToggle(cena._id)}
                              />
                            </label>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {Array.isArray(playroom.paketi) &&
                  playroom.paketi.length > 0 && (
                    <div className="form-group">
                      <label className="booking-section-title">
                        Izaberi paket{" "}
                        <span className="inline-bracket-text">(opciono)</span>
                      </label>

                      <div className="booking-options-list booking-options-list--flat">
                        {playroom.paketi.map((p) => (
                          <div key={p._id} className="option-card">
                            <label className="option-check-row">
                              <div>
                                <span>
                                  {p.naziv} - {p.cena} RSD
                                  <span className="inline-bracket-text">
                                    ({getPricingLabel(p)})
                                  </span>
                                </span>

                                {p.opis && (
                                  <span className="item-opis">({p.opis})</span>
                                )}
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

                {Array.isArray(playroom.dodatneUsluge) &&
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
                                  {u.naziv} - {u.cena} RSD
                                  <span className="inline-bracket-text">
                                    ({getPricingLabel(u)})
                                  </span>
                                </span>

                                {u.opis && (
                                  <span className="item-opis">({u.opis})</span>
                                )}
                              </div>
                              <input
                                type="checkbox"
                                checked={selectedUslugeIds.includes(
                                  String(u._id),
                                )}
                                onChange={() => handleUslugaToggle(u._id)}
                              />
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {Array.isArray(playroom.besplatnePogodnosti) &&
                  playroom.besplatnePogodnosti.length > 0 && (
                    <div className="free-features-section">
                      <h4>✨ Besplatne pogodnosti</h4>
                      <div className="free-features-list">
                        {playroom.besplatnePogodnosti.map((pog, index) => (
                          <span key={`${pog}-${index}`} className="free-badge">
                            ✓ {pog}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                <div className="form-row">
                  <div className="form-group" ref={brojDeceWrapperRef}>
                    <label>
                      Broj dece{" "}
                      <span className="inline-bracket-text">
                        {hasPerPersonPricing ? "(obavezno)" : "(opciono)"}
                      </span>
                    </label>
                    <input
                      ref={brojDeceRef}
                      onKeyDown={(e) => {
                        if (["e", "E", "+", "-"].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      type="number"
                      inputMode="numeric"
                      min={hasPerPersonPricing ? "1" : "0"}
                      max="100"
                      required={hasPerPersonPricing}
                      value={brojDece}
                      className={
                        hasPerPersonPricing && !Number(brojDece)
                          ? "input-error"
                          : ""
                      }
                      onChange={(e) => {
                        setError("");
                        const val = e.target.value;
                        if (
                          val === "" ||
                          (Number(val) >= 0 && Number(val) <= 100)
                        ) {
                          setBrojDece(val);
                        }
                      }}
                    />
                    {hasPerPersonPricing && !Number(brojDece) && (
                      <p className="field-hint-error">
                        Broj dece je obavezan jer je izabrana stavka koja se
                        naplaćuje po osobi.
                      </p>
                    )}
                  </div>

                  <div className="form-group">
                    <label>
                      Broj roditelja{" "}
                      <span className="inline-bracket-text">(opciono)</span>
                    </label>
                    <input
                      onKeyDown={(e) => {
                        if (["e", "E", "+", "-"].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="100"
                      value={brojRoditelja}
                      onChange={(e) => {
                        setError("");
                        const val = e.target.value;
                        if (
                          val === "" ||
                          (Number(val) >= 0 && Number(val) <= 100)
                        ) {
                          setBrojRoditelja(val);
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="booking-section-title">
                    📝 Napomena{" "}
                    <span className="inline-bracket-text">(opciono)</span>
                  </label>

                  <textarea
                    rows="3"
                    maxLength={500}
                    value={napomena}
                    onChange={(e) => {
                      setError("");
                      setNapomena(e.target.value);
                    }}
                    placeholder="Npr. alergije, posebni zahtevi, dolazak sa kolicima..."
                  />
                </div>
                <div className="user-data-section">
                  <div className="user-data-header">
                    <h4>👤 Vaši podaci</h4>

                    {!isAuthenticated && (
                      <span className="user-info-text">
                        ( Nakon potvrde rezervacije bićete automatski
                        registrovani i prijavljeni )
                      </span>
                    )}
                  </div>
                  <div className="form-row">
                    <div className="form-group" ref={imeRef}>
                      <label>Ime *</label>
                      <input
                        type="text"
                        autoComplete="given-name"
                        name="ime"
                        value={korisnikPodaci.ime}
                        onChange={handleKorisnikChange}
                        required
                      />
                    </div>

                    <div className="form-group" ref={prezimeRef}>
                      <label>Prezime *</label>
                      <input
                        type="text"
                        autoComplete="family-name"
                        name="prezime"
                        value={korisnikPodaci.prezime}
                        onChange={handleKorisnikChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group" ref={emailRef}>
                      <label>Email *</label>
                      <input
                        type="email"
                        autoComplete="email"
                        name="email"
                        value={korisnikPodaci.email}
                        onChange={handleKorisnikChange}
                        required
                      />
                    </div>

                    <div className="form-group" ref={telefonRef}>
                      <label>Telefon *</label>
                      <input
                        type="tel"
                        autoComplete="tel"
                        name="telefon"
                        value={korisnikPodaci.telefon}
                        onChange={handleKorisnikChange}
                        required
                      />
                    </div>
                  </div>
                  {!isAuthenticated && (
                    <div className="form-row">
                      <div className="form-group" ref={passwordRef}>
                        <label>Lozinka *</label>
                        <div className="password-input-wrapper">
                          <input
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            name="password"
                            value={korisnikPodaci.password}
                            onChange={handleKorisnikChange}
                            required={!isAuthenticated}
                          />

                          <button
                            type="button"
                            className="password-toggle-btn"
                            onClick={() => setShowPassword((prev) => !prev)}
                          >
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                          </button>
                        </div>
                      </div>

                      <div className="form-group" ref={confirmPasswordRef}>
                        <label>Potvrda lozinke *</label>
                        <div className="password-input-wrapper">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            autoComplete="new-password"
                            name="confirmPassword"
                            value={korisnikPodaci.confirmPassword}
                            onChange={handleKorisnikChange}
                            required={!isAuthenticated}
                          />

                          <button
                            type="button"
                            className="password-toggle-btn"
                            onClick={() =>
                              setShowConfirmPassword((prev) => !prev)
                            }
                          >
                            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="form-group terms-checkbox" ref={termsRef}>
                    <label className="terms-checkbox-label">
                      <span>
                        Prihvatam{" "}
                        <a
                          href="/terms-of-service"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Uslove korišćenja
                        </a>
                        ,{" "}
                        <a
                          href="/privacy-policy"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Politiku privatnosti
                        </a>{" "}
                        i{" "}
                        <a
                          href="/booking-policy"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Pravila rezervacije
                        </a>
                        .
                      </span>

                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => {
                          setAcceptedTerms(e.target.checked);
                          setError("");
                        }}
                      />
                    </label>
                  </div>
                </div>

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
                                  item.cena * slotDurationHours
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
                              (Number(selectedPaket.cena) || 0) *
                              slotDurationHours
                            } RSD`
                          : selectedPaket.tip === "po_osobi"
                            ? `${selectedPaket.cena} RSD × ${formatBrojDece(brojDece)} = ${
                                (Number(selectedPaket.cena) || 0) *
                                (Number(brojDece) || 0)
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

                <button
                  className="btn-book"
                  onClick={handleBook}
                  disabled={submitting}
                >
                  {submitting
                    ? "Rezervišem..."
                    : !isAuthenticated
                      ? "✅ Registruj me i potvrdi rezervaciju"
                      : "✅ Potvrdi rezervaciju"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>

);
};

export default Book;

==================================================
FILE: PlayroomDetails.js
==================================================
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getPlayroomById } from "../services/playroomService";
import { normalizeText } from "../utils/normalizeText";
import "../styles/PlayroomDetails.css";
import ImageModal from "../components/ImageModal";
import Reviews from "../components/Reviews";
import VideoPlayer from "../components/VideoPlayer";

const DAY_LABELS = {
ponedeljak: "Ponedeljak",
utorak: "Utorak",
sreda: "Sreda",
cetvrtak: "Četvrtak",
petak: "Petak",
subota: "Subota",
nedelja: "Nedelja",
};

const PlayroomDetails = () => {
const { id } = useParams();

const navigate = useNavigate();

const [playroom, setPlayroom] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");
const [showPriceModal, setShowPriceModal] = useState(false);
const [modalOpen, setModalOpen] = useState(false);
const [selectedImageIndex, setSelectedImageIndex] = useState(0);

useEffect(() => {
const fetchData = async () => {
setLoading(true);
setError("");

      try {
        const result = await getPlayroomById(id);

        if (result?.success) {
          setPlayroom(result.data);
        } else {
          setPlayroom(null);
          setError(result?.error || "Greška pri učitavanju igraonice.");
        }
      } catch (err) {
        setPlayroom(null);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Greška pri učitavanju igraonice.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();

}, [id]);

useEffect(() => {
if (
(window.location.hash === "#reviews" ||
window.location.hash === "#reviews-section") &&
playroom
) {
setTimeout(() => {
const element = document.getElementById("reviews-section");
if (element) {
element.scrollIntoView({ behavior: "smooth" });
}
}, 300);
}
}, [playroom]);

const handleBook = () => {
navigate(`/book/${id}`);
};

const openGalleryModal = (index) => {
setSelectedImageIndex(index);
setModalOpen(true);
};

const scrollToReviews = () => {
document
.getElementById("reviews-section")
?.scrollIntoView({ behavior: "smooth" });
};

if (loading) {
return <div className="container loading">Učitavanje...</div>;
}

if (error) {
return (

<div className="container">
<h1>Greška</h1>
<p>{error}</p>
</div>
);
}

if (!playroom) {
return (

<div className="container">
<h1>Igraonica nije pronađena</h1>
</div>
);
}

const galleryImages = Array.isArray(playroom.slike) ? playroom.slike : [];

const modalImages = galleryImages;

const ratingValue = Number(playroom.rating || 0);
const filledStars = Math.max(0, Math.min(5, Math.floor(ratingValue)));

const cene = Array.isArray(playroom.cene) ? playroom.cene : [];

const cenaDete = cene.find((c) => normalizeText(c.naziv) === "dete");

const cenaRoditelj = cene.find((c) => normalizeText(c.naziv) === "roditelj");

const ostaleCene = cene.filter((c) => {
const naziv = normalizeText(c.naziv);
return naziv !== "dete" && naziv !== "roditelj";
});

const getCenaTipLabel = (tip) => {
if (tip === "po_osobi") return "po osobi";
if (tip === "po_satu") return "po satu";
if (tip === "fiksno") return "fiksno";
return "";
};

return (

<div className="container playroom-details">
<button
type="button"
className="btn-back"
onClick={() => navigate("/playrooms")} >
← Nazad na igraonice
</button>

      <div className="details-card">
        {playroom.profilnaSlika?.url && (
          <div className="profile-image-container">
            <div className="profile-image-wrapper">
              <img
                src={playroom.profilnaSlika.url}
                alt={playroom.naziv}
                className="profile-image-detail"
              />
            </div>
          </div>
        )}

        <div className="details-header">
          <h1>{playroom.naziv}</h1>

          <div className="playroom-rating-large">
            <div className="stars-large">
              {"★".repeat(filledStars)}
              {"☆".repeat(5 - filledStars)}
            </div>

            <span className="rating-number-large">
              {ratingValue.toFixed(1)}
            </span>

            <span
              className="review-count-link-large"
              onClick={scrollToReviews}
              style={{
                cursor: "pointer",
                color: "#2196f3",
                textDecoration: "underline",
              }}
            >
              ({playroom.reviewCount || 0} recenzija)
            </span>
          </div>
        </div>

        <div className="details-location">
          📍 {playroom.adresa}, {playroom.grad}
        </div>

        <div className="details-grid">
          <div className="detail-item">
            <label>📞 Telefon</label>
            <p>{playroom.kontaktTelefon || "-"}</p>
          </div>

          <div className="detail-item">
            <label>📧 Email</label>
            {playroom.kontaktEmail ? (
              <a
                href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(playroom.kontaktEmail)}`}
                target="_blank"
                rel="noreferrer"
              >
                {playroom.kontaktEmail}
              </a>
            ) : (
              <p>-</p>
            )}
          </div>

          <div className="detail-item">
            <label>👶 Kapacitet dece</label>
            <p>{playroom.kapacitet?.deca || 0} dece</p>
          </div>

          <div className="detail-item">
            <label>👨‍👩‍👧 Kapacitet roditelja</label>
            <p>
              {playroom.kapacitet?.roditelji
                ? `${playroom.kapacitet.roditelji} roditelja`
                : "Neograničeno"}
            </p>
          </div>
          <div className="detail-item">
            <label>⏰ Režim rezervacije</label>
            <p>
              {playroom.rezimRezervacije === "fiksno"
                ? `Fiksni termini (${playroom.trajanjeTermina || 60} min)`
                : "Fleksibilno od-do"}
            </p>
          </div>
        </div>
        <div className="detail-item full-width">
          <label>📝 Opis</label>
          <p className="description-text">{playroom.opis || "-"}</p>
        </div>
        <div className="details-price">
          <div className="price-buttons">
            <button
              type="button"
              className="btn-price"
              onClick={() => setShowPriceModal(true)}
            >
              💰 Cenovnik
            </button>

            <button type="button" className="btn-book" onClick={handleBook}>
              📅 Rezerviši
            </button>
          </div>
        </div>

        <div className="details-working-hours">
          <h3>Radno vreme</h3>
          <div className="hours-list">
            {Object.entries(playroom.radnoVreme || {}).map(([dan, vreme]) => {
              const isZatvoreno =
                vreme?.radi === false || (!vreme?.od && !vreme?.do);

              return (
                <div key={dan} className="hour-item">
                  <span className="day">{DAY_LABELS[dan] || dan}:</span>
                  {isZatvoreno ? (
                    <span className="closed">Zatvoreno</span>
                  ) : (
                    <span>
                      {vreme?.od || "09:00"} - {vreme?.do || "20:00"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {playroom.drustveneMreze && (
          <div className="detail-item full-width">
            <label>🌐 Društvene mreže</label>
            <div className="social-links-manage">
              {playroom.drustveneMreze.instagram && (
                <a
                  href={playroom.drustveneMreze.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="social-link-small instagram"
                >
                  Instagram
                </a>
              )}

              {playroom.drustveneMreze.facebook && (
                <a
                  href={playroom.drustveneMreze.facebook}
                  target="_blank"
                  rel="noreferrer"
                  className="social-link-small facebook"
                >
                  Facebook
                </a>
              )}

              {playroom.drustveneMreze.tiktok && (
                <a
                  href={playroom.drustveneMreze.tiktok}
                  target="_blank"
                  rel="noreferrer"
                  className="social-link-small tiktok"
                >
                  TikTok
                </a>
              )}

              {playroom.drustveneMreze.website && (
                <a
                  href={playroom.drustveneMreze.website}
                  target="_blank"
                  rel="noreferrer"
                  className="social-link-small website"
                >
                  Veb sajt
                </a>
              )}
            </div>
          </div>
        )}

        {galleryImages.length > 0 && (
          <div className="details-gallery">
            <h3>📸 Galerija slika</h3>
            <div className="gallery-grid">
              {galleryImages.map((img, idx) => (
                <div
                  key={img.publicId || img.public_id || img.url || idx}
                  className="gallery-item"
                  onClick={() => openGalleryModal(idx)}
                >
                  <img src={img.url} alt={`Slika ${idx + 1}`} />
                </div>
              ))}
            </div>
          </div>
        )}

        {modalOpen && modalImages.length > 0 && (
          <ImageModal
            images={modalImages}
            currentIndex={selectedImageIndex}
            onClose={() => setModalOpen(false)}
          />
        )}

        {Array.isArray(playroom.videoGalerija) &&
        playroom.videoGalerija.length > 0 ? (
          <div className="details-video-gallery">
            <h3>🎥 Video galerija</h3>
            <div className="video-gallery-grid">
              {playroom.videoGalerija.map((video, idx) => (
                <VideoPlayer
                  key={video.publicId || video.public_id || video.url || idx}
                  video={video}
                />
              ))}
            </div>
          </div>
        ) : (
          <div
            style={{
              margin: "20px 0",
              padding: "20px",
              background: "#fff3e0",
              borderRadius: "12px",
              textAlign: "center",
            }}
          >
            <p>📹 Još nema dodatih video snimaka za ovu igraonicu.</p>
          </div>
        )}
        <Reviews playroomId={playroom._id} />
      </div>

      {showPriceModal && (
        <div className="price-modal" onClick={() => setShowPriceModal(false)}>
          <div
            className="price-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="price-modal-header">
              <h2>Cenovnik - {playroom.naziv}</h2>
              <button
                type="button"
                className="price-modal-close"
                onClick={() => setShowPriceModal(false)}
              >
                ✖
              </button>
            </div>

            <div className="price-modal-body">
              <div className="price-group">
                <h3>💰 Cene</h3>

                {cenaDete ? (
                  <div className="price-item">
                    <span>Deca:</span>
                    <strong>{cenaDete.cena} RSD</strong>
                    {getCenaTipLabel(cenaDete.tip) && (
                      <span className="price-type">
                        ({getCenaTipLabel(cenaDete.tip)})
                      </span>
                    )}
                    {cenaDete.opis && (
                      <span className="price-desc">({cenaDete.opis})</span>
                    )}
                  </div>
                ) : (
                  <div className="price-item">
                    <span>Deca:</span>
                    <strong>besplatno</strong>
                  </div>
                )}

                {cenaRoditelj ? (
                  <div className="price-item">
                    <span>Roditelji:</span>
                    <strong>{cenaRoditelj.cena} RSD</strong>
                    {getCenaTipLabel(cenaRoditelj.tip) && (
                      <span className="price-type">
                        ({getCenaTipLabel(cenaRoditelj.tip)})
                      </span>
                    )}
                    {cenaRoditelj.opis && (
                      <span className="price-desc">({cenaRoditelj.opis})</span>
                    )}
                  </div>
                ) : (
                  <div className="price-item">
                    <span>Roditelji:</span>
                    <strong>besplatno</strong>
                  </div>
                )}

                {ostaleCene.map((cena, idx) => (
                  <div key={`${cena.naziv}-${idx}`} className="price-item">
                    <span>{cena.naziv}:</span>
                    <strong>{cena.cena} RSD</strong>
                    {getCenaTipLabel(cena.tip) && (
                      <span className="price-type">
                        ({getCenaTipLabel(cena.tip)})
                      </span>
                    )}
                    {cena.opis && (
                      <span className="price-desc">({cena.opis})</span>
                    )}
                  </div>
                ))}
              </div>

              {Array.isArray(playroom.paketi) && playroom.paketi.length > 0 && (
                <div className="price-group">
                  <h3>🎁 Paketi</h3>
                  {playroom.paketi.map((paket, idx) => (
                    <div key={`${paket.naziv}-${idx}`} className="price-item">
                      <span>{paket.naziv}:</span>
                      <strong>{paket.cena} RSD</strong>
                      {paket.tip === "po_osobi" && (
                        <span className="price-type">(po osobi)</span>
                      )}
                      {paket.tip === "po_satu" && (
                        <span className="price-type">(po satu)</span>
                      )}
                      {paket.tip === "fiksno" && (
                        <span className="price-type">(fiksno)</span>
                      )}
                      {paket.opis && (
                        <span className="price-desc">({paket.opis})</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {Array.isArray(playroom.dodatneUsluge) &&
                playroom.dodatneUsluge.length > 0 && (
                  <div className="price-group">
                    <h3>🎪 Dodatne pogodnosti</h3>
                    {playroom.dodatneUsluge.map((usluga, idx) => (
                      <div
                        key={`${usluga.naziv}-${idx}`}
                        className="price-item"
                      >
                        <span>{usluga.naziv}:</span>
                        <strong>{usluga.cena} RSD</strong>
                        {usluga.tip === "po_osobi" && (
                          <span className="price-type">(po osobi)</span>
                        )}
                        {usluga.tip === "po_satu" && (
                          <span className="price-type">(po satu)</span>
                        )}
                        {usluga.opis && (
                          <span className="price-desc">({usluga.opis})</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

              {Array.isArray(playroom.besplatnePogodnosti) &&
                playroom.besplatnePogodnosti.length > 0 && (
                  <div className="price-group">
                    <h3>✨ Besplatne pogodnosti</h3>
                    <div className="free-features">
                      {playroom.besplatnePogodnosti.map((feat, idx) => (
                        <span key={`${feat}-${idx}`} className="free-feature">
                          ✓ {feat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>

);
};

export default PlayroomDetails;

==================================================
FILE: OwnerTimeSlots.js
==================================================
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyPlayrooms } from "../services/playroomService";
import { getAllTimeSlotsForOwner } from "../services/bookingService";
import { useAuth } from "../context/AuthContext";

import "../styles/OwnerTimeSlots.css";
import { useToast } from "../context/ToastContext";

const OwnerTimeSlots = () => {
const { user, loading: authLoading } = useAuth();
const navigate = useNavigate();
const toast = useToast();
const [playrooms, setPlayrooms] = useState([]);
const [selectedPlayroom, setSelectedPlayroom] = useState("");
const [timeSlots, setTimeSlots] = useState([]);
const [loadingPlayrooms, setLoadingPlayrooms] = useState(true);
const [loadingSlots, setLoadingSlots] = useState(false);
const [selectedDate, setSelectedDate] = useState(
new Date().toISOString().split("T")[0],
);
const [message, setMessage] = useState("");

const [error, setError] = useState("");

const [expandedBookingId, setExpandedBookingId] = useState(null);

useEffect(() => {
if (!authLoading) {
loadPlayrooms();
}
}, [authLoading]);

const loadTimeSlots = useCallback(async () => {
if (!selectedPlayroom) return;

    setLoadingSlots(true);
    setError("");
    setMessage("");

    try {
      const result = await getAllTimeSlotsForOwner(
        selectedPlayroom,
        selectedDate,
      );

      if (result?.success) {
        setTimeSlots(
          Array.isArray(result.data)
            ? result.data.sort((a, b) => a.vremeOd.localeCompare(b.vremeOd))
            : [],
        );
      } else {
        setTimeSlots([]);
        setError(result?.error || "Greška pri učitavanju termina.");
      }
    } catch (err) {
      setTimeSlots([]);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Greška pri učitavanju termina.",
      );
    } finally {
      setLoadingSlots(false);
    }

}, [selectedPlayroom, selectedDate]);

useEffect(() => {
if (selectedPlayroom) {
loadTimeSlots();
}
}, [selectedPlayroom, selectedDate, loadTimeSlots]);

const calculateDuration = (od, doVreme) => {
if (!od || !doVreme) return "-";

    const [h1, m1] = od.split(":").map(Number);
    const [h2, m2] = doVreme.split(":").map(Number);

    const start = h1 * 60 + m1;
    const end = h2 * 60 + m2;

    const diff = end - start;

    const sati = Math.floor(diff / 60);
    const minuti = diff % 60;

    if (sati > 0 && minuti > 0) return `${sati}h ${minuti}min`;
    if (sati > 0) return `${sati}h`;
    return `${minuti}min`;

};

const loadPlayrooms = async () => {
setLoadingPlayrooms(true);
setError("");
setMessage("");

    try {
      const result = await getMyPlayrooms();

      if (
        result?.success &&
        Array.isArray(result.data) &&
        result.data.length > 0
      ) {
        setPlayrooms(result.data);
        setSelectedPlayroom((prev) => prev || result.data[0]._id);
      } else {
        setPlayrooms([]);
        setSelectedPlayroom("");
        setError("Nemate nijednu igraonicu. Prvo dodajte igraonicu.");
      }
    } catch (err) {
      setPlayrooms([]);
      setSelectedPlayroom("");
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Greška pri učitavanju igraonica.",
      );
    } finally {
      setLoadingPlayrooms(false);
    }

};

const goToReservationPage = () => {
if (!selectedPlayroom || !selectedDate) {
setError("Izaberi igraonicu i datum.");
return;
}

    const params = new URLSearchParams({
      datum: selectedDate,
      mode: "owner",
    });

    navigate(`/book/${selectedPlayroom}?${params.toString()}`);

};

const getBookingId = (booking) => {
return booking?.\_id || booking?.id || null;
};

const handleSlotClick = (segment) => {
const bookingId = getBookingId(segment.booking);

    if (!bookingId) return;

    setExpandedBookingId((prev) => (prev === bookingId ? null : bookingId));

};

const selectedPlayroomData = playrooms.find(
(p) => p.\_id === selectedPlayroom,
);

const occupiedSlots = timeSlots.filter(
(segment) => segment.tip === "zauzeto",
);

const formatBookingName = (booking) => {
if (!booking) return "-";

    const ime =
      booking.ime || booking.imeRoditelja || booking.parentFirstName || "";
    const prezime =
      booking.prezime ||
      booking.prezimeRoditelja ||
      booking.parentLastName ||
      "";

    const fullName = `${ime} ${prezime}`.trim();
    return fullName || booking.userName || "-";

};

const formatBookingEmail = (booking) => {
return (
booking?.email || booking?.emailRoditelja || booking?.parentEmail || "-"
);
};

const formatBookingPhone = (booking) => {
return (
booking?.telefon ||
booking?.telefonRoditelja ||
booking?.parentPhone ||
"-"
);
};

if (authLoading || loadingPlayrooms) {
return <div className="container loading">Učitavanje...</div>;
}

if (user?.role !== "vlasnik" && user?.role !== "admin") {
return (

<div className="container">
<h1>Pristup zabranjen</h1>
<p>Samo vlasnici igraonica mogu upravljati terminima.</p>
</div>
);
}

return (

<div className="container owner-slots-page">
<div className="page-header">
<h1>📅 Termini igraonice</h1>
</div>

      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}

      {playrooms.length === 0 ? (
        <div className="empty-state">
          <p>Nemate nijednu igraonicu.</p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate("/create-playroom")}
          >
            Dodaj igraonicu
          </button>
        </div>
      ) : (
        <>
          <div className="owner-reservation-toolbar">
            <div className="filter-group owner-date-filter">
              <label htmlFor="owner-date-select">Izaberite datum</label>
              <input
                id="owner-date-select"
                type="date"
                value={selectedDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setMessage("");
                  setError("");
                  setExpandedBookingId(null);
                }}
              />
            </div>

            <button
              type="button"
              className="owner-reserve-btn"
              onClick={goToReservationPage}
              disabled={!selectedPlayroom || !selectedDate}
            >
              ➕ Rezerviši termin
            </button>
          </div>

          {loadingSlots ? (
            <div className="loading-slots">Učitavanje termina...</div>
          ) : occupiedSlots.length === 0 ? (
            <div className="empty-state">
              <p>Nema zauzetih termina za izabrani datum.</p>
            </div>
          ) : (
            <div className="slots-grid">
              {occupiedSlots.map((segment, index) => (
                <div
                  key={`${segment.vremeOd}-${segment.vremeDo}-${index}`}
                  className={`slot-card clickable-slot ${
                    segment.tip === "zauzeto" ? "zauzeto" : "slobodno"
                  }`}
                >
                  <div
                    className="owner-booking-card-header"
                    onClick={() => handleSlotClick(segment)}
                  >
                    <div>
                      <h3>{formatBookingName(segment.booking)}</h3>

                      <p className="owner-booking-short-info">
                        🗓{" "}
                        {segment.booking?.datum
                          ? new Date(segment.booking.datum).toLocaleDateString(
                              "sr-RS",
                            )
                          : selectedDate
                            ? new Date(selectedDate).toLocaleDateString("sr-RS")
                            : "-"}{" "}
                        | ⏰ {segment.vremeOd || "-"} - {segment.vremeDo || "-"}
                      </p>
                    </div>

                    <div className="owner-booking-card-right">
                      <span className="owner-booking-status-badge">
                        Potvrđeno
                      </span>
                      <span
                        className={`owner-booking-arrow ${
                          expandedBookingId === getBookingId(segment.booking)
                            ? "open"
                            : ""
                        }`}
                      >
                        ▼
                      </span>
                    </div>
                  </div>

                  {expandedBookingId === getBookingId(segment.booking) && (
                    <div
                      className="owner-booking-card-details"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p>✉️ {formatBookingEmail(segment.booking)}</p>
                      <p>📞 {formatBookingPhone(segment.booking)}</p>

                      <p>
                        🗓{" "}
                        {segment.booking?.datum
                          ? new Date(segment.booking.datum).toLocaleDateString(
                              "sr-RS",
                            )
                          : selectedDate
                            ? new Date(selectedDate).toLocaleDateString("sr-RS")
                            : "-"}
                      </p>

                      <p>
                        ⏰ {segment.vremeOd || "-"} - {segment.vremeDo || "-"}
                      </p>

                      <p>👶 Broj dece: {segment.booking?.brojDece ?? 0}</p>
                      <p>
                        👨‍👩‍👧 Broj roditelja: {segment.booking?.brojRoditelja ?? 0}
                      </p>
                      <p>
                        💰 Ukupna cena: {segment.booking?.ukupnaCena ?? 0} RSD
                      </p>
                      {Array.isArray(segment.booking?.izabraneCene) &&
                        segment.booking.izabraneCene.length > 0 && (
                          <div className="owner-booking-extra-block">
                            <p>
                              <strong>Izabrane stavke:</strong>
                            </p>

                            {segment.booking.izabraneCene.map((item, idx) => (
                              <p key={`cena-${idx}`}>
                                • {item.naziv} ({item.tip || "fiksno"}) -{" "}
                                {item.cena} RSD
                                {item.tip === "po_satu" && (
                                  <>
                                    {" "}
                                    ×{" "}
                                    {calculateDuration(
                                      segment.vremeOd,
                                      segment.vremeDo,
                                    )}{" "}
                                    ={" "}
                                    {(Number(item.cena) || 0) *
                                      ((Number(segment.vremeDo?.slice(0, 2)) *
                                        60 +
                                        Number(segment.vremeDo?.slice(3, 5)) -
                                        (Number(segment.vremeOd?.slice(0, 2)) *
                                          60 +
                                          Number(
                                            segment.vremeOd?.slice(3, 5),
                                          ))) /
                                        60)}{" "}
                                    RSD
                                  </>
                                )}
                                {item.opis && <span> - {item.opis}</span>}
                              </p>
                            ))}
                          </div>
                        )}

                      {segment.booking?.izabraniPaket?.naziv && (
                        <div className="owner-booking-extra-block">
                          <p>
                            <strong>Paket:</strong>{" "}
                            {segment.booking.izabraniPaket.naziv} (
                            {segment.booking.izabraniPaket.tip || "fiksno"}) -{" "}
                            {segment.booking.izabraniPaket.cena} RSD
                          </p>

                          {segment.booking.izabraniPaket.opis && (
                            <p>- {segment.booking.izabraniPaket.opis}</p>
                          )}
                        </div>
                      )}

                      {Array.isArray(segment.booking?.izabraneUsluge) &&
                        segment.booking.izabraneUsluge.length > 0 && (
                          <div className="owner-booking-extra-block">
                            <p>
                              <strong>Dodatne usluge:</strong>
                            </p>

                            {segment.booking.izabraneUsluge.map((item, idx) => (
                              <p key={`usluga-${idx}`}>
                                • {item.naziv} ({item.tip || "fiksno"}) -{" "}
                                {item.cena} RSD
                                {item.opis && <span> - {item.opis}</span>}
                              </p>
                            ))}
                          </div>
                        )}

                      {segment.booking?.napomena && (
                        <p>📝 Napomena: {segment.booking.napomena}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>

);
};

export default OwnerTimeSlots;

==================================================
FILE: App.js
==================================================
import React, { useEffect } from "react";
import {
BrowserRouter as Router,
Routes,
Route,
Navigate,
useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Playrooms from "./pages/Playrooms";
import CreatePlayroom from "./pages/CreatePlayroom";
import ManagePlayroom from "./pages/ManagePlayroom";
import AdminPanel from "./pages/AdminPanel";
import PlayroomDetails from "./pages/PlayroomDetails";
import Book from "./pages/Book";
import BookingSuccess from "./pages/BookingSuccess";
import MyBookings from "./pages/MyBookings";
import OwnerTimeSlots from "./pages/OwnerTimeSlots";
import OwnerDashboard from "./pages/OwnerDashboard";
import "./styles/global.css";
import { ToastProvider } from "./context/ToastContext";
import ToastContainer from "./components/ToastContainer";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import BookingPolicy from "./pages/BookingPolicy";
import VerifyEmail from "./pages/VerifyEmail";

const ScrollToTop = () => {
const { pathname } = useLocation();

useEffect(() => {
window.scrollTo(0, 0);
}, [pathname]);

return null;
};

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
const { user, isAuthenticated, loading } = useAuth();

if (loading) {
return <div className="container loading">Učitavanje...</div>;
}

if (!isAuthenticated) {
return <Navigate to="/login" replace />;
}

if (
Array.isArray(allowedRoles) &&
allowedRoles.length > 0 &&
!allowedRoles.includes(user?.role)
) {
return <Navigate to="/" replace />;
}

return children;
};

const VlasnikRoute = ({ children }) => (
<ProtectedRoute allowedRoles={["vlasnik", "admin"]}>
{children}
</ProtectedRoute>
);

const AdminRoute = ({ children }) => (
<ProtectedRoute allowedRoles={["admin"]}>{children}</ProtectedRoute>
);

const RoditeljRoute = ({ children }) => (
<ProtectedRoute allowedRoles={["roditelj", "admin"]}>
{children}
</ProtectedRoute>
);

function AppRoutes() {
const location = useLocation();

const showFooter = [
"/",
"/playrooms",
"/privacy-policy",
"/terms-of-service",
"/booking-policy",
].includes(location.pathname);
return (
<>
<Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/booking-policy" element={<BookingPolicy />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/playrooms" element={<Playrooms />} />
        <Route path="/playrooms/:id" element={<PlayroomDetails />} />

        {/* BOOK mora biti JAVAN */}
        <Route path="/book/:id" element={<Book />} />

        <Route
          path="/booking-success"
          element={
            <RoditeljRoute>
              <BookingSuccess />
            </RoditeljRoute>
          }
        />

        <Route
          path="/my-bookings"
          element={
            <RoditeljRoute>
              <MyBookings />
            </RoditeljRoute>
          }
        />

        <Route
          path="/create-playroom"
          element={
            <VlasnikRoute>
              <CreatePlayroom />
            </VlasnikRoute>
          }
        />

        <Route
          path="/manage-playroom"
          element={
            <VlasnikRoute>
              <ManagePlayroom />
            </VlasnikRoute>
          }
        />

        <Route
          path="/owner/timeslots"
          element={
            <VlasnikRoute>
              <OwnerTimeSlots />
            </VlasnikRoute>
          }
        />

        <Route
          path="/owner/dashboard"
          element={
            <VlasnikRoute>
              <OwnerDashboard />
            </VlasnikRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {showFooter && <Footer />}
    </>

);
}

export default function App() {
return (
<ToastProvider>
<AuthProvider>
<Router>
<ScrollToTop />
<ToastContainer />
<AppRoutes />
</Router>
</AuthProvider>
</ToastProvider>
);
}
