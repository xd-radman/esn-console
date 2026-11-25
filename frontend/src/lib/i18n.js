/**
 * i18n.js — Bilingual UI String Dictionary (English & Turkish)
 * Centralizes all user-facing copy grouped by feature namespace (`nav`, `theme`,
 * `lang`, `landing`, `dashboard`, `common`) and consumed via `useLang().t(key)`.
 */
export const translations = {
  // English (default fallback language)
  en: {
    brand: 'ESN Console',

    // Navigation & shell toolbar labels
    nav: {
      allProjects: 'All Projects',
      testBarLabel: 'Phase 1 preview controls',
      speakingClubSample: 'Speaking Club',
    },

    // Theme switcher labels & accessible descriptions
    theme: {
      light: 'Light',
      dark: 'Dark',
      switchToLight: 'Switch to light theme',
      switchToDark: 'Switch to dark theme',
      labelLight: 'Swiss Studio (Warm Paper)',
      labelDark: 'Warm Carbon Ink',
    },

    // Language switcher labels & ARIA descriptions
    lang: {
      en: 'EN',
      tr: 'TR',
      switcherLabel: 'Language selector',
      switchToEn: 'Switch language to English',
      switchToTr: 'Switch language to Turkish',
    },

    // Landing page (`/`) hero & sample route preview copy
    landing: {
      kicker: 'Phase 1 · Shell & Routing',
      title: 'ESN Console',
      subtitle:
        'Bento Modular × Swiss International workspace for ESN sections. Bilingual context and client-side routing are active.',
      sampleTag: 'Sample Route',
      sampleTitle: 'Speaking Club',
      sampleDesc: 'Preview the dynamic project dashboard route with live URL parameters.',
      openProject: 'Open Project',
      pageTitle: 'Projects | ESN Console',
    },

    // Project dashboard (`/project/:projectId`) placeholder copy
    dashboard: {
      kicker: 'Project Route Preview',
      placeholderTitle: 'Project Dashboard',
      placeholderSubtitle:
        'This placeholder verifies dynamic routing and bilingual context before the full analytics workspace is built.',
      projectIdLabel: 'Active project ID',
      pageTitle: '{id} | ESN Console',
    },

    // Shared status & navigation actions
    common: {
      backHome: 'Back to All Projects',
      activeTheme: 'Active theme',
      ready: 'Routing Ready',
    },
  },

  // Turkish localization (`tr`) mirroring the exact English key structure
  tr: {
    brand: 'ESN Console',

    // Navigation & shell toolbar labels
    nav: {
      allProjects: 'Tüm Projeler',
      testBarLabel: 'Faz 1 önizleme kontrolleri',
      speakingClubSample: 'Konuşma Kulübü',
    },

    // Theme switcher labels & accessible descriptions
    theme: {
      light: 'Açık',
      dark: 'Koyu',
      switchToLight: 'Açık temaya geç',
      switchToDark: 'Koyu temaya geç',
      labelLight: 'Swiss Studio (Sıcak Kağıt)',
      labelDark: 'Sıcak Karbon Mürekkep',
    },

    // Language switcher labels & ARIA descriptions
    lang: {
      en: 'EN',
      tr: 'TR',
      switcherLabel: 'Dil seçici',
      switchToEn: 'Dili İngilizce yap',
      switchToTr: 'Dili Türkçe yap',
    },

    // Landing page (`/`) hero & sample route preview copy
    landing: {
      kicker: 'Faz 1 · Kabuk ve Yönlendirme',
      title: 'ESN Console',
      subtitle:
        'ESN şubeleri için Bento Modular × Swiss International çalışma alanı. İki dilli içerik ve istemci yönlendirmesi etkin.',
      sampleTag: 'Örnek Rota',
      sampleTitle: 'Konuşma Kulübü',
      sampleDesc: 'Canlı URL parametreleriyle dinamik proje paneli rotasını önizleyin.',
      openProject: 'Projeyi Aç',
      pageTitle: 'Projeler | ESN Console',
    },

    // Project dashboard (`/project/:projectId`) placeholder copy
    dashboard: {
      kicker: 'Proje Rotası Önizlemesi',
      placeholderTitle: 'Proje Paneli',
      placeholderSubtitle:
        'Bu yer tutucu, tam analiz çalışma alanı kurulmadan önce dinamik yönlendirme ve iki dilli bağlamı doğrular.',
      projectIdLabel: 'Aktif proje kimliği',
      pageTitle: '{id} | ESN Console',
    },

    // Shared status & navigation actions
    common: {
      backHome: 'Tüm Projelere Dön',
      activeTheme: 'Aktif tema',
      ready: 'Yönlendirme Hazır',
    },
  },
};
