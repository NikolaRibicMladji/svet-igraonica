import api from "./api";

const normalizeId = (id) => String(id || "").trim();

export const getReviews = async (playroomId, page = 1, limit = 10) => {
  const safePlayroomId = normalizeId(playroomId);

  if (!safePlayroomId) {
    return {
      success: false,
      error: "Nedostaje ID igraonice za recenzije.",
    };
  }

  try {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));

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

export const addReview = async (playroomId, rating, comment) => {
  const safePlayroomId = normalizeId(playroomId);

  if (!safePlayroomId) {
    return {
      success: false,
      error: "Nedostaje ID igraonice za dodavanje recenzije.",
    };
  }

  const safeRating = Number(rating);
  const safeComment = String(comment || "").trim();

  if (!Number.isFinite(safeRating) || safeRating < 1 || safeRating > 5) {
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
        rating: safeRating,
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
