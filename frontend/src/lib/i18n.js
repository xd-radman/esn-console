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
      monogram: 'ES',
      name: 'ESN SAKARYA',
      email: 'coordinator@esn.org',
      roleAdmin: 'President',
      statusLabel: 'Status',
      statusActive: 'Active',
      accessLabel: 'Access',
      accessFull: 'Full Access',
      accountSettings: 'Account Settings',
      teamandPremissions: 'Team & Promissions',
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
      addSessionKicker: 'Session Timeline',
      addSessionTitle: 'Add Session',
      addSessionSubtitle:
        'Add a new week, trip, or check-in period to organize incoming participant feedback.',
      sessionTitleLabel: 'Session Title',
      sessionTitlePlaceholder: 'e.g. Week 4 — Language Exchange',
      sessionTitleRequired: 'Please enter a session title.',
      startDate: 'Start Date',
      endDate: 'End Date',
      dateRequired: 'Please select both a start date and an end date.',
      dateRangeError: 'End date must be on or after the start date.',
      createSession: 'Add Session',
      deleteSessionKicker: 'Confirm Removal',
      deleteSessionTitle: 'Delete Session',
      deleteSessionConfirm:
        'Are you sure you want to remove this session? All response rows linked to it will be deleted from the workspace.',
      deleteSessionResponses: '{count} responses will be removed',
      delete: 'Delete',
      addGraphKicker: 'Bento Chart Grid',
      addGraphTitle: 'Add Graph Tile',
      addGraphSubtitle:
        'Choose a survey metric, Chart.js visualization style, and grid column span for this workspace.',
      metricLabel: 'Metric',
      styleLabel: 'Chart Style',
      widthLabel: 'Column Width (12-col grid)',
      widthCols: '{count} cols',
      customTitleLabel: 'Custom Title',
      customTitlePlaceholder: 'Optional — leave blank to use metric name',
      createGraph: 'Add Graph',
    },

    // Summary KPI strip (`SummaryStrip.jsx`)
    kpi: {
      stripLabel: 'Project summary KPIs',
      totalResponses: 'Total Responses',
      positiveRate: 'Positive Outcome Rate',
      avgScore: 'Average Score',
    },

    // Customizable 12-col Bento chart grid (`ChartGrid.jsx`, `ChartTile.jsx`, `chartUtils.js`)
    charts: {
      sectionTitle: 'Analytics & Visualizations',
      addGraph: 'Add Graph',
      resetDefault: 'Reset Default',
      emptyTitle: 'No Graphs Configured',
      emptySubtitle:
        'Add a custom chart tile or restore this project’s default Swiss Bento layout.',
      noData: 'No responses in this session yet.',
      deleteGraphAria: 'Remove {title} chart',
      resetZoom: 'Reset Zoom',
      expandChart: 'Expand chart',
      exportPng: 'Export PNG',
      selectedPoint: 'Selected',
      clearSelection: 'Clear selected data point',
      responseCountLabel: 'Responses',
      positiveRateLabel: 'Positive Rate (%)',
      shareLabel: 'Share (%)',
      positiveCenterLabel: 'Positive',
      topShareCenterLabel: 'Top Share',
      metrics: {
        cat1: 'Participant Group',
        cat2: 'Activity Focus',
        comfort: 'Comfort Level',
        score: 'Satisfaction Score',
        outcome: 'Positive Outcome',
        sessionTrend: 'Session Trend',
      },
      styles: {
        bar: 'Vertical Bar',
        horizontalBar: 'Horizontal Bar',
        donut: 'Donut',
        line: 'Line',
        dualAxis: 'Dual-Axis Trend',
      },
      values: {
        yes: 'Yes',
        maybe: 'Maybe',
        no: 'No',
        high: 'High',
        medium: 'Medium',
        low: 'Low',
      },
    },

    // Searchable participant feedback table (`FeedbackTable.jsx`)
    feedback: {
      sectionTitle: 'Feedback & Suggestions',
      searchLabel: 'Search feedback notes',
      searchPlaceholder: 'Search highlights, suggestions, or sessions...',
      clearSearch: 'Clear search',
      sessionCol: 'Session',
      dateCol: 'Date Range',
      scoreCol: 'Score',
      highlightCol: 'Highlight',
      suggestionCol: 'Suggestion',
      emptySearch: 'No feedback notes match your search query.',
      emptyAll: 'No feedback notes recorded for this selection yet.',
      tableCaption: 'Searchable student feedback highlights and suggestions',
    },

    // Collapsible organizer prediction sidebar (`PredictionSidebar.jsx` + `mlApi.js`)
    sidebar: {
      kicker: 'Organizer Intelligence',
      title: 'Retention Predictor',
      subtitle:
        'Test upcoming session parameters to estimate repeat attendance before publishing.',
      closeLabel: 'Close prediction sidebar',
      toggleLabel: 'Toggle prediction sidebar',
      sessionFormat: 'Session Format',
      groupMix: 'Participant Mix',
      comfortLevel: 'Expected Comfort Level',
      expectedSize: 'Expected Group Size',
      checkBtn: 'Check Prediction',
      checking: 'Evaluating...',
      verdictLabel: 'Predicted Verdict',
      confidenceLabel: 'Confidence',
      factorsLabel: 'Top Contributing Factors',
      heuristicNote: 'Local heuristic mode · FastAPI /predict connects in Phase 6',
      verdicts: {
        high_retention: 'High Retention Likely',
        moderate_retention: 'Moderate Retention',
        at_risk: 'Retention At Risk',
      },
      formats: {
        interactive: 'Interactive Tables & Icebreakers',
        cultural: 'Guided Cultural Walk & Social',
        workshop: 'Structured Workshop / Orientation',
        mixer: 'Open Social Mixer',
      },
      mixes: {
        balanced: 'Balanced Erasmus + Local',
        erasmus_heavy: 'Mostly Incoming Erasmus',
        local_heavy: 'Mostly Local Volunteers',
      },
      comforts: {
        high: 'High — Welcoming & Guided',
        medium: 'Medium — Casual Drop-In',
        low: 'Low — Crowded / Unstructured',
      },
      factors: {
        balancedMix: 'Balanced Erasmus & local volunteer mix boosts sense of belonging',
        highComfort: 'High-comfort setting strongly correlates with repeat attendance',
        interactiveFormat: 'Interactive format accelerates peer bonding in the first 30 min',
        optimalGroupSize: 'Group size (15–45) keeps conversations personal and manageable',
        largeGroupRisk: 'Large crowd (>60) may dilute interactions without extra facilitators',
        lowComfortRisk: 'Low-comfort environment increases early drop-off risk',
        skewedMixRisk: 'Skewed participant ratio limits cross-cultural exchange',
        smallGroupNote: 'Small group (<12) works best in a cozy venue with an active host',
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

    // Project dashboard (`/project/:projectId`) Step 3.2 toolbar & preview copy
    dashboard: {
      kicker: 'Phase 3.2 · Session Management',
      placeholderTitle: 'Project Dashboard',
      placeholderSubtitle:
        'Filter sessions, add or delete session periods, inject demo responses, or upload a custom CSV file.',
      projectIdLabel: 'Active project ID',
      loadingData: 'Loading workspace data from Supabase...',
      loadError: 'Could not load workspace data',
      notFoundTitle: 'Project Not Found',
      notFoundSubtitle:
        'No project matches this URL slug. Return to the directory to choose an active ESN workspace.',
      allSessions: 'All Sessions (Combined)',
      sessionSelectLabel: 'Active session filter',
      toolbarLabel: 'Session management toolbar',
      addSession: 'Add Session',
      deleteSession: 'Delete Session',
      addDemoResponse: 'Add Demo Response',
      uploadCsv: 'Upload CSV',
      csvUploaded: 'Imported {count} rows from {file}.',
      csvUploadError: 'Could not parse the selected CSV file.',
      demoAdded: 'Added a demo response to {session}.',
      activeFilterLabel: 'Filtered View',
      filteredResponses: '{count} Responses',
      latestRowsTitle: 'Active Filter Responses',
      sampleRowsCaption: 'Filtered response rows for {project}',
      noResponsesYet: 'No responses recorded for this selection yet. Use "+ Add Demo Response" to test live updates.',
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

    // Google-only Supabase OAuth & role-based access copy (`LoginPage.jsx`, `ProfilePopover.jsx`)
    auth: {
      kicker: 'Erasmus Student Network · Google SSO',
      modeSwitcherLabel: 'Authentication mode',
      signInTab: 'Sign In',
      signUpTab: 'Sign Up',
      signInTitle: 'Sign in to ESN Console',
      signInSubtitle:
        'Use your Google account to access section analytics, session feedback, and retention predictions.',
      signUpTitle: 'Join ESN Console',
      signUpSubtitle:
        'Create your passwordless ESN workspace profile with Google. New accounts start with standard Member read & predict access until promoted by an Admin.',
      continueWithGoogle: 'Continue with Google',
      signUpWithGoogle: 'Sign Up with Google',
      redirectingToGoogle: 'Redirecting to Google...',
      googleOnlyNote:
        'Passwordless authentication via Google OAuth only. New accounts receive standard Member access automatically.',
      oauthError:
        'Google authentication could not be completed. Please try again or contact your ESN section admin.',
      accountNotFound:
        'No ESN Console account was found for this Google email. Please switch to the Sign Up tab to create your account first.',
      accountAlreadyExists:
        'An ESN Console account with this Google email already exists. Please switch to the Sign In tab instead.',
      missingConfig:
        'Supabase authentication is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      signOut: 'Sign Out',
      roleAdmin: 'Admin',
      roleMember: 'Member',
      readOnlyBadge: 'Read-Only',
      checkingSession: 'Verifying your ESN session...',
      pageTitle: 'Sign In | ESN Console',
    },

    // Supabase loading states & dismissible error toast copy
    toast: {
      regionLabel: 'Workspace notifications',
      errorTitle: 'Action Could Not Be Saved',
      dismissLabel: 'Dismiss notification',
      permissionDenied: 'Permission denied. Admin privileges are required to modify workspace data.',
      writeFailed: 'Could not save your change to Supabase. Please try again.',
      loadingDirectory: 'Syncing ESN projects from Supabase...',
      seedingWorkspace: 'Initializing default ESN projects...',
      csvEmpty: 'No valid response rows were found in the selected CSV file.',
    },

    // Account Settings modal (`AccountSettingsModal.jsx`)
    settings: {
      kicker: 'Workspace Profile',
      title: 'Account Settings',
      subtitle: 'Manage how your name appears across the ESN Console workspace.',
      usernameLabel: 'Display Name',
      usernamePlaceholder: 'e.g. Ayse Yilmaz',
      emailLabel: 'Google Email',
      emailReadonlyHint: 'Managed by Google OAuth sign-in and cannot be changed here.',
      roleLabel: 'Workspace Role',
      saveBtn: 'Save Changes',
      saving: 'Saving...',
      savedSuccess: 'Your display name has been updated.',
      saveError: 'Could not save your profile changes. Please try again.',
      validationRequired: 'Please enter a display name before saving.',
      usernameTaken: 'This display name is already taken. Please choose another.',
      memberEditLocked: 'Profile editing is locked until an Admin approves your account.',
    },

    // Team & Permissions modal (`TeamPermissionsModal.jsx`, Admin only)
    team: {
      kicker: 'Access Control',
      menuLabel: 'Team & Permissions',
      title: 'Team & Permissions',
      subtitle: 'Manage Admin and Member access levels across your ESN section.',
      searchLabel: 'Search team members',
      searchPlaceholder: 'Search by name or email...',
      sortLabel: 'Sort team members',
      sortNameAsc: 'Name A–Z',
      sortNameDesc: 'Name Z–A',
      sortRoleAdmin: 'Role: Admins First',
      sortRoleMember: 'Role: Members First',
      memberCol: 'Member',
      roleCol: 'Role',
      youBadge: 'You',
      emptyList: 'No active team members found yet.',
      noMatches: 'No matching users found.',
      loading: 'Loading team directory...',
      loadError: 'Could not load the team roster from Supabase.',
      roleUpdated: 'Updated {name} to {role}.',
      roleUpdateError: 'Could not update member role. Please try again.',
      selfDemoteHint: 'You cannot change your own Admin role.',
      hierarchyLockedHint: 'Same-level or higher roles cannot be modified.',
      confirmRole: 'Confirm role change',
      cancelRole: 'Cancel role change',
      memberCount: '{count} Members',
    },

    // Member lockout / access approval limbo screen (`AccessPendingPage.jsx`)
    limbo: {
      kicker: 'Access Pending',
      title: 'Awaiting Admin Approval',
      subtitle:
        'Your ESN Console account is active with a standard Member role, which does not yet have workspace access. Please wait for an Admin to grant your permissions.',
      accountLabel: 'Signed-in Account',
      statusLabel: 'Access Status',
      statusPending: 'Pending Admin Approval',
      checkBtn: 'Check Access Status',
      checking: 'Checking status...',
      stillPending: 'Your account is still awaiting Admin approval. Please check back later.',
      pageTitle: 'Access Pending | ESN Console',
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
      monogram: 'ES',
      name: 'ESN SAKARYA',
      email: 'coordinator@esn.org',
      roleAdmin: 'Yönetici',
      statusLabel: 'Durum',
      statusActive: 'Aktif',
      accessLabel: 'Erişim',
      accessFull: 'Tam Erişim',
      accountSettings: 'Hesap Ayarları',
      teamandPremissions: 'Ekip & Yetkiler',
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
      addSessionKicker: 'Oturum Zaman Çizelgesi',
      addSessionTitle: 'Oturum Ekle',
      addSessionSubtitle:
        'Katılımcı geri bildirimlerini düzenlemek için yeni bir hafta, gezi veya buluşma dönemi oluşturun.',
      sessionTitleLabel: 'Oturum Başlığı',
      sessionTitlePlaceholder: 'Örn. 4. Hafta — Dil Değişimi',
      sessionTitleRequired: 'Lütfen bir oturum başlığı girin.',
      startDate: 'Başlangıç Tarihi',
      endDate: 'Bitiş Tarihi',
      dateRequired: 'Lütfen hem başlangıç hem de bitiş tarihini seçin.',
      dateRangeError: 'Bitiş tarihi başlangıç tarihine eşit veya sonrası olmalıdır.',
      createSession: 'Oturum Ekle',
      deleteSessionKicker: 'Silme Onayı',
      deleteSessionTitle: 'Oturumu Sil',
      deleteSessionConfirm:
        'Bu oturumu kaldırmak istediğinizden emin misiniz? Bu oturuma bağlı tüm yanıt satırları çalışma alanından silinecektir.',
      deleteSessionResponses: '{count} yanıt kaldırılacak',
      delete: 'Sil',
      addGraphKicker: 'Bento Grafik Izgarası',
      addGraphTitle: 'Grafik Kartı Ekle',
      addGraphSubtitle:
        'Bu çalışma alanı için bir anket metriği, Chart.js görselleştirme stili ve sütun genişliği seçin.',
      metricLabel: 'Metrik',
      styleLabel: 'Grafik Stili',
      widthLabel: 'Sütun Genişliği (12 sütunluk ızgara)',
      widthCols: '{count} sütun',
      customTitleLabel: 'Özel Başlık',
      customTitlePlaceholder: 'İsteğe bağlı — metrik adını kullanmak için boş bırakın',
      createGraph: 'Grafik Ekle',
    },

    // Summary KPI strip (`SummaryStrip.jsx`)
    kpi: {
      stripLabel: 'Proje özet KPI değerleri',
      totalResponses: 'Toplam Yanıt',
      positiveRate: 'Olumlu Sonuç Oranı',
      avgScore: 'Ortalama Puan',
    },

    // Customizable 12-col Bento chart grid (`ChartGrid.jsx`, `ChartTile.jsx`, `chartUtils.js`)
    charts: {
      sectionTitle: 'Analitik ve Görselleştirmeler',
      addGraph: 'Grafik Ekle',
      resetDefault: 'Varsayılana Sıfırla',
      emptyTitle: 'Yapılandırılmış Grafik Yok',
      emptySubtitle:
        'Özel bir grafik kartı ekleyin veya bu projenin varsayılan Swiss Bento yerleşimini geri yükleyin.',
      noData: 'Bu oturumda henüz yanıt bulunmuyor.',
      deleteGraphAria: '{title} grafiğini kaldır',
      resetZoom: 'Yakınlaştırmayı Sıfırla',
      expandChart: 'Grafiği genişlet',
      exportPng: 'PNG Olarak İndir',
      selectedPoint: 'Seçili',
      clearSelection: 'Seçili veri noktasını temizle',
      responseCountLabel: 'Yanıt Sayısı',
      positiveRateLabel: 'Olumlu Oran (%)',
      shareLabel: 'Pay (%)',
      positiveCenterLabel: 'Olumlu',
      topShareCenterLabel: 'En Yüksek Pay',
      metrics: {
        cat1: 'Katılımcı Grubu',
        cat2: 'Etkinlik Odağı',
        comfort: 'Konfor Düzeyi',
        score: 'Memnuniyet Puanı',
        outcome: 'Olumlu Sonuç',
        sessionTrend: 'Oturum Eğilimi',
      },
      styles: {
        bar: 'Dikey Çubuk',
        horizontalBar: 'Yatay Çubuk',
        donut: 'Halka (Donut)',
        line: 'Çizgi',
        dualAxis: 'Çift Eksenli Eğilim',
      },
      values: {
        yes: 'Evet',
        maybe: 'Belki',
        no: 'Hayır',
        high: 'Yüksek',
        medium: 'Orta',
        low: 'Düşük',
      },
    },

    // Searchable participant feedback table (`FeedbackTable.jsx`)
    feedback: {
      sectionTitle: 'Geri Bildirimler ve Öneriler',
      searchLabel: 'Geri bildirim notlarında ara',
      searchPlaceholder: 'Öne çıkanlar, öneriler veya oturumlarda ara...',
      clearSearch: 'Aramayı temizle',
      sessionCol: 'Oturum',
      dateCol: 'Tarih Aralığı',
      scoreCol: 'Puan',
      highlightCol: 'Öne Çıkan',
      suggestionCol: 'Öneri',
      emptySearch: 'Arama sorgunuzla eşleşen geri bildirim notu bulunamadı.',
      emptyAll: 'Bu seçim için henüz geri bildirim notu kaydedilmedi.',
      tableCaption: 'Aranabilir öğrenci geri bildirimleri ve önerileri',
    },

    // Collapsible organizer prediction sidebar (`PredictionSidebar.jsx` + `mlApi.js`)
    sidebar: {
      kicker: 'Organizatör Zekası',
      title: 'Bağlılık Tahminleyicisi',
      subtitle:
        'Yayınlamadan önce tekrar katılım olasılığını tahmin etmek için oturum parametrelerini test edin.',
      closeLabel: 'Tahmin panelini kapat',
      toggleLabel: 'Tahmin panelini aç veya kapat',
      sessionFormat: 'Oturum Formatı',
      groupMix: 'Katılımcı Dengesi',
      comfortLevel: 'Beklenen Konfor Düzeyi',
      expectedSize: 'Beklenen Grup Boyutu',
      checkBtn: 'Tahmini Kontrol Et',
      checking: 'Değerlendiriliyor...',
      verdictLabel: 'Tahmin Sonucu',
      confidenceLabel: 'Güven Oranı',
      factorsLabel: 'Başlıca Etkenler',
      heuristicNote: 'Yerel sezgisel mod · FastAPI /predict Faz 6’da bağlanacak',
      verdicts: {
        high_retention: 'Yüksek Bağlılık Bekleniyor',
        moderate_retention: 'Orta Düzey Bağlılık',
        at_risk: 'Bağlılık Risk Altında',
      },
      formats: {
        interactive: 'Etkileşimli Masalar ve Buz Kırıcılar',
        cultural: 'Rehberli Kültür Yürüyüşü ve Sosyal',
        workshop: 'Yapılandırılmış Atölye / Oryantasyon',
        mixer: 'Açık Sosyal Buluşma',
      },
      mixes: {
        balanced: 'Dengeli Erasmus + Yerel',
        erasmus_heavy: 'Ağırlıklı Erasmus Öğrencileri',
        local_heavy: 'Ağırlıklı Yerel Gönüllüler',
      },
      comforts: {
        high: 'Yüksek — Samimi ve Yönlendirmeli',
        medium: 'Orta — Serbest Katılım',
        low: 'Düşük — Kalabalık / Plansız',
      },
      factors: {
        balancedMix: 'Dengeli Erasmus ve yerel gönüllü oranı aidiyet duygusunu artırıyor',
        highComfort: 'Yüksek konfor ortamı tekrar katılımla güçlü biçimde ilişkili',
        interactiveFormat: 'Etkileşimli format ilk 30 dakikada akran bağlarını hızlandırıyor',
        optimalGroupSize: 'Grup boyutu (15–45) sohbetleri samimi ve yönetilebilir tutuyor',
        largeGroupRisk: 'Kalabalık grup (>60) ek moderatör olmadan etkileşimi azaltabilir',
        lowComfortRisk: 'Düşük konfor ortamı erken ayrılma riskini artırıyor',
        skewedMixRisk: 'Tek taraflı katılımcı oranı kültürlerarası etkileşimi sınırlıyor',
        smallGroupNote: 'Küçük grup (<12) samimi bir mekan ve aktif moderatörle en iyi sonucu verir',
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

    // Project dashboard (`/project/:projectId`) Step 3.2 toolbar & preview copy
    dashboard: {
      kicker: 'Faz 3.2 · Oturum Yönetimi',
      placeholderTitle: 'Proje Paneli',
      placeholderSubtitle:
        'Oturumları filtreleyin, yeni dönem ekleyin veya silin, demo yanıt ekleyin ya da özel bir CSV dosyası yükleyin.',
      projectIdLabel: 'Aktif proje kimliği',
      loadingData: 'Çalışma alanı verileri Supabase’ten yükleniyor...',
      loadError: 'Çalışma alanı verileri yüklenemedi',
      notFoundTitle: 'Proje Bulunamadı',
      notFoundSubtitle:
        'Bu URL kimliğiyle eşleşen bir proje yok. Aktif bir ESN çalışma alanı seçmek için dizine dönün.',
      allSessions: 'Tüm Oturumlar (Birleşik)',
      sessionSelectLabel: 'Aktif oturum filtresi',
      toolbarLabel: 'Oturum yönetim araç çubuğu',
      addSession: 'Oturum Ekle',
      deleteSession: 'Oturumu Sil',
      addDemoResponse: 'Demo Yanıt Ekle',
      uploadCsv: 'CSV Yükle',
      csvUploaded: '{file} dosyasından {count} satır içe aktarıldı.',
      csvUploadError: 'Seçilen CSV dosyası ayrıştırılamadı.',
      demoAdded: '{session} oturumuna demo yanıt eklendi.',
      activeFilterLabel: 'Filtrelenen Görünüm',
      filteredResponses: '{count} Yanıt',
      latestRowsTitle: 'Aktif Filtre Yanıtları',
      sampleRowsCaption: '{project} için filtrelenmiş yanıt satırları',
      noResponsesYet: 'Bu seçim için henüz yanıt yok. Canlı güncellemeleri test etmek için "+ Demo Yanıt Ekle" düğmesini kullanın.',
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

    // Google-only Supabase OAuth & role-based access copy (`LoginPage.jsx`, `ProfilePopover.jsx`)
    auth: {
      kicker: 'Erasmus Student Network · Google SSO',
      modeSwitcherLabel: 'Kimlik doğrulama modu',
      signInTab: 'Giriş Yap',
      signUpTab: 'Kayıt Ol',
      signInTitle: 'ESN Console’a Giriş Yap',
      signInSubtitle:
        'Şube analizlerine, oturum geri bildirimlerine ve bağlılık tahminlerine erişmek için Google hesabınızla devam edin.',
      signUpTitle: 'ESN Console’a Katıl',
      signUpSubtitle:
        'Google ile şifresiz ESN çalışma alanı profilinizi oluşturun. Yeni hesaplar bir Yönetici tarafından yetkilendirilene kadar standart Üye (salt okunur ve tahmin) erişimiyle başlar.',
      continueWithGoogle: 'Google ile Devam Et',
      signUpWithGoogle: 'Google ile Kayıt Ol',
      redirectingToGoogle: 'Google’a yönlendiriliyor...',
      googleOnlyNote:
        'Yalnızca Google OAuth ile şifresiz kimlik doğrulama. Yeni hesaplara otomatik olarak standart Üye rolü atanır.',
      oauthError:
        'Google kimlik doğrulaması tamamlanamadı. Lütfen tekrar deneyin veya ESN şube yöneticinizle iletişime geçin.',
      accountNotFound:
        'Bu Google e-posta adresiyle kayıtlı bir ESN Console hesabı bulunamadı. Lütfen önce Kayıt Ol sekmesinden hesabınızı oluşturun.',
      accountAlreadyExists:
        'Bu Google e-posta adresiyle zaten bir ESN Console hesabı bulunuyor. Lütfen bunun yerine Giriş Yap sekmesini kullanın.',
      missingConfig:
        'Supabase kimlik doğrulaması yapılandırılmamış. VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY değerlerini kontrol edin.',
      signOut: 'Çıkış Yap',
      roleAdmin: 'Yönetici',
      roleMember: 'Üye',
      readOnlyBadge: 'Salt Okunur',
      checkingSession: 'ESN oturumunuz doğrulanıyor...',
      pageTitle: 'Giriş Yap | ESN Console',
    },

    // Supabase loading states & dismissible error toast copy
    toast: {
      regionLabel: 'Çalışma alanı bildirimleri',
      errorTitle: 'İşlem Kaydedilemedi',
      dismissLabel: 'Bildirimi kapat',
      permissionDenied: 'Yetki reddedildi. Çalışma alanı verilerini değiştirmek için Yönetici yetkisi gerekir.',
      writeFailed: 'Değişiklik Supabase’e kaydedilemedi. Lütfen tekrar deneyin.',
      loadingDirectory: 'ESN projeleri Supabase’ten senkronize ediliyor...',
      seedingWorkspace: 'Varsayılan ESN projeleri hazırlanıyor...',
      csvEmpty: 'Seçilen CSV dosyasında geçerli yanıt satırı bulunamadı.',
    },

    // Account Settings modal (`AccountSettingsModal.jsx`)
    settings: {
      kicker: 'Çalışma Alanı Profili',
      title: 'Hesap Ayarları',
      subtitle: 'ESN Console çalışma alanında adınızın nasıl görüneceğini yönetin.',
      usernameLabel: 'Görünen Ad',
      usernamePlaceholder: 'Örn. Ayşe Yılmaz',
      emailLabel: 'Google E-postası',
      emailReadonlyHint: 'Google OAuth oturumu tarafından yönetilir ve buradan değiştirilemez.',
      roleLabel: 'Çalışma Alanı Rolü',
      saveBtn: 'Değişiklikleri Kaydet',
      saving: 'Kaydediliyor...',
      savedSuccess: 'Görünen adınız güncellendi.',
      saveError: 'Profil değişiklikleri kaydedilemedi. Lütfen tekrar deneyin.',
      validationRequired: 'Kaydetmeden önce lütfen bir görünen ad girin.',
      usernameTaken: 'Bu görünen ad zaten kullanılıyor. Lütfen başka bir ad seçin.',
      memberEditLocked: 'Bir Yönetici hesabınızı onaylayana kadar profil düzenleme kilitlidir.',
    },

    // Team & Permissions modal (`TeamPermissionsModal.jsx`, Admin only)
    team: {
      kicker: 'Erişim Kontrolü',
      menuLabel: 'Ekip ve İzinler',
      title: 'Ekip ve İzinler',
      subtitle: 'ESN şubenizdeki Yönetici ve Üye erişim düzeylerini yönetin.',
      searchLabel: 'Ekip üyelerinde ara',
      searchPlaceholder: 'Ad veya e-posta ile ara...',
      sortLabel: 'Ekip üyelerini sırala',
      sortNameAsc: 'Ad A–Z',
      sortNameDesc: 'Ad Z–A',
      sortRoleAdmin: 'Rol: Önce Yöneticiler',
      sortRoleMember: 'Rol: Önce Üyeler',
      memberCol: 'Üye',
      roleCol: 'Rol',
      youBadge: 'Siz',
      emptyList: 'Henüz aktif ekip üyesi bulunamadı.',
      noMatches: 'Eşleşen kullanıcı bulunamadı.',
      loading: 'Ekip listesi yükleniyor...',
      loadError: 'Ekip listesi Supabase’ten yüklenemedi.',
      roleUpdated: '{name} kullanıcısının rolü {role} olarak güncellendi.',
      roleUpdateError: 'Üye rolü güncellenemedi. Lütfen tekrar deneyin.',
      selfDemoteHint: 'Kendi Yönetici rolünüzü değiştiremezsiniz.',
      hierarchyLockedHint: 'Aynı veya daha üst seviyedeki roller değiştirilemez.',
      confirmRole: 'Rol değişikliğini onayla',
      cancelRole: 'Rol değişikliğini iptal et',
      memberCount: '{count} Üye',
    },

    // Member lockout / access approval limbo screen (`AccessPendingPage.jsx`)
    limbo: {
      kicker: 'Erişim Bekleniyor',
      title: 'Yönetici Onayı Bekleniyor',
      subtitle:
        'ESN Console hesabınız standart Üye rolüyle oluşturuldu ve henüz çalışma alanına erişim izni bulunmuyor. Lütfen bir Yöneticinin yetkinizi onaylamasını bekleyin.',
      accountLabel: 'Giriş Yapılan Hesap',
      statusLabel: 'Erişim Durumu',
      statusPending: 'Yönetici Onayı Bekleniyor',
      checkBtn: 'Erişim Durumunu Kontrol Et',
      checking: 'Durum kontrol ediliyor...',
      stillPending: 'Hesabınız hâlâ Yönetici onayı bekliyor. Lütfen daha sonra tekrar kontrol edin.',
      pageTitle: 'Erişim Bekleniyor | ESN Console',
    },
  },
};
