/**
 * i18n.js — Bilingual UI String Dictionary (English & Turkish)
 * Centralizes all user-facing copy grouped by feature namespace (`nav`, `theme`,
 * `lang`, `profile`, `status`, `card`, `modal`, `landing`, `dashboard`, `common`)
 * and consumed via `useLang().t(key, params)`.
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

    // Synchronized project status pill labels (`StatusSelect.jsx`)
    status: {
      active: 'Active',
      inactive: 'Inactive',
      changeFor: 'Project status for {project}',
    },

    // Project directory card metrics & actions (`ProjectCard.jsx`)
    card: {
      sessions: 'Sessions',
      responses: 'Responses',
      openProject: 'Open workspace',
    },

    // `+ New Project` modal dialog (`NewProjectModal.jsx`)
    modal: {
      newProjectKicker: 'Project Directory',
      newProjectTitle: 'Create New Project',
      newProjectSubtitle:
        'Set up a blank ESN workspace or deep-clone default chart layouts from an existing initiative.',
      closeLabel: 'Close dialog',
      requiredBadge: 'Required',
      optionalBadge: 'Optional',
      titleLabel: 'Project Title',
      titlePlaceholder: 'e.g. Erasmus Welcome Dinner',
      descLabel: 'Description',
      descPlaceholder: 'Brief overview of sessions, participants, or section goals...',
      duplicateLabel: 'Duplicate From',
      blankOption: 'Blank Project (Standard KPI & Chart Layout)',
      statusLabel: 'Initial Status',
      iconLabel: 'Project Icon',
      cancel: 'Cancel',
      create: 'Create Project',
      titleRequired: 'Please enter a project title.',
      defaultSubtitle:
        'ESN section workspace tracking recurring session attendance, satisfaction scores, and student feedback.',
      defaultCategory: 'Section Initiative',
      icons: {
        messagesSquare: 'Conversation',
        compass: 'Trip & Mobility',
        users: 'Buddy & Community',
        sparkles: 'Welcome & Orientation',
        globe: 'International Exchange',
        music: 'Culture & Social Night',
        award: 'Workshop & Training',
        heartHandshake: 'Social Impact',
      },
    },

    // Landing page (`/`) hero & directory copy (`LandingPage.jsx`)
    landing: {
      kicker: 'Erasmus Student Network · Analytics Hub',
      title: 'Section Project Directory',
      subtitle:
        'Monitor participation trends, session feedback, and retention signals across every recurring initiative in your ESN section.',
      newProject: 'New Project',
      directoryLabel: 'ESN section projects',
      totalProjects: '{count} Projects',
      activeCount: '{count} Active',
      pageTitle: 'Projects | ESN Console',
    },

    // Project dashboard (`/project/:projectId`) Step 3.1 CSV verification copy
    dashboard: {
      kicker: 'Phase 3.1 · CSV Data Pipeline',
      placeholderTitle: 'Project Dashboard',
      placeholderSubtitle:
        'Live data verification backed by PapaParse and /dummy_data.csv before charts and toolbar modals are added.',
      projectIdLabel: 'Active project ID',
      loadingData: 'Loading project dataset from dummy_data.csv...',
      loadError: 'Could not load CSV dataset',
      notFoundTitle: 'Project Not Found',
      notFoundSubtitle:
        'No project matches this URL slug. Return to the directory to choose an active ESN workspace.',
      sessionsLoaded: 'Loaded Sessions',
      responsesLoaded: 'Total Responses',
      avgScore: 'Average Score',
      parsedSessionsTitle: 'Parsed Sessions',
      sampleRowsTitle: 'Sample Parsed Responses',
      sampleRowsCaption: 'Normalized response rows loaded from dummy_data.csv for {project}',
      noResponsesYet: 'No CSV responses found for this project yet.',
      colSession: 'Session',
      colDates: 'Date Range',
      colCategories: 'Categories',
      colComfort: 'Comfort',
      colScore: 'Score',
      colOutcome: 'Outcome',
      colNotes: 'Notes & Suggestions',
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

    // Synchronized project status pill labels (`StatusSelect.jsx`)
    status: {
      active: 'Aktif',
      inactive: 'Pasif',
      changeFor: '{project} proje durumu',
    },

    // Project directory card metrics & actions (`ProjectCard.jsx`)
    card: {
      sessions: 'Oturum',
      responses: 'Yanıt',
      openProject: 'Çalışma alanını aç',
    },

    // `+ New Project` modal dialog (`NewProjectModal.jsx`)
    modal: {
      newProjectKicker: 'Proje Dizini',
      newProjectTitle: 'Yeni Proje Oluştur',
      newProjectSubtitle:
        'Boş bir ESN çalışma alanı kurun veya mevcut bir girişimin varsayılan grafik yerleşimini kopyalayın.',
      closeLabel: 'Pencereyi kapat',
      requiredBadge: 'Zorunlu',
      optionalBadge: 'İsteğe bağlı',
      titleLabel: 'Proje Başlığı',
      titlePlaceholder: 'Örn. Erasmus Tanışma Yemeği',
      descLabel: 'Açıklama',
      descPlaceholder: 'Oturumlar, katılımcılar veya şube hedefleri hakkında kısa özet...',
      duplicateLabel: 'Şuradan Kopyala',
      blankOption: 'Boş Proje (Standart KPI ve Grafik Yerleşimi)',
      statusLabel: 'Başlangıç Durumu',
      iconLabel: 'Proje İkonu',
      cancel: 'İptal',
      create: 'Proje Oluştur',
      titleRequired: 'Lütfen bir proje başlığı girin.',
      defaultSubtitle:
        'Oturum katılımını, memnuniyet puanlarını ve öğrenci geri bildirimlerini izleyen ESN şube çalışma alanı.',
      defaultCategory: 'Şube Girişimi',
      icons: {
        messagesSquare: 'Sohbet',
        compass: 'Gezi ve Hareketlilik',
        users: 'Buddy ve Topluluk',
        sparkles: 'Oryantasyon ve Sosyal',
        globe: 'Uluslararası Değişim',
        music: 'Kültür ve Sosyal Gece',
        award: 'Atölye ve Eğitim',
        heartHandshake: 'Sosyal Etki',
      },
    },

    // Landing page (`/`) hero & directory copy (`LandingPage.jsx`)
    landing: {
      kicker: 'Erasmus Student Network · Analitik Merkezi',
      title: 'Şube Proje Dizini',
      subtitle:
        'ESN şubenizdeki tüm süreklilik projelerinde katılım eğilimlerini, oturum geri bildirimlerini ve bağlılık sinyallerini izleyin.',
      newProject: 'Yeni Proje',
      directoryLabel: 'ESN şube projeleri',
      totalProjects: '{count} Proje',
      activeCount: '{count} Aktif',
      pageTitle: 'Projeler | ESN Console',
    },

    // Project dashboard (`/project/:projectId`) Step 3.1 CSV verification copy
    dashboard: {
      kicker: 'Faz 3.1 · CSV Veri Hattı',
      placeholderTitle: 'Proje Paneli',
      placeholderSubtitle:
        'Grafikler ve araç çubuğu pencereleri eklenmeden önce PapaParse ve /dummy_data.csv ile canlı veri doğrulaması.',
      projectIdLabel: 'Aktif proje kimliği',
      loadingData: 'Proje veri seti dummy_data.csv dosyasından yükleniyor...',
      loadError: 'CSV veri seti yüklenemedi',
      notFoundTitle: 'Proje Bulunamadı',
      notFoundSubtitle:
        'Bu URL kimliğiyle eşleşen bir proje yok. Aktif bir ESN çalışma alanı seçmek için dizine dönün.',
      sessionsLoaded: 'Yüklenen Oturum',
      responsesLoaded: 'Toplam Yanıt',
      avgScore: 'Ortalama Puan',
      parsedSessionsTitle: 'Ayrıştırılan Oturumlar',
      sampleRowsTitle: 'Örnek Ayrıştırılan Yanıtlar',
      sampleRowsCaption: '{project} için dummy_data.csv dosyasından yüklenen normalleştirilmiş yanıt satırları',
      noResponsesYet: 'Bu proje için henüz CSV yanıtı bulunmuyor.',
      colSession: 'Oturum',
      colDates: 'Tarih Aralığı',
      colCategories: 'Kategoriler',
      colComfort: 'Konfor',
      colScore: 'Puan',
      colOutcome: 'Sonuç',
      colNotes: 'Notlar ve Öneriler',
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
