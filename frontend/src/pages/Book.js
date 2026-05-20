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

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const topRef = useRef(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [playroom, setPlayroom] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [selectedStartTime, setSelectedStartTime] = useState(prefillStart);
  const [selectedEndTime, setSelectedEndTime] = useState(prefillEnd);

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
          selectedCenaIds.includes(String(item._id)),
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
      ? playroom.cene.find((item) => String(item._id) === String(cenaId))
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
      ? playroom.paketi.find((item) => String(item._id) === String(paketId))
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
          (item) => String(item._id) === String(uslugaId),
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
    if (playroom?._id && selectedDate) {
      loadTimeSlots();
    } else {
      setAvailability(null);
      setSelectedStartTime("");
      setSelectedEndTime("");
    }
  }, [playroom?._id, selectedDate, loadTimeSlots]);

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
    ? playroom.cene.filter((c) => selectedCenaIds.includes(String(c._id)))
    : [];

  const selectedPaket = Array.isArray(playroom?.paketi)
    ? playroom.paketi.find((p) => String(p._id) === String(selectedPaketId))
    : null;

  const selectedUsluge = Array.isArray(playroom?.dodatneUsluge)
    ? playroom.dodatneUsluge.filter((u) =>
        selectedUslugeIds.includes(String(u._id)),
      )
    : [];

  const isFiksno = playroom?.rezimRezervacije === "fiksno";
  const trajanjeTermina = Number(playroom?.trajanjeTermina) || 60;

  const timeToMinutes = (time) => {
    const [h, m] = String(time || "00:00")
      .split(":")
      .map(Number);
    return h * 60 + m;
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

    return busyIntervals.some((interval) => {
      const busyStart = timeToMinutes(interval.vremeOd);
      const busyEnd = timeToMinutes(interval.vremeDo);

      return startMinutes < busyEnd && endMinutes > busyStart;
    });
  };

  const buildAvailabilitySegments = () => {
    if (!availability?.workingHours) return [];

    const workingStart = timeToMinutes(availability.workingHours.vremeOd);
    const workingEnd = timeToMinutes(availability.workingHours.vremeDo);

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
      const originalBusyEnd = timeToMinutes(
        interval.originalVremeDo || interval.vremeDo,
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
        pripremaOd: interval.hasPreparationBuffer
          ? minutesToTime(originalBusyEnd)
          : null,
        pripremaDo: interval.hasPreparationBuffer ? interval.vremeDo : null,
      });

      cursor = Math.max(cursor, busyEnd);
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
          label: `❌ ${segment.vremeOd}-${segment.vremeDo}`,
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

          if (!isPast) {
            items.push({
              type: "free",
              key: `free-${index}-${time}`,
              value: time,
              label: `✅ ${time}`,
            });
          }
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
          label: `❌ ${segment.vremeOd}-${segment.vremeDo}`,
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

          if (!isPast) {
            items.push({
              type: "free",
              key: `end-free-${index}-${time}`,
              value: time,
              label: `✅ ${time}`,
            });
          }
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

      if (korisnikPodaci.password.trim().length < 8) {
        setError("Lozinka mora imati najmanje 8 karaktera.");
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
        onClick={() => navigate(`/playrooms/${id}`)}
      >
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

                      <div className="time-picker-grid">
                        {startDropdownItems.map((item) => (
                          <button
                            type="button"
                            key={item.key}
                            disabled={item.type !== "free"}
                            className={`time-pill ${
                              selectedStartTime === item.value ? "active" : ""
                            } ${item.type !== "free" ? "disabled" : ""}`}
                            onClick={() => {
                              setError("");
                              if (selectedStartTime === item.value) {
                                setSelectedStartTime("");
                                setSelectedEndTime("");
                                return;
                              }

                              setSelectedStartTime(item.value);

                              if (playroom?.rezimRezervacije === "fiksno") {
                                const endMinutes =
                                  timeToMinutes(item.value) + trajanjeTermina;
                                setSelectedEndTime(minutesToTime(endMinutes));
                              } else {
                                setSelectedEndTime("");
                              }
                            }}
                          >
                            {item.type === "free" ? item.value : item.label}
                          </button>
                        ))}

                        {startDropdownItems.filter(
                          (item) => item.type === "free",
                        ).length === 0 && (
                          <p className="booking-info-box">
                            Nema dostupnih termina.
                          </p>
                        )}
                      </div>
                    </div>

                    {!isFiksno ? (
                      <div className="form-group" ref={endTimeRef}>
                        <label>Vreme do *</label>

                        <div className="time-picker-grid">
                          {endDropdownItems.map((item) => (
                            <button
                              type="button"
                              key={item.key}
                              disabled={item.type !== "free"}
                              className={`time-pill ${
                                selectedEndTime === item.value ? "active" : ""
                              } ${item.type !== "free" ? "disabled" : ""}`}
                              onClick={() => {
                                setError("");
                                if (selectedEndTime === item.value) {
                                  setSelectedEndTime("");
                                  return;
                                }

                                setSelectedEndTime(item.value);
                              }}
                            >
                              {item.type === "free" ? item.value : item.label}
                            </button>
                          ))}

                          {selectedStartTime &&
                            endDropdownItems.filter(
                              (item) => item.type === "free",
                            ).length === 0 && (
                              <p className="booking-info-box">
                                Nema dostupnih završetaka za izabrani početak.
                              </p>
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
