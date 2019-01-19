import winston from "winston";

const logger = winston.createLogger({
  levels: { unmock: 2},
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
         winston.format.simple(),
      ),
      level: "unmock",
    }),
  ],
});

winston.addColors({ unmock: "cyan bold" });

export default logger;
