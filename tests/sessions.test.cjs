const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

// Exercise the actual pure TypeScript modules without bringing React Native into Node.
function load(relative, overrides = {}) {
  const source = fs.readFileSync(path.join(__dirname, "..", relative), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const mockedRequire = (name) => name in overrides ? overrides[name] : require(name);
  new Function("module", "exports", "require", compiled)(module, module.exports, mockedRequire);
  return module.exports;
}
const { emptyCatalog, parseCatalog, upsertSession, normalizeSession } = load("src/storage/sessionCatalog.ts");
const { resumePosition, undoProgress } = load("src/utils/sessionProgress.ts");
const item = (id, time) => ({ id, creationTime: time, uri: id, filename: id, mediaType: "photo" });
const session = (id, kind = "photos") => normalizeSession({ id, kind, startDate: 100, folders: [] });

test("migration retains the legacy cursor, date and trash", () => {
  const legacy = { id: "old", startDate: 100, currentIndex: 20, lastAnalyzedId: "a", lastAnalyzedCreationTime: 50, trash: [item("b", 40)] };
  const catalog = parseCatalog(null, JSON.stringify(legacy));
  assert.equal(catalog.sessions.length, 1);
  assert.equal(catalog.activeIds.photos, "old");
  assert.equal(catalog.sessions[0].kind, "photos");
  assert.equal(catalog.sessions[0].currentIndex, 20);
  assert.deepEqual(catalog.sessions[0].trash, legacy.trash);
  assert.equal(catalog.sessions[0].lastAnalyzedCreationTime, 50);
});

test("a new session preserves old progress and section trash", () => {
  const old = { ...session("old"), currentIndex: 60, lastAnalyzedCreationTime: 12, trash: [item("x", 12)] };
  let catalog = upsertSession(emptyCatalog(), old);
  catalog = upsertSession(catalog, { ...session("new"), trash: old.trash });
  assert.equal(catalog.sessions.length, 2);
  assert.equal(catalog.sessions.find((s) => s.id === "old").currentIndex, 60);
  assert.equal(catalog.activeIds.photos, "new");
  assert.deepEqual(catalog.sessions.find((s) => s.id === "old").trash, old.trash);
});

test("trash updates are shared only within the same section", () => {
  let catalog = upsertSession(emptyCatalog(), session("photo1"));
  catalog = upsertSession(catalog, session("photo2"));
  catalog = upsertSession(catalog, { ...session("doc", "documents"), trash: [item("pdf", 5)] });
  catalog = upsertSession(catalog, { ...session("photo1"), currentIndex: 7, trash: [item("a", 3)] });
  assert.equal(catalog.sessions.find((s) => s.id === "photo2").trash[0].id, "a");
  assert.equal(catalog.sessions.find((s) => s.id === "photo2").currentIndex, 0);
  assert.equal(catalog.sessions.find((s) => s.id === "doc").trash[0].id, "pdf");
  catalog = upsertSession(catalog, { ...session("photo2"), trash: [] });
  assert.deepEqual(catalog.sessions.find((s) => s.id === "photo1").trash, []);
  assert.equal(catalog.activeIds.documents, "doc");
});

test("persisted multi-session catalog takes precedence over legacy backup", () => {
  const catalog = upsertSession(emptyCatalog(), session("new"));
  const loaded = parseCatalog(JSON.stringify(catalog), JSON.stringify(session("legacy")));
  assert.deepEqual(loaded, catalog);
});

test("corrupt catalogs fail instead of silently starting from scratch", () => {
  assert.throws(() => parseCatalog("{broken", null));
  assert.throws(() => parseCatalog('{"version":3}', null));
  assert.throws(() => parseCatalog('{"version":2,"sessions":[{}]}', null));
  assert.throws(() => parseCatalog(null, '{}'));
  assert.equal(normalizeSession({ id: "s", startDate: 10, trash: [{}] }), null);
});

test("resuming uses the last ID rather than a stale numeric index", () => {
  const saved = { ...session("s"), lastAnalyzedId: "b", currentIndex: 99 };
  assert.deepEqual(resumePosition([item("a", 90), item("b", 80), item("c", 70)], saved), { index: 2, missing: false });
});

test("missing anchors fall back to date, including an empty library", () => {
  const saved = { ...session("s"), lastAnalyzedId: "gone", lastAnalyzedCreationTime: 80 };
  assert.deepEqual(resumePosition([item("a", 90), item("c", 70)], saved), { index: 1, missing: true });
  assert.deepEqual(resumePosition([], saved), { index: 0, missing: true });
  assert.deepEqual(resumePosition([item("a", 90)], saved), { index: 1, missing: true });
});

test("a new session always starts at the newest matching item", () => {
  assert.deepEqual(resumePosition([item("a", 90)], session("s")), { index: 0, missing: false });
});

test("undo returns to the discarded card even after more keep actions", () => {
  const discarded = item("discard", 70);
  const saved = { ...session("s"), currentIndex: 9, lastAnalyzedId: "later", trash: [discarded, item("other", 60)] };
  const undone = undoProgress(saved, discarded, { index: 4, previousId: "before", previousDate: 80, wasInTrash: false });
  assert.equal(undone.currentIndex, 4);
  assert.equal(undone.lastAnalyzedId, "before");
  assert.equal(undone.lastAnalyzedCreationTime, 80);
  assert.deepEqual(undone.trash.map((entry) => entry.id), ["other"]);
});

test("undo does not restore a file that was already in another session's shared trash", () => {
  const discarded = item("already-pending", 70);
  const saved = { ...session("s"), trash: [discarded] };
  const undone = undoProgress(saved, discarded, { index: 0, previousId: null, previousDate: null, wasInTrash: true });
  assert.deepEqual(undone.trash, [discarded]);
  assert.equal(undone.currentIndex, 0);
});

test("storage serializes writes so an older session cannot overwrite a newer snapshot", async () => {
  const snapshots = [];
  let active = 0;
  let maxActive = 0;
  const api = load("src/storage/sessionStorage.ts", {
    "@react-native-async-storage/async-storage": { __esModule: true, default: { setItem: async (_, raw) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, snapshots.length === 0 ? 10 : 1));
      snapshots.push(JSON.parse(raw));
      active--;
    } } },
    "./sessionCatalog": { parseCatalog }
  });
  const older = upsertSession(emptyCatalog(), session("old"));
  const newer = upsertSession(older, session("new"));
  await Promise.all([api.saveCatalog(older), api.saveCatalog(newer)]);
  assert.equal(maxActive, 1);
  assert.equal(snapshots.at(-1).sessions.length, 2);
});

test("a failed write does not poison subsequent saves", async () => {
  let calls = 0;
  const api = load("src/storage/sessionStorage.ts", {
    "@react-native-async-storage/async-storage": { __esModule: true, default: { setItem: async () => {
      if (++calls === 1) throw new Error("Disk full");
    } } },
    "./sessionCatalog": { parseCatalog }
  });
  await assert.rejects(api.saveCatalog(emptyCatalog()));
  await api.saveCatalog(emptyCatalog());
  assert.equal(calls, 2);
});

test("storage migration writes a new catalog without deleting the legacy backup", async () => {
  const writes = [];
  const legacy = JSON.stringify({ id: "old", startDate: 10, trash: [] });
  const api = load("src/storage/sessionStorage.ts", {
    "@react-native-async-storage/async-storage": { __esModule: true, default: {
      multiGet: async () => [["photinder.sessions.v2", null], ["photinder.session.v1", legacy]],
      setItem: async (key, raw) => writes.push([key, raw]),
      removeItem: () => assert.fail("The legacy backup must not be deleted")
    } },
    "./sessionCatalog": { parseCatalog }
  });
  assert.equal((await api.loadCatalog()).sessions[0].id, "old");
  assert.equal(writes.length, 1);
  assert.equal(writes[0][0], "photinder.sessions.v2");
});

test("document scanning deduplicates overlapping folders and sorts by modification date", async () => {
  const native = { listDocuments: async (token) => token === "first"
    ? [item("old", 10), item("same", 20)]
    : [item("new", 30), item("same", 20)] };
  const api = load("src/services/documents.ts", { expo: { requireOptionalNativeModule: () => native } });
  const files = await api.listDocuments([{ token: "first", name: "One" }, { token: "second", name: "Two" }]);
  assert.deepEqual(files.map((entry) => entry.id), ["new", "same", "old"]);
  assert.equal(files[0].mediaType, "document");
  assert.equal(files[0].folderToken, "second");
});

test("document deletion preserves per-file native failures and original references", async () => {
  let request;
  const native = { deleteDocuments: async (items) => {
    request = items;
    return { deletedIds: ["a"], failures: [{ id: "b", message: "Read only" }] };
  } };
  const api = load("src/services/documents.ts", { expo: { requireOptionalNativeModule: () => native } });
  const result = await api.deleteDocuments([{ ...item("a", 5), folderToken: "folder" }, { ...item("b", 4), folderToken: "folder" }]);
  assert.deepEqual(request[0], { id: "a", uri: "a", token: "folder" });
  assert.equal(result.failures[0].id, "b");
  assert.deepEqual(result.deletedIds, ["a"]);
});

test("Expo Go reports that a native document build is required", () => {
  const api = load("src/services/documents.ts", { expo: { requireOptionalNativeModule: () => null } });
  assert.throws(() => api.pickDocumentFolder(), /nuovo APK/);
});
