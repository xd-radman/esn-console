/**
 * initialProjects.js — Seed ESN Project Directory Data
 * Mirrors the future Phase 4 Supabase PostgreSQL schema so UI components require
 * zero structural refactoring when switching from local state to database queries:
 * - `id` / `code` / `status` / `iconKey` -> `projects` table columns (`slug`, `code`, `status`, `icon_key`)
 * - `en` & `tr` localized metadata -> `projects.config` (`jsonb` column)
 * - `sessionsCount` & `responsesCount` -> aggregated counts from `sessions` and `responses`
 * - `defaultGraphs` -> `project_graphs` table rows (`metric_key`, `chart_style`, `col_span`)
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
    sessionsCount: 6,
    responsesCount: 148,
    defaultGraphs: [
      { metricKey: 'score', chartStyle: 'bar-vertical', colSpan: 6 },
      { metricKey: 'outcome', chartStyle: 'donut', colSpan: 6 },
      { metricKey: 'comfort', chartStyle: 'bar-horizontal', colSpan: 4 },
      { metricKey: 'trend', chartStyle: 'combo-trend', colSpan: 8 },
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
    responsesCount: 92,
    defaultGraphs: [
      { metricKey: 'score', chartStyle: 'bar-vertical', colSpan: 6 },
      { metricKey: 'outcome', chartStyle: 'donut', colSpan: 6 },
      { metricKey: 'cat1', chartStyle: 'bar-horizontal', colSpan: 12 },
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
    sessionsCount: 4,
    responsesCount: 214,
    defaultGraphs: [
      { metricKey: 'outcome', chartStyle: 'donut', colSpan: 4 },
      { metricKey: 'comfort', chartStyle: 'bar-vertical', colSpan: 8 },
      { metricKey: 'trend', chartStyle: 'line', colSpan: 12 },
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
    sessionsCount: 5,
    responsesCount: 310,
    defaultGraphs: [
      { metricKey: 'score', chartStyle: 'bar-vertical', colSpan: 6 },
      { metricKey: 'outcome', chartStyle: 'donut', colSpan: 6 },
    ],
  },
];
