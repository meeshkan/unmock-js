import { ILogger } from "unmock-core";
import * as winston from "winston";

const logger = winston.createLogger({
  levels: { unmock: 2, unmockError: 0 },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
      level: "unmock",
      stderrLevels: ["unmock"],
    }),
  ],
});

winston.addColors({ unmock: "cyan bold", unmockError: "red bold" });

export default class WinstonLogger implements ILogger {
  public log(message: string) {
    logger.log({
      level: "unmock",
      message,
    });
  }

  public error(message: string) {
    logger.log({
      level: "unmockError",
      message,
    });
  }
}
