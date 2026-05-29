import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getMyPlayrooms, getPlayroomStats } from "../services/playroomService";
import { getReviews } from "../services/reviewService";
import { useAuth } from "../context/AuthContext";
import {
  getOwnerBookings,
  confirmBooking,
  cancelBooking,
} from "../services/bookingService";
import "../styles/OwnerDashboard.css";
import { useToast } from "../context/ToastContext";

const DAY_NAMES = [
  "Nedelja",
  "Ponedeljak",
  "Utorak",
  "Sreda",
  "Četvrtak",
  "Petak",
  "Subota",
];

const OwnerDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const [stats, setStats] = useState(null);
  const [myPlayrooms, setMyPlayrooms] = useState([]);
  const [selectedPlayroomId, setSelectedPlayroomId] = useState("");
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [, setBookingsLoading] = useState(false);
  const [confirmingId, setConfirmingId] = useState("");
  const [cancellingId, setCancellingId] = useState("");
  const [cancelConfirmBooking, setCancelConfirmBooking] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("svi");
  const [dateFilter, setDateFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [timeFromFilter, setTimeFromFilter] = useState("");
  const [timeToFilter, setTimeToFilter] = useState("");
  const hasActiveFilters =
    searchTerm.trim() ||
    statusFilter !== "svi" ||
    dateFilter ||
    monthFilter ||
    timeFromFilter ||
    timeToFilter;

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("svi");
    setDateFilter("");
    setMonthFilter("");
    setTimeFromFilter("");
    setTimeToFilter("");
  };
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showConfirmedModal, setShowConfirmedModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showAllBookingsModal, setShowAllBookingsModal] = useState(false);
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [expandedOwnerBookingId, setExpandedOwnerBookingId] = useState(null);
  const [showTodayBookingsModal, setShowTodayBookingsModal] = useState(false);
  const [showActiveBookingsModal, setShowActiveBookingsModal] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");

  const isAnyDashboardModalOpen =
    showStatsModal ||
    showConfirmedModal ||
    showPendingModal ||
    showAllBookingsModal ||
    showCompletedModal ||
    showTodayBookingsModal ||
    showActiveBookingsModal ||
    showReviewsModal ||
    Boolean(cancelConfirmBooking);

  useEffect(() => {
    if (!isAnyDashboardModalOpen) return undefined;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isAnyDashboardModalOpen]);

  const toggleOwnerBookingDetails = (bookingId) => {
    setExpandedOwnerBookingId((prev) =>
      prev === bookingId ? null : bookingId,
    );
  };

  const fetchMyPlayrooms = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const result = await getMyPlayrooms();

      if (!result?.success) {
        setMyPlayrooms([]);
        setSelectedPlayroomId("");
        setStats(null);
        setError(
          result?.error || "Greška pri učitavanju podataka za dashboard.",
        );
        return;
      }

      const playrooms = Array.isArray(result.data) ? result.data : [];

      setMyPlayrooms(playrooms);

      if (playrooms.length > 0) {
        setSelectedPlayroomId(playrooms[0]._id);
      } else {
        setSelectedPlayroomId("");
        setStats(null);
      }
    } catch (err) {
      console.error("Greška pri učitavanju igraonica:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Greška pri učitavanju podataka za dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async (playroomId, showLoader = false) => {
    try {
      if (showLoader) {
        setStatsLoading(true);
      }

      setError("");

      const result = await getPlayroomStats(playroomId);

      if (result?.success) {
        setStats(result.data || null);
      } else {
        setStats(null);
        setError(
          result?.error || "Greška pri učitavanju statistike igraonice.",
        );
      }
    } catch (err) {
      console.error("Greška pri učitavanju statistike:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Greška pri učitavanju statistike igraonice.",
      );
      setStats(null);
    } finally {
      if (showLoader) {
        setStatsLoading(false);
      }
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    try {
      setBookingsLoading(true);

      const res = await getOwnerBookings();

      if (res?.success) {
        setBookings(Array.isArray(res.data) ? res.data : []);
      } else {
        setBookings([]);
      }
    } catch (err) {
      console.error("Greška pri učitavanju rezervacija:", err);
      setBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  const fetchReviews = useCallback(async (playroomId) => {
    if (!playroomId) {
      setReviews([]);
      return;
    }

    try {
      setReviewsLoading(true);
      setReviewsError("");

      const result = await getReviews(playroomId, 1, 10);

      if (result?.success) {
        setReviews(Array.isArray(result.data) ? result.data : []);
      } else {
        setReviews([]);
        setReviewsError(result?.error || "Greška pri učitavanju recenzija.");
      }
    } catch (err) {
      console.error("Greška pri učitavanju recenzija:", err);
      setReviews([]);
      setReviewsError(
        err?.response?.data?.message ||
          err?.message ||
          "Greška pri učitavanju recenzija.",
      );
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (user?.role !== "vlasnik" && user?.role !== "admin") {
      setLoading(false);
      return;
    }

    fetchMyPlayrooms();
    fetchBookings();
  }, [authLoading, user?.role, fetchMyPlayrooms, fetchBookings]);

  useEffect(() => {
    if (selectedPlayroomId) {
      fetchStats(selectedPlayroomId, true);
      fetchReviews(selectedPlayroomId);
    } else {
      setStats(null);
      setReviews([]);
    }
  }, [selectedPlayroomId, fetchStats, fetchReviews]);

  useEffect(() => {
    if (authLoading) return undefined;

    if (user?.role !== "vlasnik" && user?.role !== "admin") {
      return undefined;
    }

    const interval = setInterval(() => {
      fetchBookings();

      if (selectedPlayroomId) {
        fetchStats(selectedPlayroomId, false);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [authLoading, user?.role, selectedPlayroomId, fetchBookings, fetchStats]);

  const handleConfirm = async (bookingId) => {
    if (!bookingId) {
      showError("Nedostaje ID rezervacije za potvrdu.");
      return;
    }

    if (confirmingId) return;

    try {
      setConfirmingId(bookingId);
      setError("");

      const res = await confirmBooking(bookingId);

      if (res?.success) {
        showSuccess(res.message || "Rezervacija je potvrđena.");
        await fetchBookings();

        if (selectedPlayroomId) {
          await fetchStats(selectedPlayroomId);
        }
      } else {
        showError(res?.error || "Greška pri potvrdi rezervacije.");
      }
    } catch (err) {
      const message =
        err?.response?.data?.message || "Greška pri potvrdi rezervacije.";
      showError(message);
    } finally {
      setConfirmingId("");
    }
  };

  const openCancelConfirm = (booking) => {
    if (!booking?._id || cancellingId || confirmingId) return;

    setCancelConfirmBooking(booking);
  };

  const closeCancelConfirm = () => {
    if (cancellingId) return;

    setCancelConfirmBooking(null);
  };

  const handleCancel = async () => {
    const bookingId = cancelConfirmBooking?._id;

    if (!bookingId) {
      showError("Nedostaje ID rezervacije za otkazivanje.");
      return;
    }

    if (cancellingId) return;

    try {
      setCancellingId(bookingId);
      setError("");

      const res = await cancelBooking(bookingId);

      if (res?.success) {
        showSuccess(res.message || "Rezervacija je otkazana.");
        setCancelConfirmBooking(null);

        await fetchBookings();

        if (selectedPlayroomId) {
          await fetchStats(selectedPlayroomId);
        }
      } else {
        showError(res?.error || "Greška pri otkazivanju rezervacije.");
      }
    } catch (err) {
      const message =
        err?.response?.data?.message || "Greška pri otkazivanju rezervacije.";

      showError(message);
    } finally {
      setCancellingId("");
    }
  };

  const getPlayroomId = useCallback(
    (booking) =>
      typeof booking.playroomId === "object"
        ? booking.playroomId?._id
        : booking.playroomId,
    [],
  );

  const getDurationHours = (od, doVreme) => {
    if (!od || !doVreme) return 1;

    const [h1, m1] = od.split(":").map(Number);
    const [h2, m2] = doVreme.split(":").map(Number);

    const start = h1 * 60 + m1;
    const end = h2 * 60 + m2;

    const diff = end - start;

    if (!Number.isFinite(diff) || diff <= 0) return 1;

    return diff / 60;
  };

  const getItemCalculationText = (item, booking) => {
    if (!item) return "";

    const cena = Number(item.cena) || 0;
    const tip = item.tip || "fiksno";
    const brojDece = Number(booking?.brojDece) || 0;
    const sati = getDurationHours(booking?.vremeOd, booking?.vremeDo);

    if (tip === "po_satu" || tip === "poSatu") {
      const total = cena * sati;
      return `${cena} RSD × ${sati}h = ${total} RSD`;
    }

    if (tip === "po_osobi" || tip === "poOsobi") {
      const total = cena * brojDece;
      return `${cena} RSD × ${brojDece} = ${total} RSD`;
    }

    return `${cena} RSD`;
  };

  const renderStars = (rating = 0) => {
    const safe = Math.max(0, Math.min(5, Number(rating) || 0));
    return "★".repeat(safe) + "☆".repeat(5 - safe);
  };

  const filteredBookings = useMemo(() => {
    let result = [...bookings];

    if (selectedPlayroomId) {
      result = result.filter(
        (booking) => getPlayroomId(booking) === selectedPlayroomId,
      );
    }

    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (normalizedSearch) {
      result = result.filter((booking) => {
        const fullName =
          `${booking.imeRoditelja || ""} ${booking.prezimeRoditelja || ""}`.toLowerCase();
        const phone = String(
          booking.telefonRoditelja || booking.telefon || "",
        ).toLowerCase();
        const email = String(booking.emailRoditelja || "").toLowerCase();

        return (
          fullName.includes(normalizedSearch) ||
          phone.includes(normalizedSearch) ||
          email.includes(normalizedSearch)
        );
      });
    }

    if (statusFilter !== "svi") {
      result = result.filter((booking) => booking.status === statusFilter);
    }

    if (dateFilter) {
      result = result.filter((booking) => {
        if (!booking.datum) return false;
        return booking.datum.slice(0, 10) === dateFilter;
      });
    } else if (monthFilter) {
      result = result.filter((booking) => {
        if (!booking.datum) return false;
        return booking.datum.slice(0, 7) === monthFilter;
      });
    }
    if (timeFromFilter || timeToFilter) {
      result = result.filter((booking) => {
        if (!booking.vremeOd) return false;

        const bookingStart = booking.vremeOd;

        if (timeFromFilter && bookingStart < timeFromFilter) {
          return false;
        }

        if (timeToFilter && bookingStart > timeToFilter) {
          return false;
        }

        return true;
      });
    }

    return result;
  }, [
    bookings,
    selectedPlayroomId,
    searchTerm,
    statusFilter,
    dateFilter,
    monthFilter,
    timeFromFilter,
    timeToFilter,
    getPlayroomId,
  ]);

  const allOwnerBookings = useMemo(() => filteredBookings, [filteredBookings]);

  const pendingBookings = useMemo(
    () => filteredBookings.filter((b) => b.status === "cekanje"),
    [filteredBookings],
  );

  const upcomingConfirmedBookings = useMemo(
    () => filteredBookings.filter((b) => b.status === "potvrdjeno"),
    [filteredBookings],
  );

  const completedBookings = useMemo(
    () => filteredBookings.filter((b) => b.status === "zavrseno"),
    [filteredBookings],
  );

  const todayBookings = useMemo(() => {
    const today = new Date().toLocaleDateString("sv-SE", {
      timeZone: "Europe/Belgrade",
    });

    return filteredBookings.filter((b) => {
      if (!b.datum) return false;

      const bookingDate = new Date(b.datum).toLocaleDateString("sv-SE", {
        timeZone: "Europe/Belgrade",
      });

      return bookingDate === today;
    });
  }, [filteredBookings]);

  const activeBookings = useMemo(() => {
    const now = new Date();

    const today = now.toLocaleDateString("sv-SE", {
      timeZone: "Europe/Belgrade",
    });

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return filteredBookings.filter((booking) => {
      if (!booking.datum || !booking.vremeOd || !booking.vremeDo) {
        return false;
      }

      if (booking.status !== "potvrdjeno") {
        return false;
      }

      const bookingDate = new Date(booking.datum).toLocaleDateString("sv-SE", {
        timeZone: "Europe/Belgrade",
      });

      if (bookingDate !== today) {
        return false;
      }

      const [startH, startM] = booking.vremeOd.split(":").map(Number);
      const [endH, endM] = booking.vremeDo.split(":").map(Number);

      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    });
  }, [filteredBookings]);

  const timeStats = useMemo(() => {
    const map = {};
    let total = 0;

    filteredBookings.forEach((b) => {
      if (!b.vremeOd || !b.vremeDo) return;

      const key = `${b.vremeOd}-${b.vremeDo}`;
      map[key] = (map[key] || 0) + 1;
      total += 1;
    });

    const entries = Object.entries(map);

    if (entries.length === 0) {
      return {
        mostPopular: null,
        mostPopularPercent: null,
        leastPopular: null,
        leastPopularPercent: null,
      };
    }

    entries.sort((a, b) => b[1] - a[1]);

    const mostPopular = entries[0];
    const leastPopular = entries[entries.length - 1];

    return {
      mostPopular: mostPopular[0],
      mostPopularPercent:
        total > 0 ? Math.round((mostPopular[1] / total) * 100) : 0,
      leastPopular: leastPopular[0],
      leastPopularPercent:
        total > 0 ? Math.round((leastPopular[1] / total) * 100) : 0,
    };
  }, [filteredBookings]);

  const dayStats = useMemo(() => {
    const map = {};
    let total = 0;

    filteredBookings.forEach((b) => {
      if (!b.datum) return;

      const date = new Date(b.datum);
      const day = date.getDay();

      map[day] = (map[day] || 0) + 1;
      total += 1;
    });

    const entries = Object.entries(map);

    if (entries.length === 0) {
      return {
        bestDay: null,
        bestDayPercent: null,
        worstDay: null,
        worstDayPercent: null,
      };
    }

    entries.sort((a, b) => b[1] - a[1]);

    const bestDay = entries[0];
    const worstDay = entries[entries.length - 1];

    return {
      bestDay: DAY_NAMES[bestDay[0]],
      bestDayPercent: total > 0 ? Math.round((bestDay[1] / total) * 100) : 0,
      worstDay: DAY_NAMES[worstDay[0]],
      worstDayPercent: total > 0 ? Math.round((worstDay[1] / total) * 100) : 0,
    };
  }, [filteredBookings]);

  const packageStats = useMemo(() => {
    const map = {};
    let totalWithPackage = 0;

    filteredBookings.forEach((b) => {
      const paket = b.izabraniPaket;

      if (!paket?.naziv) return;

      totalWithPackage += 1;
      map[paket.naziv] = (map[paket.naziv] || 0) + 1;
    });

    const entries = Object.entries(map);

    if (entries.length === 0) {
      return {
        mostUsed: null,
        mostUsedPercent: null,
        leastUsed: null,
        leastUsedPercent: null,
      };
    }

    entries.sort((a, b) => b[1] - a[1]);

    const mostUsed = entries[0];
    const leastUsed = entries[entries.length - 1];

    return {
      mostUsed: mostUsed[0],
      mostUsedPercent:
        totalWithPackage > 0
          ? Math.round((mostUsed[1] / totalWithPackage) * 100)
          : 0,
      leastUsed: leastUsed[0],
      leastUsedPercent:
        totalWithPackage > 0
          ? Math.round((leastUsed[1] / totalWithPackage) * 100)
          : 0,
    };
  }, [filteredBookings]);

  const serviceStats = useMemo(() => {
    const map = {};
    let totalServices = 0;

    filteredBookings.forEach((b) => {
      if (!Array.isArray(b.izabraneUsluge)) return;

      b.izabraneUsluge.forEach((usluga) => {
        if (!usluga?.naziv) return;

        totalServices += 1;
        map[usluga.naziv] = (map[usluga.naziv] || 0) + 1;
      });
    });

    const entries = Object.entries(map);

    if (entries.length === 0) {
      return {
        mostUsed: null,
        mostUsedPercent: null,
        leastUsed: null,
        leastUsedPercent: null,
      };
    }

    entries.sort((a, b) => b[1] - a[1]);

    const mostUsed = entries[0];
    const leastUsed = entries[entries.length - 1];

    return {
      mostUsed: mostUsed[0],
      mostUsedPercent:
        totalServices > 0 ? Math.round((mostUsed[1] / totalServices) * 100) : 0,
      leastUsed: leastUsed[0],
      leastUsedPercent:
        totalServices > 0
          ? Math.round((leastUsed[1] / totalServices) * 100)
          : 0,
    };
  }, [filteredBookings]);

  const cancellationStats = useMemo(() => {
    const total = filteredBookings.length;

    if (total === 0) {
      return 0;
    }

    const cancelled = filteredBookings.filter(
      (b) => b.status === "otkazano",
    ).length;

    return Math.round((cancelled / total) * 100);
  }, [filteredBookings]);

  const occupancyStats = useMemo(() => {
    const total = filteredBookings.length;

    if (total === 0) {
      return 0;
    }

    const occupied = filteredBookings.filter(
      (b) => b.status === "potvrdjeno" || b.status === "zavrseno",
    ).length;

    return Math.round((occupied / total) * 100);
  }, [filteredBookings]);

  const reviewsStats = useMemo(() => {
    const total = reviews.length;

    if (total === 0) {
      return {
        total: 0,
        averageRating: 0,
      };
    }

    const sum = reviews.reduce(
      (acc, review) => acc + Number(review.ocena || review.rating || 0),
      0,
    );

    return {
      total,
      averageRating: (sum / total).toFixed(1),
    };
  }, [reviews]);

  const renderOwnerBookingsAccordion = (items = []) => {
    if (!items.length) {
      return (
        <div
          className="empty-state modal-empty"
          role="status"
          aria-live="polite"
        >
          <p>Nema rezervacija.</p>
        </div>
      );
    }

    return (
      <div className="owner-bookings-accordion-list">
        {items.map((booking) => {
          const isExpanded = expandedOwnerBookingId === booking._id;

          const statusText =
            booking.status === "potvrdjeno"
              ? "Potvrđeno"
              : booking.status === "otkazano"
                ? "Otkazano"
                : booking.status === "zavrseno"
                  ? "Završeno"
                  : booking.status === "cekanje"
                    ? "Čeka potvrdu"
                    : booking.status;

          const statusClass =
            booking.status === "potvrdjeno"
              ? "status-confirmed"
              : booking.status === "otkazano"
                ? "status-cancelled"
                : booking.status === "zavrseno"
                  ? "status-completed"
                  : "status-pending";

          return (
            <div key={booking._id} className="owner-booking-card">
              <div
                className="owner-booking-header clickable-header"
                onClick={() => toggleOwnerBookingDetails(booking._id)}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                aria-controls={`owner-booking-details-${booking._id}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleOwnerBookingDetails(booking._id);
                  }
                }}
              >
                <div>
                  <h3>
                    {booking.imeRoditelja} {booking.prezimeRoditelja}
                  </h3>
                  <p className="booking-short-info">
                    📅{" "}
                    {booking.datum
                      ? new Date(booking.datum).toLocaleDateString("sr-RS")
                      : "-"}{" "}
                    | ⏰ {booking.vremeOd || "-"} - {booking.vremeDo || "-"}
                  </p>
                </div>

                <div className="booking-header-right">
                  <span className={`status-badge ${statusClass}`}>
                    {statusText}
                  </span>
                  <span className={`arrow ${isExpanded ? "open" : ""}`}>▼</span>
                </div>
              </div>

              {isExpanded && (
                <div
                  id={`owner-booking-details-${booking._id}`}
                  className="owner-booking-details"
                >
                  <p>📧 {booking.emailRoditelja || "-"}</p>
                  <p>📞 {booking.telefonRoditelja || booking.telefon || "-"}</p>
                  <p>
                    📅{" "}
                    {booking.datum
                      ? new Date(booking.datum).toLocaleDateString("sr-RS")
                      : "-"}
                  </p>
                  <p>
                    ⏰ {booking.vremeOd || "-"} - {booking.vremeDo || "-"}
                  </p>
                  <p>👶 Broj dece: {booking.brojDece ?? 0}</p>
                  <p>👨‍👩‍👧 Broj roditelja: {booking.brojRoditelja ?? 0}</p>
                  <p>💰 Ukupna cena: {booking.ukupnaCena ?? 0} RSD</p>

                  {Array.isArray(booking.izabraneCene) &&
                    booking.izabraneCene.length > 0 && (
                      <div className="booking-selected-items">
                        <p>
                          <strong>Izabrane stavke:</strong>
                        </p>
                        {booking.izabraneCene.map((item, idx) => (
                          <p key={`owner-cena-${idx}`}>
                            • {item.naziv} ({item.tip || "fiksno"}) -{" "}
                            {getItemCalculationText(item, booking)}
                            {item.opis && <span> - {item.opis}</span>}
                          </p>
                        ))}
                      </div>
                    )}

                  {booking.izabraniPaket?.naziv && (
                    <div className="booking-selected-items">
                      <p>
                        <strong>Paket:</strong> {booking.izabraniPaket.naziv} (
                        {booking.izabraniPaket.tip || "fiksno"}) -{" "}
                        {getItemCalculationText(booking.izabraniPaket, booking)}
                      </p>

                      {booking.izabraniPaket.opis && (
                        <p>- {booking.izabraniPaket.opis}</p>
                      )}
                    </div>
                  )}

                  {Array.isArray(booking.izabraneUsluge) &&
                    booking.izabraneUsluge.length > 0 && (
                      <div className="booking-selected-items">
                        <p>
                          <strong>Dodatne usluge:</strong>
                        </p>
                        {booking.izabraneUsluge.map((item, idx) => (
                          <p key={`owner-usluga-${idx}`}>
                            • {item.naziv} ({item.tip || "fiksno"}) -{" "}
                            {getItemCalculationText(item, booking)}
                            {item.opis && <span> - {item.opis}</span>}
                          </p>
                        ))}
                      </div>
                    )}

                  {booking.napomena && <p>📝 Napomena: {booking.napomena}</p>}

                  {booking.status === "cekanje" && (
                    <button
                      type="button"
                      className="btn-confirm-booking"
                      onClick={() => handleConfirm(booking._id)}
                      disabled={confirmingId === booking._id}
                      aria-busy={confirmingId === booking._id}
                      aria-label={`Potvrdi rezervaciju za ${booking.imeRoditelja || ""} ${
                        booking.prezimeRoditelja || ""
                      }`.trim()}
                    >
                      {confirmingId === booking._id
                        ? "Potvrđujem..."
                        : "✅ Potvrdi rezervaciju"}
                    </button>
                  )}
                  {["cekanje", "potvrdjeno"].includes(booking.status) && (
                    <button
                      type="button"
                      className="btn-cancel-booking"
                      onClick={() => openCancelConfirm(booking)}
                      disabled={
                        cancellingId === booking._id ||
                        confirmingId === booking._id
                      }
                      aria-busy={cancellingId === booking._id}
                      aria-label={`Otkaži rezervaciju za ${booking.imeRoditelja || ""} ${
                        booking.prezimeRoditelja || ""
                      }`.trim()}
                    >
                      {cancellingId === booking._id
                        ? "Otkazujem..."
                        : "❌ Otkaži rezervaciju"}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {cancelConfirmBooking && (
          <div
            className="owner-cancel-confirm-overlay"
            onClick={closeCancelConfirm}
          >
            <div
              className="owner-cancel-confirm-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Potvrda otkazivanja rezervacije"
            >
              <h2>Otkazivanje rezervacije</h2>

              <p>
                Da li ste sigurni da želite da otkažete rezervaciju za{" "}
                <strong>
                  {cancelConfirmBooking.imeRoditelja}{" "}
                  {cancelConfirmBooking.prezimeRoditelja}
                </strong>
                ?
              </p>

              <div className="owner-cancel-booking-info">
                <span>
                  📅{" "}
                  {cancelConfirmBooking.datum
                    ? new Date(cancelConfirmBooking.datum).toLocaleDateString(
                        "sr-RS",
                      )
                    : "-"}
                </span>

                <span>
                  ⏰ {cancelConfirmBooking.vremeOd || "-"} -{" "}
                  {cancelConfirmBooking.vremeDo || "-"}
                </span>
              </div>

              <div className="owner-cancel-confirm-actions">
                <button
                  type="button"
                  className="owner-cancel-keep-btn"
                  onClick={closeCancelConfirm}
                  disabled={cancellingId === cancelConfirmBooking._id}
                >
                  Ne, zadrži rezervaciju
                </button>

                <button
                  type="button"
                  className="owner-cancel-confirm-btn"
                  onClick={handleCancel}
                  disabled={cancellingId === cancelConfirmBooking._id}
                  aria-busy={cancellingId === cancelConfirmBooking._id}
                >
                  {cancellingId === cancelConfirmBooking._id
                    ? "Otkazujem..."
                    : "Da, otkaži rezervaciju"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="loading-container" role="status" aria-live="polite">
        ⏳ Učitavanje podataka...
      </div>
    );
  }

  if (user?.role !== "vlasnik" && user?.role !== "admin") {
    return (
      <div className="dashboard-container">
        <div className="error-message" role="alert">
          Ova stranica je dostupna samo vlasnicima igraonica.
        </div>
      </div>
    );
  }

  if (error && myPlayrooms.length === 0) {
    return (
      <div className="dashboard-container">
        <div className="error-message" role="alert">
          {error}
        </div>
      </div>
    );
  }

  if (myPlayrooms.length === 0) {
    return (
      <div className="dashboard-container">
        <header className="dashboard-header">
          <h2>Zdravo, {user?.ime || "vlasniče"} 👋</h2>
        </header>

        <div className="empty-state" role="status" aria-live="polite">
          <p>Još nemate kreiranu nijednu igraonicu.</p>
          <p>Prvo kreirajte svoju igraonicu da biste videli statistiku.</p>
        </div>
      </div>
    );
  }

  const selectedPlayroom =
    myPlayrooms.find((playroom) => playroom._id === selectedPlayroomId) ||
    myPlayrooms[0];

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h2 className="playroom-title">
          {selectedPlayroom?.naziv
            ? selectedPlayroom.naziv.toUpperCase()
            : "IZABERI IGRAONICU"}
        </h2>
      </header>

      {myPlayrooms.length > 1 && (
        <div className="dashboard-playroom-select">
          <label htmlFor="dashboard-playroom-select">
            Izaberite igraonicu:
          </label>
          <select
            id="dashboard-playroom-select"
            value={selectedPlayroomId}
            onChange={(e) => setSelectedPlayroomId(e.target.value)}
          >
            {myPlayrooms.map((playroom) => (
              <option key={playroom._id} value={playroom._id}>
                {playroom.naziv}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
      <div className="mobile-filters-toggle-wrap">
        <button
          type="button"
          className="mobile-filters-toggle"
          onClick={() => setShowMobileFilters((prev) => !prev)}
          aria-expanded={showMobileFilters}
          aria-controls="dashboard-filters"
        >
          {showMobileFilters ? "Sakrij filtere" : "Filteri"}
        </button>
      </div>

      <div
        id="dashboard-filters"
        className={`dashboard-filters ${showMobileFilters ? "open" : ""}`}
      >
        <div className="dashboard-filter-group pretraga-group">
          <div className="pretraga-header">
            <label htmlFor="booking-search">Pretraga</label>

            {hasActiveFilters && (
              <button
                type="button"
                className="btn-reset-filters mobile-reset-btn"
                onClick={resetFilters}
              >
                Resetuj
              </button>
            )}
          </div>
          <input
            id="booking-search"
            type="text"
            placeholder="Ime, prezime, telefon ili email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="dashboard-filter-group">
          <label htmlFor="booking-time-from-filter">Vreme od</label>
          <input
            id="booking-time-from-filter"
            type="time"
            step="900"
            value={timeFromFilter}
            onChange={(e) => setTimeFromFilter(e.target.value)}
          />
        </div>

        <div className="dashboard-filter-group">
          <label htmlFor="booking-time-to-filter">Vreme do</label>
          <input
            id="booking-time-to-filter"
            type="time"
            step="900"
            value={timeToFilter}
            onChange={(e) => setTimeToFilter(e.target.value)}
          />
        </div>

        <div className="dashboard-filter-group">
          <label htmlFor="booking-month-filter">Mesec</label>
          <input
            id="booking-month-filter"
            type="month"
            value={monthFilter}
            onChange={(e) => {
              setMonthFilter(e.target.value);
              setDateFilter("");
            }}
          />
        </div>

        <div className="dashboard-filter-group">
          <label htmlFor="booking-date-filter">Datum</label>
          <input
            id="booking-date-filter"
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setMonthFilter("");
            }}
          />
        </div>

        <div className="dashboard-filter-group">
          <label htmlFor="booking-status-filter">Status</label>
          <select
            id="booking-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="svi">Svi statusi</option>
            <option value="cekanje">Na čekanju</option>
            <option value="potvrdjeno">Potvrđene</option>
            <option value="zavrseno">Završene</option>
            <option value="otkazano">Otkazane</option>
          </select>
        </div>
      </div>
      <div className="dashboard-filter-results">
        <span>
          Prikazano rezervacija: <strong>{filteredBookings.length}</strong>
        </span>

        {hasActiveFilters && (
          <button
            type="button"
            className="btn-reset-filters desktop-reset-btn"
            onClick={resetFilters}
          >
            Resetuj filtere
          </button>
        )}
      </div>
      {statsLoading ? (
        <div className="loading-container" role="status" aria-live="polite">
          ⏳ Učitavanje statistike...
        </div>
      ) : (
        <div className="stats-grid">
          <button
            type="button"
            className="stat-card blue clickable"
            onClick={() => setShowAllBookingsModal(true)}
          >
            <span className="stat-icon">📊</span>
            <div className="stat-info">
              <h3>{filteredBookings.length}</h3>
              <p>Ukupno rezervacija</p>
            </div>
          </button>

          <button
            type="button"
            className="stat-card yellow clickable"
            onClick={() => setShowPendingModal(true)}
          >
            <span className="stat-icon">⏳</span>
            <div className="stat-info">
              <h3>{pendingBookings.length}</h3>
              <p>Na čekanju</p>
            </div>
          </button>

          <button
            type="button"
            className="stat-card green clickable"
            onClick={() => setShowConfirmedModal(true)}
          >
            <span className="stat-icon">✅</span>
            <div className="stat-info">
              <h3>{upcomingConfirmedBookings.length}</h3>
              <p>Potvrđene rezervacije</p>
            </div>
          </button>

          <button
            type="button"
            className="stat-card orange clickable"
            onClick={() => setShowCompletedModal(true)}
          >
            <span className="stat-icon">🎉</span>
            <div className="stat-info">
              <h3>{completedBookings.length}</h3>
              <p>Završene rezervacije</p>
            </div>
          </button>
          <button
            type="button"
            className="stat-card purple clickable"
            onClick={() => setShowTodayBookingsModal(true)}
          >
            <span className="stat-icon">📅</span>
            <div className="stat-info">
              <h3>{todayBookings.length}</h3>
              <p>Današnje rezervacije</p>
            </div>
          </button>
          <button
            type="button"
            className="stat-card red clickable"
            onClick={() => setShowActiveBookingsModal(true)}
          >
            <span className="stat-icon">🔥</span>

            <div className="stat-info">
              <h3>{activeBookings.length}</h3>
              <p>Rezervacije u toku</p>
            </div>
          </button>
          <button
            type="button"
            className="stat-card dark clickable"
            onClick={() => setShowStatsModal(true)}
          >
            <span className="stat-icon">📊</span>
            <div className="stat-info">
              <h3>{filteredBookings.length}</h3>
              <p>Statistika</p>
            </div>
          </button>
          <button
            type="button"
            className="stat-card dark clickable"
            onClick={() => setShowReviewsModal(true)}
          >
            <span className="stat-icon">⭐</span>
            <div className="stat-info">
              <h3>{reviewsStats.total}</h3>
              <p>Recenzije</p>
            </div>
          </button>
        </div>
      )}

      {showAllBookingsModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowAllBookingsModal(false);
            setExpandedOwnerBookingId(null);
          }}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="all-bookings-modal-title"
          >
            <div className="modal-header sticky-modal-header">
              <h3 id="all-bookings-modal-title">📊 Sve rezervacije</h3>
              <button
                type="button"
                className="modal-close-btn"
                aria-label="Zatvori modal"
                onClick={() => {
                  setShowAllBookingsModal(false);
                  setExpandedOwnerBookingId(null);
                }}
              >
                ✖
              </button>
            </div>

            {renderOwnerBookingsAccordion(allOwnerBookings)}
          </div>
        </div>
      )}
      {showActiveBookingsModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowActiveBookingsModal(false);
            setExpandedOwnerBookingId(null);
          }}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="active-bookings-modal-title"
          >
            <div className="modal-header sticky-modal-header">
              <h3 id="active-bookings-modal-title">🔥 Rezervacije u toku</h3>

              <button
                type="button"
                className="modal-close-btn"
                aria-label="Zatvori modal"
                onClick={() => {
                  setShowActiveBookingsModal(false);
                  setExpandedOwnerBookingId(null);
                }}
              >
                ✖
              </button>
            </div>

            {renderOwnerBookingsAccordion(activeBookings)}
          </div>
        </div>
      )}
      {showTodayBookingsModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowTodayBookingsModal(false);
            setExpandedOwnerBookingId(null);
          }}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="today-bookings-modal-title"
          >
            <div className="modal-header sticky-modal-header">
              <h3 id="today-bookings-modal-title">📅 Današnje rezervacije</h3>
              <button
                type="button"
                className="modal-close-btn"
                aria-label="Zatvori modal"
                onClick={() => {
                  setShowTodayBookingsModal(false);
                  setExpandedOwnerBookingId(null);
                }}
              >
                ✖
              </button>
            </div>

            {renderOwnerBookingsAccordion(todayBookings)}
          </div>
        </div>
      )}

      {showCompletedModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowCompletedModal(false);
            setExpandedOwnerBookingId(null);
          }}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="completed-bookings-modal-title"
          >
            <div className="modal-header sticky-modal-header">
              <h3 id="completed-bookings-modal-title">
                🎉 Završene rezervacije
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                aria-label="Zatvori modal"
                onClick={() => {
                  setShowCompletedModal(false);
                  setExpandedOwnerBookingId(null);
                }}
              >
                ✖
              </button>
            </div>

            {renderOwnerBookingsAccordion(completedBookings)}
          </div>
        </div>
      )}

      {showPendingModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowPendingModal(false);
            setExpandedOwnerBookingId(null);
          }}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pending-bookings-modal-title"
          >
            <div className="modal-header sticky-modal-header">
              <h3 id="pending-bookings-modal-title">
                ⏳ Rezervacije na čekanju
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                aria-label="Zatvori modal"
                onClick={() => {
                  setShowPendingModal(false);
                  setExpandedOwnerBookingId(null);
                }}
              >
                ✖
              </button>
            </div>

            {renderOwnerBookingsAccordion(pendingBookings)}
          </div>
        </div>
      )}

      {showConfirmedModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowConfirmedModal(false);
            setExpandedOwnerBookingId(null);
          }}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirmed-bookings-modal-title"
          >
            <div className="modal-header sticky-modal-header">
              <h3 id="confirmed-bookings-modal-title">
                ✅ Potvrđene rezervacije
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                aria-label="Zatvori modal"
                onClick={() => {
                  setShowConfirmedModal(false);
                  setExpandedOwnerBookingId(null);
                }}
              >
                ✖
              </button>
            </div>

            {renderOwnerBookingsAccordion(upcomingConfirmedBookings)}
          </div>
        </div>
      )}
      {showStatsModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowStatsModal(false);
          }}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="stats-modal-title"
          >
            <div className="modal-header sticky-modal-header">
              <h3 id="stats-modal-title">📊 Statistika</h3>
              <button
                type="button"
                className="modal-close-btn"
                aria-label="Zatvori modal"
                onClick={() => setShowStatsModal(false)}
              >
                ✖
              </button>
            </div>

            <div className="stats-modal-content">
              <div className="stats-box">
                <h4>🥇 Najpopularniji termin</h4>
                <p>
                  {timeStats.mostPopular
                    ? `${timeStats.mostPopular} (${timeStats.mostPopularPercent}%)`
                    : "-"}
                </p>
              </div>

              <div className="stats-box">
                <h4>🧊 Najslabiji termin</h4>
                <p>
                  {timeStats.leastPopular
                    ? `${timeStats.leastPopular} (${timeStats.leastPopularPercent}%)`
                    : "-"}
                </p>
              </div>

              <div className="stats-box">
                <h4>📅 Najjači dan</h4>
                <p>
                  {dayStats.bestDay
                    ? `${dayStats.bestDay} (${dayStats.bestDayPercent}%)`
                    : "-"}
                </p>
              </div>

              <div className="stats-box">
                <h4>📉 Najslabiji dan</h4>
                <p>
                  {dayStats.worstDay
                    ? `${dayStats.worstDay} (${dayStats.worstDayPercent}%)`
                    : "-"}
                </p>
              </div>

              <div className="stats-box">
                <h4>📦 Najprodavaniji paket</h4>
                <p>
                  {packageStats.mostUsed
                    ? `${packageStats.mostUsed} (${packageStats.mostUsedPercent}%)`
                    : "-"}
                </p>
              </div>

              <div className="stats-box">
                <h4>📉 Najmanje korišćen paket</h4>
                <p>
                  {packageStats.leastUsed
                    ? `${packageStats.leastUsed} (${packageStats.leastUsedPercent}%)`
                    : "-"}
                </p>
              </div>

              <div className="stats-box">
                <h4>➕ Najčešća usluga</h4>
                <p>
                  {serviceStats.mostUsed
                    ? `${serviceStats.mostUsed} (${serviceStats.mostUsedPercent}%)`
                    : "-"}
                </p>
              </div>

              <div className="stats-box">
                <h4>🧊 Najmanje korišćena usluga</h4>
                <p>
                  {serviceStats.leastUsed
                    ? `${serviceStats.leastUsed} (${serviceStats.leastUsedPercent}%)`
                    : "-"}
                </p>
              </div>
              <div className="stats-box">
                <h4>❌ Otkazane rezervacije</h4>
                <p>{cancellationStats}%</p>
              </div>

              <div className="stats-box">
                <h4>📊 Popunjenost termina</h4>
                <p>{occupancyStats}%</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {showReviewsModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowReviewsModal(false);
          }}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reviews-modal-title"
          >
            <div className="modal-header sticky-modal-header">
              <h3 id="reviews-modal-title">⭐ Recenzije</h3>
              <button
                type="button"
                className="modal-close-btn"
                aria-label="Zatvori modal"
                onClick={() => setShowReviewsModal(false)}
              >
                ✖
              </button>
            </div>

            <div className="stats-modal-content">
              <div className="stats-box">
                <h4>Ukupno recenzija</h4>
                <p>{reviewsStats.total}</p>
              </div>

              <div className="stats-box">
                <h4>Prosečna ocena</h4>
                <p>{reviewsStats.averageRating}</p>
              </div>
            </div>

            {reviewsLoading ? (
              <div
                className="loading-container"
                role="status"
                aria-live="polite"
              >
                ⏳ Učitavanje recenzija...
              </div>
            ) : reviewsError ? (
              <div className="error-message" role="alert">
                {reviewsError}
              </div>
            ) : reviews.length === 0 ? (
              <div
                className="empty-state modal-empty"
                role="status"
                aria-live="polite"
              >
                <p>Još nema recenzija za ovu igraonicu.</p>
              </div>
            ) : (
              <div className="owner-reviews-list">
                {reviews.map((review) => (
                  <div key={review._id} className="owner-review-card">
                    <div className="owner-review-top">
                      <div>
                        <h4>{review.userName || "Korisnik"}</h4>
                        <p className="owner-review-date">
                          {review.createdAt
                            ? new Date(review.createdAt).toLocaleDateString(
                                "sr-RS",
                              )
                            : "-"}
                        </p>
                      </div>

                      <div className="owner-review-rating">
                        {renderStars(review.ocena || review.rating || 0)}
                      </div>
                    </div>

                    <p className="owner-review-text">
                      {review.komentar || review.comment || "Bez komentara."}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerDashboard;
