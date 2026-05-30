// @ts-nocheck -- FIXME(types): legacy helper; type during Phase 12.16 strict pass
import { applyActiveEffectOnUpdate } from "../active-effects/legacy-attribute-effects.js";
import {
  explodeMod as explodeModImpl,
  getModKeyPath as getModKeyPathImpl,
  getModTypeByModPath as getModTypeByModPathImpl,
} from "../active-effects/modifier-map.js";

export default class ModifierHelpers {
  static getModTypeByModPath(skillPath) {
    return getModTypeByModPathImpl(skillPath);
  }

  static explodeMod(modType, mod) {
    return explodeModImpl(modType, mod);
  }

  static getModKeyPath(modType, mod) {
    return getModKeyPathImpl(modType, mod);
  }

  static async applyActiveEffectOnUpdate(item, formData) {
    return applyActiveEffectOnUpdate(item, formData);
  }
}
