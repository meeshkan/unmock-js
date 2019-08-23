import querystring from "querystring";
import { IDeserializer } from "../interfaces";

export default class FormDeserializer implements IDeserializer {
  public deserialize(json: any) {
    const contentType = json.headers
      ? json.headers["Content-Type"] || json.headers["content-type"]
      : undefined;
    if (
      contentType &&
      typeof contentType === "string" &&
      contentType.startsWith("application/x-www-form-urlencoded")
    ) {
      return {
        ...json,
        ...(json.body && typeof json.body === "object"
          ? {
              body: Object.entries(json.body)
                .map(
                  ([k, v]) =>
                    `${querystring.escape(k)}=${querystring.escape(`${v}`)}`,
                )
                .join("&"),
            }
          : {}),
      };
    }
    return json;
  }
}
