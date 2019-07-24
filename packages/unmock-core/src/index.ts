import { IBackend, ILogger, IUnmockOptions, IUnmockPackage} from "./interfaces";
import { UnmockOptions } from "./options";
import { WhiteListOption } from "./whiteList";
import * as transformers from "./service/state/transformers";
// top-level exports
export { UnmockOptions } from "./options";
export * from "./interfaces";
export * from "./generator";
export const dsl = transformers;

export abstract class CorePackage implements IUnmockPackage {
  protected readonly backend: IBackend;
  private readonly options: UnmockOptions;
  private readonly whiteList: WhiteListOption;

  constructor(baseOptions: UnmockOptions, backend: IBackend, whiteList: WhiteListOption) {
    this.options = baseOptions;
    this.backend = backend;
    this.whiteListOption = whiteList;
  }

  public on(maybeOptions?: IUnmockOptions) {
    const defaultLogger: ILogger = {
        log: (_: string) => {
          /* */
        },
      };

    return this.backend.initialize(this.options.reset(maybeOptions), defaultLogger, this.whiteListOption.reset(maybeOptions));

  }

  public init(maybeOptions?: IUnmockOptions) {
    this.on(maybeOptions);
  }
  public initialize(maybeOptions?: IUnmockOptions) {
    this.on(maybeOptions);
  }

  public off() {
    this.backend.reset();
  }

  public abstract states(): any;
}
