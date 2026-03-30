import React, { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import "../styles/OwnerDashboard.css"; // Napravićemo i ovaj CSS

const OwnerDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Tvoja ruta za dobijanje podataka o sopstvenoj igraonici
        const resPlayroom = await api.get("/playrooms/moja");
        const playroomId = resPlayroom.data._id;

        // Statistika koju smo dodali na backend
        const resStats = await api.get(`/playrooms/${playroomId}/stats`);
        setStats(resStats.data.data);
      } catch (err) {
        console.error("Greška pri učitavanju statistike:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading)
    return <div className="loading-container">⏳ Učitavanje podataka...</div>;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h2>Zdravo, {user?.ime} 👋</h2>
        <p className="playroom-name">📍 {stats?.playroomName}</p>
      </header>

      <div className="stats-grid">
        <div className="stat-card blue">
          <span className="stat-icon">📊</span>
          <div className="stat-info">
            <h3>{stats?.totalBookings}</h3>
            <p>Ukupno zahteva</p>
          </div>
        </div>

        <div className="stat-card green">
          <span className="stat-icon">✅</span>
          <div className="stat-info">
            <h3>{stats?.confirmedBookings}</h3>
            <p>Potvrđeno</p>
          </div>
        </div>

        <div className="stat-card gold">
          <span className="stat-icon">💰</span>
          <div className="stat-info">
            <h3>{stats?.totalRevenue?.toLocaleString()} RSD</h3>
            <p>Zarada</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;
