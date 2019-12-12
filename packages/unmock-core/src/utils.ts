import { HTTPMethod, IProtocol } from "./interfaces";

/**
 * Normalize header key, expected for `IIncomingHeaders`.
 * @param key
 */
export const normalizeHeaderKey = (key: string) => key.toLowerCase();

export const isRESTMethod = (maybeMethod: string): maybeMethod is HTTPMethod =>
  [
    "get",
    "head",
    "post",
    "put",
    "patch",
    "delete",
    "options",
    "trace",
  ].includes(maybeMethod);

export const isKnownProtocol = (
  maybeProtocol: string,
): maybeProtocol is IProtocol => /^https?$/.test(maybeProtocol);
