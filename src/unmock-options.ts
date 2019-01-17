export interface IUnmockInternalOptions {
    save: boolean | string[];
    unmockHost: string;
    unmockPort: string;
    ignore?: any;
    whitelist?: string[];
}

export interface IUnmockOptions {
    save?: boolean | string[];
    unmockHost?: string;
    unmockPort?: string;
    ignore?: any;
    whitelist?: string[];
}
