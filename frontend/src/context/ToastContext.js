import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const timersRef = useRef({});

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearTimeout);
      timersRef.current = {};
    };
  }, []);

  const removeToast = useCallback((id) => {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }

    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = "info", duration = 3000) => {
      const safeMessage = String(message || "").trim();

      if (!safeMessage) return null;

      const allowedTypes = ["success", "error", "info"];
      const safeType = allowedTypes.includes(type) ? type : "info";
      const safeDuration = Number.isFinite(Number(duration))
        ? Math.max(1000, Math.min(10000, Number(duration)))
        : 3000;

      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      setToasts((prev) => [
        ...prev.slice(-4),
        { id, message: safeMessage, type: safeType },
      ]);

      timersRef.current[id] = setTimeout(() => {
        removeToast(id);
      }, safeDuration);

      return id;
    },
    [removeToast],
  );

  const success = useCallback(
    (message, duration) => {
      showToast(message, "success", duration);
    },
    [showToast],
  );

  const error = useCallback(
    (message, duration) => {
      showToast(message, "error", duration);
    },
    [showToast],
  );

  const info = useCallback(
    (message, duration) => {
      showToast(message, "info", duration);
    },
    [showToast],
  );

  const value = useMemo(
    () => ({
      toasts,
      showToast,
      success,
      error,
      info,
      removeToast,
    }),
    [toasts, showToast, success, error, info, removeToast],
  );

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast mora da se koristi unutar ToastProvider.");
  }

  return context;
};
