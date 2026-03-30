import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api", // tvoj backend URL
  withCredentials: true, // OBAVEZNO: omogućava slanje kolačića
  //baseURL = "https://svet-igraonica.onrender.com/api"; // produkcija
});

// Interceptor za zahteve: dodaje token u Header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Interceptor za odgovore: MAGIJA OSVEŽAVANJA TOKENA
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Ako je greška 401 (istekao token) i nismo već probali osvežavanje
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Pozivamo backend rutu za osvežavanje
        const res = await axios.post(
          "http://localhost:5000/api/auth/refresh",
          {},
          { withCredentials: true },
        );
        const { accessToken } = res.data;

        // Čuvamo novi token
        localStorage.setItem("accessToken", accessToken);

        // Ponovo šaljemo originalni zahtev sa novim tokenom
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Ako i refresh propadne (npr. isteklo 7 dana), izbaci korisnika
        localStorage.removeItem("accessToken");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

export default api;
