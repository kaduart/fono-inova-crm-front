// Conteúdo da central de Novidades. Cada tela tem sua versão: ao mudar uma tela,
// suba só a `version` dela (ex.: '2026-11-05') e acrescente/edite os itens.
// Só essa tela volta a abrir sozinha; as outras continuam como vistas.
export type NovidadesArea = 'admin' | 'doctor';

export interface NovidadeItem {
    title: string;
    what: string;
    how: string;
}

export interface NovidadesScreen {
    id: string;
    area: NovidadesArea;
    name: string;
    version: string;
    summary: string;
    /** abas (activeTab do header) em que esta tela abre sozinha */
    tabs: string[];
    items: NovidadeItem[];
}

export const NOVIDADES_SCREENS: NovidadesScreen[] = [
    // ── Admin / secretária ───────────────────────────────────────────────
    {
        id: 'admin-dashboard', area: 'admin', name: 'Dashboard', version: '2026-10-31', tabs: ['Dashboard'],
        summary: 'O que precisa de você hoje fica logo no topo.',
        items: [
            { title: 'Números que batem', what: 'Hoje, Amanhã e Não confirmadas em Próximas sessões contam todas as sessões dos próximos 7 dias, e os pré-agendados entram em Sessões hoje e Semana.', how: 'Se a lista mostrar só parte, use "Ver todas na Agenda".' },
            { title: 'Quando algo não carrega', what: 'O cartão mostra "Não foi possível carregar" em vez de zero.', how: 'Clique em Tentar de novo.' },
            { title: 'Precisa de você hoje', what: 'Pré-agendamentos, pagamentos em aberto, leads para retornar e aniversariantes sem parabéns.', how: 'Clique no número para ir direto à aba.' },
            { title: 'Lead esperando resposta', what: 'Faixa com leads novos sem resposta há mais de 2h, com cronômetro.', how: 'Responda primeiro os que esperam há mais tempo.' },
            { title: 'Pacote acabando e sem próxima sessão', what: 'Cartões com a mensagem de renovação ou de retorno já pronta.', how: 'Clique em Renovar ou Chamar de volta e confira o texto antes de enviar.' },
            { title: 'Aniversariantes', what: 'Uma linha por pessoa, com chips Hoje, Próximos 7 dias e Mês. Quem já recebeu aparece riscado.', how: 'O envio automático sai às 10h; use o chip Hoje para conferir.' },
        ],
    },
    {
        id: 'admin-agenda', area: 'admin', name: 'Agenda', version: '2026-10-31', tabs: ['Calendário'],
        summary: 'A agenda mostra onde tem vaga e quem dá para encaixar.',
        items: [
            { title: 'Filtros em chips', what: 'Profissional, status e tipo com contagem. Ficam lembrados na próxima visita e valem para Mês, Semana e Dia.', how: 'Clique no chip para filtrar; clique de novo para tirar.' },
            { title: 'Dia por profissional', what: 'Uma coluna por profissional, total do dia e horários livres tracejados.', how: 'No modo Dia, escolha "Por profissional".' },
            { title: 'Encaixe no horário livre', what: 'O horário livre sugere pacientes sem próxima sessão e leads da especialidade, com WhatsApp pronto.', how: 'Clique no horário tracejado; o Agendar já vem preenchido.' },
            { title: 'Reativar na Recorrência', what: 'Na vaga crítica, o botão Reativar chama o último paciente daquele horário e registra o contato.', how: 'A mensagem abre para você conferir antes de enviar.' },
            { title: 'Legenda', what: 'As cores agora ficam no botão Legenda, sem ocupar a tela.', how: 'Clique em Legenda no topo da agenda.' },
        ],
    },
    {
        id: 'admin-financeiro', area: 'admin', name: 'Financeiro · Caixa e Fluxo', version: '2026-10-31', tabs: ['Financeiro'],
        summary: 'Caixa do dia em destaque e ações por urgência.',
        items: [
            { title: 'Caixa em destaque', what: 'O total do dia segue a regra do banco, com a agenda do dia em chips.', how: 'Clique num número para abrir o detalhe; "Ver agenda" rola até a aba.' },
            { title: 'Ações por urgência', what: 'O que precisa de baixa ou cobrança aparece primeiro.', how: 'Resolva de cima para baixo.' },
            { title: 'Aba Pagamentos', what: 'Lista real de pagamentos com chips de situação, tipo e forma, busca por paciente e CSV.', how: 'Use a busca para achar o pagamento de um paciente.' },
        ],
    },
    {
        id: 'admin-vendas', area: 'admin', name: 'Vendas & Marketing', version: '2026-10-31',
        tabs: ['Leads', 'InteresseConvenios', 'SocialMedia', 'Analytics', 'ROI'],
        summary: 'Do lead ao paciente, com o próximo passo de cada um.',
        items: [
            { title: 'Leads com próximo passo', what: 'KPIs do funil no período e a fila mostra o próximo passo de cada lead.', how: 'Clique no lead para abrir o WhatsApp com a mensagem.' },
            { title: 'ROI em tela única', what: 'Investimento, custo por lead e por paciente, receita e retorno por canal.', how: 'Troque o período nos chips do topo.' },
            { title: 'Convênios: oferecer particular', what: 'Quem espera vaga do convênio há mais de 30 dias ganha a oferta do particular.', how: 'Clique em Oferecer particular e confira o texto.' },
            { title: 'Social Media em 3 grupos', what: 'Calendário, Criar com IA e Anúncios, com sugestões da semana das especialidades com horário vago.', how: 'Comece pelas sugestões da semana.' },
            { title: 'Site até o paciente', what: 'Visitas, leads e pacientes do site, e alerta de landing page com visitas e nenhum lead.', how: 'Veja o alerta em Analytics do Site.' },
        ],
    },
    {
        id: 'admin-conversas', area: 'admin', name: 'Conversas', version: '2026-10-31', tabs: ['Mensagens'],
        summary: 'A fila mostra primeiro quem está esperando há mais tempo.',
        items: [
            { title: 'Fila por prioridade', what: 'Chips Esperando resposta, Não lidas, Leads e Pacientes. Espera acima de 2h fica vermelha.', how: 'Comece pelo chip Esperando resposta.' },
            { title: 'Respostas prontas', what: 'Textos com valor antes do preço e horário genérico. Só preenchem o campo, nada sai sozinho.', how: 'Revise e envie você mesma.' },
            { title: 'Painel do lead', what: 'Origem, etapa e próximo passo ao lado da conversa.', how: 'Use Agendar avaliação ou Marcar como respondido.' },
        ],
    },

    // ── Terapeuta ────────────────────────────────────────────────────────
    {
        id: 'doctor-inicio', area: 'doctor', name: 'Início', version: '2026-10-29', tabs: ['overview'],
        summary: 'Seu dia em uma coluna, com o que está pendente.',
        items: [
            { title: 'Agenda de hoje', what: 'Cada sessão mostra status, particular, convênio ou pacote, evolução pendente e WhatsApp.', how: 'Aperte "/" para buscar um paciente.' },
            { title: 'Pendências', what: 'Evoluções a registrar, sessões sem confirmação e aniversários.', how: 'Clique no item para resolver direto.' },
            { title: 'Amanhã e Meu mês', what: 'Resumo do dia seguinte e dos números do mês.', how: 'Fica ao lado da agenda de hoje.' },
        ],
    },
    {
        id: 'doctor-pacientes', area: 'doctor', name: 'Meus pacientes', version: '2026-10-29', tabs: ['patients'],
        summary: 'Próxima sessão e status real de cada paciente.',
        items: [
            { title: 'Filtros rápidos', what: 'Em atendimento, Sem próxima sessão, Evolução pendente, Aniversário no mês e Inativos, com contagem.', how: 'Clique no filtro para ver só esses pacientes.' },
            { title: 'Menu ⋯ do paciente', what: 'Registrar evolução, Agendar sessão e Ver relatórios na própria linha.', how: 'Clique nos três pontinhos da linha.' },
        ],
    },
    {
        id: 'doctor-evolucao', area: 'doctor', name: 'Evolução', version: '2026-10-30', tabs: ['therapy'],
        summary: 'Fila de pendentes e gráfico por área.',
        items: [
            { title: 'Fila de pendentes', what: 'Ao abrir a aba aparecem as evoluções que faltam registrar.', how: 'Clique no paciente: o registro já abre com a data da sessão.' },
            { title: 'Gráfico por área', what: 'Uma linha por área, escala 0 a 10 e a meta do plano tracejada.', how: 'Troque entre Últimas 3, Últimas 6 ou Tudo; também dá para ver em tabela.' },
            { title: 'Linha do tempo', what: 'Texto clínico visível, nota por área e diferença para a sessão anterior. PDF por evolução.', how: 'Excluir fica no menu ⋯.' },
        ],
    },
    {
        id: 'doctor-agenda', area: 'doctor', name: 'Minha agenda', version: '2026-10-30', tabs: ['appointments'],
        summary: 'Chips de filtro e modo Lista.',
        items: [
            { title: 'Chips de filtro', what: 'Hoje, Amanhã, Próximos 7 dias, Não confirmados, Sem baixa, Faltas e Canceladas do mês.', how: 'Clique no chip para filtrar.' },
            { title: 'Lista ou Calendário', what: 'No celular a lista abre por padrão. Semana e Dia ficaram legíveis.', how: 'Troque no botão Lista/Calendário.' },
        ],
    },
    {
        id: 'doctor-insights', area: 'doctor', name: 'Insights', version: '2026-10-30', tabs: ['insights'],
        summary: 'Período que funciona, faltas e pacientes em atenção.',
        items: [
            { title: 'Período e comparação', what: 'Comparecimento, faltas, cancelamentos e pacientes atendidos, comparados ao período anterior.', how: 'Escolha o período nos chips.' },
            { title: 'Pacientes em atenção', what: 'Agrupados por motivo, com próxima sessão real e WhatsApp.', how: 'Clique em Agendar quando o paciente estiver sem horário.' },
        ],
    },
];
