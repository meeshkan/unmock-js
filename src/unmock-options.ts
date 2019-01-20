export interface IUnmockInternalOptions {
    save: boolean | string[];
    saveCallback: (body: string | undefined, hash: string, headers: any) => void;
    unmockHost: string;
    unmockPort: string;
    ignore?: any;
    whitelist?: string[];
}

export interface IUnmockOptions {
    save?: boolean | string[];
    saveCallback?: (body: string | undefined, hash: string, headers: any) => void;
    unmockHost?: string;
    unmockPort?: string;
    ignore?: any;
    whitelist?: string[];
}
