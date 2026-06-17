const path = require('path');

const url = (process.env.DIRECTUS_URL || '').replace(/\/$/, '');
const token = process.env.DIRECTUS_TOKEN;

const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

// Inicializador de Coleções e Campos no Directus
async function checkAndCreateCollections() {
  if (!url || !token) {
    console.error('[Directus] Erro: DIRECTUS_URL ou DIRECTUS_TOKEN não configurados no arquivo .env.');
    return;
  }

  try {
    // 1. Listar todas as coleções do Directus para saber quais já existem
    console.log('[Directus Setup] Listando coleções do Directus...');
    const resList = await fetch(`${url}/collections`, { headers });
    if (!resList.ok) {
      throw new Error(`Falha ao listar coleções: ${resList.statusText}`);
    }
    const listData = await resList.json();
    const existingCollections = (listData.data || []).map(c => c.collection);

    // 2. Verificar/Criar coleção 'clientes'
    if (!existingCollections.includes('clientes')) {
      console.log('[Directus Setup] Coleção "clientes" não encontrada. Criando...');
      const createCollRes = await fetch(`${url}/collections`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          collection: 'clientes',
          schema: {},
          meta: {
            icon: 'business',
            note: 'Clientes cadastrados na AgênciaOS'
          }
        })
      });

      if (!createCollRes.ok) {
        throw new Error('Falha ao criar coleção clientes: ' + createCollRes.statusText);
      }
    }

    // Sempre verificar/criar campos para 'clientes'
    const clientFields = [
      { field: 'name', type: 'string', meta: { interface: 'input', required: true } },
      { field: 'niche', type: 'string', meta: { interface: 'input' } },
      { field: 'target_audience', type: 'text', meta: { interface: 'textarea' } },
      { field: 'marketing_goals', type: 'text', meta: { interface: 'textarea' } },
      { field: 'brand_voice', type: 'text', meta: { interface: 'textarea' } },
      { field: 'notes', type: 'text', meta: { interface: 'textarea' } },
      { field: 'meta_ad_account_id', type: 'string', meta: { interface: 'input' } },
      { field: 'meta_access_token', type: 'text', meta: { interface: 'input' } },
      { field: 'marketing_objective', type: 'string', meta: { interface: 'input' } },
      { field: 'target_kpi', type: 'string', meta: { interface: 'input' } },
      { field: 'monthly_budget', type: 'string', meta: { interface: 'input' } },
      { field: 'created_at', type: 'string', meta: { interface: 'input', hidden: true } }
    ];

    for (const f of clientFields) {
      await checkAndCreateField('clientes', f.field, f.type, f.meta);
    }

    // 3. Verificar/Criar coleção 'analises'
    if (!existingCollections.includes('analises')) {
      console.log('[Directus Setup] Coleção "analises" não encontrada. Criando...');
      const createCollRes2 = await fetch(`${url}/collections`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          collection: 'analises',
          schema: {},
          meta: {
            icon: 'analytics',
            note: 'Análises de criativos com IA'
          }
        })
      });

      if (!createCollRes2.ok) {
        throw new Error('Falha ao criar coleção analises: ' + createCollRes2.statusText);
      }
    }

    // Sempre verificar/criar campos para 'analises'
    const analysisFields = [
      { field: 'client_id', type: 'string', meta: { interface: 'input', required: true } },
      { field: 'media_path', type: 'string', meta: { interface: 'input' } },
      { field: 'media_type', type: 'string', meta: { interface: 'input' } },
      { field: 'feedback', type: 'text', meta: { interface: 'textarea' } },
      { field: 'created_at', type: 'string', meta: { interface: 'input', hidden: true } }
    ];

    for (const f of analysisFields) {
      await checkAndCreateField('analises', f.field, f.type, f.meta);
    }

    console.log('[Directus Setup] Inicialização e checagem de esquema do Directus concluída.');
  } catch (error) {
    console.error('[Directus Setup] Erro crítico na inicialização do Directus:', error);
  }
}

// Auxiliar para criar campos dinamicamente se não existirem
async function checkAndCreateField(collection, fieldName, type, meta = { interface: 'input' }) {
  try {
    const res = await fetch(`${url}/fields/${collection}/${fieldName}`, { headers });
    // Se der 404 ou 403, significa que o campo não existe
    if (res.status === 404 || res.status === 403) {
      console.log(`[Directus Setup] Criando campo "${fieldName}" na coleção "${collection}"...`);
      const createRes = await fetch(`${url}/fields/${collection}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          field: fieldName,
          type: type,
          meta: meta
        })
      });
      if (!createRes.ok) {
        const errText = await createRes.text();
        console.error(`[Directus Setup] Falha ao criar campo ${fieldName} em ${collection}: ${errText}`);
      }
    }
  } catch (e) {
    console.error(`Erro ao verificar/criar campo ${fieldName} em ${collection}:`, e);
  }
}

const dbHelper = {
  // Inicializador chamado pelo servidor
  async init() {
    await checkAndCreateCollections();
  },

  // Retorna todos os clientes
  async getClients() {
    try {
      const res = await fetch(`${url}/items/clientes?sort=-id`, { headers });
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    } catch (e) {
      console.error('Erro ao buscar clientes no Directus:', e);
      return [];
    }
  },

  // Retorna um cliente específico por ID
  async getClientById(id) {
    try {
      const res = await fetch(`${url}/items/clientes/${id}`, { headers });
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch (e) {
      console.error(`Erro ao buscar cliente ${id} no Directus:`, e);
      return null;
    }
  },

  // Cria um novo cliente
  async createClient({ name, niche, target_audience, marketing_goals, brand_voice, notes, meta_ad_account_id, meta_access_token, marketing_objective, target_kpi, monthly_budget }) {
    try {
      const res = await fetch(`${url}/items/clientes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name,
          niche,
          target_audience,
          marketing_goals,
          brand_voice,
          notes,
          meta_ad_account_id: meta_ad_account_id || '',
          meta_access_token: meta_access_token || '',
          marketing_objective: marketing_objective || '',
          target_kpi: target_kpi || '',
          monthly_budget: monthly_budget || '',
          created_at: new Date().toISOString()
        })
      });
      
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Directus respondeu com status ${res.status}: ${errText}`);
      }

      const data = await res.json();
      if (!data || !data.data) {
        throw new Error('Directus não retornou os dados do cliente criado.');
      }
      return { id: data.data.id };
    } catch (e) {
      console.error('Erro ao criar cliente no Directus:', e);
      throw e;
    }
  },

  // Atualiza os dados cadastrais e briefing de um cliente
  async updateClient(id, { name, niche, target_audience, marketing_goals, brand_voice, notes, meta_ad_account_id, meta_access_token, marketing_objective, target_kpi, monthly_budget }) {
    try {
      const res = await fetch(`${url}/items/clientes/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          name,
          niche,
          target_audience,
          marketing_goals,
          brand_voice,
          notes,
          meta_ad_account_id: meta_ad_account_id || '',
          meta_access_token: meta_access_token || '',
          marketing_objective: marketing_objective || '',
          target_kpi: target_kpi || '',
          monthly_budget: monthly_budget || ''
        })
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Directus respondeu com status ${res.status}: ${errText}`);
      }
      return { success: true };
    } catch (e) {
      console.error(`Erro ao atualizar cliente ${id} no Directus:`, e);
      throw e;
    }
  },

  // Exclui um cliente
  async deleteClient(id) {
    try {
      await fetch(`${url}/items/clientes/${id}`, {
        method: 'DELETE',
        headers
      });
      return { success: true };
    } catch (e) {
      console.error(`Erro ao excluir cliente ${id} no Directus:`, e);
      throw e;
    }
  },

  // Salva o histórico de análise de um criativo
  async saveAnalysis({ client_id, media_path, media_type, feedback }) {
    try {
      const res = await fetch(`${url}/items/analises`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          client_id: String(client_id),
          media_path,
          media_type,
          feedback,
          created_at: new Date().toISOString()
        })
      });
      const data = await res.json();
      return { id: data.data.id };
    } catch (e) {
      console.error('Erro ao salvar análise no Directus:', e);
      throw e;
    }
  },

  // Retorna o histórico de análises de um cliente
  async getAnalysesByClient(client_id) {
    try {
      const res = await fetch(`${url}/items/analises?filter[client_id][_eq]=${client_id}&sort=-id`, { headers });
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    } catch (e) {
      console.error(`Erro ao buscar análises do cliente ${client_id} no Directus:`, e);
      return [];
    }
  },

  // Atualiza as anotações contínuas de aprendizado sobre o cliente
  async updateClientNotes(client_id, notes) {
    try {
      await fetch(`${url}/items/clientes/${client_id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ notes })
      });
      return { success: true };
    } catch (e) {
      console.error(`Erro ao atualizar memória do cliente ${client_id} no Directus:`, e);
      throw e;
    }
  }
};

module.exports = dbHelper;
