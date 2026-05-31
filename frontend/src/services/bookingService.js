import api from "./api";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const QUARTER_MINUTES = [0, 15, 30, 45];

const normalizeId = (id) => String(id || "").trim();

const normalizeIdList = (items) =>
  Array.isArray(items) ? items.map(normalizeId).filter(Boolean) : [];

const normalizeDate = (value) => {
  const safeValue = String(value || "").trim();

  return DATE_REGEX.test(safeValue) ? safeValue : "";
};

const normalizeTime = (value) => {
  const safeValue = String(value || "").trim();

  if (!TIME_REGEX.test(safeValue)) return "";

  const [, minutes] = safeValue.split(":").map(Number);

  return QUARTER_MINUTES.includes(minutes) ? safeValue : "";
};

const normalizeText = (value, maxLength = 500) =>
  String(value || "")
    .trim()
    .slice(0, maxLength);

const toSafeCount = (value) => {
  if (value === "" || value === null || value === undefined) return 0;

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue < 0) return 0;

  return Math.floor(numberValue);
};

const BOOKING_STATUSES = ["cekanje", "potvrdjeno", "otkazano", "zavrseno"];

const toSafePage = (value) => {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue < 1) return 1;

  return numberValue;
};

const toSafeLimit = (value) => {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue < 1) return 10;

  return Math.min(numberValue, 50);
};

const buildBookingsQuery = (params = {}, options = {}) => {
  const query = new URLSearchParams();

  query.append("page", String(toSafePage(params.page)));
  query.append("limit", String(toSafeLimit(params.limit)));

  const status = String(params.status || "")
    .trim()
    .toLowerCase();

  if (BOOKING_STATUSES.includes(status)) {
    query.append("status", status);
  }

  if (options.includePlayroomId) {
    const playroomId = normalizeId(params.playroomId);

    if (playroomId) {
      query.append("playroomId", playroomId);
    }
  }

  return query.toString();
};

const normalizeBookingMode = (value) => {
  const safeValue = String(value || "")
    .trim()
    .toLowerCase();

  return ["fiksno", "fleksibilno"].includes(safeValue) ? safeValue : "";
};

const timeToMinutes = (time) => {
  const safeTime = normalizeTime(time);

  if (!safeTime) return null;

  const [hours, minutes] = safeTime.split(":").map(Number);

  return hours * 60 + minutes;
};

const buildBookingTimePayload = (data) => {
  const mode = normalizeBookingMode(data.mode || data.rezimRezervacije);
  const timeSlotId = normalizeId(data.timeSlotId);

  const shouldUseFixedSlot =
    mode === "fiksno" || (timeSlotId && mode !== "fleksibilno");

  if (shouldUseFixedSlot) {
    if (!timeSlotId) {
      return {
        error: "Izaberite postojeći termin.",
      };
    }

    return {
      payload: {
        timeSlotId,
      },
    };
  }

  const datum = normalizeDate(data.datum);
  const vremeOd = normalizeTime(data.vremeOd);
  const vremeDo = normalizeTime(data.vremeDo);

  if (!datum || !vremeOd || !vremeDo) {
    return {
      error: "Izaberite datum, vreme početka i vreme završetka.",
    };
  }

  const startMinutes = timeToMinutes(vremeOd);
  const endMinutes = timeToMinutes(vremeDo);

  if (
    startMinutes === null ||
    endMinutes === null ||
    endMinutes <= startMinutes
  ) {
    return {
      error: "Vreme završetka mora biti posle vremena početka.",
    };
  }

  return {
    payload: {
      datum,
      vremeOd,
      vremeDo,
    },
  };
};

const buildBookingBasePayload = (data) => {
  const playroomId = normalizeId(data.playroomId);
  const cenaIds = normalizeIdList(data.cenaIds);
  const paketId = normalizeId(data.paketId) || null;

  if (!playroomId) {
    return {
      error: "Nedostaje ID igraonice.",
    };
  }

  if (cenaIds.length === 0 && !paketId) {
    return {
      error: "Izaberite cenu ili paket.",
    };
  }

  const timePayloadResult = buildBookingTimePayload(data);

  if (timePayloadResult.error) {
    return timePayloadResult;
  }

  return {
    payload: {
      playroomId,
      ...timePayloadResult.payload,
      cenaIds,
      paketId,
      usluge: normalizeIdList(data.usluge),
      brojDece: toSafeCount(data.brojDece),
      brojRoditelja: toSafeCount(data.brojRoditelja),
      napomena: normalizeText(data.napomena, 500),
    },
  };
};

// ============ TERMINI ============

export const getTimeSlots = async (playroomId, datum = null) => {
  const safePlayroomId = normalizeId(playroomId);

  if (!safePlayroomId) {
    return {
      success: false,
      error: "Nedostaje ID igraonice za termine.",
    };
  }

  try {
    const query = new URLSearchParams();

    const safeDatum = normalizeDate(datum);

    if (safeDatum) {
      query.append("datum", safeDatum);
    }

    const queryString = query.toString();

    const response = await api.get(
      `/timeslots/playroom/${encodeURIComponent(safePlayroomId)}${
        queryString ? `?${queryString}` : ""
      }`,
    );

    return {
      success: true,
      data: response.data?.data || null,
    };
  } catch (error) {
    console.error("Greška pri dohvatanju termina:", error);

    return {
      success: false,
      status: error.response?.status,
      error: error.response?.data?.message || "Greška pri dohvatanju termina.",
    };
  }
};

export const createTimeSlot = async (data) => {
  if (!data || typeof data !== "object") {
    return {
      success: false,
      error: "Nedostaju podaci za kreiranje termina.",
    };
  }

  if (!data.playroomId || !data.datum || !data.vremeOd || !data.vremeDo) {
    return {
      success: false,
      error: "Popunite sva obavezna polja za termin.",
    };
  }

  try {
    const response = await api.post("/timeslots", data);

    return {
      success: true,
      data: response.data?.data || null,
      message: response.data?.message || "Termin je uspešno kreiran.",
    };
  } catch (error) {
    console.error("Greška pri kreiranju termina:", error);

    return {
      success: false,
      status: error.response?.status,
      error: error.response?.data?.message || "Greška pri kreiranju termina.",
    };
  }
};

export const getMyTimeSlots = async () => {
  try {
    const response = await api.get("/timeslots/my");

    return {
      success: true,
      data: Array.isArray(response.data?.data) ? response.data.data : [],
    };
  } catch (error) {
    console.error("Greška pri dohvatanju mojih termina:", error);

    return {
      success: false,
      status: error.response?.status,
      error: error.response?.data?.message || "Greška pri dohvatanju termina.",
    };
  }
};

export const deleteTimeSlot = async (id) => {
  const safeId = normalizeId(id);

  if (!safeId) {
    return {
      success: false,
      error: "Nedostaje ID termina za brisanje.",
    };
  }

  try {
    const response = await api.delete(
      `/timeslots/${encodeURIComponent(safeId)}`,
    );

    return {
      success: true,
      message: response.data?.message || "Termin je uspešno obrisan.",
    };
  } catch (error) {
    console.error("Greška pri brisanju termina:", error);

    return {
      success: false,
      status: error.response?.status,
      error: error.response?.data?.message || "Greška pri brisanju termina.",
    };
  }
};

// ============ REZERVACIJE ============

export const createBooking = async (data) => {
  if (!data || typeof data !== "object") {
    return {
      success: false,
      error: "Nedostaju podaci za rezervaciju.",
    };
  }

  const basePayloadResult = buildBookingBasePayload(data);

  if (basePayloadResult.error) {
    return {
      success: false,
      error: basePayloadResult.error,
    };
  }

  try {
    const payload = {
      ...basePayloadResult.payload,
      imeRoditelja: normalizeText(data.imeRoditelja || data.ime, 80),
      prezimeRoditelja: normalizeText(
        data.prezimeRoditelja || data.prezime,
        80,
      ),
      emailRoditelja: normalizeText(
        data.emailRoditelja || data.email,
        120,
      ).toLowerCase(),
      telefonRoditelja: normalizeText(
        data.telefonRoditelja || data.telefon,
        30,
      ),
    };

    const response = await api.post("/bookings", payload);

    return {
      success: true,
      data: response.data?.data || null,
      message: response.data?.message || "Rezervacija je uspešno kreirana.",
    };
  } catch (error) {
    console.error("Greška pri kreiranju rezervacije:", error);

    return {
      success: false,
      status: error.response?.status,
      error:
        error.response?.data?.message || "Greška pri kreiranju rezervacije.",
    };
  }
};

export const getMyBookings = async (params = {}) => {
  try {
    const queryString = buildBookingsQuery(params);

    const response = await api.get(`/bookings/my?${queryString}`);

    return {
      success: true,
      count: Number(response.data?.count) || 0,
      pagination: response.data?.pagination || {
        total: 0,
        page: toSafePage(params.page),
        limit: toSafeLimit(params.limit),
        pages: 0,
      },
      data: Array.isArray(response.data?.data) ? response.data.data : [],
    };
  } catch (error) {
    console.error("Greška pri dohvatanju mojih rezervacija:", error);

    return {
      success: false,
      status: error.response?.status,
      error:
        error.response?.data?.message || "Greška pri dohvatanju rezervacija.",
      data: [],
      count: 0,
      pagination: {
        total: 0,
        page: toSafePage(params.page),
        limit: toSafeLimit(params.limit),
        pages: 0,
      },
    };
  }
};

export const getOwnerBookings = async (params = {}) => {
  try {
    const queryString = buildBookingsQuery(params, {
      includePlayroomId: true,
    });

    const response = await api.get(`/bookings/owner?${queryString}`);

    return {
      success: true,
      count: Number(response.data?.count) || 0,
      pagination: response.data?.pagination || {
        total: 0,
        page: toSafePage(params.page),
        limit: toSafeLimit(params.limit),
        pages: 0,
      },
      data: Array.isArray(response.data?.data) ? response.data.data : [],
    };
  } catch (error) {
    console.error("Greška pri dohvatanju owner rezervacija:", error);

    return {
      success: false,
      status: error.response?.status,
      error:
        error.response?.data?.message || "Greška pri dohvatanju rezervacija.",
      data: [],
      count: 0,
      pagination: {
        total: 0,
        page: toSafePage(params.page),
        limit: toSafeLimit(params.limit),
        pages: 0,
      },
    };
  }
};

export const cancelBooking = async (id) => {
  const safeId = normalizeId(id);

  if (!safeId) {
    return {
      success: false,
      error: "Nedostaje ID rezervacije za otkazivanje.",
    };
  }

  try {
    const response = await api.put(
      `/bookings/${encodeURIComponent(safeId)}/cancel`,
    );

    return {
      success: true,
      message: response.data?.message || "Rezervacija je otkazana.",
      data: response.data?.data || null,
    };
  } catch (error) {
    console.error("Greška pri otkazivanju rezervacije:", error);

    return {
      success: false,
      status: error.response?.status,
      error:
        error.response?.data?.message || "Greška pri otkazivanju rezervacije.",
    };
  }
};

export const confirmBooking = async (id) => {
  const safeId = normalizeId(id);

  if (!safeId) {
    return {
      success: false,
      error: "Nedostaje ID rezervacije za potvrdu.",
    };
  }

  try {
    const response = await api.put(
      `/bookings/${encodeURIComponent(safeId)}/confirm`,
    );

    return {
      success: true,
      message: response.data?.message || "Rezervacija je potvrđena.",
      data: response.data?.data || null,
    };
  } catch (error) {
    console.error("Greška pri potvrdi rezervacije:", error);

    return {
      success: false,
      status: error.response?.status,
      error: error.response?.data?.message || "Greška pri potvrdi rezervacije.",
    };
  }
};

export const generateTimeSlots = async (playroomId) => {
  const safePlayroomId = normalizeId(playroomId);

  if (!safePlayroomId) {
    return {
      success: false,
      error: "Nedostaje ID igraonice za generisanje termina.",
    };
  }

  try {
    const response = await api.post(
      `/timeslots/generate/${encodeURIComponent(safePlayroomId)}`,
    );

    return {
      success: true,
      message: response.data?.message || "Termini su uspešno generisani.",
      data: response.data?.data || null,
    };
  } catch (error) {
    console.error("Greška pri generisanju termina:", error);

    return {
      success: false,
      status: error.response?.status,
      error: error.response?.data?.message || "Greška pri generisanju termina.",
    };
  }
};

export const getAllTimeSlotsForOwner = async (playroomId, datum = null) => {
  const safePlayroomId = normalizeId(playroomId);

  if (!safePlayroomId) {
    return {
      success: false,
      error: "Nedostaje ID igraonice za termine vlasnika.",
    };
  }

  try {
    const query = new URLSearchParams();

    const safeDatum = normalizeDate(datum);

    if (safeDatum) {
      query.append("datum", safeDatum);
    }

    const queryString = query.toString();

    const response = await api.get(
      `/timeslots/playroom/${encodeURIComponent(safePlayroomId)}/all${
        queryString ? `?${queryString}` : ""
      }`,
    );

    return {
      success: true,
      data: Array.isArray(response.data?.data) ? response.data.data : [],
      playroom: response.data?.playroom || null,
    };
  } catch (error) {
    console.error("Greška pri dohvatanju svih termina za vlasnika:", error);

    return {
      success: false,
      status: error.response?.status,
      error:
        error.response?.data?.message ||
        "Greška pri dohvatanju termina za vlasnika.",
    };
  }
};

export const manualBookTimeSlot = async (slotId, bookingData) => {
  const safeSlotId = normalizeId(slotId);

  if (!safeSlotId) {
    return {
      success: false,
      error: "Nedostaje ID fiksnog termina.",
    };
  }

  if (!bookingData || typeof bookingData !== "object") {
    return {
      success: false,
      error: "Nedostaju podaci za ručno zauzimanje termina.",
    };
  }

  const payload = {
    cenaIds: normalizeIdList(bookingData.cenaIds),
    paketId: normalizeId(bookingData.paketId) || null,
    usluge: normalizeIdList(bookingData.usluge),
    brojDece: toSafeCount(bookingData.brojDece),
    brojRoditelja: toSafeCount(bookingData.brojRoditelja),
    imeRoditelja: normalizeText(
      bookingData.imeRoditelja || bookingData.ime,
      100,
    ),
    prezimeRoditelja: normalizeText(
      bookingData.prezimeRoditelja || bookingData.prezime,
      100,
    ),
    emailRoditelja: normalizeText(
      bookingData.emailRoditelja || bookingData.email,
      120,
    ).toLowerCase(),
    telefonRoditelja: normalizeText(
      bookingData.telefonRoditelja || bookingData.telefon,
      30,
    ),
    napomena: normalizeText(bookingData.napomena, 500),
  };

  if (payload.cenaIds.length === 0 && !payload.paketId) {
    return {
      success: false,
      error: "Izaberite cenu ili paket.",
    };
  }

  try {
    const response = await api.post(
      `/timeslots/${encodeURIComponent(safeSlotId)}/manual-book`,
      payload,
    );

    return {
      success: true,
      data: response.data?.data || null,
      message: response.data?.message || "Termin je uspešno ručno zauzet.",
    };
  } catch (error) {
    console.error("Greška pri ručnom zauzimanju fiksnog termina:", error);

    return {
      success: false,
      status: error.response?.status,
      error:
        error.response?.data?.message ||
        "Greška pri ručnom zauzimanju fiksnog termina.",
    };
  }
};

export const manualBookInterval = async (bookingData) => {
  if (!bookingData || typeof bookingData !== "object") {
    return {
      success: false,
      error: "Nedostaju podaci za ručno zauzimanje termina.",
    };
  }

  const payload = {
    ...bookingData,
    cenaIds: normalizeIdList(bookingData.cenaIds),
    paketId: normalizeId(bookingData.paketId) || null,
    usluge: normalizeIdList(bookingData.usluge),
    brojDece: toSafeCount(bookingData.brojDece),
    brojRoditelja: toSafeCount(bookingData.brojRoditelja),
    imeRoditelja: normalizeText(
      bookingData.imeRoditelja || bookingData.ime,
      100,
    ),
    prezimeRoditelja: normalizeText(
      bookingData.prezimeRoditelja || bookingData.prezime,
      100,
    ),
    emailRoditelja: normalizeText(
      bookingData.emailRoditelja || bookingData.email,
      120,
    ).toLowerCase(),
    telefonRoditelja: normalizeText(
      bookingData.telefonRoditelja || bookingData.telefon,
      30,
    ),
    napomena: normalizeText(bookingData.napomena, 500),
  };

  try {
    const response = await api.post("/timeslots/manual-book-interval", payload);

    return {
      success: true,
      data: response.data?.data || null,
      message: response.data?.message || "Termin je uspešno ručno zauzet.",
    };
  } catch (error) {
    console.error("Greška pri ručnom zauzimanju termina:", error);

    return {
      success: false,
      status: error.response?.status,
      error:
        error.response?.data?.message ||
        "Greška pri ručnom zauzimanju termina.",
    };
  }
};

export const createGuestBooking = async (data) => {
  if (
    !data?.ime ||
    !data?.prezime ||
    !data?.email ||
    !data?.telefon ||
    !data?.password ||
    !data?.confirmPassword
  ) {
    return {
      success: false,
      error: "Popunite sva obavezna polja.",
    };
  }

  const basePayloadResult = buildBookingBasePayload(data);

  if (basePayloadResult.error) {
    return {
      success: false,
      error: basePayloadResult.error,
    };
  }

  try {
    const payload = {
      ...basePayloadResult.payload,
      ime: normalizeText(data.ime, 80),
      prezime: normalizeText(data.prezime, 80),
      email: normalizeText(data.email, 120).toLowerCase(),
      telefon: normalizeText(data.telefon, 30),
      password: String(data.password || ""),
      confirmPassword: String(data.confirmPassword || ""),
      acceptedTerms: data.acceptedTerms === true,
    };

    const response = await api.post("/bookings/guest", payload);

    return {
      success: true,
      data: response.data?.data || null,
      accessToken: response.data?.accessToken,
      user: response.data?.user,
      message:
        response.data?.message || "Rezervacija uspešna (guest korisnik).",
    };
  } catch (error) {
    console.error("Greška pri guest rezervaciji:", error);

    return {
      success: false,
      status: error.response?.status,
      error: error.response?.data?.message || "Greška pri guest rezervaciji.",
    };
  }
};

export const submitBooking = async ({
  isAuthenticated = false,
  bookingPayload,
  password = "",
  confirmPassword = "",
  acceptedTerms = false,
}) => {
  if (isAuthenticated) {
    return createBooking(bookingPayload);
  }

  return createGuestBooking({
    ...bookingPayload,
    password,
    confirmPassword,
    acceptedTerms,
  });
};
export const getAvailableTimeSlots = async (playroomId, datum = null) => {
  const safePlayroomId = normalizeId(playroomId);

  if (!safePlayroomId) {
    return {
      success: false,
      error: "Nedostaje ID igraonice za slobodne termine.",
    };
  }

  try {
    const query = new URLSearchParams();

    const safeDatum = normalizeDate(datum);

    if (safeDatum) {
      query.append("datum", safeDatum);
    }

    const queryString = query.toString();

    const response = await api.get(
      `/timeslots/playroom/${encodeURIComponent(safePlayroomId)}/available${
        queryString ? `?${queryString}` : ""
      }`,
    );

    return {
      success: true,
      data: response.data?.data || null,
    };
  } catch (error) {
    console.error("Greška pri dohvatanju slobodnih termina:", error);

    return {
      success: false,
      status: error.response?.status,
      error:
        error.response?.data?.message ||
        "Greška pri dohvatanju slobodnih termina.",
    };
  }
};
