import { describe, expect, it } from "vitest";
import Helpers from "../modules/helpers/common.js";

describe("Common Helpers", () => {
  it("returns changed keys from the second object", () => {
    expect(Helpers.diff({ a: 1 }, { a: 2 })).toEqual({ a: 2 });
  });

  it("returns undefined for keys missing from the second object", () => {
    expect(Helpers.diff({ a: 1 }, { b: 1 })).toEqual({ a: undefined });
  });

  it("recurses into arrays instead of treating them as primitive values", () => {
    expect(Helpers.diff({ values: [1] }, { values: [2] })).toEqual({ values: { 0: 2 } });
  });
});
