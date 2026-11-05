import { test, mock } from "node:test";
import assert from "node:assert/strict";
import {
  duplicateGroups,
  selectArmor,
  summarizeActivities,
  type Gear,
} from "../shared/companion-insights";
import {
  transferSchema,
  insertPlugSchema,
  equipLoadoutSchema,
} from "../shared/bungie-actions";

test("action contracts accept browser numbers and legacy platform strings without losing int64 precision", () => {
  for (const membershipType of [3, "3"]) {
    const value = transferSchema.parse({
      membershipType,
      characterId: "2305843009260000000",
      itemId: "6917529830000000000",
      itemReferenceHash: 123,
      transferToVault: true,
    });
    assert.equal(value.membershipType, 3);
    assert.equal(value.itemId, "6917529830000000000");
    assert.equal(value.stackSize, 1);
  }
  assert.equal(
    transferSchema.safeParse({ membershipType: null }).success,
    false,
  );
  assert.equal(
    equipLoadoutSchema.safeParse({
      membershipType: 3,
      characterId: "123",
      loadoutIndex: 10,
    }).success,
    false,
  );
  assert.equal(
    insertPlugSchema.safeParse({
      membershipType: 3,
      characterId: "123",
      itemInstanceId: "456",
      socketIndex: 1,
      plugItemHash: 99,
    }).success,
    true,
  );
});

const gear = (
  id: string,
  slot: string,
  value: number,
  rarity = "legendary",
  classType = 1,
): Gear => ({
  id,
  itemHash: Number(id),
  name: id,
  slot,
  rarity,
  classType,
  location: "vault",
  isInstanced: true,
  stats: [{ statHash: 1, name: "Stat", value }],
});
test("armor selector uses owned class-compatible pieces and allocates the single exotic optimally", () => {
  const items = ["helmet", "arms", "chest", "legs", "class"].map((slot, i) =>
    gear(String(i + 1), slot, 10),
  );
  items.push(
    gear("10", "helmet", 20, "exotic"),
    gear("11", "arms", 50, "exotic"),
    gear("12", "helmet", 1000, "legendary", 2),
  );
  items.push({ ...gear("13", "helmet", 2000), location: "postmaster" });
  const selected = selectArmor(items, 1);
  assert.equal(selected.length, 5);
  assert.deepEqual(
    selected.map((i) => i.id),
    ["1", "11", "3", "4", "5"],
  );
  assert.equal(
    selectArmor(
      items.filter((i) => i.slot !== "class"),
      1,
    ).length,
    0,
  );
});
test("duplicate comparison ignores repeated instances and non-instanced stacks", () => {
  const a = gear("1", "kinetic", 0);
  const b = { ...a, id: "2" };
  assert.deepEqual(
    duplicateGroups([a, a, b, { ...a, id: "3", isInstanced: false }]).map((g) =>
      g.map((i) => i.id),
    ),
    [["1", "2"]],
  );
});
test("activity summary labels the sample and never manufactures a K/D with zero deaths", () => {
  assert.equal(summarizeActivities([]).kd, null);
  assert.deepEqual(
    summarizeActivities([
      { kills: 20, deaths: 4, duration: 60, completed: true, modeType: 5 },
    ]),
    {
      count: 1,
      kills: 20,
      deaths: 4,
      kd: 5,
      completions: 1,
      seconds: 60,
      modes: [{ mode: 5, count: 1 }],
    },
  );
});

test("real Express routes enforce auth and ownership and send the correct Bungie payloads", async () => {
  process.env.DATABASE_URL ||= "postgresql://unused:unused@127.0.0.1:1/unused";
  const [
    { default: express },
    { storage },
    { default: bungieRouter },
    { default: companionRouter },
  ] = await Promise.all([
    import("express"),
    import("../server/storage"),
    import("../server/routes/bungie"),
    import("../server/routes/companion"),
  ]);
  mock.method(storage, "getSession", async () => ({
    id: "test",
    bungieMembershipId: "123",
    accessToken: "test-only-token",
    tokenExpiresAt: new Date(Date.now() + 60_000),
    absoluteExpiry: new Date(Date.now() + 60_000),
  }));
  const realFetch = globalThis.fetch;
  const upstream: { url: string; body: any }[] = [];
  const definitions: Record<string, any> = {
    DestinyInventoryItemDefinition: {
      99: {
        displayProperties: { name: "Test Rifle" },
        inventory: { bucketTypeHash: 1498876634, tierTypeName: "Legendary" },
      },
    },
    DestinyVendorDefinition: {
      1: { displayProperties: { name: "Test Vendor" } },
    },
    DestinyMilestoneDefinition: {
      2: { displayProperties: { name: "Weekly Test" } },
    },
  };
  mock.method(globalThis, "fetch", async (url: any, options: any = {}) => {
    if (!String(url).startsWith("https://www.bungie.net"))
      return realFetch(url, options);
    upstream.push({
      url: String(url),
      body: options.body ? JSON.parse(options.body) : null,
    });
    const path = new URL(String(url)).pathname;
    if (path.startsWith("/definitions/"))
      return Response.json(definitions[path.split("/").pop()!] || {});
    let response: any = 1;
    if (path === "/Platform/Destiny2/Manifest/")
      response = {
        version: "test",
        jsonWorldComponentContentPaths: {
          en: Object.fromEntries(
            [
              "DestinyInventoryItemDefinition",
              "DestinyVendorDefinition",
              "DestinyMilestoneDefinition",
              "DestinyCollectibleDefinition",
              "DestinyRecordDefinition",
              "DestinyProgressionDefinition",
              "DestinyObjectiveDefinition",
              "DestinyActivityDefinition",
              "DestinyStatDefinition",
            ].map((name) => [name, "/definitions/" + name]),
          ),
        },
      };
    if (path === "/Platform/Destiny2/Milestones/")
      response = { 2: { endDate: "2026-11-10T17:00:00Z" } };
    if (path.includes("/Vendors/"))
      response = {
        vendors: { data: { 1: {} } },
        sales: {
          data: {
            1: {
              saleItems: {
                0: {
                  vendorItemIndex: 0,
                  itemHash: 99,
                  saleStatus: 0,
                  quantity: 1,
                  costs: [],
                },
              },
            },
          },
        },
      };
    if (path.includes("PostGameCarnageReport"))
      response = {
        entries: [
          {
            characterId: "456",
            player: {},
            values: {},
            extended: { weapons: [{ referenceId: 99, values: {} }] },
          },
        ],
      };
    if (path.includes("/Profile/") && !path.includes("/Vendors/"))
      response = {};
    return Response.json({ ErrorCode: 1, Response: response });
  });
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.signedCookies = req.headers["x-test-auth"]
      ? { session_id: "test" }
      : {};
    next();
  });
  app.use(bungieRouter);
  app.use(companionRouter);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as { port: number };
  const request = async (path: string, body?: any, auth = true) =>
    realFetch(`http://127.0.0.1:${address.port}${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        ...(auth ? { "x-test-auth": "1" } : {}),
        "content-type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  try {
    assert.equal(
      (await request("/api/bungie/weekly", undefined, false)).status,
      401,
    );
    assert.equal((await request("/api/bungie/vendors/3/999/456")).status, 403);
    assert.equal(
      (await request("/api/bungie/activity-report/not-an-id")).status,
      400,
    );
    assert.equal(
      (await request("/api/bungie/transfer", { membershipType: 3 })).status,
      400,
    );
    const base = { characterId: "456", membershipType: 3 };
    const transfer = await request("/api/bungie/transfer", {
      ...base,
      itemReferenceHash: 99,
      itemId: "789",
      transferToVault: true,
      stackSize: 5,
    });
    assert.equal(transfer.status, 200);
    assert.equal(upstream.at(-1)?.body.stackSize, 5);
    const plug = await request("/api/bungie/insert-plug", {
      ...base,
      itemInstanceId: "789",
      socketIndex: 2,
      plugItemHash: 99,
    });
    assert.equal(plug.status, 200);
    assert.deepEqual(upstream.at(-1)?.body, {
      ...base,
      itemId: "789",
      plug: { socketIndex: 2, socketArrayType: 0, plugItemHash: 99 },
    });
    const renamed = await request("/api/bungie/update-loadout-name", {
      ...base,
      loadoutIndex: 0,
      nameHash: 101,
    });
    assert.equal(renamed.status, 200);
    assert.match(upstream.at(-1)!.url, /UpdateLoadoutIdentifiers/);
    assert.equal(upstream.at(-1)!.body.nameHash, 101);
    // A mutation invalidates the cached profile even though platform IDs arrived as numbers.
    await request("/api/bungie/profile-state/3/123");
    await request("/api/bungie/profile-state/3/123");
    const profilesBefore = upstream.filter((r) =>
      r.url.includes("/Profile/123/?components="),
    ).length;
    await request("/api/bungie/lock", { ...base, itemId: "789", state: true });
    await request("/api/bungie/profile-state/3/123");
    assert.ok(
      upstream.filter((r) => r.url.includes("/Profile/123/?components="))
        .length > profilesBefore,
    );
    const weekly = await (await request("/api/bungie/weekly")).json();
    assert.equal(weekly[0].name, "Weekly Test");
    const vendors = await (
      await request("/api/bungie/vendors/3/123/456")
    ).json();
    assert.equal(vendors.vendors[0].name, "Test Vendor");
    assert.equal(vendors.vendors[0].items[0].name, "Test Rifle");
    const report = await (
      await request("/api/bungie/activity-report/777")
    ).json();
    assert.equal(report.players[0].kills, null);
    assert.equal(report.players[0].weapons[0].kills, null);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    mock.restoreAll();
  }
});

test("game writes are not replayed after an ambiguous transport failure", async () => {
  const { transferItem } = await import("../server/bungie");
  let attempts = 0;
  mock.method(globalThis, "fetch", async () => {
    attempts++;
    throw new TypeError("fetch failed");
  });
  try {
    await assert.rejects(() =>
      transferItem(
        {
          itemReferenceHash: 99,
          itemId: "789",
          characterId: "456",
          membershipType: 3,
          transferToVault: true,
        },
        "test-only-token",
      ),
    );
    assert.equal(attempts, 1);
  } finally {
    mock.restoreAll();
  }
});
