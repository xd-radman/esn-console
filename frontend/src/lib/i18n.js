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
      loadingData: 'Loading project dataset from dummy_data.csv...',
      loadError: 'Could not load CSV dataset',
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
      loadingData: 'Proje veri seti dummy_data.csv dosyasından yükleniyor...',
      loadError: 'CSV veri seti yüklenemedi',
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
  },
};
