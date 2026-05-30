/**
 * Semver-aware migration runner. Replaces the parseFloat-based dispatcher
 * that previously lived in swffg-migration.js (Phase 11).
 *
 * Migrations are imported from per-version files and listed in
 * MIGRATION_REGISTRY. Each entry exports `{ version, slug, description,
 * default: migrate }` where `migrate(world, options)` is an async function.
 *
 * `runMigrations(oldVersion, newVersion, options)` runs every registered
 * migration whose version is strictly newer than `oldVersion` and not
 * newer than `newVersion`, in ascending version order.
 */

/**
 * Migrations register themselves via `modules/migrations/index.js`, which
 * loads each per-version file and pushes entries into this array. Keeping
 * the registry empty at runner-import time lets unit tests load the runner
 * without pulling in Foundry-dependent migration code.
 */
export interface MigrationRunOptions {
  world?: MigrationWorld;
  throwOnError?: boolean;
}

export interface MigrationWorld {
  actors?: any;
  items?: any;
  settings?: any;
}

export interface MigrationResult {
  changed?: number;
}

export interface MigrationEntry {
  version: string;
  slug?: string;
  description?: string;
  default: (world: MigrationWorld, options: MigrationRunOptions) => Promise<MigrationResult | void>;
}

export interface MigrationSummary {
  ran: string[];
  changed: number;
  errors: Array<{ version: string; error: unknown }>;
}

export const MIGRATION_REGISTRY: MigrationEntry[] = [];

export async function handleUpdate(): Promise<void> {
  const registeredVersion = game.settings.get("starwarsffg", "systemMigrationVersion") as unknown as string;
  const runningVersion = game.system.version;
  if (registeredVersion === runningVersion) return;

  await runMigrations(registeredVersion, runningVersion);
  await sendChanges(runningVersion);
  await warnTheme();

  if (canRegisterMigrationVersion(registeredVersion)) {
    await game.settings.set("starwarsffg", "systemMigrationVersion", runningVersion);
  } else {
    await warnUnsupportedWorld();
  }
}

export async function runMigrations(
  oldVersion: string | undefined,
  newVersion: string,
  options: MigrationRunOptions = {},
): Promise<MigrationSummary> {
  const summary: MigrationSummary = { ran: [], changed: 0, errors: [] };
  for (const entry of MIGRATION_REGISTRY) {
    if (!shouldRun(entry.version, oldVersion, newVersion)) continue;
    try {
      const result = await entry.default(options.world ?? productionWorld(), options);
      summary.ran.push(entry.version);
      if (result && result.changed) summary.changed += result.changed;
    } catch (err) {
      summary.errors.push({ version: entry.version, error: err });
      if (options.throwOnError) throw err;
    }
  }
  return summary;
}

function shouldRun(targetVersion: string, oldVersion: string | undefined, newVersion: string): boolean {
  if (!oldVersion) return true;
  if (compareVersions(targetVersion, oldVersion) <= 0) return false;
  if (compareVersions(targetVersion, newVersion) > 0) return false;
  return true;
}

function canRegisterMigrationVersion(registeredVersion: string | undefined): boolean {
  if (!registeredVersion) return true;
  return compareVersions(registeredVersion, "2.0.0") >= 0;
}

function productionWorld(): MigrationWorld {
  return {
    actors: game.actors,
    items: game.items,
    settings: game.settings,
  };
}

export function compareVersions(a?: string, b?: string): number {
  const aParts = splitVersion(a);
  const bParts = splitVersion(b);
  const len = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < len; i++) {
    const av = aParts[i] ?? 0;
    const bv = bParts[i] ?? 0;
    if (av !== bv) return av < bv ? -1 : 1;
  }
  return 0;
}

function splitVersion(version?: string): number[] {
  if (!version) return [0];
  const release = version.split("-")[0];
  return release.split(".").map((part) => {
    const n = parseInt(part, 10);
    return Number.isFinite(n) ? n : 0;
  });
}

async function sendChanges(newVersion: string): Promise<void> {
  const template = "systems/starwarsffg/templates/notifications/new_version.html";
  const html = await foundry.applications.handlebars.renderTemplate(template, { version: newVersion });
  ChatMessage.create({
    user: game.user.id,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
    content: html,
  } as any);
}

async function warnTheme(): Promise<void> {
  if ((game.settings.get("starwarsffg", "ui-uitheme") as unknown as string) !== "default") return;
  ChatMessage.create({
    user: game.user.id,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
    content:
      "You are using an unsupported theme. Expected issues, or swap to the Mandar theme.<br>(This message will only show once.)",
  } as any);
}

async function warnUnsupportedWorld(): Promise<void> {
  const content = game.i18n.localize("SWFFG.Migrate.Unsupported.Text");
  new Dialog(
    {
      title: game.i18n.localize("SWFFG.Migrate.Unsupported.Title"),
      content,
      buttons: {
        ok: {
          icon: '<i class="fas fa-exclamation"></i>',
          label: game.i18n.localize("SWFFG.Migrate.Unsupported.Button"),
        },
      },
    },
    {
      classes: ["dialog", "starwarsffg"],
    },
  ).render(true);
}
