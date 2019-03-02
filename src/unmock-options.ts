import { ILogger } from "./logger/logger";
import { IPersistence } from "./persistence/persistence";

export interface IUnmockInternalOptions {
    logger: ILogger;
    persistence: IPersistence;
    save: boolean | string[];
    unmockHost: string;
    unmockPort: string;
    useInProduction: boolean;
    ignore?: any;
    signature?: string;
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
    signature?: string;
    token?: string;
    whitelist?: string[];
    useInProduction?: boolean;
}
