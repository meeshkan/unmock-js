import { IBackend, IUnmockOptions, IUnmockPackage } from "./interfaces";
import { UnmockOptions } from "./options";
import * as transformers from "./service/state/transformers";
// top-level exports
export { UnmockOptions } from "./options";
export * from "./interfaces";
export * from "./generator";
export const dsl = transformers;

export abstract class CorePackage implements IUnmockPackage {
  protected readonly backend: IBackend;
  private readonly options: UnmockOptions;

  constructor(baseOptions: UnmockOptions, backend: IBackend) {
    this.options = baseOptions;
    this.backend = backend;
  }

  public on(maybeOptions?: IUnmockOptions) {
    return this.backend.initialize(this.options.reset(maybeOptions));
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
