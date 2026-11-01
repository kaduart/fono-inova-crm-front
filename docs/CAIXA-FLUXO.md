# Caixa e Fluxo — retomada do mock aprovado

Implementação de 30/10/2026 baseada no mock “Mock Caixa e Fluxo” aprovado no projeto ERP - FONO INOVA.

- O filtro Hoje acompanha a data escolhida; meses abrem a visão de fluxo sem um segundo seletor Dia/Mês.
- A faixa principal usa caixa recebido, previsto da agenda, pendências de pagamento, atendimentos e ticket do backend.
- O previsto depende do contrato `agenda` introduzido no backend por a5903927. Não estimar pelo valor do pacote no frontend.
- O comparativo usa `comparativos.ontem`; não é feita uma segunda consulta completa do caixa anterior.
- Os detalhes anteriores continuam disponíveis, recolhidos. As seis sub-abas e as ações financeiras existentes foram preservadas.
- A visão mensal acrescenta caixa versus produção por dia e resumo de semanas de segunda a domingo, limitado aos dados do mês.

## Ações e limites das fontes

Cobrar abre Pendentes; Agendar abre a lista sem próxima sessão; Renovar mostra a fila comercial de pacotes e permite abrir a conversa; Encaixar abre a grade de retenção; Faturar abre os atendimentos de convênio.

A API de pacotes não fornece o preço da futura renovação: a tela informa que o valor está a definir. Horários críticos são da grade atual, não uma confirmação de vaga livre no dia consultado ou de candidato esperando. Essas diferenças em relação aos números ilustrativos do mock ficam explícitas na interface.

Nenhuma cobrança, mensagem ou faturamento é executado automaticamente por essas ações de navegação. Erros ao consultar filas não são apresentados como ausência de pendências.

## Verificação

Prévia isolada dos componentes com dados sintéticos em desktop e celular; compilação de produção; testes de navegação, preservação dos parâmetros de URL, competência e regressão do chip Hoje. O teste unitário do backend de atendimentos e previsto foi executado separadamente.

## Correção do resumo operacional

A agenda e o movimento ficam sempre visíveis: agendados ativos (realizados + aguardando), atendidos, aguardando, faltas/cancelamentos e agendamentos criados. O perfil mostra primeira consulta, nova especialidade, retornos, recorrentes e liminares.

O perfil considera a data marcada para atendimento: a API também retorna registros criados no intervalo para datas futuras, que são excluídos desse perfil. Agendamentos criados usam o resumo independente de `mode: createdAt` (ativos, incluindo datas futuras). Falhas de consulta não são apresentadas como zero.

O painel financeiro força alinhamento à esquerda para neutralizar a centralização herdada do aplicativo. Pendências e composição ficam lado a lado em telas largas, com linhas compactas. Os detalhes financeiros anteriores continuam acessíveis.

Validação da correção: nove testes de navegação, dois testes do resumo operacional e compilação de produção aprovados. A revisão visual desta rodada ficou pendente por indisponibilidade da conexão do navegador e expiração da abertura do Chrome.

## Cliques que detalham (31/10/2026)

Pedido do Kadu: tudo que era clicável continua clicável para facilitar o comercial.
- Números do topo: Caixa e Ticket abrem Recebimentos, Previsto abre a Agenda do dia, A receber abre Pendentes.
- Agenda e movimento: Agendados, Atendidos, Aguardando e Faltas abrem a Agenda do dia já filtrada. "Ver agenda e atendimentos" abre a aba e rola até ela (antes trocava a aba lá embaixo e parecia que nada acontecia).
- Perfil: pré-agendado e 1ª consulta viram "Pacientes novos" (com a divisão embaixo). Esse grupo, Retornos, Recorrentes e Liminar abrem uma lista com nome, horário, profissional e botão de WhatsApp. Nova especialidade segue com o modal próprio.

## Visual do topo (aprovado em 31/10/2026)

Mock: https://claude.ai/artifact/MofvBUst4aP3nUUB3Vx11G
- Caixa em destaque (número grande, barra de quanto do previsto entrou, variação vs ontem).
- Agenda e perfil numa linha de chips clicáveis (mesmos cliques de antes).
- Ações com número colorido pela urgência; origem do caixa em barra empilhada com %.

## Versão 2 (01/11/2026, mock aprovado)

Mock: https://claude.ai/artifact/R6NEhtTmWQm5ZwWR98r6dh · crítica Impeccable: critique 26/40, audit 14/20.
- Bug "clico no card e a tela desce": cards e chips não rolam mais até as sub-abas. Abrem o painel lateral `CashflowDrawer` (Esc fecha, a página fica parada); "Abrir na aba …" leva à sub-aba completa. Sub-abas ganharam "↑ Voltar ao resumo".
- A receber: agrupado por paciente, valor por atendimento e WhatsApp com mensagem pronta (`collectMessage`). Nada é enviado sozinho.
- Novo "Do previsto ao caixa": caixa + atendido sem pagamento + convênio a faturar; o resto aparece como "pacote pago antes, liminar ou sem lançamento". Só números do backend.
- Nova ação "Faltas para remarcar" com `agenda.perdido` (backend) e mensagem `rescheduleMessage`.
- Pacotes: última sessão primeiro, resumo por especialidade e WhatsApp com renovação (Valor → Preço). Sem próxima sessão cita os 3 primeiros nomes.
- Chips em duas linhas (Agenda / Perfil); cards com "Ver … ›"; "caixa do mês" no Ticket; origem com uma forma só vira uma linha; card violeta trocado pelo padrão e usando o previsto do backend.
- Performance: sem busca duplicada da agenda no clique; renovações com cache de 5 min; blocos de "Ver detalhes" só renderizam quando abertos; console.log removidos.
