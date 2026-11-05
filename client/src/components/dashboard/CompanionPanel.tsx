import { BungieActionsPanel } from "./BungieActionsPanel";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import type {
  CharacterData,
  InventoryItem,
  InGameLoadout,
} from "@/hooks/use-profile-state";
import { useI18n } from "@/lib/i18n";
import { useSetLockState, useIsBungieMutating } from "@/hooks/use-transfer";
import { useToast } from "@/hooks/use-toast";
import {
  duplicateGroups,
  selectArmor,
  summarizeActivities,
} from "@shared/companion-insights";
import type { ActivitySample } from "@shared/companion-insights";

type Milestone = {
  hash: number;
  name: string;
  description: string;
  endDate: string | null;
};
type VendorItem = {
  index: number;
  name: string;
  quantity: number;
  available: boolean;
  costs: { name: string; quantity: number }[];
};
type Vendor = {
  hash: number;
  name: string;
  salesUnavailable: boolean;
  nextRefreshDate: string | null;
  items: VendorItem[];
};
type History = ActivitySample & {
  instanceId: string;
  activityName: string;
  date: string;
};
type Report = {
  name: string;
  players: {
    characterId: string;
    name: string;
    kills: number | null;
    deaths: number | null;
    assists: number | null;
    weapons: { itemHash: number; name: string; kills: number | null }[];
  }[];
};
const button =
  "px-3 py-2 text-sm rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40";
const select =
  "w-full rounded-lg bg-[#101420] p-3 text-sm border border-white/10";

function useCompanionData<T>(path: string, enabled: boolean) {
  return useQuery<T>({
    queryKey: ["companion", path],
    enabled,
    staleTime: 300_000,
    queryFn: async ({ signal }) => {
      const response = await fetch(path, { credentials: "include", signal });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const error = new Error(body.message || "Bungie data unavailable");
        Object.assign(error, {
          status: response.status,
          errorType: body.errorType,
        });
        throw error;
      }
      return response.json();
    },
  });
}

function QueryState({
  query,
  empty,
  de,
}: {
  query: { isLoading: boolean; error: Error | null; refetch: () => unknown };
  empty: boolean;
  de: boolean;
}) {
  if (query.isLoading)
    return (
      <p role="status" className="flex gap-2 text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        {de ? "Lädt von Bungie …" : "Loading from Bungie …"}
      </p>
    );
  if (query.error)
    return (
      <div role="alert" className="space-y-3">
        <p className="text-amber-300">{query.error.message}</p>
        <button className={button} onClick={() => query.refetch()}>
          {de ? "Erneut versuchen" : "Retry"}
        </button>
      </div>
    );
  if (empty)
    return (
      <p className="text-gray-400">
        {de
          ? "Bungie liefert dafür momentan keine Daten."
          : "Bungie currently provides no data for this view."}
      </p>
    );
  return null;
}

export function CompanionPanel({
  membershipType,
  membershipId,
  characters,
  vaultItems,
  selectedCharacterId,
  onAdoptArmor,
  inGameLoadouts,
}: {
  membershipType: number;
  membershipId: string;
  characters: CharacterData[];
  vaultItems: InventoryItem[];
  selectedCharacterId: string | null;
  onAdoptArmor: (items: InventoryItem[], characterId: string) => void;
  inGameLoadouts: Record<string, InGameLoadout[]>;
}) {
  const { language } = useI18n();
  const de = language === "de";
  const [tab, setTab] = useState<"weekly" | "vendors" | "stats" | "arsenal">(
    "weekly",
  );
  const [chosenCharacter, setChosenCharacter] = useState(
    selectedCharacterId || characters[0]?.characterId || "",
  );
  const character =
    characters.find((c) => c.characterId === chosenCharacter) || characters[0];
  const charId = character?.characterId || "";
  const [vendorHash, setVendorHash] = useState("");
  const [activityId, setActivityId] = useState("");
  const [priority, setPriority] = useState("");
  const [search, setSearch] = useState("");
  const weekly = useCompanionData<Milestone[]>(
    "/api/bungie/weekly",
    tab === "weekly",
  );
  const vendors = useCompanionData<{ unavailable: boolean; vendors: Vendor[] }>(
    `/api/bungie/vendors/${membershipType}/${membershipId}/${charId}`,
    tab === "vendors" && !!charId,
  );
  const history = useCompanionData<History[]>(
    `/api/bungie/activity-history/${membershipType}/${membershipId}/${charId}?mode=all&count=50&page=0`,
    tab === "stats" && !!charId,
  );
  const report = useCompanionData<Report>(
    `/api/bungie/activity-report/${activityId}`,
    tab === "stats" && !!activityId,
  );
  const items = useMemo(
    () => [
      ...vaultItems,
      ...characters.flatMap((c) => [...c.inventory, ...c.equippedItems]),
    ],
    [vaultItems, characters],
  );
  const groups = useMemo(
    () =>
      duplicateGroups(items).filter((group) =>
        group[0].name.toLowerCase().includes(search.toLowerCase()),
      ),
    [items, search],
  );
  const armor = useMemo(
    () =>
      character
        ? selectArmor(
            items,
            character.classType,
            priority ? Number(priority) : undefined,
          )
        : [],
    [items, character, priority],
  );
  const statOptions = useMemo(
    () => [
      ...new Map(
        items
          .filter((i) => ["helmet", "arms", "chest", "legs"].includes(i.slot))
          .flatMap((i) => i.stats || [])
          .map((stat) => [stat.statHash, stat.name]),
      ).entries(),
    ],
    [items],
  );
  const summary = useMemo(
    () => summarizeActivities(history.data || []),
    [history.data],
  );
  const lock = useSetLockState();
  const mutating = useIsBungieMutating();
  const { toast } = useToast();
  const vendor =
    vendors.data?.vendors.find((v) => String(v.hash) === vendorHash) ||
    vendors.data?.vendors[0];
  const date = (value: string | null) =>
    value
      ? new Date(value).toLocaleString(language)
      : de
        ? "Nicht angegeben"
        : "Not supplied";
  async function toggleLock(item: InventoryItem) {
    if (mutating || !charId) return;
    try {
      await lock.mutateAsync({
        itemId: item.id,
        characterId: item.characterId || charId,
        membershipType,
        state: !item.locked,
      });
      toast({ title: de ? "Sperrstatus aktualisiert" : "Lock state updated" });
    } catch (error) {
      toast({
        title: de ? "Aktion fehlgeschlagen" : "Action failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  }
  return (
    <div
      className="h-full overflow-y-auto p-4 md:p-8 scroll-container"
      data-testid="panel-companion"
    >
      <div className="max-w-4xl mx-auto space-y-6 pb-24">
        <header>
          <h2 className="text-xl text-white">Companion</h2>
          <p className="text-sm text-gray-400 mt-2">
            {de
              ? "Aktuelle Angebote, deine letzten Aktivitäten und Hilfe für deinen Tresor."
              : "Current offers, your recent activities and help with your vault."}
          </p>
        </header>
        <div
          role="tablist"
          aria-label="Companion"
          className="flex gap-2 flex-wrap"
        >
          {(
            [
              ["weekly", de ? "Wochenziele" : "Milestones"],
              ["vendors", de ? "Händler" : "Vendors"],
              ["stats", de ? "Spielprofil" : "Activity profile"],
              ["arsenal", de ? "Ausrüstung" : "Gear"],
            ] as const
          ).map(([id, title]) => (
            <button
              role="tab"
              aria-selected={tab === id}
              key={id}
              onClick={() => setTab(id)}
              className={`${button} ${tab === id ? "text-indigo-300 ring-1 ring-indigo-400/40" : "text-gray-400"}`}
              data-testid={`companion-tab-${id}`}
            >
              {title}
            </button>
          ))}
        </div>
        {tab !== "weekly" && (
          <label className="block text-sm text-gray-400 space-y-2">
            <span>{de ? "Charakter" : "Character"}</span>
            <select
              aria-label={de ? "Charakter" : "Character"}
              className={select}
              value={charId}
              onChange={(event) => {
                setChosenCharacter(event.target.value);
                setActivityId("");
                setVendorHash("");
              }}
            >
              {characters.map((c) => (
                <option key={c.characterId} value={c.characterId}>
                  {c.className} · {c.light}
                </option>
              ))}
            </select>
          </label>
        )}
        {tab === "weekly" && (
          <section
            className="space-y-4"
            aria-label={de ? "Wochenziele" : "Milestones"}
          >
            <p className="text-xs text-gray-500">
              {de
                ? "Öffentliche Bungie-Meilensteine. Dein persönlicher Abschlussstatus ist hier nicht enthalten."
                : "Public Bungie milestones. Personal completion status is not included here."}
            </p>
            <QueryState query={weekly} empty={!weekly.data?.length} de={de} />
            {weekly.data?.map((m) => (
              <article key={m.hash} className="py-4 border-b border-white/10">
                <h3 className="text-white">{m.name}</h3>
                <p className="text-sm text-gray-400 mt-2">{m.description}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {de ? "Endet" : "Ends"}: {date(m.endDate)}
                </p>
              </article>
            ))}
          </section>
        )}
        {tab === "vendors" && (
          <section className="space-y-4">
            <QueryState
              query={vendors}
              empty={
                !vendors.data?.vendors.length || !!vendors.data?.unavailable
              }
              de={de}
            />
            {!!vendors.data?.vendors.length && (
              <>
                <select
                  className={select}
                  aria-label={de ? "Händler auswählen" : "Choose vendor"}
                  value={vendor ? String(vendor.hash) : ""}
                  onChange={(event) => setVendorHash(event.target.value)}
                >
                  {vendors.data.vendors.map((v) => (
                    <option value={v.hash} key={v.hash}>
                      {v.name} ({v.items.length})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  {de ? "Nächste Aktualisierung" : "Next refresh"}:{" "}
                  {date(vendor?.nextRefreshDate || null)}.{" "}
                  {de
                    ? "Käufe erfolgen im Spiel."
                    : "Purchase items in the game."}
                </p>
                {vendor?.salesUnavailable && (
                  <p className="text-gray-400">
                    {de
                      ? "Angebotsdaten für diesen Händler nicht verfügbar."
                      : "Offers for this vendor are unavailable."}
                  </p>
                )}
                {vendor?.items.map((i) => (
                  <article
                    key={i.index}
                    className="py-3 border-b border-white/10"
                  >
                    <p className="text-white">
                      {i.name}
                      {i.quantity > 1 ? ` × ${i.quantity}` : ""}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {i.costs.length
                        ? i.costs
                            .map((c) => `${c.quantity} ${c.name}`)
                            .join(" · ")
                        : de
                          ? "Keine Kostenangabe"
                          : "Cost not supplied"}
                    </p>
                    {!i.available && (
                      <p className="text-xs text-amber-300 mt-1">
                        {de
                          ? "Kaufbedingungen momentan nicht erfüllt."
                          : "Purchase conditions currently unmet."}
                      </p>
                    )}
                  </article>
                ))}
              </>
            )}
          </section>
        )}
        {tab === "stats" && (
          <section className="space-y-5">
            <p className="text-sm text-gray-400">
              {de
                ? "Auswertung der letzten bis zu 50 Aktivitäten dieses Charakters. PvE und PvP sind enthalten. Keine Bewertung deiner gesamten Spielzeit."
                : "Summary of up to 50 recent activities for this character, including PvE and PvP. This does not represent your entire play history."}
            </p>
            <QueryState query={history} empty={!history.data?.length} de={de} />
            {!!history.data?.length && (
              <>
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  {[
                    [de ? "Aktivitäten" : "Activities", summary.count],
                    [de ? "Abgeschlossen" : "Completed", summary.completions],
                    ["K/D", summary.kd?.toFixed(2) ?? "—"],
                    [
                      de ? "Spielzeit" : "Playtime",
                      `${Math.round(summary.seconds / 60)} min`,
                    ],
                  ].map(([name, value]) => (
                    <div key={name} className="bg-white/5 p-3 rounded-lg">
                      <dt className="text-gray-400">{name}</dt>
                      <dd className="mt-1 text-xl text-white">{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="text-xs text-gray-500">
                  {de
                    ? "Bungie-Modi in dieser Stichprobe"
                    : "Bungie modes in this sample"}
                  :{" "}
                  {summary.modes
                    .map(
                      (m) =>
                        `${({ 4: "Raid", 5: "PvP", 18: "Strike", 46: "Nightfall", 63: "Gambit", 82: "Dungeon", 84: "Trials", 43: "Iron Banner" } as Record<number, string>)[m.mode] || (de ? "Weitere Aktivitäten" : "Other activities")}: ${m.count}`,
                    )
                    .join(" · ")}
                </p>
                <label className="block space-y-2 text-sm text-gray-400">
                  <span>{de ? "Aktivitätsbericht" : "Activity report"}</span>
                  <select
                    className={select}
                    value={activityId}
                    onChange={(e) => setActivityId(e.target.value)}
                  >
                    <option value="">
                      {de ? "Aktivität auswählen" : "Choose activity"}
                    </option>
                    {history.data.map((a) => (
                      <option key={a.instanceId} value={a.instanceId}>
                        {a.activityName} · {date(a.date)}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            {activityId && (
              <>
                <QueryState
                  query={report}
                  empty={!report.data?.players.length}
                  de={de}
                />
                {report.data?.players.map((p) => (
                  <article
                    key={p.characterId}
                    className="py-3 border-b border-white/10"
                  >
                    <h3 className="text-white">{p.name}</h3>
                    <p className="text-sm text-gray-400">
                      {p.kills ?? "—"} Kills · {p.deaths ?? "—"}{" "}
                      {de ? "Tode" : "Deaths"} · {p.assists ?? "—"} Assists
                    </p>
                    {p.weapons.map((w) => (
                      <p
                        key={w.itemHash}
                        className="text-xs text-gray-500 mt-1"
                      >
                        {w.name}: {w.kills ?? "—"} Kills
                      </p>
                    ))}
                  </article>
                ))}
              </>
            )}
          </section>
        )}
        {tab === "arsenal" && (
          <section className="space-y-8">
            {character && (
              <BungieActionsPanel
                key={charId}
                character={character}
                membershipType={membershipType}
                loadouts={inGameLoadouts[charId] || []}
              />
            )}
            <div className="space-y-4">
              <h3 className="text-lg text-white">
                {de ? "Rüstung kombinieren" : "Combine armor"}
              </h3>
              <p className="text-sm text-gray-400">
                {de
                  ? "Wählt aus deinem Besitz fünf passende Rüstungsteile mit höchstens einem Exoten. Gewertet werden die von Bungie gemeldeten Werte inklusive aktiver Boni. Aspekte, Mods, Set-Boni und Zielwerte werden nicht optimiert."
                  : "Selects five owned armor pieces for your class with at most one exotic. Uses Bungie-reported stats including active bonuses. Aspects, mods, set bonuses and target stat thresholds are not optimized."}
              </p>
              <select
                className={select}
                aria-label={de ? "Werte priorisieren" : "Stat priority"}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="">
                  {de
                    ? "Alle Werte gleich gewichten"
                    : "Weight all stats equally"}
                </option>
                {statOptions.map(([hash, name]) => (
                  <option key={hash} value={hash}>
                    {name} ×3
                  </option>
                ))}
              </select>
              {!armor.length ? (
                <p className="text-gray-400 text-sm">
                  {de
                    ? "Für eine vollständige Auswahl fehlen passende Teile oder Werte."
                    : "Not enough compatible pieces or stat data for a complete selection."}
                </p>
              ) : (
                <>
                  <ul className="space-y-2">
                    {armor.map((i) => (
                      <li className="text-sm text-white" key={i.id}>
                        {i.name}{" "}
                        <span className="text-gray-500">
                          ·{" "}
                          {i.stats
                            ?.map((s) => `${s.name} ${s.value}`)
                            .join(", ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button
                    className={button}
                    onClick={() => onAdoptArmor(armor, charId)}
                    data-testid="companion-adopt-armor"
                  >
                    {de ? "Im Loadout bearbeiten" : "Edit in loadout"}
                  </button>
                </>
              )}
            </div>
            <div className="space-y-4">
              <h3 className="text-lg text-white">
                {de ? "Mehrfach vorhandene Gegenstände" : "Duplicate items"}
              </h3>
              <p className="text-sm text-gray-400">
                {de
                  ? "Gleicher Gegenstand bedeutet nicht gleicher Roll. Vergleiche die Werte und aktiven Sockel. Du kannst Exemplare schützen und entsperren."
                  : "The same item can have different rolls. Compare stats and active sockets. You can lock and unlock copies."}
              </p>
              <input
                className={select}
                placeholder={de ? "Gegenstand suchen" : "Search items"}
                aria-label={de ? "Duplikate suchen" : "Search duplicates"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {!groups.length && (
                <p className="text-sm text-gray-400">
                  {de
                    ? "Keine mehrfach vorhandenen Gegenstände gefunden."
                    : "No duplicate items found."}
                </p>
              )}
              {groups.map((group) => (
                <details
                  key={group[0].itemHash}
                  className="border-b border-white/10 py-3"
                >
                  <summary className="text-white cursor-pointer">
                    {group[0].name} · {group.length}
                  </summary>
                  <div className="space-y-4 mt-4">
                    {group.map((i) => (
                      <article key={i.id} className="text-sm text-gray-400">
                        <p className="break-all">
                          {i.id} · {i.location}
                        </p>
                        <p>
                          {i.stats
                            ?.map((s) => `${s.name} ${s.value}`)
                            .join(" · ")}
                        </p>
                        <p className="text-xs">
                          {i.sockets
                            ?.map((s) => s.name)
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        <button
                          className={`${button} mt-2`}
                          disabled={mutating || !charId}
                          onClick={() => toggleLock(i)}
                        >
                          {i.locked
                            ? de
                              ? "Entsperren"
                              : "Unlock"
                            : de
                              ? "Schützen"
                              : "Lock"}
                        </button>
                      </article>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}
        <button
          className={`${button} flex gap-2 items-center`}
          disabled={tab === "arsenal"}
          onClick={() => {
            if (tab === "weekly") weekly.refetch();
            if (tab === "vendors") vendors.refetch();
            if (tab === "stats") history.refetch();
          }}
        >
          <RefreshCw className="w-4 h-4" />
          {de ? "Aktualisieren" : "Refresh"}
        </button>
      </div>
    </div>
  );
}
