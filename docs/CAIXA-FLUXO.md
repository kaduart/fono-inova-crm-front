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
