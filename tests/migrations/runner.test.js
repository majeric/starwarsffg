import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  compareVersions,
  runMigrations,
  MIGRATION_REGISTRY,
} from "../../modules/migrations/runner.js";

describe("compareVersions", () => {
  it("returns -1 when a is older than b", () => {
    expect(compareVersions("1.901", "1.906")).toBe(-1);
    expect(compareVersions("1.907", "2.0.0")).toBe(-1);
    expect(compareVersions("2.0.3", "2.1.0")).toBe(-1);
  });

  it("returns 1 when a is newer than b", () => {
    expect(compareVersions("1.906", "1.901")).toBe(1);
    expect(compareVersions("2.0.0", "1.907")).toBe(1);
  });

  it("returns 0 when versions are equal", () => {
    expect(compareVersions("2.0.3", "2.0.3")).toBe(0);
  });

  it("ignores pre-release suffix for ordering", () => {
    expect(compareVersions("2.0.3-fork.0", "2.0.3")).toBe(0);
  });

  it("treats missing parts as 0", () => {
    expect(compareVersions("2", "2.0.0")).toBe(0);
    expect(compareVersions("2.0", "2.0.0")).toBe(0);
  });

  it("handles empty/undefined safely (returns 0 / 0)", () => {
    expect(compareVersions("", "")).toBe(0);
    expect(compareVersions(undefined, undefined)).toBe(0);
  });
});

describe("runMigrations", () => {
  beforeEach(() => {
    MIGRATION_REGISTRY.length = 0;
  });

  it("runs no migrations when registry is empty", async () => {
    const summary = await runMigrations("1.0.0", "2.0.0", { world: {} });
    expect(summary.ran).toEqual([]);
    expect(summary.errors).toEqual([]);
  });

  it("runs migrations strictly between old and new versions", async () => {
    const a = vi.fn().mockResolvedValue({ changed: 1 });
    const b = vi.fn().mockResolvedValue({ changed: 0 });
    const c = vi.fn().mockResolvedValue({ changed: 2 });
    MIGRATION_REGISTRY.push(
      { version: "1.901", default: a },
      { version: "1.906", default: b },
      { version: "1.907", default: c },
    );
    const summary = await runMigrations("1.901", "1.907", { world: {} });
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledOnce();
    expect(c).toHaveBeenCalledOnce();
    expect(summary.ran).toEqual(["1.906", "1.907"]);
    expect(summary.changed).toBe(2);
  });

  it("runs all migrations when oldVersion is empty", async () => {
    const a = vi.fn().mockResolvedValue({});
    MIGRATION_REGISTRY.push({ version: "1.901", default: a });
    const summary = await runMigrations(undefined, "2.0.0", { world: {} });
    expect(a).toHaveBeenCalledOnce();
    expect(summary.ran).toEqual(["1.901"]);
  });

  it("skips migrations newer than newVersion", async () => {
    const future = vi.fn();
    MIGRATION_REGISTRY.push({ version: "3.0.0", default: future });
    await runMigrations("1.0.0", "2.0.0", { world: {} });
    expect(future).not.toHaveBeenCalled();
  });

  it("captures errors instead of throwing by default", async () => {
    const broken = vi.fn().mockRejectedValue(new Error("boom"));
    MIGRATION_REGISTRY.push({ version: "1.901", default: broken });
    const summary = await runMigrations("1.0.0", "2.0.0", { world: {} });
    expect(summary.errors).toHaveLength(1);
    expect(summary.errors[0].version).toBe("1.901");
  });

  it("rethrows errors when throwOnError option is set", async () => {
    const broken = vi.fn().mockRejectedValue(new Error("boom"));
    MIGRATION_REGISTRY.push({ version: "1.901", default: broken });
    await expect(
      runMigrations("1.0.0", "2.0.0", { world: {}, throwOnError: true }),
    ).rejects.toThrow("boom");
  });
});
