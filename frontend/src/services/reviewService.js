import api from "./api";

const normalizeId = (id) => String(id || "").trim();

const toPositiveInt = (value, fallback = 1, max = 50) => {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(1, Math.floor(numberValue)));
};

export const getReviews = async (playroomId, page = 1, limit = 10) => {
  const safePlayroomId = normalizeId(playroomId);

  if (!safePlayroomId) {
    return {
      success: false,
      error: "Nedostaje ID igraonice za recenzije.",
    };
  }

  try {
    const safePage = toPositiveInt(page, 1, 1000);
    const safeLimit = toPositiveInt(limit, 10, 50);

    const query = new URLSearchParams({
      page: String(safePage),
      limit: String(safeLimit),
    });

    const response = await api.get(
      `/reviews/${encodeURIComponent(safePlayroomId)}?${query.toString()}`,
    );

    return {
      success: true,
      data: Array.isArray(response.data?.data) ? response.data.data : [],
      total: response.data?.total || 0,
      page: response.data?.page || safePage,
      pages: response.data?.pages || 1,
    };
  } catch (error) {
    console.error("Greška pri dohvatanju recenzija:", error);

    return {
      success: false,
      status: error.response?.status,
      error:
        error.response?.data?.message || "Greška pri učitavanju recenzija.",
    };
  }
};

export const getMyReviewStatus = async (playroomId) => {
  const safePlayroomId = normalizeId(playroomId);

  if (!safePlayroomId) {
    return {
      success: false,
      error: "Nedostaje ID igraonice za proveru recenzije.",
    };
  }

  try {
    const response = await api.get(
      `/reviews/${encodeURIComponent(safePlayroomId)}/my-status`,
    );

    return {
      success: true,
      data: response.data?.data || null,
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status,
      error:
        error.response?.data?.message ||
        "Greška pri proveri prava za recenziju.",
    };
  }
};

export const addReview = async (playroomId, rating, comment) => {
  const safePlayroomId = normalizeId(playroomId);

  if (!safePlayroomId) {
    return {
      success: false,
      error: "Nedostaje ID igraonice za dodavanje recenzije.",
    };
  }

  const safeRating = Number(rating);
  const normalizedRating = Number.isFinite(safeRating)
    ? Math.floor(safeRating)
    : 0;
  const safeComment = String(comment || "").trim();

  if (normalizedRating < 1 || normalizedRating > 5) {
    return {
      success: false,
      error: "Ocena mora biti između 1 i 5.",
    };
  }

  if (!safeComment) {
    return {
      success: false,
      error: "Komentar je obavezan.",
    };
  }

  if (safeComment.length > 500) {
    return {
      success: false,
      error: "Komentar ne sme imati više od 500 karaktera.",
    };
  }

  try {
    const response = await api.post(
      `/reviews/${encodeURIComponent(safePlayroomId)}`,
      {
        rating: normalizedRating,
        comment: safeComment,
      },
    );

    return {
      success: true,
      data: response.data?.data || null,
      message: response.data?.message || "Recenzija je uspešno dodata.",
    };
  } catch (error) {
    console.error("Greška pri dodavanju recenzije:", error);

    return {
      success: false,
      status: error.response?.status,
      error: error.response?.data?.message || "Greška pri dodavanju recenzije.",
    };
  }
};

export const deleteReview = async (id) => {
  const safeId = normalizeId(id);

  if (!safeId) {
    return {
      success: false,
      error: "Nedostaje ID recenzije za brisanje.",
    };
  }

  try {
    const response = await api.delete(`/reviews/${encodeURIComponent(safeId)}`);

    return {
      success: true,
      message: response.data?.message || "Recenzija je uspešno obrisana.",
    };
  } catch (error) {
    console.error("Greška pri brisanju recenzije:", error);

    return {
      success: false,
      status: error.response?.status,
      error: error.response?.data?.message || "Greška pri brisanju recenzije.",
    };
  }
};
