import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair, Search, Loader2, AlertTriangle, ChevronRight, Star, ChevronDown, RefreshCw, Sparkles, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { InventoryItem } from '@/hooks/use-profile-state';
import { apiRequest } from '@/lib/queryClient';

function bungieIcon(url: string | undefined): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `https://www.bungie.net${url}`;
}

interface PerkBreakdown {
  name: string;
  rating: 's' | 'a' | 'b' | 'c' | 'f';
  explanation: string;
}

interface WeaponRollEvaluation {
  verdict: 'god_roll' | 'great' | 'good' | 'average' | 'shard';
  score: number;
  perkBreakdown: PerkBreakdown[];
  idealPerks: string[];
  summary: string;
}

interface WeaponRollPanelProps {
  tabDirection: number;
  vaultItems: InventoryItem[];
  characterItems: InventoryItem[];
}

const appleEase = [0.16, 1, 0.3, 1] as const;

const tabVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

const WEAPON_SLOTS = ['kinetic', 'energy', 'power'];

const verdictConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  god_roll: { label: 'GOD ROLL', color: '#E5C76B', bgColor: 'rgba(229, 199, 107, 0.15)', borderColor: 'rgba(229, 199, 107, 0.3)' },
  great: { label: 'GREAT', color: '#818cf8', bgColor: 'rgba(129, 140, 248, 0.15)', borderColor: 'rgba(129, 140, 248, 0.3)' },
  good: { label: 'GOOD', color: '#34d399', bgColor: 'rgba(52, 211, 153, 0.15)', borderColor: 'rgba(52, 211, 153, 0.3)' },
  average: { label: 'AVERAGE', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.3)' },
  shard: { label: 'SHARD', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' },
};

const ratingColors: Record<string, string> = {
  s: '#E5C76B',
  a: '#818cf8',
  b: '#34d399',
  c: '#f59e0b',
  f: '#ef4444',
};

function RatingRing({ rating, size = 96 }: { rating: number; size?: number }) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (rating / 10) * circumference;
  const color = rating >= 8 ? '#E5C76B' : rating >= 6 ? '#818cf8' : rating >= 4 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative" style={{ width: size, height: size }} data-testid="rating-ring-weapon">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="white" strokeOpacity={0.06} strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.5, ease: appleEase as unknown as number[], delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-2xl font-bold text-white"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', damping: 20, stiffness: 200 }}
        >
          {rating}
        </motion.span>
        <span className="text-[9px] text-gray-500 uppercase tracking-[0.2em]">/10</span>
      </div>
    </div>
  );
}

export function WeaponRollPanel({ tabDirection, vaultItems, characterItems }: WeaponRollPanelProps) {
  const { t, language } = useI18n();
  const [selectedWeapon, setSelectedWeapon] = useState<InventoryItem | null>(null);
  const [evaluation, setEvaluation] = useState<WeaponRollEvaluation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [cache, setCache] = useState<Record<string, WeaponRollEvaluation>>({});

  const allWeapons = useMemo(() => {
    const weapons = [...characterItems, ...vaultItems].filter(
      item => WEAPON_SLOTS.includes(item.slot) && (item.rarity === 'legendary' || item.rarity === 'exotic')
    );
    const seen = new Set<string>();
    return weapons.filter(w => {
      if (seen.has(w.id)) return false;
      seen.add(w.id);
      return true;
    });
  }, [vaultItems, characterItems]);

  const filteredWeapons = useMemo(() => {
    if (!searchQuery) return allWeapons;
    const q = searchQuery.toLowerCase();
    return allWeapons.filter(w =>
      w.name.toLowerCase().includes(q) || w.type.toLowerCase().includes(q)
    );
  }, [allWeapons, searchQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const evaluateRoll = useCallback(async () => {
    if (!selectedWeapon) return;

    if (cache[selectedWeapon.id]) {
      setEvaluation(cache[selectedWeapon.id]);
      return;
    }

    setIsLoading(true);
    setError(null);

    const weaponData = {
      name: selectedWeapon.name,
      type: selectedWeapon.type,
      slot: selectedWeapon.slot,
      rarity: selectedWeapon.rarity,
      power: selectedWeapon.power,
      perks: (selectedWeapon.perks || []).map((p, idx) => ({
        name: p.name,
        isActive: p.isActive,
        column: idx,
      })),
      mods: (selectedWeapon.mods || []).map(m => ({ name: m.name })),
      masterwork: '',
    };

    try {
      const res = await apiRequest('POST', '/api/ai/evaluate-roll', { weaponData, language });
      const data = await res.json();
      setEvaluation(data);
      setCache(prev => ({ ...prev, [selectedWeapon.id]: data }));
    } catch (err: any) {
      if (err.message?.includes('429') || err.message?.includes('rate limit')) {
        setError(t('analysis.rateLimit'));
      } else {
        setError(t('analysis.error'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedWeapon, language, t, cache]);

  const selectWeapon = useCallback((weapon: InventoryItem) => {
    setSelectedWeapon(weapon);
    setIsDropdownOpen(false);
    setSearchQuery('');
    setEvaluation(null);
    setError(null);

    if (cache[weapon.id]) {
      setEvaluation(cache[weapon.id]);
    }
  }, [cache]);

  const clearSelection = useCallback(() => {
    setSelectedWeapon(null);
    setEvaluation(null);
    setError(null);
  }, []);

  return (
    <motion.div
      key="weapon-roll"
      custom={tabDirection}
      variants={tabVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.45, ease: appleEase as unknown as number[] }}
      className="h-full overflow-y-auto scroll-container px-4 md:px-8 py-6"
      data-scroll-container
      data-testid="panel-weapon-roll"
    >
      <div className="max-w-3xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: appleEase as unknown as number[] }}
          className="flex items-center gap-3 mb-2"
        >
          <Crosshair className="w-5 h-5 text-orange-400" />
          <h2 className="font-display text-sm tracking-[0.2em] text-white uppercase" data-testid="text-weapon-roll-title">{t('roll.title')}</h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: appleEase as unknown as number[], delay: 0.1 }}
          className="space-y-4"
        >
          <div ref={dropdownRef} className="relative">
            <div
              className={`flex items-center gap-3 bg-white/[0.03] border rounded-lg px-4 py-3 cursor-pointer transition-colors duration-200 ${isDropdownOpen ? 'border-orange-500/40' : 'border-white/[0.06] hover:border-white/[0.12]'}`}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              data-testid="dropdown-weapon-selector"
            >
              {selectedWeapon ? (
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {selectedWeapon.icon && (
                    <img
                      src={bungieIcon(selectedWeapon.icon)}
                      alt=""
                      className="w-8 h-8 rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate" data-testid="text-selected-weapon">{selectedWeapon.name}</p>
                    <p className="text-xs text-gray-500">{selectedWeapon.type} · {selectedWeapon.power}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); clearSelection(); }}
                    className="p-1 text-gray-500 hover:text-white transition-colors"
                    data-testid="button-clear-weapon"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 flex-1">
                  <Search className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-500">{t('roll.selectWeapon')}</span>
                </div>
              )}
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </div>

            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: appleEase as unknown as number[] }}
                  className="absolute z-50 w-full mt-2 bg-[#0d1117] border border-white/[0.08] rounded-lg shadow-2xl max-h-72 flex flex-col"
                >
                  <div className="p-2 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2 bg-white/[0.04] rounded-md px-3 py-2">
                      <Search className="w-3.5 h-3.5 text-gray-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('roll.searchWeapons')}
                        className="bg-transparent text-sm text-white placeholder-gray-500 outline-none flex-1"
                        autoFocus
                        data-testid="input-weapon-search"
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto scroll-container flex-1">
                    {filteredWeapons.length === 0 ? (
                      <div className="p-4 text-center text-xs text-gray-500">
                        {t('item.noneAvailable')}
                      </div>
                    ) : (
                      filteredWeapons.map((weapon) => (
                        <button
                          key={weapon.id}
                          onClick={() => selectWeapon(weapon)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-white/[0.04] ${selectedWeapon?.id === weapon.id ? 'bg-white/[0.06]' : ''}`}
                          data-testid={`option-weapon-${weapon.id}`}
                        >
                          {weapon.icon && (
                            <img
                              src={bungieIcon(weapon.icon)}
                              alt=""
                              className={`w-8 h-8 rounded ${weapon.rarity === 'exotic' ? 'ring-1 ring-[#E5C76B]/30' : ''}`}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-200 truncate">{weapon.name}</p>
                            <p className="text-xs text-gray-500">{weapon.type} · {weapon.power}</p>
                          </div>
                          <span className={`text-[10px] uppercase tracking-wider ${weapon.rarity === 'exotic' ? 'text-[#E5C76B]/60' : 'text-purple-400/60'}`}>
                            {weapon.rarity}
                          </span>
                          {cache[weapon.id] && (
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {selectedWeapon && !evaluation && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: appleEase as unknown as number[] }}
              className="flex flex-col items-center py-10 space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Crosshair className="w-8 h-8 text-orange-400" />
              </div>
              <p className="text-gray-400 text-sm text-center max-w-sm">{t('roll.description')}</p>
              <button
                onClick={evaluateRoll}
                className="press-scale px-8 py-3 bg-orange-600 hover:bg-orange-500 text-white text-xs font-display tracking-[0.2em] uppercase transition-all duration-300 destiny-clip-sm border border-orange-500/30"
                data-testid="button-evaluate-roll"
              >
                {t('roll.evaluate')}
              </button>
              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-400 text-xs flex items-center gap-2"
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> {error}
                </motion.p>
              )}
            </motion.div>
          )}

          {!selectedWeapon && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: appleEase as unknown as number[], delay: 0.1 }}
              className="flex flex-col items-center justify-center py-16 space-y-6"
            >
              <div className="w-20 h-20 rounded-full bg-orange-500/10 flex items-center justify-center animate-breathe">
                <Crosshair className="w-10 h-10 text-orange-400" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-gray-400 text-sm max-w-md">{t('roll.description')}</p>
                <p className="text-gray-600 text-xs">{allWeapons.length} {t('roll.weaponsAvailable')}</p>
              </div>
            </motion.div>
          )}
        </motion.div>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 space-y-6"
          >
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
              </div>
              <div className="absolute -inset-2 rounded-full border border-orange-500/20 animate-ping" style={{ animationDuration: '2s' }} />
            </div>
            <p className="text-gray-400 text-xs font-display tracking-[0.2em] uppercase">{t('roll.loading')}</p>
          </motion.div>
        )}

        {evaluation && !isLoading && (
          <div className="space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: appleEase as unknown as number[], delay: 0.1 }}
              className={`bg-white/[0.03] border rounded-xl p-6 hover-lift ${evaluation.verdict === 'god_roll' ? 'godroll-glow' : 'border-white/[0.06]'}`}
            >
              <div className="flex items-center gap-6">
                <RatingRing rating={evaluation.score} />
                <div className="flex-1 space-y-3">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3, duration: 0.5, ease: appleEase as unknown as number[] }}
                    className="flex items-center gap-3 flex-wrap"
                  >
                    <span
                      className="inline-block px-3 py-1 rounded-full text-xs font-display tracking-[0.15em] uppercase"
                      style={{
                        color: verdictConfig[evaluation.verdict]?.color,
                        backgroundColor: verdictConfig[evaluation.verdict]?.bgColor,
                        borderWidth: 1,
                        borderColor: verdictConfig[evaluation.verdict]?.borderColor,
                      }}
                      data-testid="badge-verdict"
                    >
                      {verdictConfig[evaluation.verdict]?.label || evaluation.verdict}
                    </span>
                    {selectedWeapon && (
                      <span className="text-gray-500 text-xs">{selectedWeapon.name}</span>
                    )}
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="text-gray-400 text-sm leading-relaxed"
                    data-testid="text-roll-summary"
                  >
                    {evaluation.summary}
                  </motion.p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: appleEase as unknown as number[], delay: 0.2 }}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 hover-lift"
            >
              <div className="flex items-center gap-2 mb-4">
                <Crosshair className="w-4 h-4 text-orange-400" />
                <h3 className="font-display text-xs tracking-[0.15em] text-orange-400 uppercase" data-testid="text-perk-breakdown-title">{t('roll.perkBreakdown')}</h3>
              </div>
              <div className="space-y-3" data-testid="list-perk-breakdown">
                {evaluation.perkBreakdown.map((perk, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.08, duration: 0.4, ease: appleEase as unknown as number[] }}
                    className="flex items-start gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]"
                    data-testid={`perk-breakdown-${i}`}
                  >
                    <span
                      className="inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold uppercase shrink-0"
                      style={{
                        color: ratingColors[perk.rating] || '#888',
                        backgroundColor: `${ratingColors[perk.rating] || '#888'}15`,
                        borderWidth: 1,
                        borderColor: `${ratingColors[perk.rating] || '#888'}30`,
                      }}
                      data-testid={`badge-perk-rating-${i}`}
                    >
                      {perk.rating.toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium" data-testid={`text-perk-name-${i}`}>{perk.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{perk.explanation}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: appleEase as unknown as number[], delay: 0.3 }}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 hover-lift"
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-[#E5C76B]" />
                <h3 className="font-display text-xs tracking-[0.15em] text-[#E5C76B] uppercase" data-testid="text-ideal-perks-title">{t('roll.idealPerks')}</h3>
              </div>
              <ul className="space-y-2" data-testid="list-ideal-perks">
                {evaluation.idealPerks.map((perk, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.08, duration: 0.4, ease: appleEase as unknown as number[] }}
                    className="flex items-start gap-2 text-sm text-gray-300"
                  >
                    <Star className="w-3.5 h-3.5 text-[#E5C76B]/60 mt-0.5 shrink-0" />
                    {perk}
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="flex items-center justify-center gap-3 pt-2 pb-8 flex-wrap"
            >
              <button
                onClick={() => {
                  if (selectedWeapon) {
                    setCache(prev => {
                      const next = { ...prev };
                      delete next[selectedWeapon.id];
                      return next;
                    });
                    setEvaluation(null);
                  }
                }}
                className="press-scale flex items-center gap-2 px-5 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white text-xs font-display tracking-[0.15em] uppercase transition-all duration-300 border border-white/[0.06] rounded-lg"
                data-testid="button-reevaluate"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {t('roll.reevaluate')}
              </button>
              <button
                onClick={clearSelection}
                className="press-scale flex items-center gap-2 px-5 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white text-xs font-display tracking-[0.15em] uppercase transition-all duration-300 border border-white/[0.06] rounded-lg"
                data-testid="button-select-another"
              >
                <ChevronRight className="w-3.5 h-3.5" />
                {t('roll.selectAnother')}
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
