require('dotenv').config();

// Polyfills para evitar que o pdfjs-dist (usado pelo pdf-parse) quebre em ambiente Node.js na VPS
if (typeof global.DOMMatrix === 'undefined') {
  global.DOMMatrix = class DOMMatrix {};
}
if (typeof global.ImageData === 'undefined') {
  global.ImageData = class ImageData {};
}
if (typeof global.Path2D === 'undefined') {
  global.Path2D = class Path2D {};
}

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager } = require('@google/generative-ai/server');
const pdfParse = require('pdf-parse');
const db = require('./database');
const mammoth = require('mammoth');

// Helper para extrair texto de PDF suportando diferentes versões da biblioteca pdf-parse
async function extractTextFromPdf(dataBuffer) {
  if (typeof pdfParse === 'function') {
    const data = await pdfParse(dataBuffer);
    return data.text;
  } else if (pdfParse && typeof pdfParse.PDFParse === 'function') {
    const parser = new pdfParse.PDFParse({ data: dataBuffer });
    const data = await parser.getText();
    return data.text;
  } else {
    throw new Error('Não foi possível inicializar a biblioteca pdf-parse.');
  }
}

// Helper para extrair texto de DOCX usando a biblioteca mammoth
async function extractTextFromDocx(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

const app = express();
const PORT = process.env.PORT || 3000;

// Helper para fazer requisições para a API do OpenAI
async function callOpenAI(messages, responseJson = false) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('A chave de API do OpenAI (OPENAI_API_KEY) não está configurada no arquivo .env.');
  }

  const payload = {
    model: 'gpt-4o-mini',
    messages: messages
  };

  if (responseJson) {
    payload.response_format = { type: 'json_object' };
  }

  console.log('[OpenAI API] Enviando requisição de Chat Completion...');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro na API do OpenAI: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  if (!data.choices || data.choices.length === 0) {
    throw new Error('Nenhuma resposta retornada pelo OpenAI.');
  }

  return data.choices[0].message.content;
}

// Inicializa o SDK do Gemini se a chave de API estiver configurada
const apiKey = process.env.GEMINI_API_KEY;
let genAI;
let fileManager;
if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
  fileManager = new GoogleAIFileManager(apiKey);
} else {
  console.warn('AVISO: GEMINI_API_KEY não encontrada no arquivo .env. As análises de IA não funcionarão até que a chave seja configurada.');
}

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configuração do Multer para upload de mídias
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // limite de 50MB
});

// API - Rotas de Clientes (Assíncronas para Directus)
app.get('/api/clients', async (req, res) => {
  try {
    const clients = await db.getClients();
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar clientes: ' + error.message });
  }
});

app.get('/api/clients/:id', async (req, res) => {
  try {
    const client = await db.getClientById(req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    const analyses = await db.getAnalysesByClient(req.params.id);
    res.json({ ...client, analyses });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar detalhes do cliente: ' + error.message });
  }
});

app.post('/api/clients', async (req, res) => {
  try {
    const { name, niche, target_audience, brand_voice, notes, meta_ad_account_id, meta_access_token, marketing_objective, target_kpi, monthly_budget } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Nome do cliente é obrigatório' });
    }
    const result = await db.createClient({ name, niche, target_audience, brand_voice, notes, meta_ad_account_id, meta_access_token, marketing_objective, target_kpi, monthly_budget });
    res.status(201).json({ id: result.id, message: 'Cliente cadastrado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar cliente: ' + error.message });
  }
});

app.put('/api/clients/:id', async (req, res) => {
  try {
    const { name, niche, target_audience, brand_voice, notes, meta_ad_account_id, meta_access_token, marketing_objective, target_kpi, monthly_budget } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Nome do cliente é obrigatório' });
    }
    await db.updateClient(req.params.id, { name, niche, target_audience, brand_voice, notes, meta_ad_account_id, meta_access_token, marketing_objective, target_kpi, monthly_budget });
    res.json({ message: 'Cliente atualizado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar cliente: ' + error.message });
  }
});

app.delete('/api/clients/:id', async (req, res) => {
  try {
    await db.deleteClient(req.params.id);
    res.json({ message: 'Cliente removido com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir cliente: ' + error.message });
  }
});

// API - Buscar campanhas ativas no Meta Ads
app.get('/api/clients/:id/meta-campaigns', async (req, res) => {
  const clientId = req.params.id;
  try {
    const client = await db.getClientById(clientId);
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const { meta_ad_account_id, meta_access_token } = client;
    if (!meta_ad_account_id || !meta_access_token) {
      return res.status(400).json({ error: 'As credenciais do Meta Ads não estão configuradas para este cliente.' });
    }

    let adAccountId = meta_ad_account_id.trim();
    if (!adAccountId.startsWith('act_')) {
      adAccountId = 'act_' + adAccountId;
    }

    const token = meta_access_token.trim();
    console.log(`[Meta Ads API] Buscando campanhas para a conta ${adAccountId}...`);

    const fbUrl = `https://graph.facebook.com/v19.0/${adAccountId}/campaigns?fields=name,status,objective,daily_budget,lifetime_budget,insights{spend,clicks,impressions,ctr,cpc,conversions}&access_token=${token}`;
    
    const fbRes = await fetch(fbUrl);
    const fbData = await fbRes.json();

    if (fbData.error) {
      console.error('[Meta Ads API] Erro retornado pela API do Facebook:', fbData.error);
      return res.status(500).json({ error: `Erro na API do Facebook: ${fbData.error.message}` });
    }

    res.json(fbData.data || []);
  } catch (error) {
    console.error('Erro ao buscar campanhas do Meta Ads:', error);
    res.status(500).json({ error: 'Erro ao buscar campanhas do Meta Ads: ' + error.message });
  }
});

// API - Gerar Relatório de IA (Squad de Elite) baseado nas campanhas do Meta Ads
app.post('/api/clients/:id/meta-report', async (req, res) => {
  const clientId = req.params.id;
  const provider = req.query.provider || 'gemini';

  try {
    const client = await db.getClientById(clientId);
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const { meta_ad_account_id, meta_access_token } = client;
    if (!meta_ad_account_id || !meta_access_token) {
      return res.status(400).json({ error: 'Meta Ads não configurado para este cliente.' });
    }

    let adAccountId = meta_ad_account_id.trim();
    if (!adAccountId.startsWith('act_')) {
      adAccountId = 'act_' + adAccountId;
    }

    const token = meta_access_token.trim();
    console.log(`[Meta Ads API] Puxando dados para relatório da conta ${adAccountId}...`);

    const fbUrl = `https://graph.facebook.com/v19.0/${adAccountId}/campaigns?fields=name,status,objective,insights{spend,clicks,impressions,ctr,cpc,conversions}&access_token=${token}`;
    
    const fbRes = await fetch(fbUrl);
    const fbData = await fbRes.json();

    if (fbData.error) {
      return res.status(500).json({ error: `Erro na API do Facebook: ${fbData.error.message}` });
    }

    const campaigns = fbData.data || [];
    if (campaigns.length === 0) {
      return res.status(400).json({ error: 'Nenhuma campanha ativa ou histórica encontrada nesta conta de anúncios.' });
    }

    // Formatar os dados para enviar no prompt
    let campaignsSummary = campaigns.map(c => {
      const ins = c.insights && c.insights.data ? c.insights.data[0] : null;
      return `
- Campanha: "${c.name}"
  Status: ${c.status}
  Objetivo de Tráfego: ${c.objective}
  Gasto na conta: ${ins ? 'R$ ' + ins.spend : 'R$ 0.00'}
  Cliques no link: ${ins ? ins.clicks : '0'}
  Impressões: ${ins ? ins.impressions : '0'}
  CTR médio (Taxa de Clique): ${ins ? ins.ctr + '%' : '0%'}
  CPC médio (Custo por Clique): ${ins ? 'R$ ' + ins.cpc : 'R$ 0.00'}
      `;
    }).join('\n');

    const reportPrompt = `
Você é o Squad de Elite de Tráfego Pago e Copywriting da agência.
Sua missão é analisar os resultados reais das campanhas do Meta Ads com foco estratégico. 
Use os dados fornecidos abaixo e formule seu relatório dividindo as seções exatamente conforme as diretrizes de cada especialista do Squad:

CLIENTE: ${client.name}
NICHO: ${client.niche}
PÚBLICO-ALVO: ${client.target_audience}
OBJETIVO ESTRATÉGICO: ${client.marketing_objective || 'Geral'}
MÉTRICA KPI DE SUCESSO ALVO: ${client.target_kpi || 'Melhor Custo-Benefício'}
INVESTIMENTO MENSAL PREVISTO: ${client.monthly_budget || 'Não definido'}
DIRETRIZES DE TOM DE VOZ: ${client.brand_voice}

HISTÓRICO DE APRENDIZADOS ANTERIORES DO CLIENTE:
${client.notes || 'Sem histórico prévio.'}

MÉTRICAS ATIVAS NO META ADS:
${campaignsSummary}

Escreva o relatório estratégico em formato Markdown em português estruturado exatamente conforme as chaves abaixo:

### 📈 Pedro Sobral | Tráfego & Distribuição
(Analise os números frios. Avalie se o CTR médio está bom para o nicho, se o CPC está alto e dê o parecer técnico sobre a eficiência do gasto do orçamento em relação à verba de ${client.monthly_budget || 'mensal'}. Identifique onde o tráfego está escapando)

### ✍️ Gary Halbert | Copywriting & Mensagem
(Analise a clareza e persuasão da mensagem das campanhas. Avalie se a copy está comunicando o desejo ou dor da persona e se usa os gatilhos mentais necessários para reter a atenção)

### 🎨 David Ogilvy | Direção de Arte & Branding
(Avalie a percepção de marca que essas campanhas estão gerando. Os criativos parecem amadores ou profissionais? Há consistência visual e legibilidade?)

### 🚀 Alex Hormozi | Oferta & Chamada para Ação
(Avalie a atratividade da oferta. O que estamos pedindo para o cliente fazer? A CTA faz sentido com o objetivo de ${client.marketing_objective || 'conversão'} do cliente? O benefício da conversão é claro e imediato?)

### 🛠️ Plano de Ação Unificado do Squad
(Lista direta e prioritária das próximas ações: ex: pausar campanha X, ajustar orçamento da campanha Y, criar novas variações de copy baseadas no direcionamento de Gary Halbert)
    `;

    let reportText = '';
    if (provider === 'openai') {
      reportText = await callOpenAI([
        { role: 'user', content: reportPrompt }
      ]);
    } else {
      if (!apiKey || !genAI) {
        return res.status(500).json({ error: 'A chave de API do Gemini não está configurada no servidor. Insira-a no arquivo .env.' });
      }
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      console.log('[Gemini API] Solicitando relatório de tráfego por Squad...');
      const result = await model.generateContent(reportPrompt);
      reportText = result.response.text();
      console.log('[Gemini API] Relatório de tráfego do Squad gerado com sucesso.');
    }

    res.json({ report: reportText });

  } catch (error) {
    console.error('Erro ao gerar relatório do Meta Ads:', error);
    res.status(500).json({ error: 'Erro ao processar relatório por IA: ' + error.message });
  }
});

// API - Rota de Chat com o Squad do Meta Ads
app.post('/api/clients/:id/meta-chat', async (req, res) => {
  const clientId = req.params.id;
  const { message, history } = req.body;
  const provider = req.query.provider || 'gemini';

  if (!message) {
    return res.status(400).json({ error: 'Mensagem vazia' });
  }

  try {
    const client = await db.getClientById(clientId);
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const { meta_ad_account_id, meta_access_token } = client;
    let campaignsSummary = "Nenhuma conta ou token de anúncios Meta Ads conectado.";

    if (meta_ad_account_id && meta_access_token) {
      try {
        let adAccountId = meta_ad_account_id.trim();
        if (!adAccountId.startsWith('act_')) {
          adAccountId = 'act_' + adAccountId;
        }
        const token = meta_access_token.trim();
        const fbUrl = `https://graph.facebook.com/v19.0/${adAccountId}/campaigns?fields=name,status,objective,insights{spend,clicks,impressions,ctr,cpc,conversions}&access_token=${token}`;
        
        const fbRes = await fetch(fbUrl);
        const fbData = await fbRes.json();
        
        if (fbData.data && fbData.data.length > 0) {
          campaignsSummary = fbData.data.map(c => {
            const ins = c.insights && c.insights.data ? c.insights.data[0] : null;
            return `
- Campanha: "${c.name}"
  Status: ${c.status}
  Objetivo de Tráfego: ${c.objective}
  Gasto: ${ins ? 'R$ ' + ins.spend : 'R$ 0.00'}
  Cliques: ${ins ? ins.clicks : '0'}
  CTR: ${ins ? ins.ctr + '%' : '0%'}
  CPC: ${ins ? 'R$ ' + ins.cpc : 'R$ 0.00'}
            `;
          }).join('\n');
        } else {
          campaignsSummary = "Nenhuma campanha encontrada na conta do Meta Ads.";
        }
      } catch (fbErr) {
        console.warn('Erro ao carregar campanhas para o chat:', fbErr.message);
        campaignsSummary = "Erro ao buscar campanhas do Meta Ads: " + fbErr.message;
      }
    }

    const systemInstruction = `
Você é o Squad de Elite de Tráfego Pago e Copywriting da agência.
Sua persona é um time composto por 4 especialistas seniores que debatem e definem estratégias de tráfego pago e criativos de anúncios:
1. Pedro Sobral (Focado em Tráfego, métricas de CTR, CPC, CPM, otimização de verba, ganchos visuais e testes).
2. Gary Halbert (Focado em Copywriting persuasiva, dores/desejos do cliente, títulos chamativos e clareza da mensagem).
3. David Ogilvy (Focado em Branding, estética visual, legibilidade, consistência e profissionalismo).
4. Alex Hormozi (Focado na oferta irresistível, na clareza do Call To Action (CTA) e no valor agregado do produto).

Você está em uma conversa contínua com o gestor de tráfego / dono da agência.
Sua missão é responder à dúvida ou solicitação do usuário com base nos dados do cliente e nas métricas das campanhas ativas do Meta Ads que estão listadas abaixo.

CLIENTE: ${client.name}
NICHO: ${client.niche}
PÚBLICO-ALVO: ${client.target_audience}
OBJETIVO ESTRATÉGICO: ${client.marketing_objective || 'Geral'}
MÉTRICA KPI DE SUCESSO ALVO: ${client.target_kpi || 'Melhor Custo-Benefício'}
INVESTIMENTO MENSAL PREVISTO: ${client.monthly_budget || 'Não definido'}
DIRETRIZES DE TOM DE VOZ: ${client.brand_voice}

MÉTRICAS DAS CAMPANHAS ATIVAS NO META ADS:
${campaignsSummary}

HISTÓRICO DE APRENDIZADOS ANTERIORES DO CLIENTE:
${client.notes || 'Sem histórico prévio.'}

Como responder:
- Responda como o Squad de Elite. Você pode dar o parecer de múltiplos especialistas ou focar na resposta do especialista que o usuário marcou/perguntou diretamente (ex: se perguntar sobre Pedro Sobral, Pedro Sobral deve dar a resposta principal; se for uma pergunta geral, o Squad pode debater).
- Você pode usar Markdown em suas respostas. Para manter a interface linda, se algum especialista der um parecer específico estruturado, use o formato de título '### Nome do Especialista' para que o frontend o renderize em um card exclusivo.
- Escreva em português do Brasil, mantendo um tom profissional, direto ao ponto e focado em gerar mais ROAS e leads com menor custo.
`;

    let responseText = '';
    const chatHistory = history || [];

    if (provider === 'openai') {
      const messages = [
        { role: 'system', content: systemInstruction },
        ...chatHistory,
        { role: 'user', content: message }
      ];
      responseText = await callOpenAI(messages);
    } else {
      if (!apiKey || !genAI) {
        return res.status(500).json({ error: 'A chave de API do Gemini não está configurada no servidor. Insira-a no arquivo .env.' });
      }
      const geminiHistory = chatHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        systemInstruction: systemInstruction
      });
      const chat = model.startChat({
        history: geminiHistory
      });
      console.log('[Gemini API] Enviando mensagem do chat para o Squad...');
      const result = await chat.sendMessage(message);
      responseText = result.response.text();
      console.log('[Gemini API] Resposta do Squad recebida.');
    }

    res.json({ response: responseText });

  } catch (error) {
    console.error('Erro no chat com o Squad:', error);
    res.status(500).json({ error: 'Erro ao processar conversa por IA: ' + error.message });
  }
});

// API - Rota de Planejamento de Nova Campanha (Múltiplos Criativos)
app.post('/api/clients/:id/plan-campaign', upload.array('creatives', 3), async (req, res) => {
  const clientId = req.params.id;
  const { campaignContext } = req.body;
  const provider = req.query.provider || 'gemini';

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Envie pelo menos um criativo (imagem/vídeo) para planejar.' });
  }

  let uploadedFiles = []; // Declarado fora do try para estar disponível no finally

  try {
    const client = await db.getClientById(clientId);
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const plannerPrompt = `
Você é o Squad de Elite de Tráfego Pago e Copywriting da agência.
Fomos encarregados de planejar e estruturar o lançamento de uma nova campanha de tráfego pago no Meta Ads para o cliente:

CLIENTE: ${client.name}
NICHO: ${client.niche}
PÚBLICO-ALVO: ${client.target_audience}
OBJETIVO ESTRATÉGICO: ${client.marketing_objective || 'Geral'}
MÉTRICA KPI DE SUCESSO ALVO: ${client.target_kpi || 'Melhor Custo-Benefício'}
INVESTIMENTO MENSAL PREVISTO: ${client.monthly_budget || 'Não definido'}
DIRETRIZES DE TOM DE VOZ: ${client.brand_voice}

CONTEXTO ADICIONAL DA NOVA CAMPANHA:
"${campaignContext || 'Planejar uma campanha geral focada em aquisição de clientes.'}"

Nós temos ${req.files.length} criativos anexados que você deve analisar e posicionar estrategicamente na campanha.
Sua tarefa é analisar os criativos (imagens ou vídeos enviados) e responder com um planejamento estruturado em Markdown, dividindo nas seguintes seções:

### 📈 Pedro Sobral | Estrutura & Distribuição de Tráfego
- **Recomendação de Objetivo de Campanha**: (ex: Geração de Leads, Tráfego, Conversões, Vendas)
- **Estrutura de Conjuntos de Anúncios (Ad Sets)**: Sugira como organizar os criativos. (ex: Criar 1 Conjunto de Anúncios testando os criativos A e B contra público quente, e 1 Conjunto de Anúncios testando o criativo C contra público frio).
- **Segmentação de Público Recomendada**: Indique idade, gênero, interesses, e localizações específicas para cada conjunto de anúncios sugerido.
- **Sugestão de Orçamento**: Recomende a verba diária ideal a ser alocada, dividida de forma lógica.

### 🎨 David Ogilvy | Direção de Arte & Branding dos Criativos
- Analise cada um dos criativos enviados (descreva resumidamente o que há em cada um para provar que você os viu).
- Dê o parecer visual de cada um: a legibilidade dos textos na imagem/vídeo está boa? A estética reflete a qualidade e sofisticação da Dra/Cliente? Há harmonia cromática e consistência?
- Indique ajustes visuais rápidos necessários para subir o anúncio (se houver).

### ✍️ Gary Halbert & 🚀 Alex Hormozi | Copys Estratégicas & Ofertas
- Crie sugestões de copys otimizadas para cada um dos criativos enviados. Para cada criativo, forneça:
  - **Título (Headline)**: Curta, impactante e focada em curiosidade ou benefício claro.
  - **Texto Principal (Legenda)**: Persuasivo, abordando uma dor ou desejo do público e incluindo gatilhos de valor.
  - **Chamada para Ação (CTA)**: Direta (ex: "Enviar Mensagem no WhatsApp", "Saiba Mais").
- Detalhe a oferta (por Alex Hormozi) por trás da campanha para torná-la irresistível.

### 🛠️ Plano de Ação de Lançamento
- Checklist passo a passo dos próximos passos para subir esta campanha no gerenciador de anúncios do Meta Ads de forma organizada.
`;

    let recommendationText = '';

    if (provider === 'openai') {
      // Validar se há vídeos no upload
      const hasVideo = req.files.some(f => f.mimetype.startsWith('video/'));
      if (hasVideo) {
        return res.status(400).json({ error: 'O provedor OpenAI GPT não suporta análise de vídeo direta. Por favor, alterne para o Google Gemini na barra lateral para planejar usando vídeos.' });
      }

      console.log(`[OpenAI Campaign Planner] Codificando ${req.files.length} imagens em Base64...`);
      const imageContents = req.files.map(f => {
        const fileBuffer = fs.readFileSync(f.path);
        const base64 = fileBuffer.toString('base64');
        return {
          type: 'image_url',
          image_url: {
            url: `data:${f.mimetype};base64,${base64}`
          }
        };
      });

      const messages = [
        {
          role: 'system',
          content: 'Você é o Squad de Elite de Tráfego Pago e Copywriting. Sua missão é planejar novas campanhas com base no briefing do cliente e nos criativos enviados.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: plannerPrompt
            },
            ...imageContents
          ]
        }
      ];

      recommendationText = await callOpenAI(messages);

    } else {
      // Gemini flow
      if (!apiKey || !genAI) {
        return res.status(500).json({ error: 'A chave de API do Gemini não está configurada no servidor.' });
      }

      for (const f of req.files) {
        console.log(`[Gemini Campaign Planner] Enviando criativo: ${f.filename}`);
        const uploadResult = await fileManager.uploadFile(f.path, {
          mimeType: f.mimetype,
          displayName: `plan_${clientId}_${Date.now()}`
        });
        uploadedFiles.push(uploadResult);

        // Aguarda o arquivo ficar ativo (especialmente importante para vídeos ou arquivos maiores)
        let fileState = await fileManager.getFile(uploadResult.file.name);
        let attempts = 0;
        while (fileState.state === 'PROCESSING' && attempts < 30) {
          console.log(`[Gemini Campaign Planner] Arquivo ${uploadResult.file.name} em processamento. Aguardando 2 segundos...`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          fileState = await fileManager.getFile(uploadResult.file.name);
          attempts++;
        }
        if (fileState.state === 'FAILED') {
          throw new Error(`O processamento do arquivo ${f.filename} falhou nos servidores do Gemini.`);
        }
        console.log(`[Gemini Campaign Planner] Arquivo ${uploadResult.file.name} pronto e ativo.`);
      }

      console.log(`[Gemini Campaign Planner] Solicitando planejamento ao modelo com os criativos...`);
      const contents = [
        ...uploadedFiles.map(uf => ({
          fileData: {
            fileUri: uf.file.uri,
            mimeType: uf.file.mimeType
          }
        })),
        { text: plannerPrompt }
      ];

      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent(contents);
      recommendationText = result.response.text();
      console.log(`[Gemini Campaign Planner] Planejamento gerado com sucesso.`);
    }

    res.json({ recommendation: recommendationText });

  } catch (error) {
    console.error('Erro ao planejar campanha:', error);
    res.status(500).json({ error: 'Erro ao processar planejamento por IA: ' + error.message });
  } finally {
    // Limpar arquivos temporários locais
    if (req.files) {
      req.files.forEach(f => {
        try {
          fs.unlinkSync(f.path);
        } catch (err) {
          console.error('Erro ao deletar arquivo temporário local:', err.message);
        }
      });
    }

    // Limpar arquivos na File API do Gemini
    for (const uf of uploadedFiles) {
      try {
        await fileManager.deleteFile(uf.file.name);
        console.log(`[Gemini Campaign Planner] Arquivo removido da API: ${uf.file.name}`);
      } catch (err) {
        console.error('Erro ao deletar arquivo da API do Gemini:', err.message);
      }
    }
  }
});

// API - Rota de Onboarding e Treinamento de IA via Documento PDF
app.post('/api/clients/:id/onboard-document', upload.single('document'), async (req, res) => {
  const clientId = req.params.id;
  const file = req.file;
  const provider = req.query.provider || 'gemini';

  if (!file) {
    return res.status(400).json({ error: 'Nenhum arquivo de onboarding enviado.' });
  }

  try {
    const client = await db.getClientById(clientId);
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const onboardPrompt = `
Você recebeu o documento de onboarding/briefing comercial em PDF anexo do cliente "${client.name}".
Sua tarefa é analisar o documento e extrair as informações necessárias para preencher o perfil do cliente no sistema de squads da agência.

Retorne uma resposta estritamente em formato JSON contendo exatamente as chaves abaixo (sem cabeçalhos markdown ou blocos de código):
{
  "niche": "nicho de atuação do cliente de forma curta e direta",
  "target_audience": "texto detalhado descrevendo o público-alvo e as personas identificadas",
  "marketing_objective": "um destes quatro objetivos: 'Direct Response / Venda Direta', 'Geração de Leads (Whats/LP)', 'Lançamento de Infoproduto' ou 'Tráfego para Negócio Local'",
  "target_kpi": "métrica estrela alvo de performance estimada (ex: CPL máximo R$ 5,00, ROAS desejado 3x)",
  "monthly_budget": "estimativa de verba mensal de investimento (ex: R$ 5.000/mês)",
  "brand_voice": "diretrizes sobre o tom de voz e estilo de copy que a marca deve usar",
  "notes": "aprendizados estratégicos ou segredos comerciais importantes extraídos do documento para ajudar na criação de anúncios futuros"
}

Importante:
- Caso o documento não mencione algum dos campos, use seu conhecimento analítico de marketing para sugerir valores ideais coerentes com o nicho de mercado do cliente.
- Escreva a resposta em português do Brasil.
    `;

    let extractedText = '';
    const extension = path.extname(file.originalname).toLowerCase();

    if (extension === '.pdf') {
      console.log(`[Onboarding] Extraindo texto de PDF...`);
      const dataBuffer = fs.readFileSync(file.path);
      extractedText = await extractTextFromPdf(dataBuffer);
    } else if (extension === '.docx') {
      console.log(`[Onboarding] Extraindo texto de DOCX...`);
      extractedText = await extractTextFromDocx(file.path);
    } else if (extension === '.txt' || extension === '.md') {
      console.log(`[Onboarding] Lendo arquivo de texto/markdown...`);
      extractedText = fs.readFileSync(file.path, 'utf8');
    } else {
      return res.status(400).json({ error: 'Formato de arquivo não suportado. Envie PDF, DOCX, TXT ou MD.' });
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(400).json({ error: 'O arquivo enviado parece estar vazio ou não contém texto legível.' });
    }

    let extractedData;
    let responseText = '';

    if (provider === 'openai') {
      console.log(`[OpenAI Onboarding] Solicitando extração de dados estruturados...`);
      responseText = await callOpenAI([
        {
          role: 'system',
          content: 'Você é um assistente de marketing experiente que extrai briefings comerciais em formato JSON estruturado.'
        },
        {
          role: 'user',
          content: `Aqui está o texto extraído do documento de onboarding do cliente "${client.name}":\n\n${extractedText}\n\n${onboardPrompt}`
        }
      ], true);
    } else {
      // Gemini flow
      if (!apiKey || !genAI) {
        return res.status(500).json({ error: 'A chave de API do Gemini não está configurada no servidor.' });
      }

      console.log(`[Gemini Onboarding] Solicitando extração de dados estruturados com Gemini...`);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          responseMimeType: 'application/json'
        }
      });

      const result = await model.generateContent([
        { text: `Aqui está o texto extraído do documento de onboarding do cliente "${client.name}":\n\n${extractedText}\n\n${onboardPrompt}` }
      ]);

      responseText = result.response.text();
    }

    // Limpar potenciais invólucros markdown do JSON
    let cleanedJsonText = responseText.trim();
    if (cleanedJsonText.startsWith('```')) {
      cleanedJsonText = cleanedJsonText.replace(/^```json/i, '').replace(/```$/, '').trim();
    }

    extractedData = JSON.parse(cleanedJsonText);

    // 3. Atualizar o cliente no Directus mesclando com os dados novos
    const currentNotes = client.notes ? client.notes.trim() : '';
    const newNotes = extractedData.notes || '';
    const updatedNotes = currentNotes 
      ? `${currentNotes}\n\n### 📄 Aprendizados do Onboarding (Extraído via Documento em ${new Date().toLocaleDateString('pt-BR')}):\n${newNotes}`
      : `### 📄 Aprendizados do Onboarding (Extraído via Documento em ${new Date().toLocaleDateString('pt-BR')}):\n${newNotes}`;

    await db.updateClient(clientId, {
      name: client.name,
      niche: extractedData.niche || client.niche,
      target_audience: extractedData.target_audience || client.target_audience,
      brand_voice: extractedData.brand_voice || client.brand_voice,
      notes: updatedNotes,
      marketing_objective: extractedData.marketing_objective || client.marketing_objective || '',
      target_kpi: extractedData.target_kpi || client.target_kpi || '',
      monthly_budget: extractedData.monthly_budget || client.monthly_budget || '',
      meta_ad_account_id: client.meta_ad_account_id || '',
      meta_access_token: client.meta_access_token || ''
    });

    console.log(`[IA Onboarding] Cadastro atualizado no Directus com sucesso!`);

    res.json({
      success: true,
      message: 'Onboarding processado com sucesso! O perfil do cliente foi atualizado.',
      data: extractedData
    });

  } catch (error) {
    console.error('Erro ao processar PDF Onboarding:', error);
    res.status(500).json({ error: 'Erro no processamento do documento: ' + error.message });
  } finally {
    // Remover o arquivo temporário local de uploads
    if (file && file.path) {
      fs.unlink(file.path, (err) => {
        if (err) console.error('Erro ao deletar arquivo local temporário:', err);
      });
    }
  }
});

// API - Rota de Análise Multimodal de Criativos (Squad de Elite)
app.post('/api/clients/:id/analyze', upload.single('creative'), async (req, res) => {
  const clientId = req.params.id;
  const file = req.file;
  const provider = req.query.provider || 'gemini';

  if (!file) {
    return res.status(400).json({ error: 'Nenhum arquivo de criativo enviado.' });
  }

  const client = await db.getClientById(clientId);
  if (!client) {
    return res.status(404).json({ error: 'Cliente não encontrado' });
  }

  // Determinar o tipo de mídia
  const ext = path.extname(file.originalname).toLowerCase();
  let mediaType = 'imagem';
  let mimeType = file.mimetype;
  if (['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) {
    mediaType = 'video';
  }

  const analysisPrompt = `
Você é o Squad de Elite de Criação e Estratégia de Tráfego Pago da agência de marketing.
Sua missão é auditar o arquivo de criativo anexado (${mediaType}) para o cliente "${client.name}".

CONTEXTO E DIRETRIZES DO CLIENTE:
NICHO: ${client.niche}
PÚBLICO-ALVO: ${client.target_audience}
OBJETIVO DE CAMPANHA: ${client.marketing_objective || 'Conversão Geral'}
METAS / KPI DE SUCESSO: ${client.target_kpi || 'Melhor Custo-Benefício'}
VERBA ESTIMADA DE VEICULAÇÃO: ${client.monthly_budget || 'Não definido'}
TOM DE VOZ DA MARCA: ${client.brand_voice}

HISTÓRICO DE APRENDIZADOS DE CAMPANHAS ANTERIORES (Crucial respeitar estes pontos):
${client.notes || 'Nenhum aprendizado anterior registrado ainda.'}

Analise detalhadamente o criativo enviado com base nos critérios acima e forneça uma auditoria crítica e construtiva formatada em Markdown em português do Brasil, dividindo as seções exatamente da seguinte forma:

### 📈 Pedro Sobral | Tráfego & Distribuição
(Analise o gancho visual. Se for vídeo, avalie os primeiros 3 segundos cruciais. Se for imagem, avalie o primeiro ponto de impacto visual. Estime se o criativo tem força para gerar um bom CTR no público cadastrado e reter a atenção)

### ✍️ Gary Halbert | Copywriting & Mensagem
(Avalie o título da arte, as legendas integradas ou falas do vídeo. O texto comunica a dor/desejo da persona? Está persuasivo e no tom de voz da marca? A fonte está legível?)

### 🎨 David Ogilvy | Direção de Arte & Branding
(Avalie a estética visual, a harmonia cromática das cores, o contraste do texto e a qualidade profissional geral do design. O anúncio gera autoridade ou parece amador?)

### 🚀 Alex Hormozi | Oferta & Chamada para Ação
(Avalie a clareza da proposta de valor e a Chamada para Ação. A CTA se conecta com o objetivo estratégico de ${client.marketing_objective || 'conversão'} do cliente? O benefício de clicar fica claro e imediato?)

### 🛠️ Plano de Ação Unificado do Squad
(Lista pontual de alterações práticas e rápidas para fazer neste criativo para subir a taxa de conversão das campanhas imediatamente)
  `;

  const memoryPromptTemplate = (analysisText) => `
Você acabou de analisar um criativo de ${mediaType} para o cliente "${client.name}".
Aqui está o feedback gerado pelo seu Squad:
---
${analysisText}
---

Com base nessa análise, quais são os 1 ou 2 aprendizados gerais de design, copy ou tráfego que devemos adicionar à base de conhecimento contínua desse cliente para evitar erros ou repetir sucessos no futuro?
Responda APENAS com uma lista em formato Markdown de 1 ou 2 tópicos curtos e práticos na terceira pessoa.
Exemplo:
* Evitar fontes amarelas em fundos claros devido à legibilidade.
* Vídeos com ganchos focando em dor financeira convertem melhor que estilo de vida.

Não inclua cabeçalhos, introduções ou explicações. Responda apenas com os tópicos.
  `;

  let analysisText = '';
  let uploadResult;
  try {
    if (provider === 'openai') {
      if (mediaType === 'video') {
        return res.status(400).json({ error: 'O provedor OpenAI GPT não suporta análise de vídeo direta. Selecione Gemini.' });
      }

      console.log(`[OpenAI Creative Analysis] Convertendo imagem para base64...`);
      const base64Image = fs.readFileSync(file.path, { encoding: 'base64' });

      console.log(`[OpenAI Creative Analysis] Executando análise com gpt-4o-mini...`);
      analysisText = await callOpenAI([
        {
          role: 'user',
          content: [
            { type: 'text', text: analysisPrompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ]);
      console.log(`[OpenAI Creative Analysis] Análise do Squad gerada com sucesso.`);

    } else {
      // Gemini flow
      if (!apiKey || !genAI) {
        return res.status(500).json({ error: 'A chave de API do Gemini não está configurada no servidor. Insira-a no arquivo .env.' });
      }

      console.log(`[Gemini API] Iniciando upload do arquivo: ${file.filename}`);
      uploadResult = await fileManager.uploadFile(file.path, {
        mimeType: mimeType,
        displayName: `creative_${clientId}_${Date.now()}`
      });
      console.log(`[Gemini API] Upload concluído. URI: ${uploadResult.file.uri}`);

      // Aguarda o arquivo ficar ativo
      let fileState = await fileManager.getFile(uploadResult.file.name);
      let attempts = 0;
      while (fileState.state === 'PROCESSING' && attempts < 30) {
        console.log(`[Gemini API] Arquivo em processamento. Aguardando 2 segundos...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        fileState = await fileManager.getFile(uploadResult.file.name);
        attempts++;
      }
      if (fileState.state === 'FAILED') {
        throw new Error('Falha no processamento do arquivo pelos servidores do Gemini.');
      }
      console.log(`[Gemini API] Arquivo ativo para análise.`);

      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      console.log(`[Gemini API] Executando análise multimodal do Squad...`);
      const result = await model.generateContent([
        {
          fileData: {
            fileUri: uploadResult.file.uri,
            mimeType: uploadResult.file.mimeType
          }
        },
        { text: analysisPrompt }
      ]);

      analysisText = result.response.text();
      console.log(`[Gemini API] Análise do Squad gerada com sucesso.`);
    }

    // 4. Salvar análise no banco de dados local / Directus
    const publicPath = `/uploads/${file.filename}`;
    await db.saveAnalysis({
      client_id: clientId,
      media_path: publicPath,
      media_type: mediaType,
      feedback: analysisText
    });

    // 5. Ciclo de Aprendizado (Atualizar a memória do cliente automaticamente com novos insights)
    console.log(`[IA API] Atualizando memória de aprendizado do cliente...`);
    const memoryPrompt = memoryPromptTemplate(analysisText);
    let newInsights = '';

    if (provider === 'openai') {
      newInsights = await callOpenAI([
        { role: 'user', content: memoryPrompt }
      ]);
    } else {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const memoryResult = await model.generateContent(memoryPrompt);
      newInsights = memoryResult.response.text().trim();
    }

    const currentNotes = client.notes ? client.notes.trim() : '';
    const updatedNotes = currentNotes 
      ? `${currentNotes}\n\n### ⚡ Novos Aprendizados (Adicionados em ${new Date().toLocaleDateString('pt-BR')}):\n${newInsights}`
      : `### ⚡ Aprendizados Acumulados (Iniciado em ${new Date().toLocaleDateString('pt-BR')}):\n${newInsights}`;
    
    await db.updateClientNotes(clientId, updatedNotes);
    console.log(`[IA API] Memória do cliente updated...`);

    // 6. Enviar resposta para o frontend
    res.json({
      success: true,
      analysis: analysisText,
      mediaPath: publicPath,
      mediaType: mediaType,
      updatedNotes: updatedNotes
    });

  } catch (error) {
    console.error('Erro durante a análise do criativo:', error);
    res.status(500).json({ error: 'Erro no processamento da análise por IA: ' + error.message });
  } finally {
    // Limpar o arquivo temporário da API do Gemini
    if (uploadResult && uploadResult.file) {
      try {
        await fileManager.deleteFile(uploadResult.file.name);
        console.log(`[Gemini API] Arquivo limpo do armazenamento do Gemini: ${uploadResult.file.name}`);
      } catch (err) {
        console.error('Erro ao deletar arquivo do Gemini API:', err);
      }
    }
    // Remover arquivo temporário local de criativo
    if (file && file.path) {
      fs.unlink(file.path, (err) => {
        if (err) console.error('Erro ao deletar arquivo local temporário:', err);
      });
    }
  }
});

// Configurar o endpoint para servir os uploads estaticamente
app.use('/uploads', express.static(uploadsDir));

// Rota padrão do Frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicia o servidor e roda o bootloader do Directus
app.listen(PORT, async () => {
  console.log(`========================================================`);
  console.log(`🚀 AgênciaOS iniciada com sucesso!`);
  console.log(`   Acesse localmente em: http://localhost:${PORT}`);
  console.log(`========================================================`);
  
  console.log('[Directus] Inicializando coleções e campos...');
  await db.init();
});
