import api from "./api";

const normalizeId = (id) => String(id || "").trim();

export const getUnverifiedPlayrooms = async () => {
  try {
    const response = await api.get("/admin/playrooms/unverified");

    return {
      success: true,
      data: Array.isArray(response.data?.data) ? response.data.data : [],
      count: response.data?.count || 0,
    };
  } catch (error) {
    console.error("Greška pri učitavanju neverifikovanih igraonica:", error);

    return {
      success: false,
      status: error.response?.status,
      error:
        error.response?.data?.message ||
        "Greška pri učitavanju neverifikovanih igraonica.",
    };
  }
};

export const verifyPlayroom = async (id) => {
  const safeId = normalizeId(id);

  if (!safeId) {
    return {
      success: false,
      error: "Nedostaje ID igraonice za verifikaciju.",
    };
  }

  try {
    const response = await api.put(
      `/admin/playrooms/${encodeURIComponent(safeId)}/verify`,
    );

    return {
      success: true,
      data: response.data?.data || null,
      message: response.data?.message || "Igraonica je uspešno verifikovana.",
    };
  } catch (error) {
    console.error("Greška pri verifikaciji igraonice:", error);

    return {
      success: false,
      status: error.response?.status,
      error:
        error.response?.data?.message || "Greška pri verifikaciji igraonice.",
    };
  }
};

export const rejectPlayroom = async (id, reason) => {
  const safeId = normalizeId(id);

  if (!safeId) {
    return {
      success: false,
      error: "Nedostaje ID igraonice za odbijanje.",
    };
  }

  const safeReason = String(reason || "").trim();

  if (safeReason.length < 5) {
    return {
      success: false,
      error: "Razlog odbijanja mora imati najmanje 5 karaktera.",
    };
  }

  if (safeReason.length > 500) {
    return {
      success: false,
      error: "Razlog odbijanja može imati najviše 500 karaktera.",
    };
  }

  try {
    const response = await api.put(
      `/admin/playrooms/${encodeURIComponent(safeId)}/reject`,
      {
        reason: safeReason,
      },
    );

    return {
      success: true,
      data: response.data?.data || null,
      message: response.data?.message || "Igraonica je odbijena.",
    };
  } catch (error) {
    console.error("Greška pri odbijanju igraonice:", error);

    return {
      success: false,
      status: error.response?.status,
      error: error.response?.data?.message || "Greška pri odbijanju igraonice.",
    };
  }
};

export const getAllUsers = async (page = 1, limit = 10) => {
  try {
    const parsedPage = Number(page);
    const parsedLimit = Number(limit);

    const safePage = Number.isFinite(parsedPage)
      ? Math.max(1, Math.floor(parsedPage))
      : 1;

    const safeLimit = Number.isFinite(parsedLimit)
      ? Math.min(100, Math.max(1, Math.floor(parsedLimit)))
      : 10;

    const query = new URLSearchParams({
      page: String(safePage),
      limit: String(safeLimit),
    });

    const response = await api.get(`/admin/users?${query.toString()}`);

    return {
      success: true,
      data: Array.isArray(response.data?.data) ? response.data.data : [],
      count: response.data?.count || 0,
      total: response.data?.total || 0,
      page: response.data?.page || 1,
      pages: response.data?.pages || 1,
    };
  } catch (error) {
    console.error("Greška pri učitavanju korisnika:", error);

    return {
      success: false,
      status: error.response?.status,
      error:
        error.response?.data?.message || "Greška pri učitavanju korisnika.",
    };
  }
};
