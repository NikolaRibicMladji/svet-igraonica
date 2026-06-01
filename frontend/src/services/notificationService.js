import api from "./api";

const normalizeId = (id) => String(id || "").trim();

const normalizePage = (page) => {
  const parsedPage = Number(page);
  return Number.isFinite(parsedPage) ? Math.max(1, Math.floor(parsedPage)) : 1;
};

const normalizeLimit = (limit) => {
  const parsedLimit = Number(limit);
  return Number.isFinite(parsedLimit)
    ? Math.min(50, Math.max(1, Math.floor(parsedLimit)))
    : 10;
};

const getErrorMessage = (error, fallbackMessage) =>
  error?.response?.data?.message || error?.message || fallbackMessage;

// USER NOTIFICATIONS

export const getMyNotifications = async ({
  page = 1,
  limit = 10,
  unreadOnly = false,
} = {}) => {
  try {
    const query = new URLSearchParams({
      page: String(normalizePage(page)),
      limit: String(normalizeLimit(limit)),
    });

    if (unreadOnly) {
      query.set("unreadOnly", "true");
    }

    const response = await api.get(`/notifications?${query.toString()}`);

    return {
      success: true,
      data: Array.isArray(response.data?.data) ? response.data.data : [],
      count: response.data?.count || 0,
      total: response.data?.total || 0,
      page: response.data?.page || 1,
      limit: response.data?.limit || limit,
      pages: response.data?.pages || 0,
    };
  } catch (error) {
    console.error("Greška pri učitavanju obaveštenja:", error);

    return {
      success: false,
      status: error.response?.status,
      error: getErrorMessage(error, "Greška pri učitavanju obaveštenja."),
    };
  }
};

export const getUnreadNotificationCount = async () => {
  try {
    const response = await api.get("/notifications/unread-count");

    return {
      success: true,
      unreadCount: Number(response.data?.unreadCount) || 0,
    };
  } catch (error) {
    console.error("Greška pri učitavanju broja obaveštenja:", error);

    return {
      success: false,
      status: error.response?.status,
      unreadCount: 0,
      error: getErrorMessage(error, "Greška pri učitavanju broja obaveštenja."),
    };
  }
};

export const markNotificationAsRead = async (id) => {
  const safeId = normalizeId(id);

  if (!safeId) {
    return {
      success: false,
      error: "Nedostaje ID obaveštenja.",
    };
  }

  try {
    const response = await api.put(
      `/notifications/${encodeURIComponent(safeId)}/read`,
    );

    return {
      success: true,
      message:
        response.data?.message || "Obaveštenje je označeno kao pročitano.",
    };
  } catch (error) {
    console.error("Greška pri označavanju obaveštenja:", error);

    return {
      success: false,
      status: error.response?.status,
      error: getErrorMessage(
        error,
        "Greška pri označavanju obaveštenja kao pročitanog.",
      ),
    };
  }
};

export const markAllNotificationsAsRead = async () => {
  try {
    const response = await api.put("/notifications/read-all");

    return {
      success: true,
      message:
        response.data?.message || "Sva obaveštenja su označena kao pročitana.",
      modifiedCount: response.data?.modifiedCount || 0,
    };
  } catch (error) {
    console.error("Greška pri označavanju svih obaveštenja:", error);

    return {
      success: false,
      status: error.response?.status,
      error: getErrorMessage(
        error,
        "Greška pri označavanju svih obaveštenja kao pročitanih.",
      ),
    };
  }
};

// ADMIN NOTIFICATIONS

export const getAdminNotifications = async ({
  page = 1,
  limit = 10,
  targetRole = "",
  priority = "",
  active = "",
} = {}) => {
  try {
    const query = new URLSearchParams({
      page: String(normalizePage(page)),
      limit: String(normalizeLimit(limit)),
    });

    if (targetRole) query.set("targetRole", targetRole);
    if (priority) query.set("priority", priority);
    if (active === true || active === false) {
      query.set("active", String(active));
    }

    const response = await api.get(`/admin/notifications?${query.toString()}`);

    return {
      success: true,
      data: Array.isArray(response.data?.data) ? response.data.data : [],
      count: response.data?.count || 0,
      total: response.data?.total || 0,
      page: response.data?.page || 1,
      limit: response.data?.limit || limit,
      pages: response.data?.pages || 0,
    };
  } catch (error) {
    console.error("Greška pri učitavanju admin obaveštenja:", error);

    return {
      success: false,
      status: error.response?.status,
      error: getErrorMessage(error, "Greška pri učitavanju obaveštenja."),
    };
  }
};

export const createAdminNotification = async ({
  title,
  message,
  targetRole,
  priority = "info",
  expiresAt = null,
}) => {
  const payload = {
    title: String(title || "").trim(),
    message: String(message || "").trim(),
    targetRole,
    priority,
  };

  if (expiresAt) {
    payload.expiresAt = expiresAt;
  }

  try {
    const response = await api.post("/admin/notifications", payload);

    return {
      success: true,
      data: response.data?.data || null,
      message: response.data?.message || "Obaveštenje je uspešno kreirano.",
    };
  } catch (error) {
    console.error("Greška pri kreiranju obaveštenja:", error);

    return {
      success: false,
      status: error.response?.status,
      error: getErrorMessage(error, "Greška pri kreiranju obaveštenja."),
    };
  }
};

export const deactivateAdminNotification = async (id) => {
  const safeId = normalizeId(id);

  if (!safeId) {
    return {
      success: false,
      error: "Nedostaje ID obaveštenja.",
    };
  }

  try {
    const response = await api.put(
      `/admin/notifications/${encodeURIComponent(safeId)}/deactivate`,
    );

    return {
      success: true,
      data: response.data?.data || null,
      message: response.data?.message || "Obaveštenje je deaktivirano.",
    };
  } catch (error) {
    console.error("Greška pri deaktiviranju obaveštenja:", error);

    return {
      success: false,
      status: error.response?.status,
      error: getErrorMessage(error, "Greška pri deaktiviranju obaveštenja."),
    };
  }
};
