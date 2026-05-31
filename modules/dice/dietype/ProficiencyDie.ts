export class ProficiencyDie extends foundry.dice.terms.DiceTerm {
  // FIXME(types): FFG custom properties not in fvtt-types
  declare ffg: FFGDiceResult;
  declare _isFFG: boolean;

  constructor(termData?: any) {
    super(termData);
    this.faces = 12;
  }
  /* -------------------------------------------- */
  /** @override */
  static DENOMINATION = "p";

  /* -------------------------------------------- */
  /** @override */
  get formula(): string {
    return `${this.number}${(this.constructor as typeof ProficiencyDie).DENOMINATION}${this.modifiers.join("")}`;
  }

  /* -------------------------------------------- */
  /** @override */
  async evaluate({ minimize = false, maximize = false } = {}): Promise<this> {
    if (this._evaluated) {
      throw new Error(`This ${this.constructor.name} has already been evaluated and is immutable`);
    }

    // Roll the initial number of dice
    for (let n = 1; n <= this.number!; n++) {
      await this.roll({ minimize, maximize });
    }

    // Apply modifiers
    this._evaluateModifiers();

    // Combine all FFG results.
    this.ffg = { success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 };
    this.results.forEach((result: any) => {
      this.ffg.success += result.ffg.success;
      this.ffg.failure += result.ffg.failure;
      this.ffg.advantage += result.ffg.advantage;
      this.ffg.threat += result.ffg.threat;
      this.ffg.triumph += result.ffg.triumph;
      this.ffg.despair += result.ffg.despair;
      this.ffg.light += result.ffg.light;
      this.ffg.dark += result.ffg.dark;
    });

    // Return the evaluated term
    this._evaluated = true;
    this._isFFG = true;
    return this;
  }

  /* -------------------------------------------- */
  /** @override */
  async roll(options?: any): Promise<any> {
    const roll = await super.roll(options);
    (roll as any).ffg = CONFIG.FFG.PROFICIENCY_RESULTS[(roll as any).result];
    return roll;
  }

  /* -------------------------------------------- */
  /** @override */
  getResultLabel(result: any): string {
    const die = CONFIG.FFG.PROFICIENCY_RESULTS[result.result];
    return `<img src='${die.image}' title='${game.i18n!.localize(die.label)}' alt=''/>`;
  }
}
