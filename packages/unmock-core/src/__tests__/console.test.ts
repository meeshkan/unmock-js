import { formatMsg } from "../console";

describe("Formatting log message", () => {
  it("should prepend unmock", () => {
    const str = "something here";
    const formatted = formatMsg("instruct", str);
    expect(formatted).toContain(`unmock: ${str}`);
  });
});
