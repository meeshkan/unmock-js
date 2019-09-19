const prettier = require("prettier"); // tslint:disable-line:no-var-requires
const path = require("path"); // tslint:disable-line:no-var-requires

type HTTPMethod =
  | "get"
  | "head"
  | "post"
  | "put"
  | "patch"
  | "delete"
  | "options"
  | "trace";

const header = `/* This file has been autogenerated from ${path.basename(
  __filename,
)}.
* Regenerate with "npm run generate-spy", DO NOT EDIT THIS FILE!
*/`;

const imports = `import { match, SinonMatcher } from "sinon";
import { ServiceSpy } from "..";
import { HTTPMethod, IIncomingHeaders, IIncomingQuery, IOutgoingHeaders, IProtocol } from "../../../interfaces";
import { decorateSpy, verifyOnlyOneCall } from "../decorate";`;

/**
 * Create source describing the interfaces for all methods starting with HTTP method,
 * such as `getResponseBody`, `postRequestBody`, etc.
 * @param method HTTP method
 */
const interfaceMethodsFor = (method: HTTPMethod): string => {
  return `${method}RequestHost(matcher?: SinonMatcher): string;
${method}RequestBody(matcher?: SinonMatcher): any;
${method}RequestPathname(matcher?: SinonMatcher): string;
${method}RequestPath(matcher?: SinonMatcher): string;
${method}RequestHeaders(matcher?: SinonMatcher): IIncomingHeaders;
${method}RequestQuery(matcher?: SinonMatcher): IIncomingQuery;
${method}RequestProtocol(matcher?: SinonMatcher): IProtocol;

${method}ResponseBody(matcher?: SinonMatcher): any;
${method}ResponseCode(matcher?: SinonMatcher): number;
${method}ResponseHeaders(matcher?: SinonMatcher): IOutgoingHeaders;
`;
};

const decoratorInterface = `export interface ISpyDecoration {
    with(matcher: SinonMatcher): ServiceSpy;
    withMethod(method: HTTPMethod): ServiceSpy;
    ${interfaceMethodsFor("post")}
    ${interfaceMethodsFor("get")}
    ${interfaceMethodsFor("put")}
    ${interfaceMethodsFor("delete")}
}
`;

const decoratorsFor = (method: HTTPMethod): string => {
  return `${method}RequestHost(this: ServiceSpy, matcher?: SinonMatcher): string {
    const methodMatcher = match({ method: "${method}" });
    const fullMatcher = matcher ? methodMatcher.and(matcher) : methodMatcher;
    const spyWithMatcher = this.with(fullMatcher);
    verifyOnlyOneCall({ spy: spyWithMatcher, errPrefix: "${method}Host" });
    return spyWithMatcher.firstCall.args[0].host;
  },
  ${method}RequestBody(this: ServiceSpy, matcher?: SinonMatcher): any {
    const methodMatcher = match({ method: "${method}" });
    const fullMatcher = matcher ? methodMatcher.and(matcher) : methodMatcher;
    const spyWithMatcher = this.with(fullMatcher);
    verifyOnlyOneCall({ spy: spyWithMatcher, errPrefix: "${method}RequestBody" });
    return spyWithMatcher.firstCall.args[0].body;
  },
  ${method}ResponseBody(this: ServiceSpy, matcher?: SinonMatcher): any {
    const methodMatcher = match({ method: "${method}" });
    const fullMatcher = matcher ? methodMatcher.and(matcher) : methodMatcher;
    const spyWithMatcher = this.with(fullMatcher);
    verifyOnlyOneCall({ spy: spyWithMatcher, errPrefix: "${method}ResponseBody" });
    return spyWithMatcher.firstCall.returnValue.body;
  }`;
};

const decorators = `export const decorators = {
    with(this: ServiceSpy, matcher: SinonMatcher): ServiceSpy {
        return decorateSpy(this.withArgs(matcher));
    },
    withMethod(this: ServiceSpy, method: HTTPMethod): ServiceSpy {
        return this.with(match({ method }));
    },
    ${decoratorsFor("post")},
    ${decoratorsFor("get")},
    ${decoratorsFor("put")},
    ${decoratorsFor("delete")},
}
`;

const sourceText = `${header}
${imports}

${decoratorInterface}

${decorators}
`;

console.log(prettier.format(sourceText, { parser: "typescript" })); // tslint:disable-line:no-console
