/**
 * Skill name -> [governing characteristic, category], from template.json. The
 * category is stored in each skill's `type` field (it is real data — a skill
 * grouping — not one of the type-hint keys ADR-010 drops).
 */
const SKILLS = {
  "Brawl": ["Brawn", "Combat"],
  "Gunnery": ["Agility", "Combat"],
  "Lightsaber": ["Brawn", "Combat"],
  "Melee": ["Brawn", "Combat"],
  "Ranged: Light": ["Agility", "Combat"],
  "Ranged: Heavy": ["Agility", "Combat"],
  "Astrogation": ["Intellect", "General"],
  "Athletics": ["Brawn", "General"],
  "Charm": ["Presence", "Social"],
  "Coercion": ["Willpower", "Social"],
  "Computers": ["Intellect", "General"],
  "Cool": ["Presence", "General"],
  "Coordination": ["Agility", "General"],
  "Deception": ["Cunning", "Social"],
  "Discipline": ["Willpower", "General"],
  "Leadership": ["Presence", "Social"],
  "Mechanics": ["Intellect", "General"],
  "Medicine": ["Intellect", "General"],
  "Negotiation": ["Presence", "Social"],
  "Perception": ["Cunning", "General"],
  "Piloting: Planetary": ["Agility", "General"],
  "Piloting: Space": ["Agility", "General"],
  "Resilience": ["Brawn", "General"],
  "Skulduggery": ["Cunning", "General"],
  "Stealth": ["Agility", "General"],
  "Streetwise": ["Cunning", "General"],
  "Survival": ["Cunning", "General"],
  "Vigilance": ["Willpower", "General"],
  "Knowledge: Core Worlds": ["Intellect", "Knowledge"],
  "Knowledge: Education": ["Intellect", "Knowledge"],
  "Knowledge: Lore": ["Intellect", "Knowledge"],
  "Knowledge: Outer Rim": ["Intellect", "Knowledge"],
  "Knowledge: Underworld": ["Intellect", "Knowledge"],
  "Knowledge: Warfare": ["Intellect", "Knowledge"],
  "Knowledge: Xenology": ["Intellect", "Knowledge"],
};

/**
 * Schema fragment for the actor `skills` map (the template.json "skills"
 * template) — the 35 core skills, built from the table above so no single
 * function trips the size/complexity lint limits. The per-skill `label` is set
 * at runtime by the legacy localisation, so it is not declared here.
 *
 * @returns {Record<string, object>} partial schema declaring `skills`
 */
export function skillsSchema() {
  const { SchemaField, NumberField, StringField, BooleanField } = foundry.data.fields;
  const skills = {};
  for (const [name, [characteristic, type]] of Object.entries(SKILLS)) {
    skills[name] = new SchemaField({
      rank: new NumberField({ initial: 0 }),
      characteristic: new StringField({ initial: characteristic }),
      groupskill: new BooleanField({ initial: false }),
      careerskill: new BooleanField({ initial: false }),
      type: new StringField({ initial: type }),
      max: new NumberField({ initial: 6 }),
    });
  }
  return { skills: new SchemaField(skills) };
}
