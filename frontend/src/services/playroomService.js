import api from "./api";

const normalizeId = (id) => String(id || "").trim();

const toPositiveInt = (value, fallback = 1, max = 100) => {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(1, Math.floor(numberValue)));
};

const normalizeTextParam = (value, maxLength = 100) => {
  return String(value || "")
    .trim()
    .slice(0, maxLength);
};

export const getAllPlayrooms = async (params = {}) => {
  try {
    const query = new URLSearchParams();

    if (params.page) {
      query.append("page", String(toPositiveInt(params.page, 1)));
    }

    if (params.limit) {
      query.append("limit", String(toPositiveInt(params.limit, 10, 100)));
    }

    const grad = normalizeTextParam(params.grad, 80);

    if (grad && grad !== "svi") {
      query.append("grad", grad);
    }

    if (params.minRating && params.minRating !== "sve") {
      const minRating = Number(params.minRating);

      if (Number.isFinite(minRating) && minRating >= 1 && minRating <= 5) {
        query.append("minRating", String(minRating));
      }
    }

    const allowedSortValues = ["najnovije", "rating", "naziv", "grad"];
    const sortBy = normalizeTextParam(params.sortBy, 30);

    if (allowedSortValues.includes(sortBy)) {
      query.append("sortBy", sortBy);
    }

    const search = normalizeTextParam(params.search, 80);

    if (search) {
      query.append("search", search);
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
