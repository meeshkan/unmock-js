export interface IUnmockInternalOptions {
    logger: ILogger;
    persistence: IPersistence;
    save: boolean | string[];
    unmockHost: string;
    unmockPort: string;
    ignore?: any;
    token?: string;
    whitelist?: string[];
}

export interface IUnmockOptions {
    logger?: ILogger;
    persistence?: IPersistence;
    save?: boolean | string[];
    unmockHost?: string;
    unmockPort?: string;
    ignore?: any;
    token?: string;
    whitelist?: string[];
}
