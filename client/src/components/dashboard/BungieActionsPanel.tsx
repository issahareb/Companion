import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useOnlineStatus } from "@/hooks/use-online-status";
import {
  useInsertPlug,
  useEquipLoadout,
  useSnapshotLoadout,
  useClearLoadout,
  useUpdateLoadoutName,
  useIsBungieMutating,
} from "@/hooks/use-transfer";
import type { CharacterData, InGameLoadout } from "@/hooks/use-profile-state";

const select =
  "w-full rounded-lg bg-[#101420] p-3 text-sm border border-white/10";
const button =
  "px-3 py-2 text-sm rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40";
export function BungieActionsPanel({
  character,
  membershipType,
  loadouts,
}: {
  character: CharacterData;
  membershipType: number;
  loadouts: InGameLoadout[];
}) {
  const { language } = useI18n();
  const de = language === "de";
  const [index, setIndex] = useState(0);
  const [nameHash, setNameHash] = useState("");
  const [selectedItem, setSelectedItem] = useState("");
  const [choices, setChoices] = useState<Record<string, string>>({});
  const equip = useEquipLoadout();
  const snapshot = useSnapshotLoadout();
  const clear = useClearLoadout();
  const rename = useUpdateLoadoutName();
  const plug = useInsertPlug();
  const busy = useIsBungieMutating();
  const online = useOnlineStatus();
  const { toast } = useToast();
  const names = useQuery<{ hash: number; name: string }[]>({
    queryKey: ["/api/bungie/loadout-names"],
    staleTime: 3_600_000,
    queryFn: async () =>
      (await apiRequest("GET", "/api/bungie/loadout-names")).json(),
  });
  const items = [...character.equippedItems, ...character.inventory].filter(
    (i) => i.isInstanced && i.sockets?.some((s) => s.reusablePlugs.length > 1),
  );
  const item = items.find((i) => i.id === selectedItem) || items[0];
  const populated = loadouts.some((l) => l.index === index);
  const params = {
    characterId: character.characterId,
    membershipType,
    loadoutIndex: index,
  };
  async function run(action: () => Promise<unknown>) {
    if (busy || !online) return;
    try {
      await action();
      toast({ title: de ? "Änderung übernommen" : "Change applied" });
    } catch (error) {
      toast({
        title: de ? "Änderung fehlgeschlagen" : "Change failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  }
  return (
    <>
      <section className="space-y-4">
        <h3 className="text-lg text-white">
          {de ? "Spielinterne Loadouts" : "In-game loadouts"}
        </h3>
        <p className="text-sm text-gray-400">
          {de
            ? "Ausgerüstete Gegenstände in einem Slot speichern oder ein gespeichertes Loadout aktivieren. Verfügbare Slots hängen von deiner Freischaltung ab. Wechsle für Änderungen in den Orbit oder einen sozialen Bereich."
            : "Save equipped gear to a slot or activate a saved loadout. Available slots depend on your unlocks. Switch to orbit or a social space for changes."}
        </p>
        <select
          className={select}
          aria-label="Loadout slot"
          value={index}
          onChange={(e) => setIndex(Number(e.target.value))}
        >
          {Array.from({ length: 10 }, (_, i) => (
            <option key={i} value={i}>
              {i + 1} ·{" "}
              {loadouts.find((l) => l.index === i)?.name ||
                (de ? "Ohne gespeicherte Ausrüstung" : "No saved gear")}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2">
          <button
            className={button}
            disabled={busy || !online || !populated}
            onClick={() => run(() => equip.mutateAsync(params))}
          >
            {de ? "Ausrüsten" : "Equip"}
          </button>
          <button
            className={button}
            disabled={busy || !online}
            onClick={() => {
              if (
                !populated ||
                window.confirm(
                  de
                    ? "Diesen Slot mit deiner aktuell ausgerüsteten Ausrüstung überschreiben?"
                    : "Overwrite this slot with your currently equipped gear?",
                )
              )
                run(() => snapshot.mutateAsync(params));
            }}
          >
            {de ? "Aktuelle Ausrüstung speichern" : "Save equipped gear"}
          </button>
          <button
            className={button}
            disabled={busy || !online || !populated}
            onClick={() => {
              if (
                window.confirm(
                  de
                    ? "Dieses spielinterne Loadout leeren?"
                    : "Clear this in-game loadout?",
                )
              )
                run(() => clear.mutateAsync(params));
            }}
          >
            {de ? "Slot leeren" : "Clear slot"}
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            className={select}
            aria-label={de ? "Loadout-Name" : "Loadout name"}
            value={nameHash}
            onChange={(e) => setNameHash(e.target.value)}
          >
            <option value="">
              {de ? "Bungie-Namen auswählen" : "Choose a Bungie name"}
            </option>
            {names.data?.map((n) => (
              <option value={n.hash} key={n.hash}>
                {n.name}
              </option>
            ))}
          </select>
          <button
            className={`${button} shrink-0`}
            disabled={busy || !online || !populated || !nameHash}
            onClick={() =>
              run(() =>
                rename.mutateAsync({ ...params, nameHash: Number(nameHash) }),
              )
            }
          >
            {de ? "Umbenennen" : "Rename"}
          </button>
        </div>
        {names.error && (
          <p className="text-sm text-amber-300">
            {de
              ? "Loadout-Namen momentan nicht verfügbar."
              : "Loadout names unavailable."}
          </p>
        )}
      </section>
      <section className="space-y-4">
        <h3 className="text-lg text-white">
          {de ? "Mods und Perks wechseln" : "Change mods and perks"}
        </h3>
        <p className="text-sm text-gray-400">
          {de
            ? "Für Gegenstände auf diesem Charakter. Es werden nur wiederverwendbare Optionen angezeigt. Bungie erlaubt ausschließlich kostenlose, rückgängig machbare Änderungen."
            : "For items on this character. Only reusable options are shown. Bungie only permits free, reversible changes."}
        </p>
        {!item ? (
          <p className="text-sm text-gray-500">
            {de
              ? "Keine wechselbaren Sockel verfügbar."
              : "No changeable sockets available."}
          </p>
        ) : (
          <>
            <select
              className={select}
              aria-label={
                de ? "Gegenstand für Sockeländerung" : "Item to modify"
              }
              value={item.id}
              onChange={(e) => setSelectedItem(e.target.value)}
            >
              {items.map((i) => (
                <option value={i.id} key={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
            {item.sockets
              ?.filter((s) => s.reusablePlugs.length > 1)
              .map((socket) => {
                const key = `${item.id}:${socket.socketIndex}`;
                const value = choices[key] || String(socket.plugHash);
                return (
                  <div className="space-y-2" key={key}>
                    <p className="text-sm text-gray-400">{socket.name}</p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        className={select}
                        aria-label={socket.name}
                        value={value}
                        onChange={(e) =>
                          setChoices((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                      >
                        {!socket.reusablePlugs.some(
                          (p) => p.plugHash === socket.plugHash,
                        ) && (
                          <option value={socket.plugHash}>{socket.name}</option>
                        )}
                        {socket.reusablePlugs.map((p) => (
                          <option key={p.plugHash} value={p.plugHash}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <button
                        className={`${button} shrink-0`}
                        disabled={
                          busy || !online || Number(value) === socket.plugHash
                        }
                        onClick={() =>
                          run(() =>
                            plug.mutateAsync({
                              itemInstanceId: item.id,
                              characterId: character.characterId,
                              membershipType,
                              socketIndex: socket.socketIndex,
                              plugItemHash: Number(value),
                            }),
                          )
                        }
                      >
                        {de ? "Anwenden" : "Apply"}
                      </button>
                    </div>
                  </div>
                );
              })}
          </>
        )}
      </section>
    </>
  );
}
