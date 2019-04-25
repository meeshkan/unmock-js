import { IDeserializer } from "./deserializer";

export default class JSONDeserializer implements IDeserializer {
  public deserialize(json: any) {
    const contentType = json.headers ? json.headers["Content-Type"] || json.headers["content-type"] : undefined;
    if (contentType && typeof contentType === "string" && contentType.startsWith("application/json")) {
      return {
        ...json,
        ...(json.body && typeof json.body === "object" ? { body: JSON.stringify(json.body) } : {}),
      };
    }
    return json;
  }
}
