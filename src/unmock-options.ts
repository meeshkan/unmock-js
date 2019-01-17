export interface IUnmockInternalOptions {
    save: string[];
    unmockHost: string;
    unmockPort: string;
    use: string[];
    ignore?: any;
    whitelist?: string[];
}

export interface IUnmockOptions {
    save?: string[];
    unmockHost?: string;
    unmockPort?: string;
    use?: string[];
    ignore?: any;
    whitelist?: string[];
}
