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
        id: 'admin-dashboard', area: 'admin', name: 'Dashboard', version: '2026-11-01', tabs: ['Dashboard'],
        summary: 'O que precisa de você hoje fica logo no topo.',
        items: [
            { title: 'Ir para… (Ctrl+K)', what: 'Um atalho para abrir qualquer tela do ERP digitando o nome, sem procurar no menu.', how: 'Aperte Ctrl+K (no Mac, Cmd+K), digite "caixa", "convênios", "agenda"… e dê Enter.' },
            { title: 'Menu novo: Caixa, Convênios e Financeiro', what: 'O antigo Financeiro virou três botões no topo: Caixa (o dinheiro do dia e os recebimentos), Convênios (guias, faturamento e recebimento dos planos) e Financeiro (despesas, repasse, notas e resultados). Nada foi removido, só separado.', how: 'Links antigos levam sozinhos para o menu certo. Em telas menores os botões mostram só o nome; os ícones aparecem em telas largas.' },
            { title: 'Avisos e confirmações novos', what: 'Os avisos aparecem no canto da tela e, em ações como remarcar ou remover pagamento, trazem o botão Desfazer. Confirmações de excluir/cancelar aparecem numa janela do próprio sistema.', how: 'Errou? Clique em Desfazer no aviso enquanto ele estiver na tela.' },
            { title: 'Números que se movem', what: 'Os valores dos cartões mudam com uma animação curta quando atualizam, para você perceber o que mudou.', how: 'Nada a fazer: é só leitura.' },
            { title: 'Pagamento pendente leva ao Caixa', what: 'Clicar em pagamentos em aberto no "Precisa de você hoje" agora abre o menu Caixa.', how: 'Clique no número para ir direto.' },
            { title: 'Avaliou e não fechou', what: 'Quem fez avaliação particular nos últimos 30 dias e ainda não fechou pacote, com o valor em aberto por mês e a mensagem pronta (valor antes do preço).', how: 'Abra o cartão, envie pelo WhatsApp e marque como contatado, ou use "Não vai fechar" com o motivo.' },
            { title: 'Sessões sem confirmação', what: 'As sessões do próximo dia com agenda que ainda não foram confirmadas, separadas em sem resposta, pediu remarcar e sem telefone.', how: 'Use "Enviar lembrete" para mandar a confirmação a quem ainda não recebeu (1 por sessão), ou confirme manualmente.' },
            { title: 'Números que batem', what: 'Hoje, Amanhã e Não confirmadas em Próximas sessões contam todas as sessões dos próximos 7 dias, e os pré-agendados entram em Sessões hoje e Semana.', how: 'Se a lista mostrar só parte, use "Ver todas na Agenda".' },
            { title: 'Quando algo não carrega', what: 'O cartão mostra "Não foi possível carregar" em vez de zero.', how: 'Clique em Tentar de novo.' },
            { title: 'Precisa de você hoje', what: 'Pré-agendamentos, pagamentos em aberto, leads para retornar e aniversariantes sem parabéns.', how: 'Clique no número para ir direto à aba.' },
            { title: 'Lead esperando resposta', what: 'Faixa com leads novos sem resposta há mais de 2h, com cronômetro.', how: 'Responda primeiro os que esperam há mais tempo.' },
            { title: 'Pacote acabando e sem próxima sessão', what: 'Cartões com a mensagem de renovação ou de retorno já pronta.', how: 'Clique em Renovar ou Chamar de volta e confira o texto antes de enviar.' },
            { title: 'Aniversariantes', what: 'Uma linha por pessoa, com chips Hoje, Próximos 7 dias e Mês. Quem já recebeu aparece riscado.', how: 'O envio automático sai às 10h; use o chip Hoje para conferir.' },
        ],
    },
    {
        id: 'admin-agenda', area: 'admin', name: 'Agenda', version: '2026-11-01', tabs: ['Calendário'],
        summary: 'A agenda mostra onde tem vaga e quem dá para encaixar.',
        items: [
            { title: 'Desfazer remarcação', what: 'Depois de arrastar ou remarcar uma sessão, aparece "Remarcado para dd/mm às hh:mm" com o botão Desfazer, que volta a sessão para o horário anterior.', how: 'Clique em Desfazer no aviso logo após remarcar.' },
            { title: 'Resumo do dia por profissional', what: 'No Dia por profissional, uma faixa mostra Sessões, Horários livres, Ocupação e Pré-agendados, e cada coluna tem a barra de ocupação do profissional.', how: 'Use a faixa para ver onde ainda cabe encaixe.' },
            { title: 'Atalhos de teclado', what: 'T volta para hoje, as setas andam para o dia/semana anterior ou seguinte e N abre Novo agendamento.', how: 'Funciona quando você não está digitando num campo.' },
            { title: 'Carteira com ordenação e lote', what: 'Na Carteira, clique no título da coluna para ordenar. Marque pacientes para copiar os telefones de todos de uma vez ou baixar a planilha.', how: 'Marque as caixinhas e use a barra verde que aparece no topo.' },
            { title: 'Cancelamentos: Remarcar pelo WhatsApp', what: 'No relatório de cancelamentos, o botão Remarcar busca o telefone do paciente e abre o WhatsApp para oferecer novo horário.', how: 'Clique em Remarcar e confira a mensagem antes de enviar.' },
            { title: 'Tema escuro', what: 'Carteira, Semana, Cancelamentos e o Dia por profissional agora respeitam o tema escuro.', how: 'Troque o tema no seu perfil.' },
            { title: 'Filtros em chips', what: 'Profissional, status e tipo com contagem. Ficam lembrados na próxima visita e valem para Mês, Semana e Dia.', how: 'Clique no chip para filtrar; clique de novo para tirar.' },
            { title: 'Dia por profissional', what: 'Uma coluna por profissional, total do dia e horários livres tracejados.', how: 'No modo Dia, escolha "Por profissional".' },
            { title: 'Encaixe no horário livre', what: 'O horário livre sugere pacientes sem próxima sessão e leads da especialidade, com WhatsApp pronto.', how: 'Clique no horário tracejado; o Agendar já vem preenchido.' },
            { title: 'Reativar na Recorrência', what: 'Na vaga crítica, o botão Reativar chama o último paciente daquele horário e registra o contato.', how: 'A mensagem abre para você conferir antes de enviar.' },
            { title: 'Legenda', what: 'As cores agora ficam no botão Legenda, sem ocupar a tela.', how: 'Clique em Legenda no topo da agenda.' },
        ],
    },
    {
        id: 'admin-caixa', area: 'admin', name: 'Caixa', version: '2026-11-01', tabs: ['Caixa'],
        summary: 'O dinheiro do dia e o que falta receber, num menu só.',
        items: [
            { title: 'Menu próprio', what: 'O Caixa saiu de dentro do Financeiro. Tem duas abas: Caixa e Fluxo (o dia) e Recebimentos (antes "Pagamentos").', how: 'Clique em Caixa no topo. O mês escolhido fica guardado ao trocar de aba.' },
            { title: 'Caixa em destaque', what: 'O total do dia segue a regra do banco, com a agenda do dia em chips. Clicar num número abre o painel lateral, sem pular a tela.', how: 'Clique num número para abrir o detalhe; "Ver agenda" rola até a aba.' },
            { title: 'Ações por urgência', what: 'O que precisa de baixa ou cobrança aparece primeiro.', how: 'Resolva de cima para baixo.' },
            { title: 'Desfazer ao remover pagamento', what: 'Ao remover um pagamento, ele some da lista, mas só é apagado de verdade depois de 8 segundos. Até lá dá para Desfazer.', how: 'Clique em Desfazer no aviso se removeu o errado.' },
            { title: 'Recebimentos: Cobrar pelo WhatsApp', what: 'Nas linhas "a cobrar", o botão Cobrar abre o WhatsApp do paciente. Lista com chips de situação, tipo e forma, busca e CSV.', how: 'Explique o valor do tratamento antes de falar do preço.' },
        ],
    },
    {
        id: 'admin-convenios', area: 'admin', name: 'Convênios', version: '2026-11-01', tabs: ['Convenios'],
        summary: 'Guias, faturamento e recebimento dos planos, separados do Caixa.',
        items: [
            { title: 'Menu próprio, visto pela secretária', what: 'Convênios saiu de dentro do Financeiro. As abas foram agrupadas em: Faturamento, Guias e autorizações, Envios e rascunhos, Notas e recebimentos e Histórico (acabou o "Mais").', how: 'Clique em Convênios no topo e escolha o grupo.' },
            { title: 'Fila por impacto', what: 'O topo mostra o que dá mais dinheiro ou tem mais risco: a faturar de meses anteriores (risco de glosa), sessões sem guia e o que vence primeiro.', how: 'Clique no cartão para ir direto à lista certa.' },
            { title: 'Preparar vários pacientes juntos', what: 'Em A faturar e Aguardando, marque os pacientes de um mesmo convênio e clique em "Preparar N pac." para abrir um painel só com eles. "Preparar" sem marcar abre o convênio inteiro.', how: 'As guias continuam sendo escolhidas dentro do painel, como antes. Um convênio por vez.' },
            { title: 'Ranking por convênio', what: 'Em Faturadas e Recebidas, barras mostram quanto cada convênio deve ou já pagou.', how: 'Comece a cobrança pelo convênio do topo.' },
            { title: 'Tema escuro', what: 'Autorizações, Envios, Rascunhos, Notas e o painel do paciente respeitam o tema escuro.', how: 'Troque o tema no seu perfil.' },
        ],
    },
    {
        id: 'admin-financeiro', area: 'admin', name: 'Financeiro', version: '2026-11-01', tabs: ['Financeiro'],
        summary: 'Despesas, repasse, notas e resultados da clínica.',
        items: [
            { title: 'Abas com nomes novos', what: 'Despesas, Repasse (antes "Profissionais"), NFSe e Resultados (antes "Dashboard"). Caixa e Convênios agora têm menu próprio.', how: 'Links antigos levam sozinhos para o lugar certo.' },
            { title: 'Resultados: Indicadores e Metas juntos', what: 'Indicadores do mês e Metas do ano (antes "Planejamento") ficam na mesma aba, com um botão para alternar.', how: 'Use "Indicadores do mês | Metas do ano" no topo da aba.' },
            { title: 'Para onde vai o dinheiro', what: 'Em Despesas, barras mostram o total por categoria no mês.', how: 'Aparece quando a lista cabe numa página; filtre o mês para ver.' },
            { title: 'Repasse: fechar vários de uma vez', what: 'O admin pode marcar profissionais prontos (com regra, sem pendência e ainda abertos) e fechar o mês de todos de uma vez. Quem tem pendência é pulado e avisado.', how: 'Marque, clique em "Fechar mês dos selecionados" e confirme.' },
        ],
    },
    {
        id: 'admin-vendas', area: 'admin', name: 'Vendas & Marketing', version: '2026-11-01',
        tabs: ['Leads', 'InteresseConvenios', 'SocialMedia', 'Analytics', 'ROI'],
        summary: 'Do lead ao paciente, com o próximo passo de cada um.',
        items: [
            { title: 'Follow-up em Quadro', what: 'Além da Lista, os leads podem ser vistos em Quadro, com uma coluna por etapa. Arraste o cartão para mudar a etapa; solte em Agendado, Virou paciente ou Não fechou para encerrar.', how: 'Use o botão Lista | Quadro; a escolha fica guardada.' },
            { title: 'Ficha do lead', what: 'Clicar no nome do lead abre uma ficha lateral (no celular, de baixo para cima) com contato, etapa e histórico.', how: 'Clique no nome do lead.' },
            { title: 'Leads com próximo passo', what: 'KPIs do funil no período e a fila mostra o próximo passo de cada lead.', how: 'Clique no lead para abrir o WhatsApp com a mensagem.' },
            { title: 'ROI em tela única', what: 'Investimento, custo por lead e por paciente, receita e retorno por canal.', how: 'Troque o período nos chips do topo.' },
            { title: 'Convênios: oferecer particular', what: 'Quem espera vaga do convênio há mais de 30 dias ganha a oferta do particular.', how: 'Clique em Oferecer particular e confira o texto.' },
            { title: 'Social Media em 3 grupos', what: 'Calendário, Criar com IA e Anúncios, com sugestões da semana das especialidades com horário vago.', how: 'Comece pelas sugestões da semana.' },
            { title: 'Site até o paciente', what: 'Visitas, leads e pacientes do site, e alerta de landing page com visitas e nenhum lead.', how: 'Veja o alerta em Analytics do Site.' },
        ],
    },
    {
        id: 'admin-pacientes', area: 'admin', name: 'Gestão · Pacientes', version: '2026-11-01', tabs: ['Add Paciente'],
        summary: 'Ache quem deve e fale com vários de uma vez.',
        items: [
            { title: 'Ordenar por saldo devedor', what: 'O seletor de ordem tem "Maior saldo devedor", que traz primeiro quem mais deve no particular.', how: 'Escolha a ordem no topo da lista.' },
            { title: 'Seleção em lote', what: 'Marque pacientes (a marcação continua ao trocar de página) e copie os telefones de todos ou baixe a planilha.', how: 'Use a barra verde que aparece ao marcar.' },
        ],
    },
    {
        id: 'admin-conversao', area: 'admin', name: 'Inteligência de Conversão', version: '2026-11-01', tabs: ['Conversao'],
        summary: 'Do contato ao agendamento, por canal.',
        items: [
            { title: 'Funil por canal', what: 'Mostra quantos contatos de cada canal viraram agendamento no período, e a entrega por plataforma.', how: 'Troque o período na barra do topo.' },
            { title: 'Abrir os contatos', what: 'Clicar num canal mostra os contatos dele para você agir.', how: 'Clique no canal e abra o contato.' },
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
