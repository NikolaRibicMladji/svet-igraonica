import React, { createContext, useState, useEffect, useContext } from "react";
import api from "../services/api";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Proveri da li je korisnik već prijavljen (pri učitavanju)
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  // Učitaj podatke o korisniku
  const loadUser = async () => {
    try {
      const response = await api.get("/auth/me");
      setUser(response.data.user);
    } catch (err) {
      console.error("Greška pri učitavanju korisnika:", err);
      localStorage.removeItem("token");
    } finally {
      setLoading(false);
    }
  };

  // Registracija
  const register = async (userData) => {
    setError(null);
    try {
      const response = await api.post("/auth/register", userData);
      localStorage.setItem("token", response.data.token);
      setUser(response.data.user);
      return { success: true, user: response.data.user };
    } catch (err) {
      setError(err.response?.data?.message || "Greška pri registraciji");
      return { success: false, error: err.response?.data?.message };
    }
  };

  // Prijava
  const login = async (email, password) => {
    setError(null);
    try {
      const response = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", response.data.token);
      setUser(response.data.user);
      return { success: true, user: response.data.user };
    } catch (err) {
      setError(err.response?.data?.message || "Greška pri prijavi");
      return { success: false, error: err.response?.data?.message };
    }
  };

  // Odjava
  const logout = () => {
    localStorage.removeItem("token");
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
