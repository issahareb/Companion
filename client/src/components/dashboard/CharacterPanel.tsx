import { motion, AnimatePresence } from 'framer-motion';
import {
  Crosshair, Zap, Flame, Shield, Hexagon, Orbit,
  Sparkles, Activity,
} from 'lucide-react';
import type { InventoryItem, CharacterData, ArtifactInfo } from '@/hooks/use-profile-state';
import type { Item } from '@/components/Inventory';
import { useI18n } from '@/lib/i18n';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import { toItem, appleEase, springMedium as spring } from './shared';
import { EquippedSlotRow } from './EquippedSlotRow';
import { SubclassEditor } from './SubclassEditor';
import { ArtifactDisplay } from './ArtifactDisplay';
import { QuestCard } from './QuestCard';

function ScrollRevealSection({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, isVisible } = useScrollReveal(0.1);
  return (
    <div
      ref={ref}
      className={`reveal-up ${isVisible ? 'visible' : ''} ${className || ''}`}
      style={{ transitionDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

const SECTION_ACCENTS: Record<string, string> = {
  weapons: 'border-l-red-500/50',
  armor: 'border-l-blue-500/50',
  subclass: 'border-l-purple-500/50',
  artifact: 'border-l-amber-500/50',
  quests: 'border-l-green-500/50',
};

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
  pendingItemIds?: Set<string>;
}

export function CharacterPanel({
  characters, selectedCharacterId, setSelectedCharacterId, selectedCharacter,
  tabDirection, slotPickerSlot, setSlotPickerSlot, addToLoadout, handleEquip,
  vaultItems, artifact, membershipType, pendingItemIds,
}: CharacterPanelProps) {
  const { t } = useI18n();

  return (
    <motion.div
      key="characters"
      custom={tabDirection}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: appleEase }}
      className="h-full flex flex-col relative"
    >
      <div className="flex items-center gap-1 px-4 pt-3 pb-0 shrink-0 overflow-x-auto">
        {characters.map((char) => (
          <button
            key={char.characterId}
            onClick={() => setSelectedCharacterId(char.characterId)}
            className={`flex items-center gap-2 px-3 py-2 transition-all duration-300 shrink-0 border-b-2 press-scale ${
              selectedCharacterId === char.characterId
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-gray-500 hover:text-white hover:border-white/20'
            }`}
            data-testid={`button-select-char-${char.characterId}`}
          >
            {char.emblemPath && <img src={char.emblemPath} alt="" className="w-8 h-8 rounded-sm" />}
            <div className="text-left">
              <p className="text-xs font-bold tracking-destiny uppercase">{char.className}</p>
              <p className="text-[11px] text-gray-500 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-[var(--color-gold-accent)]" /> {char.light}
              </p>
            </div>
          </button>
        ))}
      </div>
      <div className="h-px bg-white/[0.06] mx-4" />

      <AnimatePresence mode="wait">
        {selectedCharacter && (
          <motion.div
            key={selectedCharacter.characterId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 min-h-0 overflow-y-auto scroll-container"
            data-scroll-container
          >
            <div className="relative overflow-hidden">
              {selectedCharacter.emblemBackgroundPath && (
                <img
                  src={selectedCharacter.emblemBackgroundPath}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-50"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/20" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080b14] via-[#080b14]/30 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#080b14]/90" />
              <div className="relative z-10 px-6 py-8 flex items-end justify-between">
                <div>
                  <h3 className="text-3xl md:text-4xl text-white font-display font-light tracking-destiny-wide text-shadow-glow leading-none">{selectedCharacter.className}</h3>
                  <p className="text-[11px] text-gray-400/80 tracking-destiny-widest mt-2">{selectedCharacter.raceName}</p>
                </div>
                <div className="flex items-center gap-5">
                  {(() => {
                    const subclassItem = selectedCharacter.equippedItems.find(i => i.slot === 'subclass');
                    return subclassItem?.icon ? (
                      <div className="relative">
                        <div className="absolute inset-0 blur-xl opacity-30 rounded-full" style={{ background: 'radial-gradient(circle, rgba(100,180,255,0.5), transparent 70%)' }} />
                        <img src={subclassItem.icon} alt={subclassItem.name} title={subclassItem.name} className="w-14 h-14 relative z-10 drop-shadow-[0_0_12px_rgba(100,180,255,0.5)]" data-testid="img-subclass-super" />
                      </div>
                    ) : null;
                  })()}
                  <div className="text-right">
                    <div className="flex items-center gap-3 justify-end">
                      <Sparkles className="w-5 h-5 text-[var(--color-gold-accent)]" />
                      <span
                        className="text-5xl md:text-6xl font-display font-light text-[var(--color-gold-accent)] text-shadow-gold leading-none"
                        data-testid="text-power-level"
                      >
                        {selectedCharacter.light}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400/60 tracking-destiny-widest mt-2">{t('power.label')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mx-6" />

            {selectedCharacter.stats.length > 0 && (
              <div className="px-4 md:px-6 py-4">
                <div className="hidden md:grid grid-cols-6 gap-2">
                  {selectedCharacter.stats.map((stat) => {
                    const val = stat.value;
                    const pct = Math.min((val / 200) * 100, 100);
                    const isMax = val >= 200;
                    const strokeColor = isMax ? 'var(--color-gold-accent)'
                      : val >= 160 ? '#a78bfa'
                      : val >= 100 ? '#34d399'
                      : val >= 60 ? '#fbbf24'
                      : '#f87171';
                    const numColor = isMax ? 'text-[var(--color-gold-accent)]'
                      : val >= 160 ? 'text-purple-300'
                      : val >= 100 ? 'text-emerald-300'
                      : val >= 60 ? 'text-amber-300'
                      : 'text-red-400';
                    const circumference = 2 * Math.PI * 18;
                    const dashOffset = circumference - (pct / 100) * circumference;
                    return (
                      <div
                        key={stat.name}
                        className={`glass-subtle border p-2.5 hover:border-white/15 transition-all duration-400 group/stat ${isMax ? 'border-[var(--color-gold-accent)]/20' : 'border-white/[0.06]'}`}
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
                            <p className={`text-[11px] tracking-destiny truncate ${isMax ? 'text-[var(--color-gold-accent)]/70' : 'text-gray-500'}`}>{stat.name}</p>
                            {stat.icon && <img src={stat.icon} alt="" className="w-3.5 h-3.5 opacity-50 mt-1 group-hover/stat:opacity-80 transition-opacity" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="md:hidden space-y-1.5">
                  {selectedCharacter.stats.map((stat) => {
                    const val = stat.value;
                    const pct = Math.min((val / 200) * 100, 100);
                    const isMax = val >= 200;
                    const barColor = isMax ? 'bg-[var(--color-gold-accent)]'
                      : val >= 160 ? 'bg-purple-400'
                      : val >= 100 ? 'bg-emerald-400'
                      : val >= 60 ? 'bg-amber-400'
                      : 'bg-red-400';
                    const numColor = isMax ? 'text-[var(--color-gold-accent)]'
                      : val >= 160 ? 'text-purple-300'
                      : val >= 100 ? 'text-emerald-300'
                      : val >= 60 ? 'text-amber-300'
                      : 'text-red-400';
                    return (
                      <div key={stat.name} className="flex items-center gap-3" title={stat.description}>
                        <span className={`w-16 text-[11px] tracking-destiny truncate ${isMax ? 'text-[var(--color-gold-accent)]/70' : 'text-gray-500'}`}>{stat.name}</span>
                        <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full stat-bar-fill ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className={`text-xs font-display w-8 text-right ${numColor}`}>{val}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <ScrollRevealSection className="px-4 md:px-6 pb-4">
              <div className={`flex items-center gap-2 mb-3 border-l-2 pl-3 ${SECTION_ACCENTS.weapons}`}>
                <Crosshair className="w-3.5 h-3.5 text-red-400/70" />
                <h4 className="text-xs text-white/70 uppercase tracking-destiny-wide font-display">{t('section.weapons')}</h4>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>
              <div className="space-y-1">
                {(['kinetic', 'energy', 'power'] as const).map(slotId => {
                  const equipped = selectedCharacter.equippedItems.find(i => i.slot === slotId);
                  const slotLabel = slotId === 'kinetic' ? 'Primar' : slotId === 'energy' ? 'Energie' : 'Schwer';
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
                      isPending={equipped ? pendingItemIds?.has(equipped.id) : false}
                    />
                  );
                })}
              </div>
            </ScrollRevealSection>

            <ScrollRevealSection className="px-4 md:px-6 pb-4" delay={0.1}>
              <div className={`flex items-center gap-2 mb-3 border-l-2 pl-3 ${SECTION_ACCENTS.armor}`}>
                <Shield className="w-3.5 h-3.5 text-blue-400/70" />
                <h4 className="text-xs text-white/70 uppercase tracking-destiny-wide font-display">{t('section.armor')}</h4>
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
                      isPending={equipped ? pendingItemIds?.has(equipped.id) : false}
                    />
                  );
                })}
              </div>
            </ScrollRevealSection>

            <ScrollRevealSection className="px-4 md:px-6 pb-4" delay={0.15}>
              <div className={`flex items-center gap-2 mb-3 border-l-2 pl-3 ${SECTION_ACCENTS.subclass}`}>
                <Orbit className="w-3.5 h-3.5 text-purple-400/70" />
                <h4 className="text-xs text-white/70 uppercase tracking-destiny-wide font-display">{t('section.subclass')}</h4>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>
              <SubclassEditor
                character={selectedCharacter}
                membershipType={membershipType}
                addToLoadout={(item) => addToLoadout(item)}
              />
            </ScrollRevealSection>

            {artifact && (
              <ScrollRevealSection className="px-4 md:px-6 pb-4" delay={0.1}>
                <div className={`flex items-center gap-2 mb-3 border-l-2 pl-3 ${SECTION_ACCENTS.artifact}`}>
                  <Hexagon className="w-3.5 h-3.5 text-amber-400/70" />
                  <h4 className="text-xs text-white/70 uppercase tracking-destiny-wide font-display">{t('artifact.title')}</h4>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>
                <ArtifactDisplay artifact={artifact} />
              </ScrollRevealSection>
            )}

            {selectedCharacter.quests.length > 0 && (
              <ScrollRevealSection className="px-4 md:px-6 pb-6" delay={0.1}>
                <div className={`flex items-center gap-2 mb-3 border-l-2 pl-3 ${SECTION_ACCENTS.quests}`}>
                  <Activity className="w-3.5 h-3.5 text-green-400/70" />
                  <h4 className="text-xs text-white/70 uppercase tracking-destiny-wide font-display">Aktive Quests</h4>
                  <span className="text-[11px] text-gray-600">{selectedCharacter.quests.length}</span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {selectedCharacter.quests.map((quest) => (
                    <div key={quest.id}>
                      <QuestCard quest={quest} />
                    </div>
                  ))}
                </div>
              </ScrollRevealSection>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
