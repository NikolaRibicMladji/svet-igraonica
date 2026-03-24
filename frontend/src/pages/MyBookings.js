import React, { useState, useEffect } from "react";
import { getMyBookings, cancelBooking } from "../services/bookingService";
import "../styles/MyBookings.css";

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setLoading(true);
    const result = await getMyBookings();
    if (result.success) {
      setBookings(result.data);
    }
    setLoading(false);
  };

  const handleCancel = async (id) => {
    if (
      window.confirm("Da li ste sigurni da želite da otkažete ovu rezervaciju?")
    ) {
      const result = await cancelBooking(id);
      if (result.success) {
        loadBookings();
      } else {
        alert(result.error);
      }
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      cekiranje: { text: "Čeka potvrdu", class: "status-pending" },
      potvrdjeno: { text: "Potvrđeno", class: "status-confirmed" },
      otkazano: { text: "Otkazano", class: "status-cancelled" },
      zavrseno: { text: "Završeno", class: "status-completed" },
    };
    return statusMap[status] || { text: status, class: "" };
  };

  if (loading) {
    return <div className="container loading">Učitavanje...</div>;
  }

  return (
    <div className="container my-bookings-page">
      <h1>Moje rezervacije</h1>

      {bookings.length === 0 ? (
        <div className="empty-state">
          <p>Još nemate nijednu rezervaciju.</p>
          <button
            className="btn-primary"
            onClick={() => (window.location.href = "/playrooms")}
          >
            Pogledaj igraonice
          </button>
        </div>
      ) : (
        <div className="bookings-list">
          {bookings.map((booking) => {
            const status = getStatusText(booking.status);
            const slot = booking.timeSlotId;
            return (
              <div key={booking._id} className="booking-card">
                <div className="booking-header">
                  <h3>{booking.playroomId?.naziv}</h3>
                  <span className={`status-badge ${status.class}`}>
                    {status.text}
                  </span>
                </div>
                <div className="booking-details">
                  <p>
                    📍 {booking.playroomId?.adresa}, {booking.playroomId?.grad}
                  </p>
                  {slot && (
                    <>
                      <p>
                        📅 Datum:{" "}
                        {new Date(slot.datum).toLocaleDateString("sr-RS")}
                      </p>
                      <p>
                        ⏰ Vreme: {slot.vremeOd} - {slot.vremeDo}
                      </p>
                    </>
                  )}
                  <p>👶 Broj dece: {booking.brojDece}</p>
                  <p>💰 Ukupno: {booking.ukupnaCena} RSD</p>
                  {booking.napomena && <p>📝 Napomena: {booking.napomena}</p>}
                </div>
                {booking.status === "cekiranje" && (
                  <button
                    className="btn-cancel"
                    onClick={() => handleCancel(booking._id)}
                  >
                    Otkaži rezervaciju
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyBookings;
