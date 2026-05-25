const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const parseLocalDate = (date) => {
  if (!date) return null;

  if (date instanceof Date && !Number.isNaN(date.getTime())) {
    return date;
  }

  if (typeof date === "string" && DATE_REGEX.test(date)) {
    const [year, month, day] = date.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getLocalDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatDateForBackend = (date) => {
  if (!date) return "";

  if (typeof date === "string" && DATE_REGEX.test(date)) {
    return date;
  }

  const parsedDate = parseLocalDate(date);

  if (!parsedDate) return "";

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const formatDateShortLat = (date) => {
  const parsedDate = parseLocalDate(date);

  if (!parsedDate) return "";

  return new Intl.DateTimeFormat("sr-Latn-RS", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsedDate);
};

export const formatDateLat = (date) => {
  const parsedDate = parseLocalDate(date);

  if (!parsedDate) return "";

  return new Intl.DateTimeFormat("sr-Latn-RS", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsedDate);
};

export const timeToMinutes = (time) => {
  const safeTime = String(time || "").trim();

  if (!TIME_REGEX.test(safeTime)) {
    return 0;
  }

  const [h, m] = safeTime.split(":").map(Number);

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
  const safeTime = String(time || "").trim();

  if (!TIME_REGEX.test(safeTime)) {
    return false;
  }

  const [, minute] = safeTime.split(":").map(Number);

  return [0, 15, 30, 45].includes(minute);
};

export const generateQuarterHourOptions = (startTime, endTime) => {
  if (!startTime || !endTime) return [];

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  if (endMinutes < startMinutes) return [];

  const options = [];

  for (let current = startMinutes; current <= endMinutes; current += 15) {
    const hours = String(Math.floor(current / 60)).padStart(2, "0");
    const minutes = String(current % 60).padStart(2, "0");
    options.push(`${hours}:${minutes}`);
  }

  return options;
};

export const isPastSlotTime = (time, selectedDate) => {
  if (!selectedDate || !TIME_REGEX.test(String(time || "").trim())) {
    return false;
  }

  const today = new Date();
  const todayString = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  if (selectedDate !== todayString) return false;

  const [year, month, day] = selectedDate.split("-").map(Number);
  const [hours, minutes] = String(time).split(":").map(Number);

  const slotDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

  return slotDate <= today;
};
