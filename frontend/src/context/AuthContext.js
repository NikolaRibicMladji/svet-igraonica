import React, { createContext, useState, useEffect, useContext } from "react";
import api from "../services/api";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async () => {
    try {
      const response = await api.get("/auth/me");
      setUser(response.data.user);
    } catch (err) {
      console.error("Greška pri učitavanju korisnika:", err);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } finally {
      setLoading(false);
    }
  };

  // REGISTRACIJA - Ažurirano za accessToken
  const register = async (userData) => {
    setError(null);
    try {
      const response = await api.post("/auth/register", userData);
      // Backend sada vraća accessToken
      localStorage.setItem("token", response.data.accessToken);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      setUser(response.data.user);
      return { success: true, user: response.data.user };
    } catch (err) {
      const msg = err.response?.data?.message || "Greška pri registraciji";
      setError(msg);
      return { success: false, error: msg };
    }
  };

  // PRIJAVA - Popravljene promenljive (lozinka i res)
  const login = async (email, lozinka) => {
    // Promenjeno u lozinka da se slaže sa body-jem
    setError(null);
    try {
      const res = await api.post("/auth/login", { email, lozinka });

      localStorage.setItem("token", res.data.accessToken);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setUser(res.data.user); // Koristimo res, ne response
      return { success: true, user: res.data.user };
    } catch (err) {
      const msg = err.response?.data?.message || "Greška pri prijavi";
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout error", err);
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const value = {
    user,
    loading,
    error,
    register,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
