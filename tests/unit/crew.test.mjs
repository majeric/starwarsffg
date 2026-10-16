import test from "node:test";
import assert from "node:assert/strict";

import { installFoundryGlobals } from "./harness/foundry.mjs";

const harness = installFoundryGlobals();

// Rendering a crew roll builds an element out of dice images. The harness has no
// DOM, so stand up just enough of one to let the preview be built and read back.
function makeElement(tag) {
  const el = {
    tagName: tag,
    children: [],
    classList: { add() {} },
    appendChild(child) {
      el.children.push(child);
      return child;
    },
    append(child) {
      el.children.push(child);
      return child;
    },
    set innerHTML(value) {
      el._html = value;
    },
    get innerHTML() {
      return el._html ?? el.children.map(() => `<${"img"}>`).join("");
    },
  };
  return el;
}
globalThis.document = { createElement: makeElement };

// swffg-main publishes the dice pool as a global at init time, and dice-helpers
// reaches for it there rather than importing it. Do the same before loading crew.
const { DicePoolFFG } = await import("../../modules/dice/pool.js");
globalThis.DicePoolFFG = DicePoolFFG;

const { build_crew_roll, buildPilotRoll, change_role, deregister_crew, updateRoles } =
  await import("../../modules/helpers/crew.js");

/* -------------------------------------------------------------------------- */
/* The table                                                                  */
/* -------------------------------------------------------------------------- */

const PILOT_SKILLS = {
  "Piloting: Space": { rank: 1 },
  "Piloting: Planetary": { rank: 2 },
  Piloting: { rank: 3 },
  Driving: { rank: 4 },
};

/** Publish a skill theme containing only the named skills. */
function setSkills(names) {
  CONFIG.FFG.skills = Object.fromEntries(
    names.map((name) => [name, { label: name, value: name, characteristic: "Agility" }]),
  );
}

function makeCrewMember({ id = "pilot1", name = "Dex Nova" } = {}) {
  const actor = {
    id,
    name,
    type: "character",
    link: `@Actor[${id}]`,
    system: {
      characteristics: { Agility: { value: 3 } },
      skills: Object.fromEntries(
        Object.entries(PILOT_SKILLS).map(([skill, { rank }]) => [
          skill,
          { characteristic: "Agility", rank, boost: 0, setback: 0 },
        ]),
      ),
    },
  };
  game.actors.set(id, actor);
  return actor;
}

function makeVehicle({ id = "ship1", handling = 0, spaceShip = true, crew } = {}) {
  const flags = { starwarsffg: {} };
  if (crew) flags.starwarsffg.crew = crew;
  const vehicle = {
    id,
    name: "Krayt Fang",
    type: "vehicle",
    flags,
    system: { spaceShip, stats: { handling: { value: handling } } },
    getFlag(scope, key) {
      return this.flags[scope]?.[key];
    },
    setFlag(scope, key, value) {
      this.flags[scope] ??= {};
      this.flags[scope][key] = value;
      return Promise.resolve(this);
    },
    unsetFlag(scope, key) {
      delete this.flags[scope]?.[key];
      return Promise.resolve(this);
    },
  };
  game.actors.set(id, vehicle);
  return vehicle;
}

const crewOf = (vehicle) => vehicle.getFlag("starwarsffg", "crew");
const warnings = () => harness.notifications.filter((n) => n.type === "warn").map((n) => n.message);

test.beforeEach(() => {
  harness.reset();
  // The harness seeds game.actors as a plain object; crew lookups need a collection.
  game.actors = new Map();
  setSkills(Object.keys(PILOT_SKILLS));
  harness.settings.set("starwarsffg.initiativeCrewRole", { role_name: "Initiative" });
  harness.settings.set("starwarsffg.arrayCrewRoles", [
    { role_name: "Gunner", role_skill: "Gunnery", use_handling: false },
    { role_name: "Co-Pilot", role_skill: "Piloting: Space", use_handling: true },
    { role_name: "Initiative", role_skill: "Vigilance", use_handling: false },
    { role_name: "Mascot" }, // a role somebody saved without choosing a skill
  ]);
});

/* -------------------------------------------------------------------------- */
/* Assigning roles                                                            */
/*                                                                            */
/* A vehicle's crew is a flat list of (crew member, role) pairs: one person    */
/* can hold several roles, and one role can be held by several people.        */
/* -------------------------------------------------------------------------- */

test("assigning a role to a crew member records them on the vehicle", async () => {
  const pilot = makeCrewMember();
  const ship = makeVehicle();

  await updateRoles(ship, pilot.id, ["Gunner"]);

  assert.equal(crewOf(ship).length, 1);
  assert.equal(crewOf(ship)[0].actor_id, pilot.id);
  assert.equal(crewOf(ship)[0].actor_name, "Dex Nova");
  assert.equal(crewOf(ship)[0].role, "Gunner");
});

test("one crew member can hold several roles at once", async () => {
  const pilot = makeCrewMember();
  const ship = makeVehicle();

  await updateRoles(ship, pilot.id, ["Gunner", "Co-Pilot"]);

  assert.deepEqual(crewOf(ship).map((c) => c.role).sort(), ["Co-Pilot", "Gunner"]);
});

test("roles left out of the new list are given up", async () => {
  const pilot = makeCrewMember();
  const ship = makeVehicle({
    crew: [
      { actor_id: "pilot1", actor_name: "Dex Nova", role: "Gunner" },
      { actor_id: "pilot1", actor_name: "Dex Nova", role: "Co-Pilot" },
    ],
  });

  await updateRoles(ship, pilot.id, ["Gunner"]);

  assert.deepEqual(crewOf(ship).map((c) => c.role), ["Gunner"]);
});

test("changing one crew member's roles leaves the rest of the crew alone", async () => {
  makeCrewMember({ id: "pilot1", name: "Dex Nova" });
  const gunner = { actor_id: "gunner1", actor_name: "Rook", role: "Gunner" };
  const ship = makeVehicle({ crew: [gunner, { actor_id: "pilot1", actor_name: "Dex Nova", role: "Co-Pilot" }] });

  await updateRoles(ship, "pilot1", ["Gunner"]);

  assert.ok(crewOf(ship).some((c) => c.actor_id === "gunner1" && c.role === "Gunner"));
  assert.ok(crewOf(ship).some((c) => c.actor_id === "pilot1" && c.role === "Gunner"));
  assert.equal(crewOf(ship).length, 2);
});

test("a role the crew member already holds is not recorded twice", async () => {
  const pilot = makeCrewMember();
  const ship = makeVehicle({ crew: [{ actor_id: "pilot1", actor_name: "Dex Nova", role: "Gunner" }] });

  await updateRoles(ship, pilot.id, ["Gunner"]);

  assert.equal(crewOf(ship).length, 1);
});

/* -------------------------------------------------------------------------- */
/* Changing and giving up roles                                               */
/* -------------------------------------------------------------------------- */

test("changing a role moves that one assignment", async () => {
  const ship = makeVehicle({ crew: [{ actor_id: "pilot1", actor_name: "Dex Nova", role: "Gunner" }] });

  await change_role(ship, "pilot1", "Gunner", "Co-Pilot");

  assert.deepEqual(crewOf(ship).map((c) => c.role), ["Co-Pilot"]);
});

test("changing a role leaves the crew member's other roles alone", async () => {
  const ship = makeVehicle({
    crew: [
      { actor_id: "pilot1", actor_name: "Dex Nova", role: "Gunner" },
      { actor_id: "pilot1", actor_name: "Dex Nova", role: "Initiative" },
    ],
  });

  await change_role(ship, "pilot1", "Gunner", "Co-Pilot");

  assert.deepEqual(crewOf(ship).map((c) => c.role).sort(), ["Co-Pilot", "Initiative"]);
});

test("moving into a role the crew member already holds is refused with a warning", async () => {
  const ship = makeVehicle({
    crew: [
      { actor_id: "pilot1", actor_name: "Dex Nova", role: "Gunner" },
      { actor_id: "pilot1", actor_name: "Dex Nova", role: "Co-Pilot" },
    ],
  });

  await change_role(ship, "pilot1", "Gunner", "Co-Pilot");

  assert.deepEqual(warnings(), ["SWFFG.Crew.Role.Duplicate"]);
  assert.equal(crewOf(ship).length, 2, "the crew list must be left as it was");
  assert.deepEqual(crewOf(ship).map((c) => c.role).sort(), ["Co-Pilot", "Gunner"]);
});

test("giving up a role removes exactly that assignment", () => {
  const ship = makeVehicle({
    crew: [
      { actor_id: "pilot1", actor_name: "Dex Nova", role: "Gunner" },
      { actor_id: "pilot1", actor_name: "Dex Nova", role: "Co-Pilot" },
    ],
  });

  deregister_crew(ship, "pilot1", "Gunner");

  assert.deepEqual(crewOf(ship).map((c) => c.role), ["Co-Pilot"]);
});

test("giving up a role does not remove other people holding it", () => {
  const ship = makeVehicle({
    crew: [
      { actor_id: "pilot1", actor_name: "Dex Nova", role: "Gunner" },
      { actor_id: "gunner1", actor_name: "Rook", role: "Gunner" },
    ],
  });

  deregister_crew(ship, "pilot1", "Gunner");

  assert.deepEqual(crewOf(ship).map((c) => c.actor_id), ["gunner1"]);
});

test("the crew list is cleared away once the last crew member leaves", () => {
  const ship = makeVehicle({ crew: [{ actor_id: "pilot1", actor_name: "Dex Nova", role: "Gunner" }] });

  deregister_crew(ship, "pilot1", "Gunner");

  assert.equal(crewOf(ship), undefined);
});

/* -------------------------------------------------------------------------- */
/* Rolling for a role                                                         */
/*                                                                            */
/* Each role names the skill its holder rolls. A role that can no longer be    */
/* rolled has to say so, not produce a broken pool.                           */
/* -------------------------------------------------------------------------- */

test("a crew member in a known role gets a pool to roll", () => {
  makeCrewMember();
  const ship = makeVehicle();
  CONFIG.FFG.skills.Gunnery = { label: "Gunnery", value: "Gunnery", characteristic: "Agility" };
  game.actors.get("pilot1").system.skills.Gunnery = { characteristic: "Agility", rank: 1 };

  const roll = build_crew_roll(ship.id, "pilot1", "Gunner");

  assert.equal(typeof roll, "string");
  assert.notEqual(roll, "");
  assert.deepEqual(warnings(), []);
});

test("a crew member who has been deleted is reported and taken off the crew", () => {
  const ship = makeVehicle({ crew: [{ actor_id: "ghost", actor_name: "Gone", role: "Gunner" }] });

  const roll = build_crew_roll(ship.id, "ghost", "Gunner");

  assert.equal(roll, false);
  assert.deepEqual(warnings(), ["SWFFG.Crew.Actor.Removed"]);
  assert.equal(crewOf(ship), undefined, "the dangling crew entry must be cleaned up");
});

test("a role that no longer exists in the world settings is reported", () => {
  makeCrewMember();
  const ship = makeVehicle();

  const roll = build_crew_roll(ship.id, "pilot1", "Astrogator");

  assert.equal(roll, false);
  assert.deepEqual(warnings(), ["SWFFG.Crew.Role.Removed"]);
});

test("a role with no skill chosen for it is reported", () => {
  makeCrewMember();
  const ship = makeVehicle();

  const roll = build_crew_roll(ship.id, "pilot1", "Mascot");

  assert.equal(roll, false);
  assert.deepEqual(warnings(), ["SWFFG.Crew.Role.Invalid"]);
});

test("the initiative role is not rolled from the crew list", () => {
  // Initiative is rolled through the combat tracker, not the vehicle sheet.
  makeCrewMember();
  const ship = makeVehicle();

  assert.equal(build_crew_roll(ship.id, "pilot1", "Initiative"), false);
  assert.deepEqual(warnings(), []);
});

/* -------------------------------------------------------------------------- */
/* The pilot's check                                                          */
/*                                                                            */
/* A vehicle's handling helps or hinders whoever is flying it: positive        */
/* handling is boost dice, negative handling is setback dice.                 */
/* -------------------------------------------------------------------------- */

test("good handling adds boost dice", async () => {
  makeCrewMember();
  const ship = makeVehicle({ handling: 2 });

  const pool = await buildPilotRoll(ship.id, "pilot1");

  assert.equal(pool.boost, 2);
  assert.equal(pool.setback, 0);
});

test("poor handling adds setback dice, one per point", async () => {
  makeCrewMember();
  const ship = makeVehicle({ handling: -2 });

  const pool = await buildPilotRoll(ship.id, "pilot1");

  assert.equal(pool.setback, 2);
  assert.equal(pool.boost, 0);
});

test("neutral handling adds nothing either way", async () => {
  makeCrewMember();
  const ship = makeVehicle({ handling: 0 });

  const pool = await buildPilotRoll(ship.id, "pilot1");

  assert.equal(pool.boost, 0);
  assert.equal(pool.setback, 0);
});

test("a pilot check is an average check unless told otherwise", async () => {
  makeCrewMember();
  const ship = makeVehicle();

  assert.equal((await buildPilotRoll(ship.id, "pilot1")).difficulty, 2);
  assert.equal((await buildPilotRoll(ship.id, "pilot1", 0)).difficulty, 0);
  assert.equal((await buildPilotRoll(ship.id, "pilot1", 4)).difficulty, 4);
});

test("the pool is the pilot's own skill: the greater of characteristic and rank, upgraded by the lesser", async () => {
  // Agility 3, Piloting: Space 1 -> three dice, one of them upgraded.
  makeCrewMember();
  const ship = makeVehicle({ spaceShip: true });

  const pool = await buildPilotRoll(ship.id, "pilot1");

  assert.equal(pool.proficiency, 1);
  assert.equal(pool.ability, 2);
});

test("a starship is flown with Piloting: Space", async () => {
  makeCrewMember();
  const ship = makeVehicle({ spaceShip: true });

  const pool = await buildPilotRoll(ship.id, "pilot1");

  assert.equal(pool.proficiency, PILOT_SKILLS["Piloting: Space"].rank);
});

test("a planetary vehicle is driven with Piloting: Planetary", async () => {
  makeCrewMember();
  const ship = makeVehicle({ spaceShip: false });

  const pool = await buildPilotRoll(ship.id, "pilot1");

  assert.equal(pool.proficiency, PILOT_SKILLS["Piloting: Planetary"].rank);
});

test("a skill theme with a single Piloting skill uses it for starships", async () => {
  setSkills(["Piloting", "Driving"]);
  makeCrewMember();
  const ship = makeVehicle({ spaceShip: true });

  const pool = await buildPilotRoll(ship.id, "pilot1");

  assert.equal(pool.ability + pool.proficiency, PILOT_SKILLS.Piloting.rank);
});

test("a skill theme with no planetary piloting falls back to Driving", async () => {
  setSkills(["Piloting", "Driving"]);
  makeCrewMember();
  const ship = makeVehicle({ spaceShip: false });

  const pool = await buildPilotRoll(ship.id, "pilot1");

  assert.equal(pool.ability + pool.proficiency, PILOT_SKILLS.Driving.rank);
});

test("a vehicle whose pilot is gone is reported rather than blowing up", async () => {
  // The same situation as a deleted crew member in any other role, which
  // build_crew_roll warns about and cleans up instead of throwing.
  const ship = makeVehicle({ crew: [{ actor_id: "ghost", actor_name: "Gone", role: "Pilot" }] });

  await assert.doesNotReject(() => buildPilotRoll(ship.id, "ghost"));
  assert.deepEqual(warnings(), ["SWFFG.Crew.Actor.Removed"]);
});
