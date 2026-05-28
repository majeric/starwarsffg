const THRESHOLD_ATTRIBUTES = [
  "stats.wounds",
  "stats.hullTrauma",
  "stats.strain",
  "stats.systemStrain",
];

const WOUND_LIKE_ATTRIBUTES = new Set(["stats.wounds", "stats.hullTrauma"]);

export class TokenFFG extends foundry.canvas.placeables.Token {
  /** @override */
  // eslint-disable-next-line complexity -- pre-existing method; refactor is out of Phase 4.2 scope (see STATE.md Open issues).
  _refreshTurnMarker(wantMarkerActive=false) {
    CONFIG.logger.debug(`Refreshing ${this.name}...`);
    // Should a Turn Marker be active?
    const {turnMarker} = this.document;
    const markersEnabled = CONFIG.Combat.settings.turnMarker.enabled
      && (turnMarker.mode !== CONST.TOKEN_TURN_MARKER_MODES.DISABLED);
    // custom logic
    const isClaimed = game.combat?.combatant?.claimed;
    const claimant = game.combat?.combatants.find(i => i.id === isClaimed);
    // end custom logic

    CONFIG.logger.debug(`Slot claimed: ${isClaimed}`);
    // Activate a Turn Marker
    if (markersEnabled && wantMarkerActive || (markersEnabled && isClaimed && claimant && claimant.actorId === this.actor.id)) {
      if (!this.turnMarker) this.turnMarker = this.addChildAt(new foundry.canvas.placeables.tokens.TokenTurnMarker(this), 0);
      canvas.tokens.turnMarkers.add(this);
      this.turnMarker.draw();
    }
    else {
      // Remove a Turn Marker
      canvas.tokens.turnMarkers?.delete(this);
      this.turnMarker?.destroy();
      this.turnMarker = null;
    }
  }

  /** @override */
  _refreshSize() {
    this._refreshMeshSizeAndScale();

    // Adjust nameplate and tooltip positioning
    const {width, height} = this.document.getSize();

    this.nameplate.position.set(width / 2, height + 2);
    this.tooltip.position.set(width / 2, -2);

    // Adjust turn marker size (150% size by default);
    // fixes a bug where the default refreshSize does not check that this.turnMarker.mesh is defined
    if ( this.turnMarker && this.turnMarker.mesh ) {
      const mesh = this.turnMarker.mesh;
      mesh.width = mesh.height = this.externalRadius * 3;
    }
  }

  /**
   * Draw a single resource bar with FFG-style threshold behavior for
   * wounds / strain / hull / system strain. Other attributes fall back
   * to the gradient-color default rendering.
   *
   * @override
   * @param {number} number
   * @param {PIXI.Graphics} bar
   * @param {object} data
   * @returns {boolean} always true (matches the base class contract)
   */
  _drawBar(number, bar, data) {
    const h = Math.max(canvas.dimensions.size / 12, 8);
    this.#drawBarBackground(bar, h);

    if (THRESHOLD_ATTRIBUTES.includes(data.attribute)) {
      this.#drawThresholdBar(bar, h, data);
    } else {
      this.#drawDefaultBar(bar, number, h, data);
    }

    const posY = number === 0 ? this.h - h : 0;
    bar.position.set(0, posY);
    return true;
  }

  #drawBarBackground(bar, h) {
    bar
      .clear()
      .beginFill(0x000000, 0.5)
      .lineStyle(2, 0x000000, 0.9)
      .drawRoundedRect(0, 0, this.w, h, 3);
  }

  #drawThresholdBar(bar, h, data) {
    const colors = this.#colorsForAttribute(data.attribute);
    const aboveThreshold = Math.max(data.value - data.max, 0);
    if (aboveThreshold > 0) {
      this.#drawOverThresholdPortion(bar, h, data, colors, aboveThreshold);
    } else {
      this.#drawHealthyThresholdPortion(bar, h, data, colors);
    }
  }

  #drawOverThresholdPortion(bar, h, data, colors, aboveThreshold) {
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

  #drawHealthyThresholdPortion(bar, h, data, colors) {
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

  #drawDefaultBar(bar, number, h, data) {
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

  #colorsForAttribute(attribute) {
    if (WOUND_LIKE_ATTRIBUTES.has(attribute)) {
      return {
        ok: game.settings.get("starwarsffg", "ui-token-healthy"),
        damaged: game.settings.get("starwarsffg", "ui-token-wounded"),
        overDamaged: game.settings.get("starwarsffg", "ui-token-overwounded"),
      };
    }
    return {
      ok: game.settings.get("starwarsffg", "ui-token-stamina-ok"),
      damaged: game.settings.get("starwarsffg", "ui-token-stamina-damaged"),
      overDamaged: game.settings.get("starwarsffg", "ui-token-stamina-over"),
    };
  }
}
