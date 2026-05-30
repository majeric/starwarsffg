const THRESHOLD_ATTRIBUTES = [
  "stats.wounds",
  "stats.hullTrauma",
  "stats.strain",
  "stats.systemStrain",
] as const;

const WOUND_LIKE_ATTRIBUTES = new Set(["stats.wounds", "stats.hullTrauma"]);

// FIXME(types): fvtt-types does not expose _drawBar's data type directly
type BarData = NonNullable<TokenDocument.GetBarAttributeReturn>;

interface BarColors {
  ok: number;
  damaged: number;
  overDamaged: number;
}

export class TokenFFG extends foundry.canvas.placeables.Token {
  // FIXME(types): fvtt-types does not declare turnMarker on Token
  declare turnMarker: PIXI.Container | null;

  /** @override */
  _refreshTurnMarker(wantMarkerActive = false): void {
    CONFIG.logger.debug(`Refreshing ${this.name}...`);
    // Should a Turn Marker be active?
    const {turnMarker} = this.document as any;
    const markersEnabled = (CONFIG.Combat as any).settings.turnMarker.enabled
      && (turnMarker.mode !== CONST.TOKEN_TURN_MARKER_MODES.DISABLED);
    // custom logic
    const isClaimed = (game.combat?.combatant as any)?.claimed as string | undefined;
    const claimant = game.combat?.combatants.find((i: any) => i.id === isClaimed);
    // end custom logic

    CONFIG.logger.debug(`Slot claimed: ${isClaimed}`);
    // Activate a Turn Marker
    if (markersEnabled && wantMarkerActive || (markersEnabled && isClaimed && claimant && (claimant as any).actorId === this.actor!.id)) {
      if (!this.turnMarker) this.turnMarker = this.addChildAt(new (foundry.canvas.placeables.tokens.TokenTurnMarker as any)(this), 0);
      (canvas as any).tokens.turnMarkers.add(this);
      (this.turnMarker as any).draw();
    }
    else {
      // Remove a Turn Marker
      (canvas as any).tokens?.turnMarkers?.delete(this);
      this.turnMarker?.destroy();
      this.turnMarker = null;
    }
  }

  /** @override */
  _refreshSize(): void {
    (this as any)._refreshMeshSizeAndScale();

    // Adjust nameplate and tooltip positioning
    const {width, height} = this.document.getSize();

    this.nameplate!.position.set(width / 2, height + 2);
    this.tooltip!.position.set(width / 2, -2);

    // Adjust turn marker size (150% size by default);
    // fixes a bug where the default refreshSize does not check that this.turnMarker.mesh is defined
    if ( this.turnMarker && (this.turnMarker as any).mesh ) {
      const mesh = (this.turnMarker as any).mesh;
      mesh.width = mesh.height = this.externalRadius * 3;
    }
  }

  /** @override */
  protected _drawBar(number: number, bar: PIXI.Graphics, data: BarData): boolean {
    const h = Math.max((canvas as any).dimensions.size / 12, 8);
    this.#drawBarBackground(bar, h);

    if (THRESHOLD_ATTRIBUTES.includes(data.attribute as typeof THRESHOLD_ATTRIBUTES[number])) {
      this.#drawThresholdBar(bar, h, data as BarData & { max: number });
    } else {
      this.#drawDefaultBar(bar, number, h, data as BarData & { max: number });
    }

    const posY = number === 0 ? this.h - h : 0;
    bar.position.set(0, posY);
    return true;
  }

  #drawBarBackground(bar: PIXI.Graphics, h: number): void {
    bar
      .clear()
      .beginFill(0x000000, 0.5)
      .lineStyle(2, 0x000000, 0.9)
      .drawRoundedRect(0, 0, this.w, h, 3);
  }

  #drawThresholdBar(bar: PIXI.Graphics, h: number, data: BarData & { max: number }): void {
    const colors = this.#colorsForAttribute(data.attribute);
    const aboveThreshold = Math.max(data.value - data.max, 0);
    if (aboveThreshold > 0) {
      this.#drawOverThresholdPortion(bar, h, data, colors, aboveThreshold);
    } else {
      this.#drawHealthyThresholdPortion(bar, h, data, colors);
    }
  }

  #drawOverThresholdPortion(bar: PIXI.Graphics, h: number, data: BarData & { max: number }, colors: BarColors, aboveThreshold: number): void {
    const abovePct = Math.min(aboveThreshold / data.max, 1);
    const aboveWidth = abovePct * (this.w - 2);
    bar
      .beginFill(colors.overDamaged, 0.8)
      .lineStyle(1, 0x000000, 0.8)
      .drawRoundedRect(1, 1, aboveWidth, h - 2, 2);

    const startX = aboveWidth + 1;
    const remainingLength = this.w - aboveWidth - 2;
    bar
      .beginFill(colors.damaged, 0.8)
      .lineStyle(1, 0x000000, 0.8)
      .drawRoundedRect(startX, 1, remainingLength, h - 2, 2);
  }

  #drawHealthyThresholdPortion(bar: PIXI.Graphics, h: number, data: BarData & { max: number }, colors: BarColors): void {
    const woundedPct = Math.min((data.max - data.value) / data.max, 1);
    const healthyWidth = woundedPct * (this.w - 2);
    bar
      .beginFill(colors.ok, 0.8)
      .lineStyle(1, 0x000000, 0.8)
      .drawRoundedRect(1, 1, healthyWidth, h - 2, 2);

    const startX = healthyWidth + 1;
    const remainingLength = this.w - healthyWidth - 2;
    bar
      .beginFill(colors.damaged, 0.8)
      .lineStyle(1, 0x000000, 0.8)
      .drawRoundedRect(startX, 1, remainingLength, h - 2, 2);
  }

  #drawDefaultBar(bar: PIXI.Graphics, number: number, h: number, data: BarData & { max: number }): void {
    const val = Number(data.value);
    const pct = Math.clamp(val, 0, data.max) / data.max;
    const color = number === 0
      ? [1 - pct / 2, pct, 0]
      : [0.5 * pct, 0.7 * pct, 0.5 + pct / 2];
    bar
      .beginFill(PIXI.utils.rgb2hex(color), 0.8)
      .lineStyle(1, 0x000000, 0.8)
      .drawRoundedRect(1, 1, pct * (this.w - 2), h - 2, 2);
  }

  #colorsForAttribute(attribute: string): BarColors {
    if (WOUND_LIKE_ATTRIBUTES.has(attribute)) {
      return {
        ok: game.settings!.get("starwarsffg", "ui-token-healthy") as unknown as number,
        damaged: game.settings!.get("starwarsffg", "ui-token-wounded") as unknown as number,
        overDamaged: game.settings!.get("starwarsffg", "ui-token-overwounded") as unknown as number,
      };
    }
    return {
      ok: game.settings!.get("starwarsffg", "ui-token-stamina-ok") as unknown as number,
      damaged: game.settings!.get("starwarsffg", "ui-token-stamina-damaged") as unknown as number,
      overDamaged: game.settings!.get("starwarsffg", "ui-token-stamina-over") as unknown as number,
    };
  }
}
