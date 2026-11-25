/**
 * i18n.js — Bilingual UI String Dictionary (English & Turkish)
 * Centralizes all user-facing copy grouped by feature namespace (`nav`, `theme`,
 * `lang`, `profile`, `landing`, `dashboard`, `common`) and consumed via `useLang().t(key)`.
 */
export const translations = {
  // English (default fallback language)
  en: {
    brand: 'ESN Console',

    // Persistent global header & dashboard-only navigation controls
    nav: {
      allProjects: 'All Projects',
      switchProject: 'Switch project',
      toggleSidebar: 'Toggle prediction sidebar',
      sidebarShort: 'Predictor',
      controlsLabel: 'Workspace controls',
      sampleProjects: {
        speakingClub: 'Speaking Club',
        cappadociaTrip: 'Cappadocia Trip',
        buddySystem: 'Buddy System',
      },
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

    // Layout-only account overview popover (wired to Supabase Auth in Phase 4)
    profile: {
      triggerLabel: 'Account overview — ESN Coordinator',
      monogram: 'EC',
      name: 'ESN Coordinator',
      email: 'coordinator@esn.org',
      roleAdmin: 'Admin',
      statusLabel: 'Status',
      statusActive: 'Active',
      accessLabel: 'Access',
      accessFull: 'Full Console',
      accountSettings: 'Account Settings',
      sectionWorkspace: 'Section Workspace',
      signOut: 'Sign Out',
      authPreviewTag: 'Phase 4',
    },

    // Landing page (`/`) hero & sample route preview copy
    landing: {
      kicker: 'Phase 1 · Global Shell Ready',
      title: 'ESN Console',
      subtitle:
        'Bento Modular × Swiss International workspace for ESN sections. Persistent header, bilingual context, and routing are active.',
      sampleTag: 'Sample Route',
      sampleTitle: 'Speaking Club',
      sampleDesc: 'Open a sample project route to test the dashboard header controls.',
      openProject: 'Open Project',
      pageTitle: 'Projects | ESN Console',
    },

    // Project dashboard (`/project/:projectId`) placeholder copy
    dashboard: {
      kicker: 'Project Route Preview',
      placeholderTitle: 'Project Dashboard',
      placeholderSubtitle:
        'Use the top header to switch sample projects, return to All Projects, or toggle the predictor state.',
      projectIdLabel: 'Active project ID',
      pageTitle: '{id} | ESN Console',
    },

    // Shared status & navigation actions
    common: {
      backHome: 'Back to All Projects',
      activeTheme: 'Active theme',
      ready: 'Shell Ready',
    },
  },

  // Turkish localization (`tr`) mirroring the exact English key structure
  tr: {
    brand: 'ESN Console',

    // Persistent global header & dashboard-only navigation controls
    nav: {
      allProjects: 'Tüm Projeler',
      switchProject: 'Proje değiştir',
      toggleSidebar: 'Tahmin panelini aç veya kapat',
      sidebarShort: 'Tahminleyici',
      controlsLabel: 'Çalışma alanı kontrolleri',
      sampleProjects: {
        speakingClub: 'Konuşma Kulübü',
        cappadociaTrip: 'Kapadokya Gezisi',
        buddySystem: 'Buddy Sistemi',
      },
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

    // Layout-only account overview popover (wired to Supabase Auth in Phase 4)
    profile: {
      triggerLabel: 'Hesap özeti — ESN Coordinator',
      monogram: 'EC',
      name: 'ESN Coordinator',
      email: 'coordinator@esn.org',
      roleAdmin: 'Yönetici',
      statusLabel: 'Durum',
      statusActive: 'Aktif',
      accessLabel: 'Erişim',
      accessFull: 'Tam Konsol',
      accountSettings: 'Hesap Ayarları',
      sectionWorkspace: 'Şube Çalışma Alanı',
      signOut: 'Çıkış Yap',
      authPreviewTag: 'Faz 4',
    },

    // Landing page (`/`) hero & sample route preview copy
    landing: {
      kicker: 'Faz 1 · Küresel Kabuk Hazır',
      title: 'ESN Console',
      subtitle:
        'ESN şubeleri için Bento Modular × Swiss International çalışma alanı. Kalıcı üst bar, iki dilli bağlam ve yönlendirme etkin.',
      sampleTag: 'Örnek Rota',
      sampleTitle: 'Konuşma Kulübü',
      sampleDesc: 'Panel üst bar kontrollerini test etmek için örnek proje rotasını açın.',
      openProject: 'Projeyi Aç',
      pageTitle: 'Projeler | ESN Console',
    },

    // Project dashboard (`/project/:projectId`) placeholder copy
    dashboard: {
      kicker: 'Proje Rotası Önizlemesi',
      placeholderTitle: 'Proje Paneli',
      placeholderSubtitle:
        'Örnek projeler arasında geçiş yapmak, Tüm Projelere dönmek veya tahmin panelini değiştirmek için üst barı kullanın.',
      projectIdLabel: 'Aktif proje kimliği',
      pageTitle: '{id} | ESN Console',
    },

    // Shared status & navigation actions
    common: {
      backHome: 'Tüm Projelere Dön',
      activeTheme: 'Aktif tema',
      ready: 'Kabuk Hazır',
    },
  },
};
