import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
mkdirSync("artifacts/guardian-e2e", { recursive: true });
import { chromium } from "playwright";
const base = process.env.GG_PREVIEW_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({ executablePath: process.env.GG_CHROMIUM_PATH,
  headless: true,
  args: ["--no-sandbox"],
});
const item = (id, slot, extra = {}) => ({
  id,
  itemHash: 10,
  name: "Test gear",
  slot,
  rarity: "legendary",
  classType: 1,
  location: "vault",
  isInstanced: true,
  power: 2000,
  type: "Armor",
  icon: "",
  screenshot: "",
  stats: [{ statHash: 1, name: "Health", value: 20 }],
  sockets: [],
  ...extra,
});
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion: "reduce",
    });
    const errors = [];
    const writes = [];
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await context.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      let body = [];
      if (path === "/api/auth/me")
        body = {
          membershipId: "123",
          membershipType: 3,
          displayName: "Test Guardian",
        };
      if (path === "/api/bungie/membership")
        body = {
          membershipId: "123",
          membershipType: 3,
          displayName: "Test Guardian",
        };
      if (path.startsWith("/api/bungie/profile-state/"))
        body = {
          characters: [
            {
              characterId: "456",
              classType: 1,
              className: "Hunter",
              raceName: "Awoken",
              light: 2000,
              stats: [],
              equippedItems: [
                item("300", "kinetic", {
                  name: "Socket Test",
                  location: "equipped",
                  characterId: "456",
                  sockets: [
                    {
                      socketIndex: 1,
                      plugHash: 1,
                      name: "Current perk",
                      isEnabled: true,
                      reusablePlugs: [
                        { plugHash: 1, name: "Current perk" },
                        { plugHash: 2, name: "New perk" },
                      ],
                    },
                  ],
                }),
              ],
              inventory: [],
              quests: [],
              progressions: [],
            },
          ],
          vaultItems: [
            ...["helmet", "arms", "chest", "legs", "class"].map((slot, i) =>
              item(String(i + 1), slot, { itemHash: i + 10 }),
            ),
            item("99", "helmet", { locked: true }),
          ],
          postmasterItems: [],
          currencies: [],
          collectibles: [],
          records: [],
          inGameLoadouts: {
            456: [{ index: 0, name: "Test Loadout", items: [] }],
          },
        };
      if (path === "/api/bungie/weekly")
        body = [
          {
            hash: 1,
            name: "Weekly Test",
            description: "Test milestone",
            endDate: null,
          },
        ];
      if (path.startsWith("/api/bungie/vendors/"))
        body = {
          unavailable: false,
          vendors: [
            {
              hash: 1,
              name: "Test Vendor",
              salesUnavailable: false,
              nextRefreshDate: null,
              items: [
                {
                  index: 0,
                  name: "Test Rifle",
                  quantity: 1,
                  available: true,
                  costs: [{ name: "Glimmer", quantity: 100 }],
                },
              ],
            },
          ],
        };
      if (path.startsWith("/api/bungie/activity-history/"))
        body = [
          {
            instanceId: "777",
            activityName: "Test Match",
            date: "2026-11-05T10:00:00Z",
            modeType: 5,
            kills: 10,
            deaths: 2,
            duration: 120,
            completed: true,
          },
        ];
      if (path.startsWith("/api/bungie/activity-report/"))
        body = {
          name: "Test Match",
          players: [
            {
              characterId: "456",
              name: "Test Guardian",
              kills: 10,
              deaths: 2,
              assists: 4,
              weapons: [{ itemHash: 99, name: "Test Rifle", kills: 8 }],
            },
          ],
        };
      if (path === "/api/bungie/loadout-names")
        body = [{ hash: 101, name: "Test Name" }];
      if (
        [
          "/api/bungie/equip-loadout",
          "/api/bungie/update-loadout-name",
          "/api/bungie/insert-plug",
        ].includes(path)
      ) {
        writes.push({ path, ...route.request().postDataJSON() });
        body = { ErrorCode: 1 };
      }
      if (path === "/api/bungie/lock") {
        writes.push(route.request().postDataJSON());
        body = { ErrorCode: 1 };
      }
      if (path === "/api/config/turnstile")
        body = { enabled: false, siteKey: "" };
      if (path === "/api/premium/status") body = { isPremium: false, aiUsage: { used: 0, limit: 5, remaining: 5 } };
      if (path === "/api/ai/usage") body = { used: 0, limit: 5, remaining: 5 };
      await route.fulfill({ json: body });
    });
    await page.goto(base + "/dashboard");
    await page.getByTestId("text-power-level").waitFor();
    if (width < 768) {
      await page.getByTestId("bottom-tab-more").click();
      await page.getByTestId("menu-item-companion").click();
    } else
      await page
        .getByRole("navigation", { name: "GuardianGrid sections" })
        .getByRole("button", { name: "COMPANION", exact: true })
        .click();
    await page.getByText("Weekly Test", { exact: true }).waitFor();
    await page.getByTestId("companion-tab-vendors").click();
    await page.getByText("Test Rifle", { exact: true }).waitFor();
    await page.getByTestId("companion-tab-stats").click();
    await page.getByLabel(/Aktivitätsbericht|Activity report/).selectOption("777");
    await page.getByText("Test Rifle: 8 Kills", { exact: true }).waitFor();
    await page.getByTestId("companion-tab-arsenal").click();
    await page.getByRole("button", { name: /^Ausrüsten$|^Equip$/ }).click();
    await page.waitForTimeout(100);
    assert.equal(writes.at(-1).path, "/api/bungie/equip-loadout");
    await page
      .getByLabel(/Loadout-Name|Loadout name/, { exact: true })
      .selectOption("101");
    await page.getByRole("button", { name: /Umbenennen|Rename/ }).click();
    await page.waitForTimeout(100);
    assert.equal(writes.at(-1).nameHash, 101);
    await page.getByLabel("Current perk", { exact: true }).selectOption("2");
    await page.getByRole("button", { name: /Anwenden|Apply/ }).click();
    await page.waitForTimeout(100);
    assert.equal(writes.at(-1).plugItemHash, 2);
    await page.locator("summary").filter({ hasText: "Test gear" }).click();
    await page
      .getByRole("button", { name: /Schützen|^Lock$/ })
      .first()
      .click();
    await page.waitForTimeout(100);
    assert.equal(writes.length, 4);
    assert.equal(writes.at(-1).membershipType, 3);
    assert.equal(writes.at(-1).state, true);
    assert.ok(await page.getByTestId("companion-adopt-armor").isEnabled());
    const layout = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      innerWidth,
    ]);
    assert.ok(layout[0] <= layout[1] + 4, "horizontal overflow");
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `artifacts/guardian-e2e/companion-${width}.png` });
    await page.getByTestId("companion-adopt-armor").click();
    await page.getByTestId("panel-companion").waitFor({ state: "hidden" });
    await context.close();
    console.log(
      `PASS Companion: milestones, vendors, activity report, armor, locks, adoption (${width}px)`,
    );
  }
} finally {
  await browser.close();
}
