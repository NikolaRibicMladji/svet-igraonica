import React, { useCallback, useEffect, useState } from "react";
import { addReview, deleteReview, getReviews } from "../services/reviewService";
import { useAuth } from "../context/AuthContext";
import "../styles/Reviews.css";
import api from "../services/api";
import { useToast } from "../context/ToastContext";

const REVIEWS_PER_PAGE = 10;

const Reviews = ({ playroomId }) => {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [canReview, setCanReview] = useState(false);

  const loadReviews = useCallback(async () => {
    setLoading(true);

    try {
      const result = await getReviews(playroomId, page);

      if (result?.success) {
        setReviews(Array.isArray(result.data) ? result.data : []);
        setTotal(Number(result.total) || 0);
      } else {
        setReviews([]);
        setTotal(0);
        toast.error(result?.error || "Greška pri učitavanju recenzija.");
      }
    } catch (err) {
      setReviews([]);
      setTotal(0);

      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Greška pri učitavanju recenzija.";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [playroomId, page, toast]);

  const checkIfUserCanReview = useCallback(async () => {
    try {
      const [reviewsResult, bookingsRes] = await Promise.all([
        getReviews(playroomId, 1),
        api.get("/bookings/my"),
      ]);

      const reviewList = reviewsResult?.success
        ? Array.isArray(reviewsResult.data)
          ? reviewsResult.data
          : []
        : [];

      const bookingList = bookingsRes?.data?.success
        ? Array.isArray(bookingsRes.data.data)
          ? bookingsRes.data.data
          : []
        : [];

      const hasCompleted = bookingList.some(
        (b) =>
          (typeof b.playroomId === "object"
            ? b.playroomId?._id
            : b.playroomId) === playroomId && b.status === "zavrseno",
      );

      const hasReview = reviewList.some(
        (r) =>
          (typeof r.userId === "object" ? r.userId?._id : r.userId) ===
          user?.id,
      );

      setCanReview(hasCompleted && !hasReview);
    } catch (err) {
      console.error("Greška pri proveri review prava:", err);
      setCanReview(false);
    }
  }, [playroomId, user?.id]);

  useEffect(() => {
    if (!playroomId) return;
    loadReviews();
  }, [playroomId, page, loadReviews]);

  useEffect(() => {
    if (!playroomId) return;

    if (isAuthenticated && user?.role === "roditelj") {
      checkIfUserCanReview();
    } else {
      setCanReview(false);
    }
  }, [playroomId, isAuthenticated, user?.role, checkIfUserCanReview]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!isAuthenticated) {
      toast.error("Morate biti prijavljeni da biste ostavili recenziju.");
      return;
    }

    if (user?.role !== "roditelj" && user?.role !== "admin") {
      toast.error("Samo roditelj može da ostavi recenziju.");
      return;
    }

    if (!comment.trim()) {
      toast.error("Komentar je obavezan.");
      return;
    }

    setSubmitting(true);

    try {
      const result = await addReview(playroomId, rating, comment.trim());

      if (result?.success) {
        toast.success("Recenzija je uspešno dodata.");
        setComment("");
        setRating(5);
        setPage(1);
        await loadReviews();
        setCanReview(false);
      } else {
        toast.error(result?.error || "Dodavanje recenzije nije uspelo.");
      }
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Dodavanje recenzije nije uspelo.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (deletingId) return;
    const confirmed = window.confirm(
      "Da li ste sigurni da želite da obrišete ovu recenziju?",
    );

    if (!confirmed) return;

    setDeletingId(id);

    try {
      const result = await deleteReview(id);

      if (result?.success) {
        toast.success("Recenzija je uspešno obrisana.");
        if (reviews.length === 1 && page > 1) {
          setPage((prev) => prev - 1);
        } else {
          await loadReviews();
          setCanReview(true);
        }
      } else {
        toast.error(result?.error || "Brisanje recenzije nije uspelo.");
      }
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Brisanje recenzije nije uspelo.";
      toast.error(message);
    } finally {
      setDeletingId("");
    }
  };

  const renderStars = (value, interactive = false) =>
    [...Array(5)].map((_, i) => (
      <button
        key={i}
        type="button"
        className={`star ${i < value ? "filled" : ""} ${
          interactive ? "interactive" : ""
        }`}
        onClick={() => interactive && setRating(i + 1)}
        disabled={!interactive}
        aria-label={`${i + 1} zvezdica`}
      >
        ★
      </button>
    ));

  const totalPages = Math.max(1, Math.ceil(total / REVIEWS_PER_PAGE));

  if (!playroomId) {
    return null;
  }

  if (loading && page === 1) {
    return <div className="reviews-loading">Učitavanje recenzija...</div>;
  }

  return (
    <div className="reviews-section" id="reviews-section">
      <div className="reviews-header">
        <h3>⭐ Recenzije ({total})</h3>
      </div>

      {isAuthenticated && (user?.role === "admin" || canReview) && (
        <div className="review-form">
          <h4>Ostavite vašu recenziju</h4>

          <form onSubmit={handleSubmit}>
            <div className="rating-input">
              <label>Vaša ocena:</label>
              <div className="stars">{renderStars(rating, true)}</div>
            </div>

            <div className="comment-input">
              <textarea
                rows="4"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Podelite vaše iskustvo sa ovom igraonicom..."
                required
                maxLength={500}
              />
            </div>

            <button type="submit" className="btn-submit" disabled={submitting}>
              {submitting ? "Slanje..." : "📝 Ostavi recenziju"}
            </button>
          </form>
        </div>
      )}

      {isAuthenticated && user?.role === "roditelj" && !canReview && (
        <div className="info-message">
          Recenziju možete ostaviti tek nakon završene rezervacije za ovu
          igraonicu.
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="no-reviews">
          <p>Još nema recenzija. Budite prvi koji će ostaviti utisak.</p>
        </div>
      ) : (
        <div className="reviews-list">
          {reviews.map((review) => {
            const reviewUserId =
              typeof review.userId === "object"
                ? review.userId?._id
                : review.userId;

            return (
              <div key={review._id} className="review-card">
                <div className="review-header">
                  <div className="reviewer-info">
                    <span className="reviewer-name">
                      👤 {review.userName || "Nepoznat korisnik"}
                    </span>
                    <span className="review-date">
                      {review.createdAt
                        ? new Date(review.createdAt).toLocaleDateString("sr-RS")
                        : "-"}
                    </span>
                  </div>

                  <div className="review-rating">
                    {renderStars(Number(review.rating) || 0)}
                  </div>
                </div>

                <div className="review-comment">
                  <p>{review.comment || ""}</p>
                </div>

                {(user?.role === "admin" || user?.id === reviewUserId) && (
                  <button
                    type="button"
                    className="btn-delete-review"
                    onClick={() => handleDelete(review._id)}
                    disabled={deletingId === review._id}
                  >
                    {deletingId === review._id ? "Brisanje..." : "🗑 Obriši"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1}
            className="btn-page"
          >
            ← Prethodna
          </button>

          <span className="page-info">
            Strana {page} od {totalPages}
          </span>

          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages}
            className="btn-page"
          >
            Sledeća →
          </button>
        </div>
      )}
    </div>
  );
};

export default Reviews;
