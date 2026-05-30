const isDev = process.env.NODE_ENV === "development";

const logger = {
  info: (...args) => {
    if (isDev) {
      console.log(...args);
    }
  },

  warn: (...args) => {
    console.warn(...args);
  },

  error: (...args) => {
    console.error(...args);
  },
};

module.exports = logger;
