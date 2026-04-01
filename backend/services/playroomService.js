const Playroom = require("../models/Playroom");
const PLAYROOM_STATUS = require("../constants/playroomStatus");
const {
  generateTimeSlotsForPlayroom,
  syncTimeSlotsWithWorkingHours,
} = require("../utils/generateTimeSlots");

const createPlayroomWithSlots = async (playroomData) => {
  const playroom = await Playroom.create(playroomData);

  try {
    const slotResult = await generateTimeSlotsForPlayroom(playroom._id, 30);

    return {
      playroom,
      slotResult,
      slotError: null,
    };
  } catch (error) {
    console.error(
      "Greška pri generisanju termina nakon kreiranja igraonice:",
      error,
    );

    return {
      playroom,
      slotResult: null,
      slotError: error.message,
    };
  }
};

const verifyPlayroomAndGenerateSlots = async (playroomId) => {
  const playroom = await Playroom.findById(playroomId);

  if (!playroom) {
    const error = new Error("Igraonica nije pronađena");
    error.statusCode = 404;
    throw error;
  }

  playroom.verifikovan = true;
  playroom.status = PLAYROOM_STATUS.AKTIVAN;
  await playroom.save();

  const slotResult = await generateTimeSlotsForPlayroom(playroom._id, 30);

  return {
    playroom,
    slotResult,
  };
};

const regenerateSlotsForPlayroom = async (playroomId) => {
  const playroom = await Playroom.findById(playroomId);

  if (!playroom) {
    const error = new Error("Igraonica nije pronađena");
    error.statusCode = 404;
    throw error;
  }

  const result = await syncTimeSlotsWithWorkingHours(playroom._id, 30);

  if (!result.success) {
    const error = new Error(
      result.message || "Greška pri sinhronizaciji termina",
    );
    error.statusCode = 400;
    throw error;
  }

  return result;
};

module.exports = {
  createPlayroomWithSlots,
  verifyPlayroomAndGenerateSlots,
  regenerateSlotsForPlayroom,
};
