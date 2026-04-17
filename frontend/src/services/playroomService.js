import api from "./api";

export const getAllPlayrooms = async (params = {}) => {
  try {
    const query = new URLSearchParams();

    if (params.page) query.append("page", params.page);
    if (params.limit) query.append("limit", params.limit);
    if (params.grad && params.grad !== "svi") query.append("grad", params.grad);
    if (params.minRating && params.minRating !== "sve") {
      query.append("minRating", params.minRating);
    }
    if (params.sortBy) query.append("sortBy", params.sortBy);

    const response = await api.get(`/playrooms?${query.toString()}`);

    return {
      success: true,
      data: Array.isArray(response.data?.data) ? response.data.data : [],
      count: response.data?.count || 0,
      total: response.data?.total || 0,
      page: response.data?.page || 1,
      pages: response.data?.pages || 1,
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
