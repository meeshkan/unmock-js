export interface IRef {
    ref(): string;
}

export class Ref implements IRef {
    private $ref: string;
    public constructor(ref: string) {
        this.$ref = ref;
    }
    public ref() {
        return this.$ref;
    }
}

type UnmockRule = null;
type UnmockPrimitive = number | string | boolean | null | IRef | UnmockSchema;
type UnmockValue = UnmockPrimitive | UnmockObject | UnmockArray;
// tslint:disable-next-line:interface-over-type-literal
type UnmockObject = { [member: string]: UnmockValue };
// tslint:disable-next-line:interface-name
interface UnmockArray extends Array<UnmockValue> {}

type UnmockSchema = (
    urschema: UnmockSchema,
    traversal: Array<string | number>,
    hints?: {
        protocol?: string,
        url?: string,
        path?: string,
        query?: {[s: string]: string},
        headers?: {[s: string]: string | string[] },
        body?: string,
        rules?: UnmockRule[],
    }) => any;

type UnmockResolver = (curschema: UnmockValue) => UnmockSchema;

export const resolve: UnmockResolver = (curschema: UnmockValue) =>
    (
        urschema: UnmockSchema,
        traversal: Array<string | number>,
        hints?: {
            protocol?: string,
            url?: string,
            path?: string,
            query?: {[s: string]: string},
            headers?: {[s: string]: string | string[]},
            body?: string,
            rules?: UnmockRule[],
        },
    ) =>
    typeof curschema === "function" ?
    curschema(urschema, traversal, hints) :
    curschema instanceof Array ?
    curschema.map((i, j) => resolve(i)(urschema, traversal.concat(j), hints)) :
    curschema === null ?
    null :
    typeof curschema === "object" ?
    Object
        .keys(curschema)
        .map((i) => ({i: resolve(curschema[i])(urschema, traversal.concat(i), hints)}))
        .reduce((a, b) => ({ ...a , ...b}), {}) :
    curschema;

export const schema = {};
