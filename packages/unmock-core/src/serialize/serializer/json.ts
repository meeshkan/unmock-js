import { ISerializer } from "../interfaces";

export default class JSONSerializer implements ISerializer {
  public serialize(json: any) {
    const contentType = json.headers
      ? json.headers["Content-Type"] || json.headers["content-type"]
      : undefined;
    if (
      contentType &&
      typeof contentType === "string" &&
      contentType.startsWith("application/json")
    ) {
      return {
        ...json,
        ...(json.body && typeof json.body === "string"
          ? { body: JSON.parse(json.body) }
          : {})
      };
    }
    return json;
  }
}
