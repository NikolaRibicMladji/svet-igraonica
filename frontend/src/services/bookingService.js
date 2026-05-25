import api from "./api";

// ============ TERMINI ============

export const getTimeSlots = async (playroomId, datum = null) => {
  const safePlayroomId = String(playroomId || "").trim();

  if (!safePlayroomId) {
    return {
      success: false,
      error: "Nedostaje ID igraonice za termine.",
    };
  }

  try {
    const query = new URLSearchParams();

    if (datum) {
      query.append("datum", String(datum));
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
  const safeId = String(id || "").trim();

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
  if (!data?.playroomId || !data?.datum || !data?.vremeOd || !data?.vremeDo) {
    return {
      success: false,
      error: "Popunite sva obavezna polja.",
    };
  }
  try {
    const payload = {
      playroomId: data.playroomId,
      datum: data.datum,
      vremeOd: data.vremeOd,
      vremeDo: data.vremeDo,
      acceptedTerms: data.acceptedTerms === true,
      cenaIds: Array.isArray(data.cenaIds) ? data.cenaIds : [],
      paketId: data.paketId || null,
      usluge: Array.isArray(data.usluge) ? data.usluge : [],
      imeRoditelja: data.imeRoditelja || data.ime,
      prezimeRoditelja: data.prezimeRoditelja || data.prezime,
      emailRoditelja: data.emailRoditelja || data.email,
      telefonRoditelja: data.telefonRoditelja || data.telefon,
      brojDece: data.brojDece ? Number(data.brojDece) : 0,
      brojRoditelja: data.brojRoditelja ? Number(data.brojRoditelja) : 0,
      napomena: data.napomena || "",
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
export const getMyBookings = async () => {
  try {
    const response = await api.get("/bookings/my");

    return {
      success: true,
      data: Array.isArray(response.data?.data) ? response.data.data : [],
    };
  } catch (error) {
    console.error("Greška pri dohvatanju mojih rezervacija:", error);

    return {
      success: false,
      status: error.response?.status,
      error:
        error.response?.data?.message || "Greška pri dohvatanju rezervacija.",
    };
  }
};

export const getOwnerBookings = async () => {
  try {
    const response = await api.get("/bookings/owner");

    return {
      success: true,
      data: Array.isArray(response.data?.data) ? response.data.data : [],
    };
  } catch (error) {
    console.error("Greška pri dohvatanju owner rezervacija:", error);

    return {
      success: false,
      status: error.response?.status,
      error:
        error.response?.data?.message || "Greška pri dohvatanju rezervacija.",
    };
  }
};

export const cancelBooking = async (id) => {
  const safeId = String(id || "").trim();

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
  const safeId = String(id || "").trim();

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
  const safePlayroomId = String(playroomId || "").trim();

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
  const safePlayroomId = String(playroomId || "").trim();

  if (!safePlayroomId) {
    return {
      success: false,
      error: "Nedostaje ID igraonice za termine vlasnika.",
    };
  }

  try {
    const query = new URLSearchParams();

    if (datum) {
      query.append("datum", String(datum));
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

export const manualBookInterval = async (bookingData) => {
  if (!bookingData || typeof bookingData !== "object") {
    return {
      success: false,
      error: "Nedostaju podaci za ručno zauzimanje termina.",
    };
  }

  try {
    const response = await api.post(
      "/timeslots/manual-book-interval",
      bookingData,
    );

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
    !data?.playroomId ||
    !data?.datum ||
    !data?.vremeOd ||
    !data?.vremeDo ||
    !data?.ime ||
    !data?.prezime ||
    !data?.email ||
    !data?.telefon ||
    !data?.password
  ) {
    return {
      success: false,
      error: "Popunite sva obavezna polja.",
    };
  }
  try {
    const payload = {
      playroomId: data.playroomId,
      datum: data.datum,
      vremeOd: data.vremeOd,
      vremeDo: data.vremeDo,
      acceptedTerms: data.acceptedTerms === true,
      cenaIds: Array.isArray(data.cenaIds) ? data.cenaIds : [],
      paketId: data.paketId || null,
      usluge: Array.isArray(data.usluge) ? data.usluge : [],
      ime: data.ime,
      prezime: data.prezime,
      email: data.email,
      telefon: data.telefon,
      password: data.password,
      confirmPassword: data.confirmPassword,
      brojDece: data.brojDece ? Number(data.brojDece) : 0,
      brojRoditelja: data.brojRoditelja ? Number(data.brojRoditelja) : 0,
      napomena: data.napomena || "",
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
    return createBooking({
      ...bookingPayload,
      acceptedTerms,
    });
  }

  return createGuestBooking({
    ...bookingPayload,
    password,
    confirmPassword,
    acceptedTerms,
  });
};

export const getAvailableTimeSlots = async (playroomId, datum = null) => {
  const safePlayroomId = String(playroomId || "").trim();

  if (!safePlayroomId) {
    return {
      success: false,
      error: "Nedostaje ID igraonice za slobodne termine.",
    };
  }

  try {
    const query = new URLSearchParams();

    if (datum) {
      query.append("datum", String(datum));
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
