import { parseStyle } from "../parse-style";

it("should return an empty object when no style string is provided", () => {
  const result = parseStyle("");
  expect(result).toEqual({});
});

it("should return an empty object when style string is only whitespace", () => {
  const result = parseStyle("   ");
  expect(result).toEqual({});
});

it("should return a style object for a valid style string", () => {
  const result = parseStyle("color: red; font-size: 16px; font-weight: bold;");
  expect(result).toEqual({
    color: "red",
    fontSize: "16px",
    fontWeight: "bold",
  });
});

it("should handle style properties with multiple words", () => {
  const result = parseStyle("background-color: red;");
  expect(result).toEqual({
    backgroundColor: "red",
  });
});

it("should not convert CSS variables into camelCase", () => {
  const result = parseStyle("--main-color: red;");
  expect(result).toEqual({ "--main-color": "red" });
});
