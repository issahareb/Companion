import { motion } from 'framer-motion';
import {
  Crosshair, Zap, Flame, Shield, Hexagon, Orbit,
  Sparkles, Activity,
} from 'lucide-react';
import type { InventoryItem, CharacterData, ArtifactInfo } from '@/hooks/use-profile-state';
import type { Item } from '@/components/Inventory';
import { useI18n } from '@/lib/i18n';
import { toItem } from './shared';
import { EquippedSlotRow } from './EquippedSlotRow';
import { SubclassEditor } from './SubclassEditor';
import { ArtifactDisplay } from './ArtifactDisplay';
import { QuestCard } from './QuestCard';

interface CharacterPanelProps {
  characters: CharacterData[];
  selectedCharacterId: string | null;
  setSelectedCharacterId: (id: string) => void;
  selectedCharacter: CharacterData | null;
  tabDirection: number;
  slotPickerSlot: string | null;
  setSlotPickerSlot: (slot: string | null) => void;
  addToLoadout: (item: Item) => void;
  handleEquip: (item: InventoryItem, characterId: string) => void;
  vaultItems: InventoryItem[];
  artifact?: ArtifactInfo;
  membershipType: number;
}

export function CharacterPanel({
  characters, selectedCharacterId, setSelectedCharacterId, selectedCharacter,
  tabDirection, slotPickerSlot, setSlotPickerSlot, addToLoadout, handleEquip,
  vaultItems, artifact, membershipType,
}: CharacterPanelProps) {
  const { t } = useI18n();

  return (
    <motion.div
      key="characters"
      custom={tabDirection}
      initial={{ opacity: 0, x: tabDirection * 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: tabDirection * -30 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="h-full flex flex-col relative"
    >
      <div className="flex items-center gap-1 px-3 md:px-4 pt-3 pb-0 shrink-0 overflow-x-auto">
        {characters.map(char => (
          <button
            key={char.characterId}
            onClick={() => setSelectedCharacterId(char.characterId)}
            className={`flex items-center gap-2 px-3 py-2 transition-all duration-200 shrink-0 border-b-2 ${
              selectedCharacterId === char.characterId
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-gray-500 hover:text-white hover:border-white/20'
            }`}
            data-testid={`button-select-char-${char.characterId}`}
          >
            {char.emblemPath && <img src={char.emblemPath} alt="" className="w-8 h-8 rounded-sm" />}
            <div className="text-left">
              <p className="text-[10px] font-bold tracking-wider uppercase">{char.className}</p>
              <p className="text-[9px] text-gray-500 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-[#E5C76B]" /> {char.light}
              </p>
            </div>
          </button>
        ))}
      </div>
      <div className="h-px bg-white/[0.06] mx-3 md:mx-4" />

      {selectedCharacter && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <motion.div
            key={selectedCharacter.characterId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden"
          >
            {selectedCharacter.emblemBackgroundPath && (
              <img src={selectedCharacter.emblemBackgroundPath} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50 scale-105 animate-ambient" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080b14] via-[#080b14]/30 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#080b14]/90" />
            <div className="relative z-10 px-5 md:px-8 py-6 md:py-8 flex items-end justify-between">
              <motion.div
                initial={{ x: -25, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              >
                <h3 className="text-3xl md:text-4xl text-white font-display font-light tracking-wider text-shadow-glow leading-none">{selectedCharacter.className}</h3>
                <p className="text-[10px] text-gray-400/80 uppercase tracking-[0.35em] mt-2">{selectedCharacter.raceName}</p>
              </motion.div>
              <motion.div
                className="flex items-center gap-5"
                initial={{ x: 25, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              >
                {(() => {
                  const subclassItem = selectedCharacter.equippedItems.find(i => i.slot === 'subclass');
                  return subclassItem?.icon ? (
                    <div className="relative">
                      <div className="absolute inset-0 blur-xl opacity-40 rounded-full" style={{ background: 'radial-gradient(circle, rgba(100,180,255,0.5), transparent 70%)' }} />
                      <img src={subclassItem.icon} alt={subclassItem.name} title={subclassItem.name} className="w-14 h-14 relative z-10 drop-shadow-[0_0_12px_rgba(100,180,255,0.5)]" data-testid="img-subclass-super" />
                    </div>
                  ) : null;
                })()}
                <div className="text-right">
                  <div className="flex items-center gap-3 justify-end">
                    <img src="https://www.bungie.net/common/destiny2_content/icons/c81de78390f1b7f2b759c33e9a8b9938.png" alt="Power" className="w-5 h-5 brightness-150 animate-[pulse_3s_ease-in-out_infinite]" />
                    <span className="text-5xl md:text-6xl font-display font-light text-[#E5C76B] text-shadow-gold leading-none" data-testid="text-power-level">{selectedCharacter.light}</span>
                  </div>
                  <p className="text-[9px] text-gray-400/60 uppercase tracking-[0.3em] mt-2">{t('power.label')}</p>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {selectedCharacter.stats.length > 0 && (
            <div className="px-4 md:px-6 pb-5">
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {selectedCharacter.stats.map((stat, statIdx) => {
                  const val = stat.value;
                  const pct = Math.min((val / 100) * 100, 100);
                  const isMax = val >= 100;
                  const strokeColor = isMax ? '#E5C76B'
                    : val >= 80 ? '#a78bfa'
                    : val >= 50 ? '#34d399'
                    : val >= 30 ? '#fbbf24'
                    : '#f87171';
                  const numColor = isMax ? 'text-[#E5C76B]'
                    : val >= 80 ? 'text-purple-300'
                    : val >= 50 ? 'text-emerald-300'
                    : val >= 30 ? 'text-amber-300'
                    : 'text-red-400';
                  const circumference = 2 * Math.PI * 18;
                  const dashOffset = circumference - (pct / 100) * circumference;
                  return (
                    <motion.div
                      key={stat.name}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + statIdx * 0.06, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                      className={`glass-subtle border p-2.5 hover:border-white/15 transition-all duration-400 group/stat ${isMax ? 'border-[#E5C76B]/20' : 'border-white/[0.06]'}`}
                      title={stat.description}
                    >
                      <div className="flex items-center gap-2">
                        <div className="relative w-11 h-11 shrink-0">
                          <svg viewBox="0 0 40 40" className="w-full h-full stat-ring">
                            <circle cx="20" cy="20" r="18" className="stat-ring-track" />
                            <circle
                              cx="20" cy="20" r="18"
                              className="stat-ring-fill"
                              stroke={strokeColor}
                              strokeDasharray={circumference}
                              strokeDashoffset={dashOffset}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`text-xs font-display leading-none ${numColor}`} data-testid={`text-stat-${stat.name.toLowerCase()}`}>{val}</span>
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-[8px] uppercase tracking-[0.15em] truncate ${isMax ? 'text-[#E5C76B]/70' : 'text-gray-500'}`}>{stat.name}</p>
                          {stat.icon && <img src={stat.icon} alt="" className="w-3.5 h-3.5 opacity-50 mt-1 group-hover/stat:opacity-80 transition-opacity" />}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5, ease: 'easeOut' }}
            className="px-4 md:px-6 pb-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <Crosshair className="w-3.5 h-3.5 text-red-400/70" />
              <h4 className="text-[10px] text-white/70 uppercase tracking-[0.2em] font-display">{t('section.weapons')}</h4>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>
            <div className="space-y-1">
              {(['kinetic', 'energy', 'power'] as const).map(slotId => {
                const equipped = selectedCharacter.equippedItems.find(i => i.slot === slotId);
                const slotLabel = slotId === 'kinetic' ? 'Primär' : slotId === 'energy' ? 'Energie' : 'Schwer';
                const SlotIcon = slotId === 'kinetic' ? Crosshair : slotId === 'energy' ? Zap : Flame;
                return (
                  <EquippedSlotRow
                    key={slotId}
                    slotId={slotId}
                    slotLabel={slotLabel}
                    SlotIcon={SlotIcon}
                    item={equipped || null}
                    isExpanded={slotPickerSlot === slotId}
                    onTogglePicker={() => setSlotPickerSlot(slotPickerSlot === slotId ? null : slotId)}
                    onAddToLoadout={equipped ? () => addToLoadout(toItem(equipped)) : undefined}
                    character={selectedCharacter}
                    vaultItems={vaultItems}
                    onEquip={(item) => { handleEquip(item, selectedCharacter.characterId); setSlotPickerSlot(null); }}
                    onAddToLoadoutItem={(item) => addToLoadout(toItem(item))}
                  />
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5, ease: 'easeOut' }}
            className="px-4 md:px-6 pb-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-3.5 h-3.5 text-blue-400/70" />
              <h4 className="text-[10px] text-white/70 uppercase tracking-[0.2em] font-display">{t('section.armor')}</h4>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>
            <div className="space-y-1">
              {(['helmet', 'arms', 'chest', 'legs', 'class'] as const).map(slotId => {
                const equipped = selectedCharacter.equippedItems.find(i => i.slot === slotId);
                const slotLabels: Record<string, string> = { helmet: 'Kopf', arms: 'Arme', chest: 'Brust', legs: 'Beine', class: 'Klasse' };
                return (
                  <EquippedSlotRow
                    key={slotId}
                    slotId={slotId}
                    slotLabel={slotLabels[slotId]}
                    SlotIcon={slotId === 'class' ? Hexagon : Shield}
                    item={equipped || null}
                    isExpanded={slotPickerSlot === slotId}
                    onTogglePicker={() => setSlotPickerSlot(slotPickerSlot === slotId ? null : slotId)}
                    onAddToLoadout={equipped ? () => addToLoadout(toItem(equipped)) : undefined}
                    character={selectedCharacter}
                    vaultItems={vaultItems}
                    onEquip={(item) => { handleEquip(item, selectedCharacter.characterId); setSlotPickerSlot(null); }}
                    onAddToLoadoutItem={(item) => addToLoadout(toItem(item))}
                  />
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.5, ease: 'easeOut' }}
            className="px-4 md:px-6 pb-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <Orbit className="w-3.5 h-3.5 text-purple-400/70" />
              <h4 className="text-[10px] text-white/70 uppercase tracking-[0.2em] font-display">{t('section.subclass')}</h4>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>
            <SubclassEditor
              character={selectedCharacter}
              membershipType={membershipType}
            />
          </motion.div>

          {artifact && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.5, ease: 'easeOut' }}
              className="px-4 md:px-6 pb-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <Hexagon className="w-3.5 h-3.5 text-amber-400/70" />
                <h4 className="text-[10px] text-white/70 uppercase tracking-[0.2em] font-display">{t('artifact.title')}</h4>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>
              <ArtifactDisplay artifact={artifact} />
            </motion.div>
          )}

          {selectedCharacter.quests.length > 0 && (
            <div className="px-4 md:px-6 pb-6">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-3.5 h-3.5 text-green-400/70" />
                <h4 className="text-[10px] text-white/70 uppercase tracking-[0.2em] font-display">Aktive Quests</h4>
                <span className="text-[9px] text-gray-600">{selectedCharacter.quests.length}</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {selectedCharacter.quests.map(quest => (
                  <QuestCard key={quest.id} quest={quest} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
