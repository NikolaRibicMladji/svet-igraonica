const { toZonedTime, fromZonedTime, formatInTimeZone } = require("date-fns-tz");

const APP_TIMEZONE = process.env.APP_TIMEZONE || "Europe/Belgrade";

const parseTimeString = (time) => {
  const [hour, minute] = String(time || "00:00")
    .split(":")
    .map((v) => parseInt(v, 10));

  return {
    hour: Number.isFinite(hour) ? hour : 0,
    minute: Number.isFinite(minute) ? minute : 0,
  };
};

const getNowInAppTimezone = () => {
  return toZonedTime(new Date(), APP_TIMEZONE);
};

const formatDateOnlyInAppTimezone = (date) => {
  return formatInTimeZone(date, APP_TIMEZONE, "yyyy-MM-dd");
};

const startOfDayInAppTimezone = (dateInput) => {
  const dateOnly = formatDateOnlyInAppTimezone(dateInput);
  return fromZonedTime(`${dateOnly}T00:00:00`, APP_TIMEZONE);
};

const endOfDayInAppTimezone = (dateInput) => {
  const dateOnly = formatDateOnlyInAppTimezone(dateInput);
  return fromZonedTime(`${dateOnly}T23:59:59.999`, APP_TIMEZONE);
};

const buildDateTimeInAppTimezone = (dateInput, time) => {
  const dateOnly = formatDateOnlyInAppTimezone(dateInput);
  const { hour, minute } = parseTimeString(time);

  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");

  return fromZonedTime(`${dateOnly}T${hh}:${mm}:00`, APP_TIMEZONE);
};

const parseDateOnlyInAppTimezone = (dateString) => {
  if (!dateString || typeof dateString !== "string") {
    throw new Error("Datum nije validan");
  }

  const trimmed = dateString.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error("Datum nije validan");
  }

  return fromZonedTime(`${trimmed}T00:00:00`, APP_TIMEZONE);
};

module.exports = {
  APP_TIMEZONE,
  parseTimeString,
  getNowInAppTimezone,
  formatDateOnlyInAppTimezone,
  startOfDayInAppTimezone,
  endOfDayInAppTimezone,
  buildDateTimeInAppTimezone,
  parseDateOnlyInAppTimezone,
};
