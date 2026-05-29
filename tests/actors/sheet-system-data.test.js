import { describe, expect, it } from "vitest";
import { buildActorSheetSystemData } from "../../modules/actors/sheet-system-data.js";

describe("buildActorSheetSystemData", () => {
  it("uses prepared DataModel defaults missing from serialized actor data", () => {
    const actorData = { system: { attributes: {} } };
    const preparedSystem = {
      toObject: () => ({
        attributes: {},
        skills: { Brawl: { rank: 0, type: "Combat" } },
      }),
      skilltypes: [{ type: "Combat", label: "Combat" }],
    };

    const systemData = buildActorSheetSystemData(actorData, preparedSystem);

    expect(systemData.skills.Brawl).toEqual({ rank: 0, type: "Combat" });
    expect(systemData.skilltypes).toEqual([{ type: "Combat", label: "Combat" }]);
  });

  it("keeps source-only custom skill keys while overlaying prepared core skills", () => {
    const actorData = {
      system: {
        skills: {
          "Custom Skill": { rank: 2, type: "General", custom: true },
        },
      },
    };
    const preparedSystem = {
      toObject: () => ({
        skills: {
          Brawl: { rank: 1, type: "Combat", label: "Brawl" },
        },
      }),
    };

    const systemData = buildActorSheetSystemData(actorData, preparedSystem);

    expect(systemData.skills["Custom Skill"]).toEqual({ rank: 2, type: "General", custom: true });
    expect(systemData.skills.Brawl).toEqual({ rank: 1, type: "Combat", label: "Brawl" });
  });
});
