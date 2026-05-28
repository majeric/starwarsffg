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

export const MIGRATION_REGISTRY = [];

export async function handleUpdate() {
  const registeredVersion = game.settings.get("starwarsffg", "systemMigrationVersion");
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

export async function runMigrations(oldVersion, newVersion, options = {}) {
  const summary = { ran: [], changed: 0, errors: [] };
  for (const entry of MIGRATION_REGISTRY) {
    if (!shouldRun(entry.version, oldVersion, newVersion)) continue;
    try {
      const result = await entry.default(options.world ?? productionWorld(), options);
      summary.ran.push(entry.version);
      if (result?.changed) summary.changed += result.changed;
    } catch (err) {
      summary.errors.push({ version: entry.version, error: err });
      if (options.throwOnError) throw err;
    }
  }
  return summary;
}

function shouldRun(targetVersion, oldVersion, newVersion) {
  if (!oldVersion) return true;
  if (compareVersions(targetVersion, oldVersion) <= 0) return false;
  if (compareVersions(targetVersion, newVersion) > 0) return false;
  return true;
}

function canRegisterMigrationVersion(registeredVersion) {
  if (!registeredVersion) return true;
  return compareVersions(registeredVersion, "2.0.0") >= 0;
}

function productionWorld() {
  return {
    actors: game.actors,
    items: game.items,
    settings: game.settings,
  };
}

export function compareVersions(a, b) {
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

function splitVersion(version) {
  if (!version) return [0];
  const release = version.split("-")[0];
  return release.split(".").map((part) => {
    const n = parseInt(part, 10);
    return Number.isFinite(n) ? n : 0;
  });
}

async function sendChanges(newVersion) {
  const template = "systems/starwarsffg/templates/notifications/new_version.html";
  const html = await foundry.applications.handlebars.renderTemplate(template, { version: newVersion });
  ChatMessage.create({
    user: game.user.id,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
    content: html,
  });
}

async function warnTheme() {
  if (game.settings.get("starwarsffg", "ui-uitheme") !== "default") return;
  ChatMessage.create({
    user: game.user.id,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
    content:
      "You are using an unsupported theme. Expected issues, or swap to the Mandar theme.<br>(This message will only show once.)",
  });
}

async function warnUnsupportedWorld() {
  const content = game.i18n.localize("SWFFG.Migrate.Unsupported.Text");
  // eslint-disable-next-line no-undef -- Dialog is a Foundry global not yet listed in eslint.config.mjs; add it as part of a future maintainability cleanup.
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
