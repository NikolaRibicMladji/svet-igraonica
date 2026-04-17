import api from "./api";

export const getUnverifiedPlayrooms = async () => {
  try {
    const response = await api.get("/admin/playrooms/unverified");

    return {
      success: true,
      data: response.data?.data || [],
      count: response.data?.count || 0,
    };
  } catch (error) {
    console.error("Greška pri učitavanju neverifikovanih igraonica:", error);

    return {
      success: false,
      error:
        error.response?.data?.message ||
        "Greška pri učitavanju neverifikovanih igraonica.",
    };
  }
};

export const verifyPlayroom = async (id) => {
  try {
    const response = await api.put(`/admin/playrooms/${id}/verify`);

    return {
      success: true,
      data: response.data?.data || null,
      message: response.data?.message || "Igraonica je uspešno verifikovana.",
    };
  } catch (error) {
    console.error("Greška pri verifikaciji igraonice:", error);

    return {
      success: false,
      error:
        error.response?.data?.message || "Greška pri verifikaciji igraonice.",
    };
  }
};

export const getAllUsers = async (page = 1, limit = 10) => {
  try {
    const response = await api.get(`/admin/users?page=${page}&limit=${limit}`);

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
      error:
        error.response?.data?.message || "Greška pri učitavanju korisnika.",
    };
  }
};
