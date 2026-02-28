import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, AlertTriangle, Loader2, Clock, Lightbulb, ChevronRight, Star, RefreshCw, Target, ChevronDown, Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { CharacterData, RecordItem } from '@/hooks/use-profile-state';
import { apiRequest } from '@/lib/queryClient';

interface TriumphSuggestion {
  name: string;
  reason: string;
  estimatedTime: string;
  tips: string[];
}

interface TriumphAdvisorResult {
  prioritizedTriumphs: TriumphSuggestion[];
  generalAdvice: string;
}

interface TriumphAdvisorPanelProps {
  tabDirection: number;
  selectedCharacter: CharacterData | null;
  records: RecordItem[];
}

const appleEase = [0.16, 1, 0.3, 1] as const;

const tabVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

function findMatchingRecord(name: string, records: RecordItem[]): RecordItem | null {
  const lower = name.toLowerCase().trim();
  const exact = records.find(r => r.name.toLowerCase().trim() === lower);
  if (exact) return exact;
  const partial = records.find(r =>
    r.name.toLowerCase().includes(lower) || lower.includes(r.name.toLowerCase())
  );
  return partial || null;
}

function RecordDetail({ record }: { record: RecordItem }) {
  const { t } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.35, ease: appleEase as unknown as number[] }}
      className="overflow-hidden"
    >
      <div className="mt-4 pt-4 border-t border-white/[0.06]">
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-12 h-12 shrink-0 flex items-center justify-center overflow-hidden ring-1 rounded ${
            record.completed ? 'ring-[#E5C76B]/30' : 'ring-white/10'
          }`}>
            {record.icon ? (
              <img src={record.icon} alt="" className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <Trophy className={`w-6 h-6 ${record.completed ? 'text-[#E5C76B]' : 'text-gray-600'}`} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className={`text-xs font-bold tracking-wider uppercase truncate ${
                record.completed ? 'text-[#E5C76B]' : 'text-white'
              }`}>{record.name}</h4>
              {record.completed && (
                <div className="shrink-0 w-4 h-4 bg-green-500/80 rounded-full flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}
              {record.scoreValue > 0 && (
                <span className="text-[9px] text-[#E5C76B]/60 shrink-0">{record.scoreValue} pts</span>
              )}
            </div>
            {record.description && (
              <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">{record.description}</p>
            )}
          </div>
        </div>

        {record.objectives.length > 0 && (
          <div className="space-y-2.5 mt-3">
            <div className="flex items-center gap-1.5">
              <Target className="w-3 h-3 text-indigo-400" />
              <span className="text-[9px] text-gray-500 uppercase tracking-[0.15em] font-display">{t('triumph.objectives')}</span>
            </div>
            {record.objectives.map((obj, i) => {
              const pct = obj.completionValue > 0 ? Math.min(100, (obj.progress / obj.completionValue) * 100) : 0;
              return (
                <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-300 flex-1 truncate">{obj.description || t('triumphs.progress')}</span>
                    <span className={`text-[10px] shrink-0 ml-2 font-mono ${obj.complete ? 'text-green-400' : 'text-gray-400'}`}>
                      {obj.progress.toLocaleString()}/{obj.completionValue.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: appleEase as unknown as number[], delay: 0.1 }}
                      className={`h-full rounded-full ${obj.complete ? 'bg-green-500' : 'bg-indigo-500'}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function TriumphAdvisorPanel({ tabDirection, selectedCharacter, records }: TriumphAdvisorPanelProps) {
  const { t, language } = useI18n();
  const [result, setResult] = useState<TriumphAdvisorResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const incompleteRecords = records.filter(r => !r.completed);

  const matchedRecords = useMemo(() => {
    if (!result) return new Map<number, RecordItem | null>();
    const map = new Map<number, RecordItem | null>();
    result.prioritizedTriumphs.forEach((triumph, i) => {
      map.set(i, findMatchingRecord(triumph.name, records));
    });
    return map;
  }, [result, records]);

  const runAnalysis = useCallback(async () => {
    if (!selectedCharacter || incompleteRecords.length === 0) return;
    setIsLoading(true);
    setError(null);
    setExpandedIndex(null);

    const triumphData = {
      incompleteRecords: incompleteRecords.slice(0, 30).map(r => ({
        name: r.name,
        description: r.description,
        objectives: r.objectives.map(o => ({
          description: o.description,
          progress: o.progress,
          completionValue: o.completionValue,
          complete: o.complete,
        })),
      })),
      className: selectedCharacter.className,
      equippedItems: selectedCharacter.equippedItems.map(item => ({
        name: item.name,
        type: item.type,
        slot: item.slot,
      })),
    };

    try {
      const res = await apiRequest('POST', '/api/ai/triumph-advisor', { triumphData, language });
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      if (err.message?.includes('429') || err.message?.includes('rate limit')) {
        setError(t('analysis.rateLimit'));
      } else {
        setError(t('analysis.error'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedCharacter, incompleteRecords, language, t]);

  const toggleExpand = (index: number) => {
    setExpandedIndex(prev => prev === index ? null : index);
  };

  return (
    <motion.div
      key="triumph-advisor"
      custom={tabDirection}
      variants={tabVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.45, ease: appleEase as unknown as number[] }}
      className="h-full overflow-y-auto scroll-container px-4 md:px-8 py-6"
      data-scroll-container
      data-testid="panel-triumph-advisor"
    >
      <div className="max-w-3xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: appleEase as unknown as number[] }}
          className="flex items-center gap-3 mb-2"
        >
          <Trophy className="w-5 h-5 text-amber-400" />
          <h2 className="font-display text-sm tracking-[0.2em] text-white uppercase" data-testid="text-triumph-advisor-title">{t('triumph.title')}</h2>
        </motion.div>

        {!result && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: appleEase as unknown as number[], delay: 0.1 }}
            className="flex flex-col items-center justify-center py-16 space-y-6"
          >
            <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center animate-breathe">
              <Trophy className="w-10 h-10 text-amber-400" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-gray-400 text-sm max-w-md" data-testid="text-triumph-advisor-desc">{t('triumph.description')}</p>
              {selectedCharacter && (
                <p className="text-gray-600 text-xs">
                  {selectedCharacter.className} · {incompleteRecords.length} {t('triumph.incompleteCount')}
                </p>
              )}
            </div>
            <button
              onClick={runAnalysis}
              disabled={!selectedCharacter || incompleteRecords.length === 0}
              className="press-scale px-8 py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-display tracking-[0.2em] uppercase transition-all duration-300 destiny-clip-sm border border-amber-500/30"
              data-testid="button-analyze-triumphs"
            >
              {t('triumph.analyze')}
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

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 space-y-6"
          >
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
              </div>
              <div className="absolute -inset-2 rounded-full border border-amber-500/20 animate-ping" style={{ animationDuration: '2s' }} />
            </div>
            <p className="text-gray-400 text-xs font-display tracking-[0.2em] uppercase" data-testid="text-triumph-loading">{t('triumph.loading')}</p>
          </motion.div>
        )}

        {result && !isLoading && (
          <div className="space-y-5">
            <div className="space-y-4">
              {result.prioritizedTriumphs.map((triumph, i) => {
                const matchedRecord = matchedRecords.get(i) ?? null;
                const isExpanded = expandedIndex === i;

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: appleEase as unknown as number[], delay: 0.1 + i * 0.08 }}
                    className={`bg-white/[0.03] border rounded-xl p-5 transition-all duration-300 ${
                      isExpanded ? 'border-amber-500/30 bg-white/[0.04]' : 'border-white/[0.06] hover:border-white/[0.12]'
                    } ${matchedRecord ? 'cursor-pointer' : ''}`}
                    onClick={() => matchedRecord && toggleExpand(i)}
                    data-testid={`card-triumph-${i}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center mt-0.5">
                        <span className="text-amber-400 text-xs font-bold">#{i + 1}</span>
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <h3 className="text-white text-sm font-medium" data-testid={`text-triumph-name-${i}`}>{triumph.name}</h3>
                            {matchedRecord && (
                              <motion.div
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                transition={{ duration: 0.3 }}
                              >
                                <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                              </motion.div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-500 shrink-0">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-xs" data-testid={`text-triumph-time-${i}`}>{triumph.estimatedTime}</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <Star className="w-3.5 h-3.5 text-amber-500/60 mt-0.5 shrink-0" />
                          <p className="text-gray-400 text-sm leading-relaxed" data-testid={`text-triumph-reason-${i}`}>{triumph.reason}</p>
                        </div>

                        {triumph.tips.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center gap-1.5">
                              <Lightbulb className="w-3 h-3 text-[#E5C76B]/70" />
                              <span className="text-[10px] text-gray-500 uppercase tracking-[0.15em] font-display">{t('triumph.tips')}</span>
                            </div>
                            <ul className="space-y-1">
                              {triumph.tips.map((tip, j) => (
                                <li key={j} className="flex items-start gap-2 text-xs text-gray-400">
                                  <ChevronRight className="w-3 h-3 text-[#E5C76B]/40 mt-0.5 shrink-0" />
                                  <span data-testid={`text-triumph-tip-${i}-${j}`}>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <AnimatePresence>
                          {isExpanded && matchedRecord && (
                            <RecordDetail record={matchedRecord} />
                          )}
                        </AnimatePresence>

                        {matchedRecord && !isExpanded && (
                          <p className="text-[9px] text-gray-600 italic mt-1">{t('triumph.clickToExpand')}</p>
                        )}
                        {!matchedRecord && (
                          <p className="text-[9px] text-gray-600 italic mt-1">{t('triumph.noMatch')}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {result.generalAdvice && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: appleEase as unknown as number[], delay: 0.5 }}
                className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 hover-lift"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-display text-xs tracking-[0.15em] text-indigo-400 uppercase" data-testid="text-triumph-advice-title">{t('triumph.advice')}</h3>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed" data-testid="text-triumph-advice">{result.generalAdvice}</p>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="flex items-center justify-center pt-2 pb-8"
            >
              <button
                onClick={runAnalysis}
                className="press-scale flex items-center gap-2 px-5 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white text-xs font-display tracking-[0.15em] uppercase transition-all duration-300 border border-white/[0.06] rounded-lg"
                data-testid="button-reanalyze-triumphs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {t('triumph.reanalyze')}
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
