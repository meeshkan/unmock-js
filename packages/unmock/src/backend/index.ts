import {IUnmockInternalOptions} from "../options";

export interface IBackend {
  initialize: (
    story: {story: string[]},
    token: string | undefined,
    { logger, persistence, ignore, save, signature, unmockHost, whitelist }: IUnmockInternalOptions) => void;
  reset: () => void;
  unmockUAHeaderValue: () => string;
}
