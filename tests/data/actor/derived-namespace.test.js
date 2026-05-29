import { describe, it, expect } from "vitest";
import { BaseActorData } from "../../../modules/data/actor/base-actor-data.js";
import { prepareDerived } from "../derived-harness.js";

class StubActorData extends BaseActorData {
  prepareDerivedData() {
    this.parent.derived.greeting = "hi";
  }
}

describe("derived namespace pattern (ADR-011)", () => {
  it("base prepareBaseData initialises a fresh derived object on the parent", () => {
    const parent = prepareDerived(BaseActorData, {});
    expect(parent.derived).toEqual({});
  });

  it("a subclass prepareDerivedData writes derived values to the parent", () => {
    const parent = prepareDerived(StubActorData, {});
    expect(parent.derived.greeting).toBe("hi");
  });

  it("resets derived each prepare cycle so stale state cannot persist", () => {
    const model = new StubActorData({});
    model.parent = { system: model };
    model.prepareBaseData();
    model.parent.derived.stale = true;
    model.prepareBaseData();
    expect(model.parent.derived).toEqual({});
  });
});
