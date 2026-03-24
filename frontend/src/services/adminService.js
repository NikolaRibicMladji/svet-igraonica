import api from "./api";

// Dohvati sve neverifikovane igraonice
export const getUnverifiedPlayrooms = async () => {
  try {
    const response = await api.get("/admin/playrooms/unverified");
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error("Greška:", error);
    return { success: false, error: error.response?.data?.message };
  }
};

// Verifikuj igraonicu
export const verifyPlayroom = async (id) => {
  try {
    const response = await api.put(`/playrooms/${id}/verify`);
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error("Greška:", error);
    return { success: false, error: error.response?.data?.message };
  }
};

// Dohvati sve korisnike (samo admin)
export const getAllUsers = async () => {
  try {
    const response = await api.get("/admin/users");
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error("Greška:", error);
    return { success: false, error: error.response?.data?.message };
  }
};
