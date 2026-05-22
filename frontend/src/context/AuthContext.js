import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import api, {
  clearAccessToken,
  setAccessToken,
  setUnauthorizedHandler,
} from "../services/api";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const extractAuthPayload = (response) => {
  const payload =
    response?.data?.accessToken || response?.data?.user
      ? response.data
      : response;

  return payload?.data?.accessToken || payload?.data?.user
    ? payload.data
    : payload;
};

const extractUserFromMeResponse = (response) =>
  response?.data?.user ||
  response?.data?.data?.user ||
  response?.data?.data ||
  null;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const clearAuthData = useCallback(() => {
    clearAccessToken();
    setUser(null);
    setError(null);
  }, []);

  const setAuthData = useCallback((userData, token) => {
    if (token) {
      setAccessToken(token);
    }

    if (userData) {
      setUser(userData);
    }
  }, []);

  const loadUser = useCallback(async () => {
    try {
      const response = await api.get("/auth/me");
      const loadedUser = extractUserFromMeResponse(response);

      if (loadedUser) {
        setUser(loadedUser);
        return loadedUser;
      }

      clearAuthData();
      return null;
    } catch (err) {
      console.error("Greška pri učitavanju korisnika:", err);
      clearAuthData();
      return null;
    } finally {
      setLoading(false);
    }
  }, [clearAuthData]);

  const restoreSession = useCallback(async () => {
    setLoading(true);

    try {
      const refreshResponse = await api.post("/auth/refresh");
      const authData = extractAuthPayload(refreshResponse);

      const token = authData?.accessToken || authData?.token || null;

      if (!token) {
        clearAuthData();
        return null;
      }

      setAccessToken(token);

      if (authData?.user) {
        setUser(authData.user);
        return authData.user;
      }

      const meResponse = await api.get("/auth/me");
      const loadedUser = extractUserFromMeResponse(meResponse);

      if (loadedUser) {
        setUser(loadedUser);
        return loadedUser;
      }

      clearAuthData();
      return null;
    } catch {
      clearAuthData();
      return null;
    } finally {
      setLoading(false);
    }
  }, [clearAuthData]);

  useEffect(() => {
    const removeUnauthorizedHandler = setUnauthorizedHandler(() => {
      clearAuthData();
    });

    restoreSession();

    return removeUnauthorizedHandler;
  }, [clearAuthData, restoreSession]);

  const handleAuthSuccess = useCallback(
    (response, fallbackUserData = null) => {
      const authData = extractAuthPayload(response);

      const token = authData?.accessToken || authData?.token || null;
      const userDataRes = authData?.user
        ? {
            ...authData.user,
            email: authData.user.email || fallbackUserData?.email || "",
          }
        : null;

      if (!token || !userDataRes) {
        const message = "Nije moguće sačuvati prijavu korisnika.";
        console.error("handleAuthSuccess: nedostaju token ili user", response);
        setError(message);

        return {
          success: false,
          error: message,
        };
      }

      setAuthData(userDataRes, token);

      return { success: true, user: userDataRes };
    },
    [setAuthData],
  );

  const handleAuthError = useCallback((err, fallbackMessage) => {
    const msg = err?.response?.data?.message || fallbackMessage;
    setError(msg);
    return { success: false, error: msg };
  }, []);

  const register = useCallback(
    async (userData) => {
      setError(null);

      try {
        const pendingEmail = userData?.email?.trim().toLowerCase();

        const response = await api.post("/auth/register", {
          ...userData,
          email: pendingEmail,
        });

        if (pendingEmail) {
          localStorage.setItem("pendingVerificationEmail", pendingEmail);
        }

        return {
          success: true,
          message:
            response?.data?.message ||
            "Proverite email adresu radi potvrde naloga.",
          user: response?.data?.user || null,
        };
      } catch (err) {
        return handleAuthError(err, "Greška pri registraciji.");
      }
    },
    [handleAuthError],
  );

  const login = useCallback(
    async (email, password) => {
      setError(null);

      try {
        const response = await api.post("/auth/login", {
          email: String(email || "")
            .trim()
            .toLowerCase(),
          password,
        });

        return handleAuthSuccess(response);
      } catch (err) {
        return handleAuthError(err, "Greška pri prijavi.");
      }
    },
    [handleAuthError, handleAuthSuccess],
  );

  const resendVerificationEmail = useCallback(
    async (email) => {
      setError(null);

      try {
        const response = await api.post("/auth/resend-verification", {
          email: String(email || "")
            .trim()
            .toLowerCase(),
        });

        return {
          success: true,
          message:
            response?.data?.message ||
            "Ako nalog postoji i nije potvrđen, poslali smo novi email.",
        };
      } catch (err) {
        return handleAuthError(err, "Greška pri slanju verifikacionog emaila.");
      }
    },
    [handleAuthError],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      clearAuthData();
    }
  }, [clearAuthData]);

  const changePassword = useCallback(
    async (payload) => {
      setError(null);

      try {
        const response = await api.put("/auth/change-password", payload);
        clearAuthData();

        return {
          success: true,
          message: response.data?.message || "Lozinka je promenjena.",
        };
      } catch (err) {
        return handleAuthError(err, "Greška pri promeni lozinke.");
      }
    },
    [clearAuthData, handleAuthError],
  );

  const changeEmail = useCallback(
    async (payload) => {
      setError(null);

      try {
        const response = await api.put("/auth/change-email", payload);
        clearAuthData();

        return {
          success: true,
          message: response.data?.message || "Email je promenjen.",
        };
      } catch (err) {
        return handleAuthError(err, "Greška pri promeni emaila.");
      }
    },
    [clearAuthData, handleAuthError],
  );

  const deleteAccount = useCallback(
    async (payload) => {
      setError(null);

      try {
        const response = await api.delete("/auth/delete-account", {
          data: payload,
        });

        clearAuthData();

        return {
          success: true,
          message: response.data?.message || "Nalog je obrisan.",
        };
      } catch (err) {
        return handleAuthError(err, "Greška pri brisanju naloga.");
      }
    },
    [clearAuthData, handleAuthError],
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      register,
      login,
      resendVerificationEmail,
      logout,
      changePassword,
      changeEmail,
      deleteAccount,
      loadUser,
      restoreSession,
      handleAuthSuccess,
      isAuthenticated: Boolean(user),
    }),
    [
      user,
      loading,
      error,
      register,
      login,
      resendVerificationEmail,
      logout,
      changePassword,
      changeEmail,
      deleteAccount,
      loadUser,
      restoreSession,
      handleAuthSuccess,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
