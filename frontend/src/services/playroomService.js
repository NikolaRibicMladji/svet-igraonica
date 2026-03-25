import api from "./api";

// Dohvati sve verifikovane igraonice (javno)
export const getAllPlayrooms = async () => {
  try {
    const response = await api.get("/playrooms");
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error("Greška pri dohvatanju igraonica:", error);
    return {
      success: false,
      error: error.response?.data?.message || "Greška pri učitavanju igraonica",
    };
  }
};

// Dohvati jednu igraonicu po ID
export const getPlayroomById = async (id) => {
  try {
    const response = await api.get(`/playrooms/${id}`);
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error("Greška pri dohvatanju igraonice:", error);
    return {
      success: false,
      error: error.response?.data?.message || "Greška pri učitavanju igraonice",
    };
  }
};

// Kreiraj novu igraonicu (samo vlasnik)
export const createPlayroom = async (playroomData) => {
  try {
    const response = await api.post("/playrooms", playroomData);
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error("Greška pri kreiranju igraonice:", error);
    return {
      success: false,
      error: error.response?.data?.message || "Greška pri kreiranju igraonice",
    };
  }
};

// Ažuriraj igraonicu (samo vlasnik)
export const updatePlayroom = async (id, playroomData) => {
  try {
    const response = await api.put(`/playrooms/${id}`, playroomData);
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error("Greška pri ažuriranju igraonice:", error);
    return {
      success: false,
      error: error.response?.data?.message || "Greška pri ažuriranju igraonice",
    };
  }
};

// Dohvati moje igraonice (vlasnik)
export const getMyPlayrooms = async () => {
  try {
    const response = await api.get("/playrooms/mine/my-playrooms");
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error("Greška pri dohvatanju mojih igraonica:", error);
    return {
      success: false,
      error: error.response?.data?.message || "Greška pri učitavanju",
    };
  }
};

// Obriši igraonicu
export const deletePlayroom = async (id) => {
  try {
    const response = await api.delete(`/playrooms/${id}`);
    return { success: true, message: response.data.message };
  } catch (error) {
    console.error("Greška pri brisanju igraonice:", error);
    return {
      success: false,
      error: error.response?.data?.message || "Greška pri brisanju",
    };
  }
};
