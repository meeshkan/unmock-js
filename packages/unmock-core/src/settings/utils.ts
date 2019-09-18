import { escapeRegExp } from "lodash";

export const whitelistToRegex = (
  whitelist?: Array<string | RegExp>
): RegExp[] =>
  whitelist === undefined
    ? []
    : whitelist.map((item: any) =>
        item instanceof RegExp
          ? item
          : new RegExp(
              `^${item
                .split(/\*+/)
                .map(escapeRegExp)
                .join(".*")}$`
            )
      );
