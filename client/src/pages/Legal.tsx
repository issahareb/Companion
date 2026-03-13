import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { useI18n } from '@/lib/i18n';

const appleEase = [0.16, 1, 0.3, 1] as const;

function Section({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: appleEase }}
      className="mb-8"
    >
      <h2 className="font-display text-sm tracking-[0.2em] uppercase text-white mb-3">{title}</h2>
      <div className="text-[11px] text-gray-400 leading-relaxed tracking-wide whitespace-pre-line">{children}</div>
    </motion.div>
  );
}

export function ImprintPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-[100dvh] bg-[#080b14] text-gray-300" style={{ overscrollBehavior: 'none' }}>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: appleEase }}
        >
          <Link href="/" data-testid="link-back-home">
            <span className="inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-gray-500 hover:text-white transition-colors cursor-pointer mb-8">
              <ArrowLeft className="w-3.5 h-3.5" /> {t('legal.backToHome')}
            </span>
          </Link>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6, ease: appleEase }}
          className="font-display text-2xl tracking-[0.15em] uppercase text-white mt-6 mb-8"
          data-testid="text-imprint-title"
        >
          {t('imprint.title')}
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.5, ease: appleEase }}
          className="mb-8 p-4 border border-amber-500/20 bg-amber-500/5 rounded-lg flex items-start gap-3"
        >
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-300/80 tracking-wide leading-relaxed">{t('imprint.placeholder')}</p>
        </motion.div>

        <Section title={t('imprint.info')} delay={0.2}>
          <p className="font-semibold text-gray-300 mb-1">{t('imprint.name')}</p>
          <p>{t('imprint.address')}</p>
        </Section>

        <Section title={t('imprint.contact')} delay={0.3}>
          <p>{t('imprint.email')}</p>
          <p>{t('imprint.phone')}</p>
        </Section>

        <Section title={t('imprint.responsibility')} delay={0.4}>
          <p>{t('imprint.responsibilityText')}</p>
        </Section>

        <Section title={t('imprint.dispute')} delay={0.5}>
          <p>{t('imprint.disputeText')}</p>
        </Section>

        <LegalFooter />
      </div>
    </div>
  );
}

export function PrivacyPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-[100dvh] bg-[#080b14] text-gray-300" style={{ overscrollBehavior: 'none' }}>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: appleEase }}
        >
          <Link href="/" data-testid="link-back-home-privacy">
            <span className="inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-gray-500 hover:text-white transition-colors cursor-pointer mb-8">
              <ArrowLeft className="w-3.5 h-3.5" /> {t('legal.backToHome')}
            </span>
          </Link>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6, ease: appleEase }}
          className="font-display text-2xl tracking-[0.15em] uppercase text-white mt-6 mb-4"
          data-testid="text-privacy-title"
        >
          {t('privacy.title')}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="text-[11px] text-gray-400 leading-relaxed tracking-wide mb-10"
        >
          {t('privacy.intro')}
        </motion.p>

        <Section title={t('privacy.responsibleTitle')} delay={0.2}>
          <p>{t('privacy.responsibleText')}</p>
        </Section>

        <Section title={t('privacy.dataTitle')} delay={0.25}>
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-gray-300 mb-1">{t('privacy.dataAuth')}</p>
              <p>{t('privacy.dataAuthText')}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-300 mb-1">{t('privacy.dataProfile')}</p>
              <p>{t('privacy.dataProfileText')}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-300 mb-1">{t('privacy.dataLoadouts')}</p>
              <p>{t('privacy.dataLoadoutsText')}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-300 mb-1">{t('privacy.dataSessions')}</p>
              <p>{t('privacy.dataSessionsText')}</p>
            </div>
          </div>
        </Section>

        <Section title={t('privacy.cookiesTitle')} delay={0.3}>
          <p>{t('privacy.cookiesText')}</p>
        </Section>

        <Section title={t('privacy.aiTitle')} delay={0.35}>
          <p>{t('privacy.aiText')}</p>
        </Section>

        <Section title={t('privacy.thirdPartyTitle')} delay={0.4}>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>{t('privacy.thirdPartyBungie')}</li>
            <li>{t('privacy.thirdPartyOpenAI')}</li>
            <li>{t('privacy.thirdPartyCF')}</li>
          </ul>
        </Section>

        <Section title={t('privacy.rightsTitle')} delay={0.45}>
          <p>{t('privacy.rightsText')}</p>
        </Section>

        <Section title={t('privacy.contactTitle')} delay={0.5}>
          <p>{t('privacy.contactText')}</p>
        </Section>

        <LegalFooter />
      </div>
    </div>
  );
}

export function LegalFooter() {
  const { t } = useI18n();

  return (
    <div className="mt-12 pt-6 border-t border-white/[0.06] flex flex-wrap items-center justify-center gap-4">
      <Link href="/imprint" data-testid="link-imprint">
        <span className="text-[9px] tracking-[0.2em] uppercase text-gray-600 hover:text-gray-400 transition-colors cursor-pointer">
          {t('footer.imprint')}
        </span>
      </Link>
      <span className="text-gray-700 text-[8px]">|</span>
      <Link href="/privacy" data-testid="link-privacy">
        <span className="text-[9px] tracking-[0.2em] uppercase text-gray-600 hover:text-gray-400 transition-colors cursor-pointer">
          {t('footer.privacy')}
        </span>
      </Link>
    </div>
  );
}
