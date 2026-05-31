import { beforeEach, describe, expect, it } from "vitest";

class MockRoll {
  constructor(_formula = "", _data = {}, options = {}) {
    this.terms = options.terms ?? [];
    this._dice = [];
    this.dice = [];
    this._evaluated = false;
    this._total = 0;
    this._formula = _formula;
    this.formula = _formula;
  }

  static cleanFormula(terms) {
    return terms.join(" ");
  }

  static safeEval(expression) {
    return Function(`"use strict"; return (${expression});`)();
  }

  _identifyTerms() {
    return this.terms;
  }

  get total() {
    return this._total;
  }

  toJSON() {
    return {};
  }

  static fromData() {
    return new this();
  }
}

class MockOperatorTerm {
  constructor({ operator }) {
    this.operator = operator;
  }
}

class MockStringTerm {
  constructor({ term }) {
    this.term = term;
  }
}

class MockDiceTerm {}

class MockFFGTerm {
  constructor(ffg) {
    this.ffg = ffg;
    this.results = [];
    this.total = 0;
  }

  async evaluate() {
    return this;
  }
}

function ffgResult(partial) {
  return {
    success: 0,
    failure: 0,
    advantage: 0,
    threat: 0,
    triumph: 0,
    despair: 0,
    light: 0,
    dark: 0,
    ...partial,
  };
}

beforeEach(() => {
  globalThis.resetFoundryGlobals();
  globalThis.Roll = MockRoll;
  globalThis.FormApplication = class {};
  globalThis.Item = class {};
  globalThis.Dialog = class {};
  globalThis.fromUuid = async () => undefined;
  globalThis.getDocumentClass = () => class {};
  globalThis.Number.isNumeric = Number.isFinite;
  globalThis.foundry.dice = {
    terms: {
      DiceTerm: MockDiceTerm,
      OperatorTerm: MockOperatorTerm,
      StringTerm: MockStringTerm,
    },
  };
  globalThis.CONFIG.Dice = { terms: {} };
  globalThis.game.ffg = { diceterms: [MockFFGTerm] };
});

describe("RollFFG result cancellation", () => {
  it("cancels success/failure and advantage/threat after totaling FFG dice", async () => {
    const { RollFFG } = await import("../../modules/dice/roll.js");
    const roll = new RollFFG("", {}, {
      terms: [
        new MockFFGTerm(ffgResult({ success: 3, advantage: 1 })),
        new MockFFGTerm(ffgResult({ failure: 1, threat: 4 })),
      ],
    });

    await roll.evaluate();

    expect(roll.ffg).toMatchObject({
      success: 2,
      failure: 0,
      advantage: 0,
      threat: 3,
    });
  });
});
