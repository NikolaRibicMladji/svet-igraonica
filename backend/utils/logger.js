const isDev = process.env.NODE_ENV === "development";

const logger = {
  info: (...args) => {
    if (isDev) {
      console.log(...args);
    }
  },

  error: (...args) => {
    console.error(...args);
  },
};

module.exports = logger;
