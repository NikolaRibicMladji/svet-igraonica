import api from "./api";

export const getAllPlayrooms = async () => {
  try {
    const response = await api.get("/playrooms");

    return {
      success: true,
      data: Array.isArray(response.data?.data) ? response.data.data : [],
      count: response.data?.count || 0,
    };
  } catch (error) {
    console.error("Greška pri dohvatanju igraonica:", error);

    return {
      success: false,
      error:
        error.response?.data?.message || "Greška pri učitavanju igraonica.",
    };
  }
};

export const getFilterCities = async () => {
  const { data } = await api.get("/playrooms/filter-cities");
  return data;
};

export const getPlayroomById = async (id) => {
  try {
    const response = await api.get(`/playrooms/${id}`);

    return {
      success: true,
      data: response.data?.data || null,
    };
  } catch (error) {
    console.error("Greška pri dohvatanju igraonice:", error);

    return {
      success: false,
      error:
        error.response?.data?.message || "Greška pri učitavanju igraonice.",
    };
  }
};

export const createPlayroom = async (playroomData) => {
  try {
    const response = await api.post("/playrooms", playroomData);

    return {
      success: true,
      data: response.data?.data || null,
      message: response.data?.message || "Igraonica je uspešno kreirana.",
    };
  } catch (error) {
    console.error("Greška pri kreiranju igraonice:", error);

    return {
      success: false,
      error: error.response?.data?.message || "Greška pri kreiranju igraonice.",
    };
  }
};

export const updatePlayroom = async (id, playroomData) => {
  try {
    const response = await api.put(`/playrooms/${id}`, playroomData);

    return {
      success: true,
      data: response.data?.data || null,
      message: response.data?.message || "Igraonica je uspešno ažurirana.",
    };
  } catch (error) {
    console.error("Greška pri ažuriranju igraonice:", error);

    return {
      success: false,
      error:
        error.response?.data?.message || "Greška pri ažuriranju igraonice.",
    };
  }
};

export const getMyPlayrooms = async () => {
  try {
    const response = await api.get("/playrooms/mine/my-playrooms");

    return {
      success: true,
      data: Array.isArray(response.data?.data) ? response.data.data : [],
      count: response.data?.count || 0,
    };
  } catch (error) {
    console.error("Greška pri dohvatanju mojih igraonica:", error);

    return {
      success: false,
      error:
        error.response?.data?.message || "Greška pri učitavanju igraonica.",
    };
  }
};

export const deletePlayroom = async (id) => {
  try {
    const response = await api.delete(`/playrooms/${id}`);

    return {
      success: true,
      message: response.data?.message || "Igraonica je uspešno obrisana.",
    };
  } catch (error) {
    console.error("Greška pri brisanju igraonice:", error);

    return {
      success: false,
      error: error.response?.data?.message || "Greška pri brisanju igraonice.",
    };
  }
};
