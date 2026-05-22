export const getLocalDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatDateForBackend = (date) => {
  if (!date) return "";

  if (typeof date === "string") {
    return date;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const formatDateShortLat = (date) => {
  if (!date) return "";

  return new Intl.DateTimeFormat("sr-Latn-RS", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
};

export const formatDateLat = (date) => {
  if (!date) return "";

  return new Intl.DateTimeFormat("sr-Latn-RS", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
};

export const timeToMinutes = (time) => {
  const [h, m] = String(time || "00:00")
    .split(":")
    .map(Number);

  return h * 60 + m;
};

export const minutesToTime = (minutes) => {
  const safeMinutes = Math.max(0, Number(minutes) || 0);
  const hour = Math.floor(safeMinutes / 60);
  const minute = safeMinutes % 60;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

export const getSlotDurationHours = (startTime, endTime) => {
  if (!startTime || !endTime) return 1;

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const diff = endMinutes - startMinutes;

  if (!Number.isFinite(diff) || diff <= 0) return 1;

  return diff / 60;
};

export const getSlotDurationLabel = (startTime, endTime) => {
  if (!startTime || !endTime) return "";

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const diff = endMinutes - startMinutes;

  if (!Number.isFinite(diff) || diff <= 0) return "";

  const sati = Math.floor(diff / 60);
  const minuti = diff % 60;

  if (sati > 0 && minuti > 0) {
    return `${sati}h ${minuti}min`;
  }

  if (sati > 0) {
    return `${sati}h`;
  }

  return `${minuti}min`;
};

export const isQuarterHour = (time) => {
  const [h, m] = String(time || "00:00")
    .split(":")
    .map(Number);

  if (!Number.isFinite(h) || !Number.isFinite(m)) return false;

  return [0, 15, 30, 45].includes(m);
};

export const generateQuarterHourOptions = (startTime, endTime) => {
  if (!startTime || !endTime) return [];

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  const options = [];

  for (let current = startMinutes; current <= endMinutes; current += 15) {
    const hours = String(Math.floor(current / 60)).padStart(2, "0");
    const minutes = String(current % 60).padStart(2, "0");
    options.push(`${hours}:${minutes}`);
  }

  return options;
};

export const isPastSlotTime = (time, selectedDate) => {
  if (!selectedDate) return false;

  const today = new Date();
  const todayString = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  if (selectedDate !== todayString) return false;

  const [year, month, day] = selectedDate.split("-").map(Number);
  const [hours, minutes] = String(time || "00:00")
    .split(":")
    .map(Number);

  const slotDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

  return slotDate <= today;
};
