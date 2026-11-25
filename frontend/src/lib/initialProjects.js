/**
 * initialProjects.js — Seed ESN Project Directory Data
 * Mirrors the future Phase 4 Supabase PostgreSQL schema so UI components require
 * zero structural refactoring when switching from local state to database queries:
 * - `id` / `code` / `status` / `iconKey` -> `projects` table columns (`slug`, `code`, `status`, `icon_key`)
 * - `en` & `tr` localized metadata -> `projects.config` (`jsonb` column)
 * - `sessionsCount` & `responsesCount` -> aggregated counts from `sessions` and `responses`
 * - `defaultGraphs` -> `project_graphs` table rows (`id`, `metricKey`, `chartStyle`, `colSpan`, `customTitle`)
 */

export const INITIAL_PROJECTS = [
  {
    id: 'speaking-club',
    code: 'ESN-SC-01',
    status: 'active',
    iconKey: 'messages-square',
    en: {
      title: 'Speaking Club',
      subtitle:
        'Weekly multilingual conversation tables connecting incoming exchange students with local ESN volunteers.',
      category: 'Language & Social',
    },
    tr: {
      title: 'Konuşma Kulübü',
      subtitle:
        'Gelen değişim öğrencileri ile yerel ESN gönüllülerini buluşturan haftalık çok dilli sohbet masaları.',
      category: 'Dil ve Sosyal',
    },
    sessionsCount: 3,
    responsesCount: 12,
    defaultGraphs: [
      { id: 'sc-g1', metricKey: 'sessionTrend', chartStyle: 'dualAxis', colSpan: 8, customTitle: '' },
      { id: 'sc-g2', metricKey: 'outcome', chartStyle: 'donut', colSpan: 4, customTitle: '' },
      { id: 'sc-g3', metricKey: 'score', chartStyle: 'bar', colSpan: 6, customTitle: '' },
      { id: 'sc-g4', metricKey: 'comfort', chartStyle: 'horizontalBar', colSpan: 6, customTitle: '' },
      { id: 'sc-g5', metricKey: 'cat2', chartStyle: 'bar', colSpan: 6, customTitle: '' },
      { id: 'sc-g6', metricKey: 'cat1', chartStyle: 'donut', colSpan: 6, customTitle: '' },
    ],
  },
  {
    id: 'istanbul-cultural-trip',
    code: 'ESN-TR-02',
    status: 'active',
    iconKey: 'compass',
    en: {
      title: 'Istanbul Cultural Trip',
      subtitle:
        'Weekend heritage itinerary covering historic peninsula landmarks, Bosphorus ferry crossings, and group logistics.',
      category: 'Mobility & Culture',
    },
    tr: {
      title: 'İstanbul Kültür Gezisi',
      subtitle:
        'Tarihi yarımada durakları, Boğaz vapur geçişleri ve grup lojistiğini kapsayan hafta sonu kültür rotası.',
      category: 'Hareketlilik ve Kültür',
    },
    sessionsCount: 3,
    responsesCount: 10,
    defaultGraphs: [
      { id: 'ict-g1', metricKey: 'sessionTrend', chartStyle: 'dualAxis', colSpan: 8, customTitle: '' },
      { id: 'ict-g2', metricKey: 'outcome', chartStyle: 'donut', colSpan: 4, customTitle: '' },
      { id: 'ict-g3', metricKey: 'score', chartStyle: 'bar', colSpan: 6, customTitle: '' },
      { id: 'ict-g4', metricKey: 'cat2', chartStyle: 'horizontalBar', colSpan: 6, customTitle: '' },
      { id: 'ict-g5', metricKey: 'comfort', chartStyle: 'bar', colSpan: 12, customTitle: '' },
    ],
  },
  {
    id: 'buddy-system',
    code: 'ESN-BD-03',
    status: 'active',
    iconKey: 'users',
    en: {
      title: 'Buddy System',
      subtitle:
        'Peer-mentoring match program pairing international newcomers with experienced local students before arrival.',
      category: 'Integration & Support',
    },
    tr: {
      title: 'Buddy Sistemi',
      subtitle:
        'Uluslararası öğrencileri varış öncesinde deneyimli yerel öğrencilerle eşleştiren akran mentorluk programı.',
      category: 'Uyum ve Destek',
    },
    sessionsCount: 3,
    responsesCount: 10,
    defaultGraphs: [
      { id: 'bd-g1', metricKey: 'outcome', chartStyle: 'donut', colSpan: 4, customTitle: '' },
      { id: 'bd-g2', metricKey: 'sessionTrend', chartStyle: 'line', colSpan: 8, customTitle: '' },
      { id: 'bd-g3', metricKey: 'comfort', chartStyle: 'horizontalBar', colSpan: 6, customTitle: '' },
      { id: 'bd-g4', metricKey: 'score', chartStyle: 'bar', colSpan: 6, customTitle: '' },
    ],
  },
  {
    id: 'welcome-week',
    code: 'ESN-WW-04',
    status: 'inactive',
    iconKey: 'sparkles',
    en: {
      title: 'Welcome Week',
      subtitle:
        'Semester orientation series featuring campus tours, city survival workshops, and section icebreaker nights.',
      category: 'Orientation',
    },
    tr: {
      title: 'Oryantasyon Haftası',
      subtitle:
        'Kampüs turları, şehir rehberi atölyeleri ve tanışma gecelerinden oluşan dönem başı uyum serisi.',
      category: 'Oryantasyon',
    },
    sessionsCount: 3,
    responsesCount: 10,
    defaultGraphs: [
      { id: 'ww-g1', metricKey: 'sessionTrend', chartStyle: 'dualAxis', colSpan: 8, customTitle: '' },
      { id: 'ww-g2', metricKey: 'outcome', chartStyle: 'donut', colSpan: 4, customTitle: '' },
      { id: 'ww-g3', metricKey: 'cat2', chartStyle: 'horizontalBar', colSpan: 6, customTitle: '' },
      { id: 'ww-g4', metricKey: 'score', chartStyle: 'bar', colSpan: 6, customTitle: '' },
    ],
  },
];
