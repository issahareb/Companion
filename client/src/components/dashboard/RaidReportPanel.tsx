import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Skull, Trophy, Clock, Crosshair, Shield, Flame, Zap, AlertTriangle, ChevronDown, CheckCircle2, XCircle, Users } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { appleEase } from './shared';

interface ActivityEntry {
  instanceId: string;
  activityHash: number;
  activityName: string;
  activityIcon: string;
  mode: string;
  modeType: number;
  date: string;
  duration: number;
  completed: boolean;
  kills: number;
  deaths: number;
  assists: number;
  kd: number;
  teamScore: number;
  playerCount: number;
  isFlawless: boolean;
}

interface RaidReportPanelProps {
  tabDirection: number;
  membershipType?: number;
  membershipId?: string;
  characterIds?: string[];
}

type ActivityMode = 'raid' | 'dungeon' | 'nightfall' | 'crucible' | 'gambit' | 'trials' | 'strike';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function RaidReportPanel({ tabDirection, membershipType, membershipId, characterIds }: RaidReportPanelProps) {
  const { t } = useI18n();
  const [activeMode, setActiveMode] = useState<ActivityMode>('raid');
  const [page, setPage] = useState(0);

  const modes: { id: ActivityMode; label: string; icon: typeof Trophy }[] = [
    { id: 'raid', label: t('activity.raid'), icon: Shield },
    { id: 'dungeon', label: t('activity.dungeon'), icon: Flame },
    { id: 'nightfall', label: t('activity.nightfall'), icon: Zap },
    { id: 'crucible', label: t('activity.crucible'), icon: Crosshair },
    { id: 'gambit', label: t('activity.gambit'), icon: Skull },
    { id: 'trials', label: t('activity.trials'), icon: Trophy },
  ];

  const allCharacterIds = characterIds || [];
  const primaryCharacterId = allCharacterIds[0];
  const [allActivities, setAllActivities] = useState<ActivityEntry[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const { isLoading, error, isFetching } = useQuery<ActivityEntry[]>({
    queryKey: ['/api/bungie/activity-history', membershipType, membershipId, primaryCharacterId, activeMode, page],
    queryFn: async () => {
      if (!membershipType || !membershipId || !primaryCharacterId) return [];
      const res = await fetch(`/api/bungie/activity-history/${membershipType}/${membershipId}/${primaryCharacterId}?mode=${activeMode}&count=25&page=${page}`);
      if (!res.ok) throw new Error('Failed to fetch activities');
      const data: ActivityEntry[] = await res.json();
      if (data.length < 25) setHasMore(false);
      if (page === 0) {
        setAllActivities(data);
      } else {
        setAllActivities(prev => [...prev, ...data]);
      }
      return data;
    },
    enabled: !!membershipType && !!membershipId && !!primaryCharacterId,
    staleTime: 5 * 60 * 1000,
  });

  const activities = allActivities;

  const summary = useMemo(() => {
    if (!activities.length) return null;
    const completions = activities.filter(a => a.completed).length;
    const flawless = activities.filter(a => a.isFlawless).length;
    const totalKills = activities.reduce((s, a) => s + a.kills, 0);
    const totalDeaths = activities.reduce((s, a) => s + a.deaths, 0);
    const avgKd = totalDeaths > 0 ? (totalKills / totalDeaths).toFixed(2) : totalKills.toString();
    const completedActivities = activities.filter(a => a.completed && a.duration > 0);
    const fastest = completedActivities.length > 0
      ? Math.min(...completedActivities.map(a => a.duration))
      : 0;

    const byName: Record<string, { count: number; completions: number; flawless: number; fastest: number }> = {};
    for (const a of activities) {
      if (!byName[a.activityName]) byName[a.activityName] = { count: 0, completions: 0, flawless: 0, fastest: Infinity };
      byName[a.activityName].count++;
      if (a.completed) byName[a.activityName].completions++;
      if (a.isFlawless) byName[a.activityName].flawless++;
      if (a.completed && a.duration > 0) byName[a.activityName].fastest = Math.min(byName[a.activityName].fastest, a.duration);
    }

    return { completions, flawless, totalKills, totalDeaths, avgKd, fastest, total: activities.length, byName };
  }, [activities]);

  if (!membershipType || !membershipId || !primaryCharacterId) {
    return (
      <motion.div
        key="activity-no-char"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: appleEase }}
        className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center"
      >
        <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
          <Users className="w-7 h-7 text-gray-500" />
        </div>
        <p className="text-sm text-gray-500 max-w-xs" data-testid="text-activity-no-character">{t('activity.noCharacter')}</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="activity-panel"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: appleEase }}
      className="h-full flex flex-col"
    >
      <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-lg shrink-0 mx-4 md:mx-8 mt-4 mb-4 overflow-x-auto scrollbar-hide" data-testid="activity-mode-bar">
        {modes.map(mode => (
          <button
            key={mode.id}
            onClick={() => { setActiveMode(mode.id); setPage(0); setAllActivities([]); setHasMore(true); }}
            className={`px-3 py-1.5 text-[11px] font-display tracking-destiny uppercase transition-all rounded-md whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeMode === mode.id
                ? 'bg-white/[0.08] text-white border border-white/[0.1]'
                : 'text-gray-500 hover:text-gray-300'
            }`}
            data-testid={`button-activity-mode-${mode.id}`}
          >
            <mode.icon className="w-3 h-3" />
            {mode.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-8 pb-8 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
            <p className="text-sm text-gray-400">{t('activity.error')}</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Shield className="w-8 h-8 text-gray-600" />
            <p className="text-sm text-gray-500">{t('activity.empty')}</p>
          </div>
        ) : (
          <>
            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="activity-summary">
                <StatCard icon={Trophy} label={t('activity.completions')} value={`${summary.completions}/${summary.total}`} color="text-green-400" />
                <StatCard icon={Flame} label={t('activity.flawless')} value={summary.flawless.toString()} color="text-[var(--color-gold-accent)]" />
                <StatCard icon={Clock} label={t('activity.fastest')} value={summary.fastest > 0 ? formatDuration(summary.fastest) : '—'} color="text-blue-400" />
                <StatCard icon={Crosshair} label={t('activity.kd')} value={summary.avgKd} color="text-red-400" />
              </div>
            )}

            {summary && Object.keys(summary.byName).length > 1 && (
              <div className="space-y-2">
                <h3 className="text-xs font-display tracking-destiny-wide uppercase text-gray-400" data-testid="text-activity-breakdown">{t('activity.summary')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(summary.byName).map(([name, stats]) => (
                    <div key={name} className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate tracking-destiny">{name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[11px] text-green-400">{stats.completions} {t('activity.completed').toLowerCase()}</span>
                          {stats.flawless > 0 && <span className="text-[11px] text-[var(--color-gold-accent)]">{stats.flawless} {t('activity.flawless').toLowerCase()}</span>}
                          {stats.fastest < Infinity && <span className="text-[11px] text-blue-400">{formatDuration(stats.fastest)}</span>}
                        </div>
                      </div>
                      <span className="text-lg font-mono font-bold text-white/40">{stats.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-xs font-display tracking-destiny-wide uppercase text-gray-400">{t('activity.history')}</h3>
              <div className="space-y-1.5">
                <AnimatePresence>
                  {activities.map((activity, i) => (
                    <motion.div
                      key={activity.instanceId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.02, ease: appleEase }}
                      className={`group bg-white/[0.02] border rounded-lg p-3 transition-all hover:bg-white/[0.04] ${
                        activity.isFlawless
                          ? 'border-yellow-500/20 hover:border-yellow-500/40'
                          : activity.completed
                          ? 'border-white/[0.06] hover:border-indigo-500/20'
                          : 'border-red-500/10 hover:border-red-500/20'
                      }`}
                      data-testid={`activity-entry-${activity.instanceId}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 shrink-0 rounded-lg bg-white/[0.04] border border-white/[0.08] overflow-hidden flex items-center justify-center">
                          {activity.activityIcon ? (
                            <img src={activity.activityIcon} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          ) : (
                            <Shield className="w-5 h-5 text-gray-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-white truncate tracking-destiny">{activity.activityName}</p>
                            {activity.isFlawless && (
                              <span className="text-[11px] font-display tracking-destiny-wide uppercase px-1.5 py-0.5 bg-yellow-500/10 text-[var(--color-gold-accent)] border border-yellow-500/20 rounded" data-testid={`badge-flawless-${activity.instanceId}`}>
                                {t('activity.flawless')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            <span className="text-[11px] text-gray-500">{formatDate(activity.date)}</span>
                            <span className="text-[11px] text-gray-600 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" /> {formatDuration(activity.duration)}
                            </span>
                            {activity.completed ? (
                              <span className="text-[11px] text-green-400 flex items-center gap-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5" /> {t('activity.completed')}
                              </span>
                            ) : (
                              <span className="text-[11px] text-red-400 flex items-center gap-0.5">
                                <XCircle className="w-2.5 h-2.5" /> {t('activity.failed')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-4 text-right">
                          <div>
                            <p className="text-[11px] text-gray-500 tracking-destiny">{t('activity.kills')}</p>
                            <p className="text-xs font-mono text-white">{activity.kills}</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-gray-500 tracking-destiny">{t('activity.deaths')}</p>
                            <p className="text-xs font-mono text-white">{activity.deaths}</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-gray-500 tracking-destiny">{t('activity.kd')}</p>
                            <p className={`text-xs font-mono ${activity.kd >= 2 ? 'text-green-400' : activity.kd >= 1 ? 'text-white' : 'text-red-400'}`}>{activity.kd}</p>
                          </div>
                        </div>
                      </div>
                      <div className="sm:hidden flex items-center gap-4 mt-2 pt-2 border-t border-white/[0.04]">
                        <span className="text-[11px] text-gray-400">{t('activity.kills')}: <span className="text-white font-mono">{activity.kills}</span></span>
                        <span className="text-[11px] text-gray-400">{t('activity.deaths')}: <span className="text-white font-mono">{activity.deaths}</span></span>
                        <span className="text-[11px] text-gray-400">{t('activity.kd')}: <span className={`font-mono ${activity.kd >= 2 ? 'text-green-400' : activity.kd >= 1 ? 'text-white' : 'text-red-400'}`}>{activity.kd}</span></span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {hasMore && activities.length > 0 && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={isFetching}
                  className="flex items-center gap-2 px-6 py-2.5 text-[11px] font-display tracking-destiny-wide uppercase text-gray-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] rounded-lg transition-all disabled:opacity-50"
                  data-testid="button-load-more-activities"
                >
                  {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {t('activity.loadMore')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Trophy; label: string; value: string; color: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 flex items-center gap-3" data-testid={`stat-card-${label.toLowerCase()}`}>
      <div className={`w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-[11px] text-gray-500 tracking-destiny uppercase">{label}</p>
        <p className="text-sm font-mono font-bold text-white">{value}</p>
      </div>
    </div>
  );
}
