import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Newspaper, ExternalLink, Clock, Loader2, AlertTriangle, RefreshCw, Megaphone, Wrench, Shield, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useI18n } from '@/lib/i18n';

interface NewsArticle {
  title: string;
  subtitle: string;
  link: string;
  image: string;
  date: string;
  description: string;
  contentType: string;
}

interface NewsPanelProps {
  tabDirection: number;
}

const appleEase = [0.16, 1, 0.3, 1] as const;

const tabVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

const contentTypeConfig: Record<string, { label: string; color: string; icon: typeof Newspaper }> = {
  twid: { label: 'TWID', color: '#E5C76B', icon: Sparkles },
  patch: { label: 'PATCH', color: '#60a5fa', icon: Wrench },
  maintenance: { label: 'MAINTENANCE', color: '#f87171', icon: Shield },
  announcement: { label: 'ANNOUNCEMENT', color: '#a78bfa', icon: Megaphone },
  news: { label: 'NEWS', color: '#6ee7b7', icon: Newspaper },
};

function formatDate(dateStr: string, language: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const locale = language === 'de' ? 'de-DE' : language === 'fr' ? 'fr-FR' : 'en-US';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) {
      return language === 'de' ? 'Gerade eben' : language === 'fr' ? 'À l\'instant' : 'Just now';
    }
    if (diffHours < 24) {
      const unit = language === 'de' ? 'Std.' : language === 'fr' ? 'h' : 'h';
      return `${diffHours}${unit} ${language === 'de' ? 'her' : language === 'fr' ? 'il y a' : 'ago'}`;
    }
    if (diffDays < 7) {
      const unit = language === 'de' ? (diffDays === 1 ? 'Tag' : 'Tage') : language === 'fr' ? (diffDays === 1 ? 'jour' : 'jours') : (diffDays === 1 ? 'day' : 'days');
      return language === 'fr' ? `il y a ${diffDays} ${unit}` : `${diffDays} ${unit} ${language === 'de' ? 'her' : 'ago'}`;
    }
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  } catch {
    return dateStr;
  }
}

export function NewsPanel({ tabDirection }: NewsPanelProps) {
  const { t, language } = useI18n();
  const [filter, setFilter] = useState<string>('all');

  const { data: articles, isLoading, error, refetch, isFetching } = useQuery<NewsArticle[]>({
    queryKey: [`/api/bungie/news?lang=${language}`],
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  const filteredArticles = articles?.filter(a => filter === 'all' || a.contentType === filter) || [];

  const filterOptions = [
    { id: 'all', label: t('news.all') },
    { id: 'twid', label: 'TWID/TWAB' },
    { id: 'patch', label: t('news.patches') },
    { id: 'announcement', label: t('news.announcements') },
    { id: 'news', label: t('news.general') },
  ];

  return (
    <motion.div
      key="news"
      custom={tabDirection}
      variants={tabVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.45, ease: appleEase as unknown as number[] }}
      className="h-full overflow-y-auto scroll-container px-4 md:px-8 py-6"
      data-scroll-container
      data-testid="panel-news"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: appleEase as unknown as number[] }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Newspaper className="w-5 h-5 text-indigo-400" />
            <h2 className="font-display text-sm tracking-[0.2em] text-white uppercase" data-testid="text-news-title">
              {t('news.title')}
            </h2>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="press-scale flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white text-[10px] font-display tracking-[0.15em] uppercase transition-all duration-300 border border-white/[0.06] rounded-lg disabled:opacity-40"
            data-testid="button-refresh-news"
          >
            <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
            {t('news.refresh')}
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: appleEase as unknown as number[], delay: 0.05 }}
          className="flex items-center gap-1.5 flex-wrap"
          data-testid="news-filter-bar"
        >
          {filterOptions.map(opt => (
            <button
              key={opt.id}
              onClick={() => setFilter(opt.id)}
              className={`px-3 py-1.5 text-[10px] font-display tracking-[0.12em] uppercase transition-all rounded-md ${
                filter === opt.id
                  ? 'bg-white/[0.08] text-white border border-white/[0.1]'
                  : 'text-gray-500 hover:text-gray-300 border border-transparent'
              }`}
              data-testid={`button-news-filter-${opt.id}`}
            >
              {opt.label}
            </button>
          ))}
        </motion.div>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 space-y-4"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
              </div>
            </div>
            <p className="text-gray-400 text-xs font-display tracking-[0.2em] uppercase" data-testid="text-news-loading">
              {t('news.loading')}
            </p>
          </motion.div>
        )}

        {error && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 space-y-4"
          >
            <AlertTriangle className="w-8 h-8 text-red-400/60" />
            <p className="text-red-400/80 text-sm" data-testid="text-news-error">{t('news.error')}</p>
            <button onClick={() => refetch()} className="press-scale px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 text-xs border border-white/[0.06] rounded-lg" data-testid="button-news-retry">
              {t('error.retry')}
            </button>
          </motion.div>
        )}

        {!isLoading && !error && filteredArticles.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 space-y-3"
          >
            <Newspaper className="w-8 h-8 text-gray-600" />
            <p className="text-gray-500 text-sm" data-testid="text-news-empty">{t('news.empty')}</p>
          </motion.div>
        )}

        {!isLoading && !error && filteredArticles.length > 0 && (
          <div className="space-y-3" data-testid="news-article-list">
            <AnimatePresence mode="popLayout">
              {filteredArticles.map((article, i) => {
                const typeConfig = contentTypeConfig[article.contentType] || contentTypeConfig.news;
                const TypeIcon = typeConfig.icon;
                return (
                  <motion.a
                    key={`${article.link}-${i}`}
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.5, ease: appleEase as unknown as number[], delay: Math.min(i * 0.06, 0.6) }}
                    className="group block bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/[0.12] rounded-xl overflow-hidden transition-all duration-500 hover-lift"
                    data-testid={`card-news-article-${i}`}
                  >
                    <div className="flex flex-col sm:flex-row">
                      {article.image && (
                        <div className="sm:w-48 md:w-56 h-32 sm:h-auto shrink-0 overflow-hidden relative">
                          <img
                            src={article.image}
                            alt=""
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0a0e18]/80 hidden sm:block" />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e18]/60 to-transparent sm:hidden" />
                        </div>
                      )}
                      <div className="flex-1 p-4 sm:p-5 flex flex-col justify-center min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-display tracking-[0.15em] uppercase border"
                            style={{
                              color: typeConfig.color,
                              borderColor: `${typeConfig.color}30`,
                              backgroundColor: `${typeConfig.color}10`,
                            }}
                            data-testid={`badge-news-type-${i}`}
                          >
                            <TypeIcon className="w-2.5 h-2.5" />
                            {typeConfig.label}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-gray-600">
                            <Clock className="w-2.5 h-2.5" />
                            {formatDate(article.date, language)}
                          </span>
                        </div>
                        <h3 className="text-sm text-white font-medium leading-snug group-hover:text-indigo-300 transition-colors line-clamp-2" data-testid={`text-news-title-${i}`}>
                          {article.title}
                        </h3>
                        {article.subtitle && article.subtitle !== article.title && (
                          <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                            {article.subtitle}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 mt-3 text-[10px] text-gray-600 group-hover:text-indigo-400/60 transition-colors">
                          <ExternalLink className="w-3 h-3" />
                          <span className="font-display tracking-[0.1em] uppercase">bungie.net</span>
                        </div>
                      </div>
                    </div>
                  </motion.a>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
