export class AbilityDie extends foundry.dice.terms.DiceTerm {
  // FIXME(types): FFG custom properties not in fvtt-types
  declare ffg: FFGDiceResult;
  declare _isFFG: boolean;

  constructor(termData?: any) {
    super(termData);
    this.faces = 8;
  }
  /* -------------------------------------------- */
  /** @override */
  static DENOMINATION = "a";

  /* -------------------------------------------- */
  /** @override */
  get formula(): string {
    return `${this.number}${(this.constructor as typeof AbilityDie).DENOMINATION}${this.modifiers.join("")}`;
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
      this.ffg.success += parseInt(result.ffg.success);
      this.ffg.failure += parseInt(result.ffg.failure);
      this.ffg.advantage += parseInt(result.ffg.advantage);
      this.ffg.threat += parseInt(result.ffg.threat);
      this.ffg.triumph += parseInt(result.ffg.triumph);
      this.ffg.despair += parseInt(result.ffg.despair);
      this.ffg.light += parseInt(result.ffg.light);
      this.ffg.dark += parseInt(result.ffg.dark);
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
    (roll as any).ffg = CONFIG.FFG.ABILITY_RESULTS[(roll as any).result];
    return roll;
  }

  /* -------------------------------------------- */
  /** @override */
  getResultLabel(result: any): string {
    const die = CONFIG.FFG.ABILITY_RESULTS[result.result];
    return `<img src='${die.image}' title='${game.i18n.localize(die.label)}' alt=''/>`;
  }
}
