document.addEventListener('DOMContentLoaded', () => {
  // --- CONTROLE DE TEMA CLARO/ESCURO ---
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  if (btnThemeToggle) {
    btnThemeToggle.addEventListener('click', () => {
      const isLight = document.body.classList.toggle('light-theme');
      localStorage.setItem('theme', isLight ? 'light' : 'dark');
    });
  }

  // --- ESTADO DA APLICAÇÃO ---
  let clients = [];
  let currentClientId = null;
  let activeTab = 'tab-dashboard';
  let currentMetaCampaigns = []; // Cache das campanhas Meta Ads do cliente ativo
  let currentChatHistory = []; // Histórico do chat com o Squad do cliente ativo
  let selectedCampaignFiles = []; // Arquivos selecionados no planejador de campanhas

  // --- COMPONENTES DOM ---
  // Navegação
  const navLinks = document.querySelectorAll('.nav-link');
  const tabContents = document.querySelectorAll('.tab-content');
  const pageTitleText = document.getElementById('page-title-text');

  // Stats
  const statTotalClients = document.getElementById('stat-total-clients');
  const statTotalAnalyses = document.getElementById('stat-total-analyses');

  // Clientes
  const dashboardRecentClients = document.getElementById('dashboard-recent-clients');
  const clientsListContainer = document.getElementById('clients-list-container');
  const inputSearchClients = document.getElementById('input-search-clients');
  const clientDetailView = document.getElementById('client-detail-view');
  
  // Detalhe de Cliente
  const clientDetailName = document.getElementById('client-detail-name');
  const clientDetailNiche = document.getElementById('client-detail-niche');
  const clientDetailAudience = document.getElementById('client-detail-audience');
  const clientDetailObjective = document.getElementById('client-detail-objective');
  const clientDetailKpi = document.getElementById('client-detail-kpi');
  const clientDetailBudget = document.getElementById('client-detail-budget');
  const clientDetailVoice = document.getElementById('client-detail-voice');
  const clientDetailMemory = document.getElementById('client-detail-memory');
  const clientDetailAnalyses = document.getElementById('client-detail-analyses');

  // Integração Meta Ads no Detalhe & Painel Cheio
  const metaNotConfigured = document.getElementById('meta-not-configured');
  const metaConfigured = document.getElementById('meta-configured');
  
  const clientMetaView = document.getElementById('client-meta-view');
  const btnOpenMetaDashboard = document.getElementById('btn-open-meta-dashboard');
  const btnCloseMetaDashboard = document.getElementById('btn-close-meta-dashboard');
  const btnRefreshMetaDashboard = document.getElementById('btn-refresh-meta-dashboard');
  const btnMetaDashboardReport = document.getElementById('btn-meta-dashboard-report');
  
  const metaDashboardClientName = document.getElementById('meta-dashboard-client-name');
  const metaDashboardAccountId = document.getElementById('meta-dashboard-account-id');
  
  // Métricas
  const metaTotalSpend = document.getElementById('meta-total-spend');
  const metaTotalClicks = document.getElementById('meta-total-clicks');
  const metaAvgCtr = document.getElementById('meta-avg-ctr');
  const metaAvgCpc = document.getElementById('meta-avg-cpc');
  
  // Filtros
  const selectFilterMetaStatus = document.getElementById('select-filter-meta-status');
  const selectFilterMetaObjective = document.getElementById('select-filter-meta-objective');
  
  // Listas
  const metaDashboardCampaignsList = document.getElementById('meta-dashboard-campaigns-list');
  const metaDashboardReportStatus = document.getElementById('meta-dashboard-report-status');
  const metaReportStatusText = document.getElementById('meta-report-status-text');
  const metaDashboardReportOutput = document.getElementById('meta-dashboard-report-output');
  const squadChatTyping = document.getElementById('squad-chat-typing');
  const squadChatInputArea = document.getElementById('squad-chat-input-area');
  const inputSquadChat = document.getElementById('input-squad-chat');
  const btnSendSquadChat = document.getElementById('btn-send-squad-chat');

  // Planejador de Campanhas
  const inputCampaignContext = document.getElementById('input-campaign-context');
  const plannerDragDropArea = document.getElementById('planner-drag-drop-area');
  const inputPlannerCreatives = document.getElementById('input-planner-creatives');
  const plannerPreviewsContainer = document.getElementById('planner-previews-container');
  const btnRunPlanner = document.getElementById('btn-run-planner');
  const campaignPlannerStatus = document.getElementById('campaign-planner-status');
  const campaignPlannerOutput = document.getElementById('campaign-planner-output');
  const plannerReportMarkdown = document.getElementById('planner-report-markdown');

  // Integração PDF Onboarding no Detalhe
  const inputClientOnboardPdf = document.getElementById('input-client-onboard-pdf');
  const btnTriggerPdfUpload = document.getElementById('btn-trigger-pdf-upload');
  const selectedPdfName = document.getElementById('selected-pdf-name');
  const btnUploadOnboardPdf = document.getElementById('btn-upload-onboard-pdf');
  const pdfProcessingStatus = document.getElementById('pdf-processing-status');
  const pdfStatusText = document.getElementById('pdf-status-text');

  // Analisador
  const formAnalyzer = document.getElementById('form-analyzer');
  const analyzerClientSelect = document.getElementById('analyzer-client-select');
  const dragDropArea = document.getElementById('drag-drop-area');
  const fileInputCreative = document.getElementById('file-input-creative');
  const filePreviewIndicator = document.getElementById('file-preview-indicator');
  const previewFileName = document.getElementById('preview-file-name');
  const btnClearSelectedFile = document.getElementById('btn-clear-selected-file');
  const btnSubmitAnalysis = document.getElementById('btn-submit-analysis');
  const analyzerLoadingStatus = document.getElementById('analyzer-loading-status');
  const loadingStatusStep = document.getElementById('loading-status-step');
  const loadingProgressFill = document.getElementById('loading-progress-fill');
  
  // Resultados Analisador
  const resultsPlaceholderScreen = document.getElementById('results-placeholder-screen');
  const resultsContentView = document.getElementById('results-content-view');
  const mediaViewportContainer = document.getElementById('media-viewport-container');
  const analysisOutputMarkdown = document.getElementById('analysis-output-markdown');

  // Histórico Geral
  const historyTbody = document.getElementById('history-tbody');

  // Modais
  const modalClient = document.getElementById('modal-client');
  const modalClientTitle = document.getElementById('modal-client-title');
  const formClient = document.getElementById('form-client');
  const inputClientId = document.getElementById('input-client-id');
  const inputClientName = document.getElementById('input-client-name');
  const inputClientNiche = document.getElementById('input-client-niche');
  const inputClientMetaId = document.getElementById('input-client-meta-id');
  const inputClientMetaToken = document.getElementById('input-client-meta-token');
  const inputClientAudience = document.getElementById('input-client-audience');
  const inputClientObjective = document.getElementById('input-client-objective');
  const inputClientKpi = document.getElementById('input-client-kpi');
  const inputClientBudget = document.getElementById('input-client-budget');
  const inputClientVoice = document.getElementById('input-client-voice');
  const inputClientNotes = document.getElementById('input-client-notes');

  const modalAnalysisDetail = document.getElementById('modal-analysis-detail');
  const modalAnalysisTitle = document.getElementById('modal-analysis-title');
  const modalMediaViewport = document.getElementById('modal-media-viewport');
  const modalAnalysisText = document.getElementById('modal-analysis-text');

  // Botões de Abertura/Fechamento
  const btnAddClientModal = document.getElementById('btn-add-client-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnCancelModal = document.getElementById('btn-cancel-modal');
  
  const btnQuickNewClient = document.getElementById('btn-quick-new-client');
  const btnQuickAnalyze = document.getElementById('btn-quick-analyze');
  
  const btnCloseClientDetail = document.getElementById('btn-close-client-detail');
  const btnEditClient = document.getElementById('btn-edit-client');
  const btnDeleteClient = document.getElementById('btn-delete-client');
  
  const btnCloseAnalysisModal = document.getElementById('btn-close-analysis-modal');
  const btnCloseAnalysisModalFooter = document.getElementById('btn-close-analysis-modal-footer');

  const selectAIProvider = document.getElementById('select-ai-provider');
  let activeAIProvider = localStorage.getItem('ai_provider') || 'gemini';
  selectAIProvider.value = activeAIProvider;
  
  function updateAIStatusText() {
    const statusText = document.querySelector('#api-status-indicator .status-text');
    if (statusText) {
      statusText.textContent = activeAIProvider === 'gemini' ? 'Gemini Conectado' : 'GPT-4o Conectado';
    }
  }
  updateAIStatusText();

  selectAIProvider.addEventListener('change', () => {
    activeAIProvider = selectAIProvider.value;
    localStorage.setItem('ai_provider', activeAIProvider);
    updateAIStatusText();
  });

  // --- NAVEGAÇÃO DE ABAS ---
  function switchTab(tabId) {
    activeTab = tabId;
    
    // Atualiza links da sidebar
    navLinks.forEach(link => {
      if (link.getAttribute('data-tab') === tabId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Atualiza conteúdo visível
    tabContents.forEach(content => {
      if (content.id === tabId) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });

    // Atualiza título da página
    const activeLink = document.querySelector(`.nav-link[data-tab="${tabId}"]`);
    pageTitleText.textContent = activeLink ? activeLink.textContent.trim() : 'Painel';

    // Ações ao trocar de aba
    if (tabId === 'tab-dashboard') {
      loadClientsData();
    } else if (tabId === 'tab-clients') {
      loadClientsData();
      closeClientDetail();
    } else if (tabId === 'tab-analyzer') {
      populateClientDropdown();
    } else if (tabId === 'tab-history') {
      loadGeneralHistory();
    }
  }

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(link.getAttribute('data-tab'));
    });
  });

  // Ações rápidas no Dashboard
  btnQuickNewClient.addEventListener('click', () => openClientModal());
  btnQuickAnalyze.addEventListener('click', () => switchTab('tab-analyzer'));

  // --- BANCO DE DADOS E APIS - CARREGAR CLIENTES ---
  async function loadClientsData() {
    try {
      const response = await fetch('/api/clients');
      if (!response.ok) throw new Error('Erro ao buscar dados de clientes.');
      clients = await response.json();
      
      // Atualiza estatísticas
      statTotalClients.textContent = clients.length;
      
      fetchGlobalAnalysesCount();

      renderDashboardRecent();
      renderClientsList();
    } catch (error) {
      console.error(error);
      alert('Não foi possível carregar os dados dos clientes. Verifique o servidor backend.');
    }
  }

  async function fetchGlobalAnalysesCount() {
    try {
      let total = 0;
      for (const client of clients) {
        const res = await fetch(`/api/clients/${client.id}`);
        if (res.ok) {
          const detail = await res.json();
          total += (detail.analyses || []).length;
        }
      }
      statTotalAnalyses.textContent = total;
    } catch (err) {
      console.error('Erro ao somar análises:', err);
    }
  }

  // --- RENDERIZAR INTERFACES ---
  function renderDashboardRecent() {
    dashboardRecentClients.innerHTML = '';
    const recents = clients.slice(0, 3);
    
    if (recents.length === 0) {
      dashboardRecentClients.innerHTML = '<div class="empty-state">Nenhum cliente cadastrado.</div>';
      return;
    }

    recents.forEach(client => {
      const item = document.createElement('div');
      item.className = 'client-item-row';
      item.innerHTML = `
        <div class="client-item-info">
          <h4>${client.name}</h4>
          <span>${client.niche || 'Nicho não definido'}</span>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
      `;
      item.addEventListener('click', () => {
        switchTab('tab-clients');
        viewClientDetail(client.id);
      });
      dashboardRecentClients.appendChild(item);
    });
  }

  function renderClientsList() {
    clientsListContainer.innerHTML = '';
    const query = inputSearchClients.value.toLowerCase();
    const filtered = clients.filter(c => 
      c.name.toLowerCase().includes(query) || 
      (c.niche && c.niche.toLowerCase().includes(query))
    );

    if (filtered.length === 0) {
      clientsListContainer.innerHTML = '<div class="empty-state" style="grid-column: 1/-1">Nenhum cliente encontrado.</div>';
      return;
    }

    filtered.forEach(client => {
      const card = document.createElement('div');
      card.className = 'client-card';
      card.innerHTML = `
        <h3 class="client-card-title">${client.name}</h3>
        <span class="client-card-niche">${client.niche || 'Geral'}</span>
        <div class="client-card-stat">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          Cadastrado em: ${new Date(client.created_at).toLocaleDateString('pt-BR')}
        </div>
      `;
      card.addEventListener('click', () => viewClientDetail(client.id));
      clientsListContainer.appendChild(card);
    });
  }

  inputSearchClients.addEventListener('input', renderClientsList);

  function populateClientDropdown() {
    analyzerClientSelect.innerHTML = '<option value="">Selecione um cliente...</option>';
    clients.forEach(client => {
      const option = document.createElement('option');
      option.value = client.id;
      option.textContent = client.name;
      analyzerClientSelect.appendChild(option);
    });
  }

  // --- DETALHE DO CLIENTE ---
  async function viewClientDetail(clientId) {
    currentClientId = clientId;
    resetCampaignPlanner();
    try {
      const response = await fetch(`/api/clients/${clientId}`);
      if (!response.ok) throw new Error('Erro ao carregar detalhes do cliente.');
      const client = await response.json();

      clientDetailName.textContent = client.name;
      clientDetailNiche.textContent = client.niche || 'Sem Nicho';
      clientDetailAudience.textContent = client.target_audience || 'Não cadastrado.';
      clientDetailObjective.textContent = client.marketing_objective || 'Não cadastrado.';
      clientDetailKpi.textContent = client.target_kpi || 'Não cadastrado.';
      clientDetailBudget.textContent = client.monthly_budget || 'Não cadastrado.';
      clientDetailVoice.textContent = client.brand_voice || 'Não cadastrado.';
      
      // Renderizar a memória em formato markdown
      clientDetailMemory.innerHTML = client.notes 
        ? parseMarkdown(client.notes)
        : '<p class="text-muted">Nenhum aprendizado anterior registrado. Suba criativos para analisar e começar a alimentar a memória.</p>';

      // Exibir status do Meta Ads
      if (client.meta_ad_account_id && client.meta_access_token) {
        metaNotConfigured.classList.add('hidden');
        metaConfigured.classList.remove('hidden');
      } else {
        metaNotConfigured.classList.remove('hidden');
        metaConfigured.classList.add('hidden');
      }

      // Renderizar análises de criativos
      clientDetailAnalyses.innerHTML = '';
      if (client.analyses && client.analyses.length > 0) {
        client.analyses.forEach(analysis => {
          const item = document.createElement('div');
          item.className = 'analysis-item-card';
          item.innerHTML = `
            <div class="analysis-item-meta">
              <h4>Análise #${analysis.id} (${analysis.media_type === 'video' ? 'Vídeo' : 'Arte'})</h4>
              <span>Realizada em: ${new Date(analysis.created_at).toLocaleString('pt-BR')}</span>
            </div>
            <button class="btn btn-secondary btn-sm btn-view-analysis" data-id="${analysis.id}">Visualizar</button>
          `;
          
          item.querySelector('.btn-view-analysis').addEventListener('click', () => {
            openAnalysisDetailModal(analysis, client.name);
          });
          
          clientDetailAnalyses.appendChild(item);
        });
      } else {
        clientDetailAnalyses.innerHTML = '<div class="empty-state">Nenhum criativo analisado para este cliente.</div>';
      }

      // Oculta a grid de clientes e mostra a de detalhes
      clientsListContainer.classList.add('hidden');
      document.querySelector('.clients-actions-bar').classList.add('hidden');
      clientDetailView.classList.remove('hidden');
    } catch (error) {
      console.error(error);
      alert('Erro ao carregar detalhes do cliente.');
    }
  }

  function closeClientDetail() {
    clientDetailView.classList.add('hidden');
    clientMetaView.classList.add('hidden');
    clientsListContainer.classList.remove('hidden');
    document.querySelector('.clients-actions-bar').classList.remove('hidden');
    currentClientId = null;
    currentMetaCampaigns = [];
    currentChatHistory = [];
    resetCampaignPlanner();
    
    // Limpar estado do onboarding de PDF
    if (inputClientOnboardPdf) {
      inputClientOnboardPdf.value = '';
      selectedPdfName.textContent = 'Nenhum arquivo selecionado';
      btnUploadOnboardPdf.classList.add('hidden');
      pdfProcessingStatus.classList.add('hidden');
    }
  }

  btnCloseClientDetail.addEventListener('click', closeClientDetail);

  // --- PAINEL COMPLETO DO META ADS EM TELA CHEIA ---
  // Abrir o Painel do Meta Ads
  btnOpenMetaDashboard.addEventListener('click', () => {
    if (!currentClientId) return;
    
    // Ocultar detalhes do cliente e exibir o painel do Meta Ads
    clientDetailView.classList.add('hidden');
    clientMetaView.classList.remove('hidden');
    
    // Povoar nome e conta no cabeçalho do painel
    const client = clients.find(c => c.id === currentClientId);
    if (client) {
      metaDashboardClientName.textContent = `Painel Meta Ads - ${client.name}`;
      metaDashboardAccountId.textContent = `Conta: act_${client.meta_ad_account_id}`;
    }
    
    // Resetar filtros para ALL
    selectFilterMetaStatus.value = 'ALL';
    selectFilterMetaObjective.value = 'ALL';
    
    squadChatTyping.classList.add('hidden');
    
    // Restaurar histórico de chat anterior, se existir
    restoreChatHistoryFromLocalStorage();
    
    // Carregar campanhas automaticamente
    fetchMetaCampaignsDashboard();
  });

  // Voltar do Painel do Meta Ads para o perfil do cliente
  btnCloseMetaDashboard.addEventListener('click', () => {
    clientMetaView.classList.add('hidden');
    clientDetailView.classList.remove('hidden');
    currentChatHistory = [];
    squadChatInputArea.classList.add('hidden');
    squadChatTyping.classList.add('hidden');
    currentMetaCampaigns = []; // Limpa cache
  });

  // Atualizar campanhas do Meta Ads
  btnRefreshMetaDashboard.addEventListener('click', () => {
    fetchMetaCampaignsDashboard();
  });

  // Gerar relatório IA
  btnMetaDashboardReport.addEventListener('click', () => {
    generateMetaReportDashboard();
  });

  // Eventos de filtro
  selectFilterMetaStatus.addEventListener('change', applyMetaFilters);
  selectFilterMetaObjective.addEventListener('change', applyMetaFilters);

  async function fetchMetaCampaignsDashboard() {
    if (!currentClientId) return;

    btnRefreshMetaDashboard.disabled = true;
    btnRefreshMetaDashboard.textContent = 'Carregando...';
    metaDashboardCampaignsList.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; padding: 48px; flex-direction: column; gap: 16px;">
        <div class="loading-spinner"></div>
        <p class="text-muted" style="font-size: 14px;">Carregando campanhas do Facebook Ads Graph API...</p>
      </div>
    `;

    try {
      const response = await fetch(`/api/clients/${currentClientId}/meta-campaigns`);
      const campaigns = await response.json();

      if (!response.ok) {
        throw new Error(campaigns.error || 'Falha ao buscar campanhas.');
      }

      currentMetaCampaigns = campaigns;
      
      // Calcular e exibir métricas acumuladas
      calculateAndDisplayMetaMetrics(campaigns);
      
      // Renderizar a lista de campanhas com filtros aplicados
      applyMetaFilters();

    } catch (err) {
      console.error(err);
      metaDashboardCampaignsList.innerHTML = `
        <div class="empty-state" style="color: var(--danger); border-color: rgba(239, 68, 68, 0.2); padding: 20px;">
          <strong>Erro ao carregar campanhas:</strong><br>${err.message}
        </div>
      `;
      // Zera métricas
      metaTotalSpend.textContent = 'R$ 0,00';
      metaTotalClicks.textContent = '0';
      metaAvgCtr.textContent = '0.00%';
      metaAvgCpc.textContent = 'R$ 0,00';
    } finally {
      btnRefreshMetaDashboard.disabled = false;
      btnRefreshMetaDashboard.textContent = 'Atualizar Campanhas';
    }
  }

  function calculateAndDisplayMetaMetrics(campaigns) {
    let totalSpend = 0;
    let totalClicks = 0;
    let totalImpressions = 0;
    
    campaigns.forEach(c => {
      const ins = c.insights && c.insights.data ? c.insights.data[0] : null;
      if (ins) {
        totalSpend += parseFloat(ins.spend || 0);
        totalClicks += parseInt(ins.clicks || 0, 10);
        totalImpressions += parseInt(ins.impressions || 0, 10);
      }
    });
    
    // Formatar investido
    metaTotalSpend.textContent = 'R$ ' + totalSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    metaTotalClicks.textContent = totalClicks.toLocaleString('pt-BR');
    
    // CTR Médio ponderado
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    metaAvgCtr.textContent = avgCtr.toFixed(2) + '%';
    
    // CPC Médio ponderado
    const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    metaAvgCpc.textContent = 'R$ ' + avgCpc.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function applyMetaFilters() {
    const statusFilter = selectFilterMetaStatus.value;
    const objectiveFilter = selectFilterMetaObjective.value;
    
    const filtered = currentMetaCampaigns.filter(c => {
      // Filtrar por status
      if (statusFilter !== 'ALL' && c.status !== statusFilter) {
        return false;
      }
      
      // Filtrar por objetivo
      if (objectiveFilter !== 'ALL') {
        const obj = c.objective ? c.objective.toUpperCase() : '';
        if (objectiveFilter === 'OUTREACH' && !obj.includes('OUTREACH') && !obj.includes('AWARENESS')) return false;
        if (objectiveFilter === 'TRAFFIC' && !obj.includes('TRAFFIC') && !obj.includes('LANDING_PAGE')) return false;
        if (objectiveFilter === 'LEADS' && !obj.includes('LEADS')) return false;
        if (objectiveFilter === 'CONVERSIONS' && !obj.includes('CONVERSION') && !obj.includes('OUTCOME')) return false;
      }
      
      return true;
    });
    
    renderMetaCampaigns(filtered);
  }

  function renderMetaCampaigns(campaigns) {
    metaDashboardCampaignsList.innerHTML = '';
    
    if (campaigns.length === 0) {
      metaDashboardCampaignsList.innerHTML = '<div class="empty-state">Nenhuma campanha atende aos filtros selecionados.</div>';
      return;
    }
    
    campaigns.forEach(c => {
      const ins = c.insights && c.insights.data ? c.insights.data[0] : null;
      
      let budgetStr = 'Não definido';
      if (c.daily_budget) budgetStr = 'R$ ' + (parseFloat(c.daily_budget) / 100).toFixed(2) + '/dia';
      else if (c.lifetime_budget) budgetStr = 'R$ ' + (parseFloat(c.lifetime_budget) / 100).toFixed(2) + ' (total)';
      
      const statusClass = c.status === 'ACTIVE' ? 'status-active' : (c.status === 'PAUSED' ? 'status-paused' : 'status-other');
      
      const card = document.createElement('div');
      card.className = `meta-campaign-row-card ${statusClass}`;
      
      card.innerHTML = `
        <div class="meta-campaign-main-info">
          <span class="meta-campaign-name">${c.name}</span>
          <span class="meta-campaign-objective">${c.objective || 'Geral'}</span>
        </div>
        
        <div class="meta-campaign-status-badge">
          <span class="meta-status-dot ${c.status === 'ACTIVE' ? 'active' : 'paused'}"></span>
          <span>${c.status === 'ACTIVE' ? 'Ativa' : 'Pausada'}</span>
        </div>
        
        <div class="meta-campaign-metric-group">
          <span class="meta-campaign-metric-label">Orçamento</span>
          <span class="meta-campaign-metric-value" style="font-size: 12px;">${budgetStr}</span>
        </div>
        
        ${ins ? `
        <div class="meta-campaign-metric-group">
          <span class="meta-campaign-metric-label">Performance</span>
          <span class="meta-campaign-metric-value">
            R$ ${parseFloat(ins.spend || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} gasto<br>
            <strong>${parseInt(ins.clicks || 0).toLocaleString('pt-BR')}</strong> cliques (CTR ${ins.ctr}%)
          </span>
        </div>
        ` : `
        <div class="meta-campaign-metric-group">
          <span class="meta-campaign-metric-label">Performance</span>
          <span class="meta-campaign-metric-value text-muted" style="font-size: 11px;">Sem dados de insights</span>
        </div>
        `}
        
        <div class="meta-campaign-conversions">
          <span class="meta-campaign-metric-label" style="color: var(--success);">Resultados</span>
          <span class="meta-campaign-metric-value">${ins && ins.conversions ? ins.conversions : '0'}</span>
        </div>
      `;
      metaDashboardCampaignsList.appendChild(card);
    });
  }

  function saveChatHistoryToLocalStorage() {
    if (currentClientId) {
      localStorage.setItem(`squad_chat_${currentClientId}`, JSON.stringify(currentChatHistory));
    }
  }

  function restoreChatHistoryFromLocalStorage() {
    if (!currentClientId) return;
    const saved = localStorage.getItem(`squad_chat_${currentClientId}`);
    if (saved) {
      try {
        currentChatHistory = JSON.parse(saved);
        renderChatHistory();
        squadChatInputArea.classList.remove('hidden');
      } catch (err) {
        console.error('Erro ao restaurar histórico de chat:', err);
        currentChatHistory = [];
        squadChatInputArea.classList.add('hidden');
      }
    } else {
      currentChatHistory = [];
      squadChatInputArea.classList.add('hidden');
      metaDashboardReportOutput.innerHTML = '<div class="empty-state">Nenhum diagnóstico gerado ainda. Clique em "Gerar Diagnóstico IA" no topo para consultar o Squad e iniciar a conversa.</div>';
    }
  }

  function renderChatHistory() {
    metaDashboardReportOutput.innerHTML = '';
    currentChatHistory.forEach(msg => {
      const bubble = document.createElement('div');
      if (msg.role === 'user') {
        bubble.className = 'message-user';
        bubble.textContent = msg.content;
      } else {
        bubble.className = 'message-assistant';
        bubble.innerHTML = parseMarkdown(msg.content);
      }
      metaDashboardReportOutput.appendChild(bubble);
    });
    scrollChatToBottom();
  }

  async function generateMetaReportDashboard() {
    if (!currentClientId) return;

    btnMetaDashboardReport.disabled = true;
    btnMetaDashboardReport.textContent = 'Gerando Diagnóstico...';
    
    metaDashboardReportStatus.classList.remove('hidden');
    metaDashboardReportOutput.innerHTML = '';
    squadChatInputArea.classList.add('hidden');
    squadChatTyping.classList.add('hidden');
    currentChatHistory = [];
    
    try {
      const response = await fetch(`/api/clients/${currentClientId}/meta-report?provider=${activeAIProvider}`, {
        method: 'POST'
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar relatório.');
      }

      currentChatHistory = [{ role: 'assistant', content: data.report }];
      saveChatHistoryToLocalStorage();
      renderChatHistory();
      squadChatInputArea.classList.remove('hidden');

    } catch (err) {
      console.error(err);
      currentChatHistory = [];
      squadChatInputArea.classList.add('hidden');
      metaDashboardReportOutput.innerHTML = `
        <div class="empty-state" style="color: var(--danger); border-color: rgba(239, 68, 68, 0.2); padding: 20px;">
          <strong>Erro ao gerar relatório do Squad:</strong><br>${err.message}
        </div>
      `;
    } finally {
      metaDashboardReportStatus.classList.add('hidden');
      btnMetaDashboardReport.disabled = false;
      btnMetaDashboardReport.textContent = 'Gerar Diagnóstico IA';
    }
  }

  async function sendSquadChatMessage() {
    const text = inputSquadChat.value.trim();
    if (!text || !currentClientId) return;

    inputSquadChat.disabled = true;
    btnSendSquadChat.disabled = true;
    inputSquadChat.value = '';

    currentChatHistory.push({ role: 'user', content: text });
    saveChatHistoryToLocalStorage();
    
    const userMsgBubble = document.createElement('div');
    userMsgBubble.className = 'message-user';
    userMsgBubble.textContent = text;
    metaDashboardReportOutput.appendChild(userMsgBubble);
    
    scrollChatToBottom();

    squadChatTyping.classList.remove('hidden');
    scrollChatToBottom();

    try {
      const response = await fetch(`/api/clients/${currentClientId}/meta-chat?provider=${activeAIProvider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: currentChatHistory.slice(0, -1)
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao conversar com o Squad.');
      }

      currentChatHistory.push({ role: 'assistant', content: data.response });
      saveChatHistoryToLocalStorage();

      const squadMsgBubble = document.createElement('div');
      squadMsgBubble.className = 'message-assistant';
      squadMsgBubble.innerHTML = parseMarkdown(data.response);
      metaDashboardReportOutput.appendChild(squadMsgBubble);

    } catch (err) {
      console.error(err);
      const errMsgBubble = document.createElement('div');
      errMsgBubble.className = 'message-assistant';
      errMsgBubble.innerHTML = `
        <div class="empty-state" style="color: var(--danger); border-color: rgba(239, 68, 68, 0.2); padding: 15px; margin: 0; width: 100%;">
          <strong>Erro na resposta do Squad:</strong><br>${err.message}
        </div>
      `;
      metaDashboardReportOutput.appendChild(errMsgBubble);
    } finally {
      squadChatTyping.classList.add('hidden');
      inputSquadChat.disabled = false;
      btnSendSquadChat.disabled = false;
      inputSquadChat.focus();
      scrollChatToBottom();
    }
  }

  function scrollChatToBottom() {
    metaDashboardReportOutput.scrollTop = metaDashboardReportOutput.scrollHeight;
  }

  // Eventos do Chat do Squad
  btnSendSquadChat.addEventListener('click', sendSquadChatMessage);
  inputSquadChat.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendSquadChatMessage();
    }
  });

  // --- PLANEJADOR DE CAMPANHA (SQUAD AI) ---
  
  // Abrir seletor de arquivos ao clicar na zona de upload
  if (plannerDragDropArea) {
    plannerDragDropArea.addEventListener('click', () => {
      inputPlannerCreatives.click();
    });

    // Highlight drag areas
    ['dragenter', 'dragover'].forEach(eventName => {
      plannerDragDropArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        plannerDragDropArea.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      plannerDragDropArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        plannerDragDropArea.classList.remove('dragover');
      }, false);
    });

    // Handle dropped files
    plannerDragDropArea.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = Array.from(dt.files);
      handlePlannerFilesSelection(files);
    });
  }

  if (inputPlannerCreatives) {
    // Handle selected files
    inputPlannerCreatives.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      handlePlannerFilesSelection(files);
    });
  }

  function handlePlannerFilesSelection(files) {
    // Filtrar apenas imagens e vídeos
    const validFiles = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    
    if (selectedCampaignFiles.length + validFiles.length > 3) {
      alert('Você pode selecionar no máximo 3 criativos para planejar a campanha.');
      return;
    }

    selectedCampaignFiles = [...selectedCampaignFiles, ...validFiles];
    renderPlannerPreviews();
  }

  function removePlannerFile(index) {
    selectedCampaignFiles.splice(index, 1);
    renderPlannerPreviews();
  }

  function renderPlannerPreviews() {
    if (!plannerPreviewsContainer || !btnRunPlanner) return;
    plannerPreviewsContainer.innerHTML = '';
    
    if (selectedCampaignFiles.length === 0) {
      plannerPreviewsContainer.classList.add('hidden');
      btnRunPlanner.disabled = true;
      return;
    }

    plannerPreviewsContainer.classList.remove('hidden');
    btnRunPlanner.disabled = false;

    selectedCampaignFiles.forEach((file, index) => {
      const card = document.createElement('div');
      card.className = 'planner-preview-card';
      
      const thumb = document.createElement('div');
      thumb.className = 'planner-preview-thumbnail';
      
      if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.className = 'planner-preview-thumbnail';
        thumb.appendChild(img);
      } else {
        // Vídeo thumbnail placeholder
        thumb.innerHTML = `
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--primary); margin-top: 10px;"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
          <span style="font-size: 10px; margin-top: 4px; display: block; color: var(--text-muted);">Vídeo</span>
        `;
      }

      const name = document.createElement('span');
      name.className = 'planner-preview-name';
      name.textContent = file.name;

      const removeBtn = document.createElement('button');
      removeBtn.className = 'planner-preview-remove';
      removeBtn.innerHTML = '&times;';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removePlannerFile(index);
      });

      card.appendChild(thumb);
      card.appendChild(name);
      card.appendChild(removeBtn);
      plannerPreviewsContainer.appendChild(card);
    });
  }

  function resetCampaignPlanner() {
    selectedCampaignFiles = [];
    if (inputCampaignContext) inputCampaignContext.value = '';
    if (inputPlannerCreatives) inputPlannerCreatives.value = '';
    if (plannerPreviewsContainer) {
      plannerPreviewsContainer.innerHTML = '';
      plannerPreviewsContainer.classList.add('hidden');
    }
    if (btnRunPlanner) btnRunPlanner.disabled = true;
    if (campaignPlannerStatus) campaignPlannerStatus.classList.add('hidden');
    if (campaignPlannerOutput) {
      campaignPlannerOutput.classList.add('hidden');
      plannerReportMarkdown.innerHTML = '';
    }
  }

  if (btnRunPlanner) {
    // Executar Planejador
    btnRunPlanner.addEventListener('click', async () => {
      if (!currentClientId || selectedCampaignFiles.length === 0) return;

      const hasVideo = selectedCampaignFiles.some(f => f.type.startsWith('video/'));
      if (hasVideo && activeAIProvider === 'openai') {
        alert('O provedor OpenAI GPT não suporta análise de vídeo direta. Por favor, alterne para o Google Gemini na barra lateral para planejar usando vídeos.');
        return;
      }

      btnRunPlanner.disabled = true;
      campaignPlannerStatus.classList.remove('hidden');
      campaignPlannerOutput.classList.add('hidden');
      
      const formData = new FormData();
      selectedCampaignFiles.forEach(file => {
        formData.append('creatives', file);
      });
      formData.append('campaignContext', inputCampaignContext.value.trim());

      try {
        const response = await fetch(`/api/clients/${currentClientId}/plan-campaign?provider=${activeAIProvider}`, {
          method: 'POST',
          body: formData
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Erro ao gerar planejamento.');
        }

        plannerReportMarkdown.innerHTML = parseMarkdown(data.recommendation);
        campaignPlannerOutput.classList.remove('hidden');
        
        // Rolar até o resultado
        campaignPlannerOutput.scrollIntoView({ behavior: 'smooth' });

      } catch (err) {
        console.error(err);
        alert('Erro ao planejar campanha: ' + err.message);
      } finally {
        campaignPlannerStatus.classList.add('hidden');
        btnRunPlanner.disabled = false;
      }
    });
  }

  // --- PDF ONBOARDING EVENT HANDLERS ---
  btnTriggerPdfUpload.addEventListener('click', () => {
    inputClientOnboardPdf.click();
  });

  inputClientOnboardPdf.addEventListener('change', () => {
    if (inputClientOnboardPdf.files.length > 0) {
      const file = inputClientOnboardPdf.files[0];
      selectedPdfName.textContent = file.name;
      btnUploadOnboardPdf.classList.remove('hidden');
    } else {
      selectedPdfName.textContent = 'Nenhum arquivo selecionado';
      btnUploadOnboardPdf.classList.add('hidden');
    }
  });

  btnUploadOnboardPdf.addEventListener('click', async () => {
    if (!currentClientId) return;
    const file = inputClientOnboardPdf.files[0];
    if (!file) return;

    btnTriggerPdfUpload.disabled = true;
    btnUploadOnboardPdf.disabled = true;
    btnUploadOnboardPdf.textContent = 'Processando...';
    pdfProcessingStatus.classList.remove('hidden');
    
    pdfStatusText.textContent = 'Enviando PDF...';
    let progressTimer = setTimeout(() => {
      pdfStatusText.textContent = `${activeAIProvider === 'gemini' ? 'Gemini' : 'OpenAI'} lendo documento de briefing...`;
    }, 2500);
    let progressTimer2 = setTimeout(() => {
      pdfStatusText.textContent = 'Extraindo personas, metas e tom de voz...';
    }, 7000);
    let progressTimer3 = setTimeout(() => {
      pdfStatusText.textContent = 'Salvando e atualizando perfil no Directus...';
    }, 13000);

    const formData = new FormData();
    formData.append('document', file);

    try {
      const response = await fetch(`/api/clients/${currentClientId}/onboard-document?provider=${activeAIProvider}`, {
        method: 'POST',
        body: formData
      });
      const result = await response.json();

      clearTimeout(progressTimer);
      clearTimeout(progressTimer2);
      clearTimeout(progressTimer3);

      if (!response.ok) {
        throw new Error(result.error || 'Falha ao processar documento.');
      }

      pdfStatusText.textContent = 'Perfil atualizado!';
      setTimeout(async () => {
        inputClientOnboardPdf.value = '';
        selectedPdfName.textContent = 'Nenhum arquivo selecionado';
        btnUploadOnboardPdf.classList.add('hidden');
        pdfProcessingStatus.classList.add('hidden');
        
        await viewClientDetail(currentClientId);
        await loadClientsData();
      }, 1000);

    } catch (err) {
      clearTimeout(progressTimer);
      clearTimeout(progressTimer2);
      clearTimeout(progressTimer3);
      console.error(err);
      alert('Erro ao processar PDF Onboarding: ' + err.message);
      pdfProcessingStatus.classList.add('hidden');
    } finally {
      btnTriggerPdfUpload.disabled = false;
      btnUploadOnboardPdf.disabled = false;
      btnUploadOnboardPdf.textContent = 'Processar Documento';
    }
  });

  // --- CRUD DE CLIENTE ---
  function openClientModal(client = null) {
    if (client) {
      modalClientTitle.textContent = 'Editar Cliente';
      inputClientId.value = client.id;
      inputClientName.value = client.name;
      inputClientNiche.value = client.niche || '';
      inputClientMetaId.value = client.meta_ad_account_id || '';
      inputClientMetaToken.value = client.meta_access_token || '';
      inputClientAudience.value = client.target_audience || '';
      inputClientObjective.value = client.marketing_objective || '';
      inputClientKpi.value = client.target_kpi || '';
      inputClientBudget.value = client.monthly_budget || '';
      inputClientVoice.value = client.brand_voice || '';
      inputClientNotes.value = client.notes || '';
    } else {
      modalClientTitle.textContent = 'Adicionar Novo Cliente';
      formClient.reset();
      inputClientId.value = '';
      inputClientMetaId.value = '';
      inputClientMetaToken.value = '';
      inputClientObjective.value = '';
      inputClientKpi.value = '';
      inputClientBudget.value = '';
    }
    modalClient.classList.remove('hidden');
  }

  function closeModal() {
    modalClient.classList.add('hidden');
    formClient.reset();
  }

  btnAddClientModal.addEventListener('click', () => openClientModal());
  btnCloseModal.addEventListener('click', closeModal);
  btnCancelModal.addEventListener('click', closeModal);

  formClient.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = inputClientId.value;
    const clientData = {
      name: inputClientName.value,
      niche: inputClientNiche.value,
      meta_ad_account_id: inputClientMetaId.value,
      meta_access_token: inputClientMetaToken.value,
      target_audience: inputClientAudience.value,
      marketing_objective: inputClientObjective.value,
      target_kpi: inputClientKpi.value,
      monthly_budget: inputClientBudget.value,
      brand_voice: inputClientVoice.value,
      notes: inputClientNotes.value
    };

    try {
      let url = '/api/clients';
      let method = 'POST';
      
      if (id) {
        url = `/api/clients/${id}`;
        method = 'PUT';
      }

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData)
      });

      if (!response.ok) throw new Error('Erro ao salvar dados do cliente.');

      closeModal();
      loadClientsData();
      
      if (id) {
        viewClientDetail(id);
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar cadastro do cliente.');
    }
  });

  btnEditClient.addEventListener('click', async () => {
    if (!currentClientId) return;
    const res = await fetch(`/api/clients/${currentClientId}`);
    if (res.ok) {
      const fullClient = await res.json();
      openClientModal(fullClient);
    }
  });

  btnDeleteClient.addEventListener('click', async () => {
    if (!currentClientId) return;
    if (confirm('Tem certeza que deseja excluir este cliente e todas as suas análises de criativos? Esta ação é irreversível.')) {
      try {
        const response = await fetch(`/api/clients/${currentClientId}`, {
          method: 'DELETE'
        });
        if (!response.ok) throw new Error('Erro ao excluir cliente.');
        closeClientDetail();
        loadClientsData();
      } catch (error) {
        console.error(error);
        alert('Erro ao excluir cliente.');
      }
    }
  });

  // --- ANALISADOR DE CRIATIVOS ---
  // Drag & Drop
  ['dragenter', 'dragover'].forEach(eventName => {
    dragDropArea.addEventListener(eventName, (e) => {
      e.preventDefault();
      dragDropArea.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dragDropArea.addEventListener(eventName, (e) => {
      e.preventDefault();
      dragDropArea.classList.remove('dragover');
    }, false);
  });

  dragDropArea.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      fileInputCreative.files = files;
      handleSelectedFile(files[0]);
    }
  });

  fileInputCreative.addEventListener('change', (e) => {
    if (fileInputCreative.files.length > 0) {
      handleSelectedFile(fileInputCreative.files[0]);
    }
  });

  function handleSelectedFile(file) {
    previewFileName.textContent = file.name;
    filePreviewIndicator.classList.remove('hidden');
    dragDropArea.querySelector('.drag-drop-content').classList.add('hidden');
  }

  function clearSelectedFile() {
    fileInputCreative.value = '';
    filePreviewIndicator.classList.add('hidden');
    dragDropArea.querySelector('.drag-drop-content').classList.remove('hidden');
  }

  btnClearSelectedFile.addEventListener('click', (e) => {
    e.stopPropagation();
    clearSelectedFile();
  });

  // Executar Análise de Criativo
  formAnalyzer.addEventListener('submit', async (e) => {
    e.preventDefault();
    const clientId = analyzerClientSelect.value;
    const file = fileInputCreative.files[0];

    if (!clientId) {
      alert('Selecione um cliente para prosseguir.');
      return;
    }
    if (!file) {
      alert('Faça o upload de um criativo para analisar.');
      return;
    }

    formAnalyzer.classList.add('hidden');
    analyzerLoadingStatus.classList.remove('hidden');
    btnSubmitAnalysis.disabled = true;
    
    resultsPlaceholderScreen.classList.remove('hidden');
    resultsContentView.classList.add('hidden');

    const formData = new FormData();
    formData.append('creative', file);

    const isVideo = file.type.startsWith('video/');
    
    if (isVideo && activeAIProvider === 'openai') {
      alert('O provedor OpenAI GPT não suporta análise de vídeo direta. Por favor, alterne para o Google Gemini na barra lateral para analisar vídeos.');
      formAnalyzer.classList.remove('hidden');
      analyzerLoadingStatus.classList.add('hidden');
      btnSubmitAnalysis.disabled = false;
      return;
    }
    
    updateLoadingStep('Enviando criativo para o servidor...', 20);

    let progressInterval = setInterval(() => {
      if (isVideo) {
        updateLoadingStep('Servidor recebendo vídeo de alta fidelidade...', 35);
      } else {
        updateLoadingStep('Analisando pixels com Gemini Vision...', 60);
      }
    }, 4000);

    try {
      if (isVideo) {
        setTimeout(() => {
          updateLoadingStep(`Vídeo enviado. Solicitando renderização no ${activeAIProvider === 'gemini' ? 'Gemini' : 'GPT'}...`, 50);
        }, 3000);
        setTimeout(() => {
          updateLoadingStep('Aguardando processamento do vídeo (isso pode levar até 45 segundos)...', 70);
        }, 7000);
      }

      const response = await fetch(`/api/clients/${clientId}/analyze?provider=${activeAIProvider}`, {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      updateLoadingStep('Processando retorno estratégico...', 90);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro interno na API do Gemini.');
      }

      updateLoadingStep('Finalizando memória...', 100);
      setTimeout(() => {
        showAnalysisResults(data, file);
      }, 500);

    } catch (error) {
      clearInterval(progressInterval);
      console.error(error);
      alert('Erro ao executar análise: ' + error.message);
      
      formAnalyzer.classList.remove('hidden');
      analyzerLoadingStatus.classList.add('hidden');
      btnSubmitAnalysis.disabled = false;
    }
  });

  function updateLoadingStep(text, percentage) {
    loadingStatusStep.textContent = text;
    loadingProgressFill.style.width = percentage + '%';
  }

  function showAnalysisResults(data, file) {
    analyzerLoadingStatus.classList.add('hidden');
    formAnalyzer.classList.remove('hidden');
    btnSubmitAnalysis.disabled = false;

    resultsPlaceholderScreen.classList.add('hidden');
    resultsContentView.classList.remove('hidden');

    mediaViewportContainer.innerHTML = '';
    if (data.mediaType === 'video') {
      const video = document.createElement('video');
      video.src = data.mediaPath;
      video.controls = true;
      video.autoplay = false;
      mediaViewportContainer.appendChild(video);
    } else {
      const img = document.createElement('img');
      img.src = data.mediaPath;
      mediaViewportContainer.appendChild(img);
    }

    analysisOutputMarkdown.innerHTML = parseMarkdown(data.analysis);
    clearSelectedFile();
    loadClientsData();
  }

  // --- HISTÓRICO GERAL ---
  async function loadGeneralHistory() {
    try {
      historyTbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Carregando histórico...</td></tr>';
      
      const allAnalyses = [];
      
      for (const client of clients) {
        const res = await fetch(`/api/clients/${client.id}`);
        if (res.ok) {
          const detail = await res.json();
          if (detail.analyses) {
            detail.analyses.forEach(a => {
              allAnalyses.push({
                ...a,
                client_name: client.name
              });
            });
          }
        }
      }

      allAnalyses.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      historyTbody.innerHTML = '';
      if (allAnalyses.length === 0) {
        historyTbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Nenhuma análise registrada até o momento.</td></tr>';
        return;
      }

      allAnalyses.forEach(analysis => {
        const tr = document.createElement('tr');
        const fileThumbnail = analysis.media_type === 'video' 
          ? `<div class="history-media-preview">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
             </div>`
          : `<div class="history-media-preview"><img src="${analysis.media_path}"></div>`;

        tr.innerHTML = `
          <td>${new Date(analysis.created_at).toLocaleString('pt-BR')}</td>
          <td><strong>${analysis.client_name}</strong></td>
          <td>${analysis.media_type === 'video' ? 'Vídeo' : 'Imagem'}</td>
          <td>${fileThumbnail}</td>
          <td><button class="btn btn-secondary btn-sm btn-history-view" data-id="${analysis.id}">Ver Relatório</button></td>
        `;

        tr.querySelector('.btn-history-view').addEventListener('click', () => {
          openAnalysisDetailModal(analysis, analysis.client_name);
        });

        historyTbody.appendChild(tr);
      });

    } catch (err) {
      console.error(err);
      historyTbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--danger);">Erro ao carregar histórico.</td></tr>';
    }
  }

  // --- MODAL DE DETALHE DE ANÁLISE ---
  function openAnalysisDetailModal(analysis, clientName) {
    modalAnalysisTitle.textContent = `Relatório do Cliente: ${clientName}`;
    
    modalMediaViewport.innerHTML = '';
    if (analysis.media_type === 'video') {
      const video = document.createElement('video');
      video.src = analysis.media_path;
      video.controls = true;
      modalMediaViewport.appendChild(video);
    } else {
      const img = document.createElement('img');
      img.src = analysis.media_path;
      modalMediaViewport.appendChild(img);
    }

    modalAnalysisText.innerHTML = parseMarkdown(analysis.feedback);
    modalAnalysisDetail.classList.remove('hidden');
  }

  function closeAnalysisModal() {
    modalAnalysisDetail.classList.add('hidden');
    modalMediaViewport.innerHTML = '';
  }

  btnCloseAnalysisModal.addEventListener('click', closeAnalysisModal);
  btnCloseAnalysisModalFooter.addEventListener('click', closeAnalysisModal);

  // --- PARSER DE MARKDOWN PARA HTML ---
  function parseMarkdown(markdownText) {
    if (!markdownText) return '';
    let html = markdownText.trim();

    html = html.replace(/```markdown/gi, '').replace(/```/g, '');

    // Parsea Títulos H3
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    // Parsea Títulos H2
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    // Parsea Títulos H1
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Parsea Negrito (**texto**)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Parsea Listas com marcadores (* ou - ou números)
    const lines = html.split('\n');
    let inList = false;
    let listType = null;
    let processedLines = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        const itemContent = trimmed.substring(2);
        if (!inList) {
          processedLines.push('<ul>');
          inList = true;
          listType = 'ul';
        }
        processedLines.push(`<li>${itemContent}</li>`);
      } else if (/^\d+\.\s/.test(trimmed)) {
        const itemContent = trimmed.replace(/^\d+\.\s/, '');
        if (!inList) {
          processedLines.push('<ol>');
          inList = true;
          listType = 'ol';
        }
        processedLines.push(`<li>${itemContent}</li>`);
      } else {
        if (inList) {
          processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
          inList = false;
          listType = null;
        }
        processedLines.push(line);
      }
    });

    if (inList) {
      processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
    }

    html = processedLines.join('\n');

    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p><h3>/g, '<h3>').replace(/<\/h3><\/p>/g, '</h3>');
    html = html.replace(/<p><h2>/g, '<h2>').replace(/<\/h2><\/p>/g, '</h2>');
    html = html.replace(/<p><ul>/g, '<ul>').replace(/<\/ul><\/p>/g, '</ul>');
    html = html.replace(/<p><ol>/g, '<ol>').replace(/<\/ol><\/p>/g, '</ol>');

    // Post-process: wrap <h3> blocks into styled cards
    if (html.includes('<h3>')) {
      const parts = html.split('<h3>');
      let newHtml = parts[0]; // content before first h3
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        const closeH3Index = part.indexOf('</h3>');
        if (closeH3Index !== -1) {
          const title = part.substring(0, closeH3Index);
          const content = part.substring(closeH3Index + 5);
          
          let cardClass = 'expert-card';
          if (title.includes('Pedro Sobral')) {
            cardClass += ' expert-sobral';
          } else if (title.includes('Gary Halbert')) {
            cardClass += ' expert-halbert';
          } else if (title.includes('David Ogilvy')) {
            cardClass += ' expert-ogilvy';
          } else if (title.includes('Alex Hormozi')) {
            cardClass += ' expert-hormozi';
          } else if (title.includes('Plano de Ação')) {
            cardClass += ' squad-action-plan';
          }

          newHtml += `<details class="${cardClass}" open><summary><h3>${title}</h3></summary><div class="expert-card-content">${content}</div></details>`;
        } else {
          newHtml += `<h3>${part}`;
        }
      }
      html = newHtml;
    }

    return html;
  }

  // --- CARREGAMENTO INICIAL ---
  loadClientsData();
});
