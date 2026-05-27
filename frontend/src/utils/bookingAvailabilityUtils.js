import {
  generateQuarterHourOptions,
  isPastSlotTime,
  minutesToTime,
  timeToMinutes,
} from "./bookingUtils";

const isValidInterval = (start, end) => {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  return endMinutes > startMinutes;
};

export const doesOverlapBusyInterval = (availability, start, end) => {
  if (!isValidInterval(start, end)) {
    return true;
  }

  const busyIntervals = Array.isArray(availability?.busyIntervals)
    ? availability.busyIntervals
    : [];

  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  return busyIntervals.some((interval) => {
    const busyStart = timeToMinutes(interval.vremeOd);
    const busyEnd = timeToMinutes(interval.vremeDo);

    return startMinutes < busyEnd && endMinutes > busyStart;
  });
};

export const buildAvailabilitySegments = (availability) => {
  if (!availability?.workingHours) return [];

  if (availability?.mode === "fleksibilno") {
    const freeIntervals = Array.isArray(availability?.freeIntervals)
      ? availability.freeIntervals
      : [];

    return freeIntervals
      .filter(
        (interval) =>
          interval?.vremeOd &&
          interval?.vremeDo &&
          timeToMinutes(interval.vremeDo) > timeToMinutes(interval.vremeOd),
      )
      .map((interval) => ({
        tip: "slobodno",
        vremeOd: interval.vremeOd,
        vremeDo: interval.vremeDo,
      }));
  }

  const workingStart = timeToMinutes(availability.workingHours.vremeOd);
  const workingEnd = timeToMinutes(availability.workingHours.vremeDo);

  const busyIntervals = Array.isArray(availability?.busyIntervals)
    ? [...availability.busyIntervals].sort(
        (a, b) => timeToMinutes(a.vremeOd) - timeToMinutes(b.vremeOd),
      )
    : [];

  const segments = [];
  let cursor = workingStart;

  for (const interval of busyIntervals) {
    const busyStart = timeToMinutes(interval.vremeOd);
    const busyEnd = timeToMinutes(interval.vremeDo);

    if (busyEnd <= busyStart) {
      continue;
    }

    const originalBusyEnd = timeToMinutes(
      interval.originalVremeDo || interval.vremeDo,
    );

    if (busyStart > cursor) {
      segments.push({
        tip: "slobodno",
        vremeOd: minutesToTime(cursor),
        vremeDo: minutesToTime(busyStart),
      });
    }

    segments.push({
      tip: "zauzeto",
      vremeOd: interval.vremeOd,
      vremeDo: interval.vremeDo,
      pripremaOd: interval.hasPreparationBuffer
        ? minutesToTime(originalBusyEnd)
        : null,
      pripremaDo: interval.hasPreparationBuffer ? interval.vremeDo : null,
    });

    cursor = Math.max(cursor, busyEnd);
  }

  if (cursor < workingEnd) {
    segments.push({
      tip: "slobodno",
      vremeOd: minutesToTime(cursor),
      vremeDo: minutesToTime(workingEnd),
    });
  }

  return segments;
};

export const buildStartDropdownItems = ({
  availability,
  availabilitySegments,
  playroom,
  selectedDate,
}) => {
  if (!availability?.workingHours) return [];

  if (availability?.mode === "fiksno") {
    const slots = Array.isArray(availability?.slots) ? availability.slots : [];

    return slots
      .filter(
        (slot) =>
          slot?._id &&
          slot?.available === true &&
          slot?.zauzeto !== true &&
          slot?.vremeOd &&
          slot?.vremeDo &&
          !isPastSlotTime(slot.vremeOd, selectedDate),
      )
      .map((slot) => ({
        type: "free",
        key: `slot-${slot._id}`,
        value: slot.vremeOd,
        label: `✅ ${slot.vremeOd}-${slot.vremeDo}`,
        timeSlotId: String(slot._id),
        vremeOd: slot.vremeOd,
        vremeDo: slot.vremeDo,
      }));
  }

  const items = [];

  availabilitySegments.forEach((segment, index) => {
    if (segment.tip === "zauzeto") {
      items.push({
        type: "busy",
        key: `busy-${index}-${segment.vremeOd}-${segment.vremeDo}`,
        label: `❌ ${segment.vremeOd}-${segment.vremeDo}`,
      });
      return;
    }

    const intervalOptions = generateQuarterHourOptions(
      segment.vremeOd,
      segment.vremeDo,
    ).slice(0, -1);

    intervalOptions.forEach((time) => {
      const startMinutes = timeToMinutes(time);
      const endMinutes = startMinutes + 15;
      const calculatedEndTime = minutesToTime(endMinutes);

      const isValid =
        timeToMinutes(calculatedEndTime) <=
          timeToMinutes(availability.workingHours.vremeDo) &&
        !doesOverlapBusyInterval(availability, time, calculatedEndTime);

      if (isValid && !isPastSlotTime(time, selectedDate)) {
        items.push({
          type: "free",
          key: `free-${index}-${time}`,
          value: time,
          label: `✅ ${time}`,
        });
      }
    });
  });

  return items;
};

export const buildEndDropdownItems = ({
  availability,
  availabilitySegments,
  playroom,
  selectedStartTime,
  selectedDate,
  trajanjeTermina,
}) => {
  if (!availability?.workingHours || !selectedStartTime) return [];

  const items = [];

  availabilitySegments.forEach((segment, index) => {
    if (segment.tip === "zauzeto") {
      items.push({
        type: "busy",
        key: `end-busy-${index}-${segment.vremeOd}-${segment.vremeDo}`,
        label: `❌ ${segment.vremeOd}-${segment.vremeDo}`,
      });
      return;
    }

    const intervalOptions = generateQuarterHourOptions(
      segment.vremeOd,
      segment.vremeDo,
    );

    intervalOptions.forEach((time) => {
      const startMinutes = timeToMinutes(selectedStartTime);
      const endMinutes = timeToMinutes(time);

      if (endMinutes <= startMinutes) return;
      if (endMinutes > timeToMinutes(availability.workingHours.vremeDo)) return;

      if (playroom?.rezimRezervacije === "fiksno") {
        if (endMinutes !== startMinutes + trajanjeTermina) return;
      }

      if (
        !doesOverlapBusyInterval(availability, selectedStartTime, time) &&
        !isPastSlotTime(time, selectedDate)
      ) {
        items.push({
          type: "free",
          key: `end-free-${index}-${time}`,
          value: time,
          label: `✅ ${time}`,
        });
      }
    });
  });

  return items;
};
