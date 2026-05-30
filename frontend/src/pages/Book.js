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
  submitBooking,
  manualBookInterval,
  manualBookTimeSlot,
} from "../services/bookingService";
import { getPlayroomById } from "../services/playroomService";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import "../styles/Book.css";
import BookingSelectedSlotSummary from "../components/booking/BookingSelectedSlotSummary";
import {
  formatDateForBackend,
  getLocalDate,
  getSlotDurationHours,
  getSlotDurationLabel,
  minutesToTime,
  timeToMinutes,
} from "../utils/bookingUtils";
import { calculateBookingTotal } from "../utils/bookingPriceUtils";
import {
  buildAvailabilitySegments,
  buildEndDropdownItems,
  buildStartDropdownItems,
} from "../utils/bookingAvailabilityUtils";
import {
  getBookingFailureMessage,
  isOverlapBookingError,
} from "../utils/bookingValidationUtils";
import { validateBookingSubmit } from "../utils/bookingSubmitValidationUtils";
import { buildBookingPayload } from "../utils/bookingPayloadUtils";
import BookingSubmitButton from "../components/booking/BookingSubmitButton";
import BookingOrderSummary from "../components/booking/BookingOrderSummary";
import BookingUserFields from "../components/booking/BookingUserFields";
import BookingDetailsFields from "../components/booking/BookingDetailsFields";
import BookingPricingOptions from "../components/booking/BookingPricingOptions";
import BookingDateSelector from "../components/booking/BookingDateSelector";
import BookingFreeFeatures from "../components/booking/BookingFreeFeatures";
import BookingAvailabilitySection from "../components/booking/BookingAvailabilitySection";

const DATE_QUERY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const TIME_QUERY_REGEX = /^([01]\d|2[0-3]):(00|15|30|45)$/;
const ID_QUERY_REGEX = /^[a-f\d]{24}$/i;

const normalizeTimeQuery = (value) => {
  const safeValue = String(value || "").trim();

  return TIME_QUERY_REGEX.test(safeValue) ? safeValue : "";
};

const normalizeIdQuery = (value) => {
  const safeValue = String(value || "").trim();

  return ID_QUERY_REGEX.test(safeValue) ? safeValue : "";
};

const normalizeDateQuery = (value) => {
  const safeValue = String(value || "").trim();

  return DATE_QUERY_REGEX.test(safeValue) ? safeValue : "";
};

const Book = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  const prefillDate = normalizeDateQuery(queryParams.get("datum"));

  const prefillStart = normalizeTimeQuery(queryParams.get("vremeOd"));
  const prefillEnd = normalizeTimeQuery(queryParams.get("vremeDo"));
  const prefillTimeSlotId = normalizeIdQuery(queryParams.get("timeSlotId"));
  const requestedOwnerBooking = queryParams.get("mode") === "owner";

  const {
    user,
    isAuthenticated,
    loading: authLoading,
    handleAuthSuccess,
  } = useAuth();

  const isOwnerBooking =
    requestedOwnerBooking &&
    isAuthenticated &&
    (user?.role === "vlasnik" || user?.role === "admin");

  const { error: showError, removeToast } = useToast();
  const [selectedCenaIds, setSelectedCenaIds] = useState([]);
  const [selectedPaketId, setSelectedPaketId] = useState("");
  const [selectedUslugeIds, setSelectedUslugeIds] = useState([]);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const topRef = useRef(null);
  const validationToastIdRef = useRef(null);
  const [activeValidationField, setActiveValidationField] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [playroom, setPlayroom] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [selectedStartTime, setSelectedStartTime] = useState("");
  const [selectedEndTime, setSelectedEndTime] = useState("");
  const [selectedTimeSlotId, setSelectedTimeSlotId] = useState("");
  const startTimeRef = useRef(null);
  const endTimeRef = useRef(null);
  const bookingDetailsRef = useRef(null);
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
  const [, setError] = useState("");
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
    clearValidationToast();

    validationToastIdRef.current = showError(
      "Broj dece je obavezan jer je izabrana stavka koja se naplaćuje po osobi.",
      0,
    );

    setActiveValidationField("brojDece");
  };

  const focusBrojDeceField = () => {
    if (brojDeceRef.current) {
      const elementTop =
        brojDeceRef.current.getBoundingClientRect().top + window.pageYOffset;

      const offset = 140;
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
        const message = result?.error || "Greška pri učitavanju igraonice.";
        setError(message);
        showError(message);
      }
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Greška pri učitavanju igraonice.";

      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  }, [id, showError]);

  const loadTimeSlots = useCallback(async () => {
    setLoadingSlots(true);
    setSelectedStartTime("");
    setSelectedEndTime("");
    setSelectedTimeSlotId("");
    setError("");

    try {
      const result = await getAvailableTimeSlots(
        id,
        formatDateForBackend(selectedDate),
      );

      if (result?.success) {
        const availabilityData = result.data || null;

        setAvailability(availabilityData);

        if (isOwnerBooking) {
          const mode =
            availabilityData?.mode || playroom?.rezimRezervacije || "";

          if (mode === "fiksno" && prefillTimeSlotId) {
            const matchedSlot = Array.isArray(availabilityData?.slots)
              ? availabilityData.slots.find(
                  (slot) =>
                    String(slot._id) === String(prefillTimeSlotId) ||
                    String(slot.timeSlotId) === String(prefillTimeSlotId),
                )
              : null;

            setSelectedTimeSlotId(prefillTimeSlotId);
            setSelectedStartTime(matchedSlot?.vremeOd || prefillStart || "");
            setSelectedEndTime(matchedSlot?.vremeDo || prefillEnd || "");
          }

          if (mode === "fleksibilno") {
            setSelectedTimeSlotId("");
            setSelectedStartTime(prefillStart || "");
            setSelectedEndTime(prefillEnd || "");
          }
        }
      } else {
        setAvailability(null);
        const message = result?.error || "Greška pri učitavanju termina.";
        setError(message);
        showError(message);
      }
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Greška pri učitavanju termina.";

      setError(message);
      showError(message);
    } finally {
      setLoadingSlots(false);
    }
  }, [
    id,
    selectedDate,
    showError,
    isOwnerBooking,
    prefillStart,
    prefillEnd,
    prefillTimeSlotId,
    playroom?.rezimRezervacije,
  ]);

  useEffect(() => {
    if (!authLoading && isOwnerBooking) {
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
      setSelectedTimeSlotId("");
    }
  }, [playroom?._id, selectedDate, loadTimeSlots]);

  const isMobileViewport = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 768px)").matches;

  const scrollToElementOnMobile = (ref, offset = 115) => {
    if (!isMobileViewport()) return;

    const target = ref?.current;

    if (!target) return;

    setTimeout(() => {
      const elementTop =
        target.getBoundingClientRect().top + window.pageYOffset;

      window.scrollTo({
        top: Math.max(elementTop - offset, 0),
        behavior: "smooth",
      });
    }, 150);
  };

  const scrollToField = (ref) => {
    const target = ref?.current || topRef.current;

    if (!target) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const elementTop = target.getBoundingClientRect().top + window.pageYOffset;

    window.scrollTo({
      top: Math.max(elementTop - 130, 0),
      behavior: "smooth",
    });

    setTimeout(() => {
      const focusable = target.matches?.("input, textarea, select, button")
        ? target
        : target.querySelector?.(
            "input, textarea, select, button:not([disabled])",
          );

      if (focusable) {
        focusable.focus({ preventScroll: true });
      }
    }, 450);
  };

  const clearValidationToast = useCallback(() => {
    if (validationToastIdRef.current) {
      removeToast(validationToastIdRef.current);
      validationToastIdRef.current = null;
    }

    setActiveValidationField("");
  }, [removeToast]);

  const showScreenError = (message, ref, field = "") => {
    const safeMessage = message || "Došlo je do greške.";

    clearValidationToast();

    setError("");

    validationToastIdRef.current = showError(safeMessage, 0);
    setActiveValidationField(field);

    scrollToField(ref);
  };

  const selectedCene = useMemo(
    () =>
      Array.isArray(playroom?.cene)
        ? playroom.cene.filter((c) => selectedCenaIds.includes(String(c._id)))
        : [],
    [playroom?.cene, selectedCenaIds],
  );

  const selectedPaket = useMemo(
    () =>
      Array.isArray(playroom?.paketi)
        ? playroom.paketi.find((p) => String(p._id) === String(selectedPaketId))
        : null,
    [playroom?.paketi, selectedPaketId],
  );

  const selectedUsluge = useMemo(
    () =>
      Array.isArray(playroom?.dodatneUsluge)
        ? playroom.dodatneUsluge.filter((u) =>
            selectedUslugeIds.includes(String(u._id)),
          )
        : [],
    [playroom?.dodatneUsluge, selectedUslugeIds],
  );

  const bookingMode = availability?.mode || playroom?.rezimRezervacije || "";
  const isFiksno = bookingMode === "fiksno";
  const trajanjeTermina = Number(playroom?.trajanjeTermina) || 60;

  const slotDurationHours = useMemo(
    () => getSlotDurationHours(selectedStartTime, selectedEndTime),
    [selectedStartTime, selectedEndTime],
  );

  const slotDurationLabel = useMemo(
    () => getSlotDurationLabel(selectedStartTime, selectedEndTime),
    [selectedStartTime, selectedEndTime],
  );

  const totalPrice = useMemo(
    () =>
      calculateBookingTotal({
        selectedCene,
        selectedPaket,
        selectedUsluge,
        brojDece,
        slotDurationHours,
      }),
    [selectedCene, selectedPaket, selectedUsluge, brojDece, slotDurationHours],
  );

  const availabilitySegments = useMemo(
    () => buildAvailabilitySegments(availability),
    [availability],
  );

  const startDropdownItems = useMemo(
    () =>
      buildStartDropdownItems({
        availability,
        availabilitySegments,
        playroom,
        selectedDate,
      }),
    [availability, availabilitySegments, playroom, selectedDate],
  );

  const endDropdownItems = useMemo(
    () =>
      buildEndDropdownItems({
        availability,
        availabilitySegments,
        playroom,
        selectedStartTime,
        selectedDate,
        trajanjeTermina,
      }),
    [
      availability,
      availabilitySegments,
      playroom,
      selectedStartTime,
      selectedDate,
      trajanjeTermina,
    ],
  );

  useEffect(() => {
    if (!activeValidationField) return;

    const hasPricing = selectedCenaIds.length > 0 || Boolean(selectedPaketId);

    const isValidEmail = /^\S+@\S+\.\S+$/.test(
      String(korisnikPodaci.email || "").trim(),
    );

    const phoneDigits = String(korisnikPodaci.telefon || "").replace(/\D/g, "");

    const fieldFixed = {
      startTime:
        Boolean(selectedStartTime) &&
        (!isFiksno || Boolean(selectedTimeSlotId)),
      endTime: Boolean(selectedEndTime),
      pricing: hasPricing,
      brojDece: !hasPerPersonPricing || Number(brojDece) > 0,
      ime: String(korisnikPodaci.ime || "").trim().length >= 2,
      prezime: String(korisnikPodaci.prezime || "").trim().length >= 2,
      email: isValidEmail,
      telefon: phoneDigits.length >= 8,
      password:
        isAuthenticated ||
        isOwnerBooking ||
        korisnikPodaci.password.length >= 8,
      confirmPassword:
        isAuthenticated ||
        isOwnerBooking ||
        (korisnikPodaci.confirmPassword &&
          korisnikPodaci.password === korisnikPodaci.confirmPassword),
      terms: isAuthenticated || isOwnerBooking || acceptedTerms,
    };

    if (fieldFixed[activeValidationField]) {
      clearValidationToast();
    }
  }, [
    activeValidationField,
    selectedStartTime,
    selectedEndTime,
    selectedTimeSlotId,
    selectedCenaIds,
    selectedPaketId,
    brojDece,
    hasPerPersonPricing,
    korisnikPodaci,
    acceptedTerms,
    isAuthenticated,
    isOwnerBooking,
    isFiksno,
    clearValidationToast,
  ]);

  const handleBookingFailure = async (failure) => {
    const message = getBookingFailureMessage(failure);

    if (isOverlapBookingError(failure)) {
      await loadTimeSlots();
    }

    showScreenError(message, startTimeRef);
  };

  const handleStartTimeSelect = (itemOrValue) => {
    setError("");

    const item =
      itemOrValue && typeof itemOrValue === "object" ? itemOrValue : null;

    const value = item?.value || String(itemOrValue || "");

    if (selectedStartTime === value) {
      setSelectedStartTime("");
      setSelectedEndTime("");
      setSelectedTimeSlotId("");
      return;
    }

    setSelectedStartTime(value);

    if (isFiksno) {
      setSelectedTimeSlotId(item?.timeSlotId || "");
      setSelectedEndTime(
        item?.vremeDo || minutesToTime(timeToMinutes(value) + trajanjeTermina),
      );
      return;
    }

    setSelectedTimeSlotId("");
    setSelectedEndTime("");

    scrollToElementOnMobile(endTimeRef);
  };

  const handleEndTimeSelect = (value) => {
    setError("");

    if (selectedEndTime === value) {
      setSelectedEndTime("");
      return;
    }

    setSelectedEndTime(value);

    scrollToElementOnMobile(bookingDetailsRef);
  };

  const handleDateChange = (value) => {
    setSelectedDate(value);
    setSelectedStartTime("");
    setSelectedEndTime("");
    setSelectedCenaIds([]);
    setSelectedPaketId("");
    setSelectedUslugeIds([]);
    setSelectedTimeSlotId("");
    setBrojDece("");
    setBrojRoditelja("");
    setNapomena("");
    setError("");
  };

  const getBookingValidationRef = (field) => {
    const refs = {
      startTime: startTimeRef,
      endTime: endTimeRef,
      brojDece: brojDeceWrapperRef,
      pricing: pricingRef,
      ime: imeRef,
      prezime: prezimeRef,
      email: emailRef,
      telefon: telefonRef,
      password: passwordRef,
      confirmPassword: confirmPasswordRef,
      terms: termsRef,
    };

    return refs[field] || startTimeRef;
  };

  const handleBook = async () => {
    if (submitting) return;

    setError("");

    const bookingValidation = validateBookingSubmit({
      selectedStartTime,
      selectedEndTime,
      selectedDate,
      hasPerPersonPricing,
      bookingMode,
      selectedTimeSlotId,
      brojDece,
      availability,
      selectedCenaIds,
      selectedPaketId,
      korisnikPodaci,
      isAuthenticated,
      acceptedTerms,
    });

    if (!bookingValidation.success) {
      showScreenError(
        bookingValidation.error,
        getBookingValidationRef(bookingValidation.field),
        bookingValidation.field,
      );

      return;
    }

    setSubmitting(true);

    try {
      const bookingPayload = buildBookingPayload({
        playroomId: id,
        selectedDate,
        selectedStartTime,
        selectedEndTime,
        selectedCenaIds,
        selectedPaketId,
        selectedUslugeIds,
        bookingMode,
        selectedTimeSlotId,
        brojDece,
        brojRoditelja,
        korisnikPodaci,
        telefon: bookingValidation.phone,
        napomena,
      });

      const result = isOwnerBooking
        ? isFiksno
          ? await manualBookTimeSlot(selectedTimeSlotId, bookingPayload)
          : await manualBookInterval(bookingPayload)
        : await submitBooking({
            isAuthenticated,
            bookingPayload,
            password: korisnikPodaci.password,
            confirmPassword: korisnikPodaci.confirmPassword,
            acceptedTerms,
          });

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

        if (isOwnerBooking) {
          navigate("/owner/timeslots", { replace: true });
          return;
        }

        navigate("/booking-success");
      } else {
        await handleBookingFailure(result);
      }
    } catch (err) {
      await handleBookingFailure(err);
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

  if (loading || authLoading) {
    return (
      <div className="container loading" role="status" aria-live="polite">
        Učitavanje...
      </div>
    );
  }

  if (!playroom) {
    return (
      <div className="container loading" role="alert">
        Nije moguće učitati podatke o igraonici.
      </div>
    );
  }

  return (
    <div className="container book-page" ref={topRef}>
      {!isOwnerBooking && (
        <button
          type="button"
          className="back-link"
          onClick={() => navigate(`/playrooms/${encodeURIComponent(id)}`)}
        >
          ← Nazad na igraonicu
        </button>
      )}

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

        <BookingDateSelector
          selectedDate={selectedDate}
          hasSelectedDate={hasSelectedDate}
          onDateChange={handleDateChange}
        />

        {hasSelectedDate && (
          <>
            <BookingAvailabilitySection
              selectedDate={selectedDate}
              loadingSlots={loadingSlots}
              availability={availability}
              startTimeRef={startTimeRef}
              endTimeRef={endTimeRef}
              isFiksno={isFiksno}
              trajanjeTermina={trajanjeTermina}
              startDropdownItems={startDropdownItems}
              endDropdownItems={endDropdownItems}
              selectedStartTime={selectedStartTime}
              selectedEndTime={selectedEndTime}
              onStartSelect={handleStartTimeSelect}
              onEndSelect={handleEndTimeSelect}
            />

            {availability?.workingHours &&
              !loadingSlots &&
              selectedStartTime &&
              selectedEndTime && (
                <div className="booking-form" ref={bookingDetailsRef}>
                  <h3>Detalji rezervacije</h3>

                  <BookingSelectedSlotSummary
                    selectedDate={selectedDate}
                    selectedStartTime={selectedStartTime}
                    selectedEndTime={selectedEndTime}
                    slotDurationLabel={slotDurationLabel}
                  />

                  <BookingPricingOptions
                    playroom={playroom}
                    pricingRef={pricingRef}
                    selectedCenaIds={selectedCenaIds}
                    selectedPaketId={selectedPaketId}
                    selectedUslugeIds={selectedUslugeIds}
                    handleCenaToggle={handleCenaToggle}
                    handlePaketToggle={handlePaketToggle}
                    handleUslugaToggle={handleUslugaToggle}
                  />

                  <BookingFreeFeatures
                    features={playroom.besplatnePogodnosti}
                  />

                  <BookingDetailsFields
                    brojDece={brojDece}
                    setBrojDece={setBrojDece}
                    brojRoditelja={brojRoditelja}
                    setBrojRoditelja={setBrojRoditelja}
                    napomena={napomena}
                    setNapomena={setNapomena}
                    hasPerPersonPricing={hasPerPersonPricing}
                    setError={setError}
                    brojDeceRef={brojDeceRef}
                    brojDeceWrapperRef={brojDeceWrapperRef}
                  />

                  <BookingUserFields
                    isAuthenticated={isAuthenticated}
                    korisnikPodaci={korisnikPodaci}
                    handleKorisnikChange={handleKorisnikChange}
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
                    showConfirmPassword={showConfirmPassword}
                    setShowConfirmPassword={setShowConfirmPassword}
                    acceptedTerms={acceptedTerms}
                    setAcceptedTerms={setAcceptedTerms}
                    setError={setError}
                    imeRef={imeRef}
                    prezimeRef={prezimeRef}
                    emailRef={emailRef}
                    telefonRef={telefonRef}
                    passwordRef={passwordRef}
                    confirmPasswordRef={confirmPasswordRef}
                    termsRef={termsRef}
                    title={
                      isOwnerBooking ? "👤 Podaci roditelja" : "👤 Vaši podaci"
                    }
                  />
                  <BookingOrderSummary
                    selectedCene={selectedCene}
                    selectedPaket={selectedPaket}
                    selectedUsluge={selectedUsluge}
                    brojDece={brojDece}
                    brojRoditelja={brojRoditelja}
                    slotDurationHours={slotDurationHours}
                    totalPrice={totalPrice}
                  />

                  <BookingSubmitButton
                    submitting={submitting}
                    isAuthenticated={isAuthenticated || isOwnerBooking}
                    onSubmit={handleBook}
                  />
                </div>
              )}
          </>
        )}
      </div>
    </div>
  );
};

export default Book;
