import React, { useEffect, useMemo, useState } from "react";
import "../styles/PlayroomFilters.css";
import { getFilterCities } from "../services/playroomService";
import { normalizeText } from "../utils/normalizeText";

const DEFAULT_FILTERS = {
  grad: "svi",
  minRating: "sve",
  sortBy: "newest",
};

const PlayroomFilters = ({ onFilterChange, initialFilters = {} }) => {
  const mergedInitialFilters = useMemo(
    () => ({
      ...DEFAULT_FILTERS,
      ...initialFilters,
    }),
    [initialFilters],
  );

  const [tempFilters, setTempFilters] = useState(mergedInitialFilters);
  const [isExpanded, setIsExpanded] = useState(false);
  const [gradovi, setGradovi] = useState([
    { value: "svi", label: "Svi gradovi" },
  ]);

  useEffect(() => {
    setTempFilters(mergedInitialFilters);
  }, [mergedInitialFilters]);

  useEffect(() => {
    const loadCities = async () => {
      try {
        const result = await getFilterCities();

        if (result?.success && Array.isArray(result.data)) {
          setGradovi([
            { value: "svi", label: "Svi gradovi" },
            ...result.data.map((city) => ({
              value: normalizeText(city),
              label: city,
            })),
          ]);
        }
      } catch (error) {
        console.error("Greška pri učitavanju gradova za filter:", error);
      }
    };

    loadCities();
  }, []);

  const ocene = [
    { value: "sve", label: "Sve ocene" },
    { value: "4", label: "⭐ 4+" },
    { value: "3", label: "⭐⭐ 3+" },
    { value: "2", label: "⭐⭐⭐ 2+" },
  ];

  const sortOpcije = [
    { value: "newest", label: "🆕 Najnovije prvo" },
    { value: "rating", label: "⭐ Najbolje ocenjene" },
    { value: "price_asc", label: "💰 Cena rastuće" },
    { value: "price_desc", label: "💰 Cena opadajuće" },
  ];

  const handleTempChange = (key, value) => {
    setTempFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleApply = () => {
    onFilterChange?.({
      ...tempFilters,

      minRating:
        tempFilters.minRating === "sve" ? "sve" : Number(tempFilters.minRating),
    });
  };

  const handleReset = () => {
    setTempFilters(DEFAULT_FILTERS);
    onFilterChange?.(DEFAULT_FILTERS);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (tempFilters.grad !== "svi") count++;
    if (tempFilters.minRating !== "sve") count++;
    if (tempFilters.sortBy !== "newest") count++;
    return count;
  }, [tempFilters]);

  return (
    <div className="filters-container">
      <div className="filters-header">
        <button
          type="button"
          className="filters-title"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
        >
          <span className="filter-icon">🔍</span>
          <span>Filteri</span>
          {activeFiltersCount > 0 && (
            <span className="filter-badge">{activeFiltersCount}</span>
          )}
          <span className={`expand-icon ${isExpanded ? "expanded" : ""}`}>
            ▼
          </span>
        </button>

        {activeFiltersCount > 0 && (
          <button type="button" className="reset-filters" onClick={handleReset}>
            ✖ Resetuj sve
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="filters-content">
          <div className="filter-group">
            <label className="filter-label">📊 Sortiraj po</label>
            <div className="sort-buttons">
              {sortOpcije.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`sort-btn ${
                    tempFilters.sortBy === option.value ? "active" : ""
                  }`}
                  onClick={() => handleTempChange("sortBy", option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filters-row">
            <div className="filter-group">
              <label className="filter-label" htmlFor="filter-grad">
                📍 Grad
              </label>
              <select
                id="filter-grad"
                value={tempFilters.grad}
                onChange={(e) => handleTempChange("grad", e.target.value)}
                className="filter-select"
              >
                {gradovi.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label" htmlFor="filter-ocena">
                ⭐ Ocena
              </label>
              <select
                id="filter-ocena"
                value={String(tempFilters.minRating)}
                onChange={(e) => handleTempChange("minRating", e.target.value)}
                className="filter-select"
              >
                {ocene.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-actions">
            <button type="button" className="btn-apply" onClick={handleApply}>
              ✅ Primeni filtere
            </button>
            <button
              type="button"
              className="btn-cancel-filters"
              onClick={() => setIsExpanded(false)}
            >
              ✖ Zatvori
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayroomFilters;
