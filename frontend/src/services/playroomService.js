import api from "./api";

const normalizeId = (id) => String(id || "").trim();

export const getAllPlayrooms = async (params = {}) => {
  try {
    const query = new URLSearchParams();

    if (params.page) query.append("page", String(params.page));
    if (params.limit) query.append("limit", String(params.limit));
    if (params.grad && params.grad !== "svi") query.append("grad", params.grad);

    if (params.minRating && params.minRating !== "sve") {
      query.append("minRating", String(params.minRating));
    }

    if (params.sortBy) query.append("sortBy", params.sortBy);

    if (params.search && params.search.trim()) {
      query.append("search", params.search.trim());
    }

    const queryString = query.toString();
    const response = await api.get(
      `/playrooms${queryString ? `?${queryString}` : ""}`,
    );

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
      status: error.response?.status,
      error:
        error.response?.data?.message || "Greška pri učitavanju igraonica.",
    };
  }
};

export const getFilterCities = async () => {
  try {
    const response = await api.get("/playrooms/filter-cities");

    return {
      success: true,
      data: Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
          ? response.data
          : [],
    };
  } catch (error) {
    console.error("Greška pri dohvatanju gradova:", error);

    return {
      success: false,
      status: error.response?.status,
      error: error.response?.data?.message || "Greška pri učitavanju gradova.",
      data: [],
    };
  }
};

export const getPlayroomById = async (id) => {
  const safeId = normalizeId(id);

  if (!safeId) {
    return {
      success: false,
      error: "Nedostaje ID igraonice.",
    };
  }

  try {
    const response = await api.get(`/playrooms/${encodeURIComponent(safeId)}`);

    return {
      success: true,
      data: response.data?.data || null,
    };
  } catch (error) {
    console.error("Greška pri dohvatanju igraonice:", error);

    return {
      success: false,
      status: error.response?.status,
      error:
        error.response?.data?.message || "Greška pri učitavanju igraonice.",
    };
  }
};

export const createPlayroom = async (playroomData) => {
  if (!playroomData || typeof playroomData !== "object") {
    return {
      success: false,
      error: "Nedostaju podaci za kreiranje igraonice.",
    };
  }

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
      status: error.response?.status,
      error: error.response?.data?.message || "Greška pri kreiranju igraonice.",
    };
  }
};

export const updatePlayroom = async (id, playroomData) => {
  const safeId = normalizeId(id);

  if (!safeId) {
    return {
      success: false,
      error: "Nedostaje ID igraonice za ažuriranje.",
    };
  }

  if (!playroomData || typeof playroomData !== "object") {
    return {
      success: false,
      error: "Nedostaju podaci za ažuriranje igraonice.",
    };
  }

  try {
    const response = await api.put(
      `/playrooms/${encodeURIComponent(safeId)}`,
      playroomData,
    );

    return {
      success: true,
      data: response.data?.data || null,
      message: response.data?.message || "Igraonica je uspešno ažurirana.",
    };
  } catch (error) {
    console.error("Greška pri ažuriranju igraonice:", error);

    return {
      success: false,
      status: error.response?.status,
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
      status: error.response?.status,
      error:
        error.response?.data?.message || "Greška pri učitavanju igraonica.",
    };
  }
};

export const deletePlayroom = async (id) => {
  const safeId = normalizeId(id);

  if (!safeId) {
    return {
      success: false,
      error: "Nedostaje ID igraonice za brisanje.",
    };
  }

  try {
    const response = await api.delete(
      `/playrooms/${encodeURIComponent(safeId)}`,
    );

    return {
      success: true,
      message: response.data?.message || "Igraonica je uspešno obrisana.",
    };
  } catch (error) {
    console.error("Greška pri brisanju igraonice:", error);

    return {
      success: false,
      status: error.response?.status,
      error: error.response?.data?.message || "Greška pri brisanju igraonice.",
    };
  }
};

export const deactivatePlayroom = async (id, password) => {
  const safeId = normalizeId(id);
  const safePassword = String(password || "");

  if (!safeId) {
    return {
      success: false,
      error: "Nedostaje ID igraonice za deaktivaciju.",
    };
  }

  if (!safePassword.trim()) {
    return {
      success: false,
      error: "Unesite lozinku za potvrdu deaktivacije.",
    };
  }

  try {
    const response = await api.put(
      `/playrooms/${encodeURIComponent(safeId)}/deactivate`,
      {
        password: safePassword,
      },
    );

    return {
      success: true,
      data: response.data?.data || null,
      message:
        response.data?.message ||
        "Igraonica je deaktivirana i više nije javno dostupna.",
    };
  } catch (error) {
    console.error("Greška pri deaktivaciji igraonice:", error);

    return {
      success: false,
      status: error.response?.status,
      error:
        error.response?.data?.message || "Greška pri deaktivaciji igraonice.",
    };
  }
};

export const getPlayroomStats = async (playroomId) => {
  const safePlayroomId = normalizeId(playroomId);

  if (!safePlayroomId) {
    return {
      success: false,
      error: "Nedostaje ID igraonice za statistiku.",
    };
  }

  try {
    const response = await api.get(
      `/playrooms/${encodeURIComponent(safePlayroomId)}/stats`,
    );

    return {
      success: true,
      data: response.data?.data || null,
    };
  } catch (error) {
    console.error("Greška pri učitavanju statistike:", error);

    return {
      success: false,
      status: error.response?.status,
      error:
        error.response?.data?.message ||
        "Greška pri učitavanju statistike igraonice.",
    };
  }
};
