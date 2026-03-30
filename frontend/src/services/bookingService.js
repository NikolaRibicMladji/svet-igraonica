import api from "./api";

// ============ TERMINI ============

// Dohvati termine za igraonicu
export const getTimeSlots = async (playroomId, datum = null) => {
  try {
    let url = `/timeslots/playroom/${playroomId}`;
    if (datum) {
      url += `?datum=${datum}`;
    }

    const response = await api.get(url);

    return { success: true, data: response.data.data };
  } catch (error) {
    console.error("Greška pri dohvatanju termina:", error);
    return { success: false, error: error.response?.data?.message };
  }
};

// Kreiraj termin (vlasnik)
export const createTimeSlot = async (data) => {
  try {
    const response = await api.post("/timeslots", data);
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error("Greška:", error);
    return { success: false, error: error.response?.data?.message };
  }
};

// Dohvati moje termine (vlasnik)
export const getMyTimeSlots = async () => {
  try {
    const response = await api.get("/timeslots/my");
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error("Greška:", error);
    return { success: false, error: error.response?.data?.message };
  }
};

// Obriši termin (vlasnik)
export const deleteTimeSlot = async (id) => {
  try {
    const response = await api.delete(`/timeslots/${id}`);
    return { success: true, message: response.data.message };
  } catch (error) {
    console.error("Greška:", error);
    return { success: false, error: error.response?.data?.message };
  }
};

// ============ REZERVACIJE ============

// Kreiraj rezervaciju
export const createBooking = async (data) => {
  try {
    const response = await api.post("/bookings", data);
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error("Greška:", error);
    return { success: false, error: error.response?.data?.message };
  }
};

// Dohvati moje rezervacije (roditelj)
export const getMyBookings = async () => {
  try {
    const response = await api.get("/bookings/my");
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error("Greška:", error);
    return { success: false, error: error.response?.data?.message };
  }
};

// Dohvati rezervacije za moje igraonice (vlasnik)
export const getOwnerBookings = async () => {
  try {
    const response = await api.get("/bookings/owner");
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error("Greška:", error);
    return { success: false, error: error.response?.data?.message };
  }
};

// Otkaži rezervaciju
export const cancelBooking = async (id) => {
  try {
    const response = await api.put(`/bookings/${id}/cancel`);
    return { success: true, message: response.data.message };
  } catch (error) {
    console.error("Greška:", error);
    return { success: false, error: error.response?.data?.message };
  }
};

// Potvrdi rezervaciju (vlasnik)
export const confirmBooking = async (id) => {
  try {
    const response = await api.put(`/bookings/${id}/confirm`);
    return { success: true, message: response.data.message };
  } catch (error) {
    console.error("Greška:", error);
    return { success: false, error: error.response?.data?.message };
  }
};

// Generiši termine za igraonicu
export const generateTimeSlots = async (playroomId) => {
  try {
    const response = await api.post(`/timeslots/generate/${playroomId}`);
    return {
      success: true,
      message: response.data.message,
      data: response.data.data,
    };
  } catch (error) {
    console.error("Greška:", error);
    return { success: false, error: error.response?.data?.message };
  }
};

// Dohvati sve termine za igraonicu (za vlasnika - vidi i slobodne i zauzete)
export const getAllTimeSlotsForOwner = async (playroomId, datum = null) => {
  try {
    let url = `/timeslots/playroom/${playroomId}/all`;
    if (datum) {
      url += `?datum=${datum}`;
    }
    const response = await api.get(url);
    return {
      success: true,
      data: response.data.data,
      playroom: response.data.playroom,
    };
  } catch (error) {
    console.error("Greška:", error);
    return { success: false, error: error.response?.data?.message };
  }
};

// Ručno zauzmi termin (vlasnik rezerviše)
export const manualBookTimeSlot = async (timeSlotId, bookingData) => {
  try {
    const response = await api.post(
      `/timeslots/${timeSlotId}/manual-book`,
      bookingData,
    );

    return {
      success: true,
      data: response.data.data,
      message: response.data.message,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error.response?.data?.message || "Greška pri ručnom zauzimanju termina",
    };
  }
};
