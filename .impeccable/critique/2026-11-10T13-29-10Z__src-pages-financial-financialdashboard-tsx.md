---
target: Financeiro > Resultados (5 abas)
total_score: 18
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:C:\\Users\\User\\Documents\\projetos\\crm\\front\\src\\pages\\Financial\\FinancialDashboard.tsx"
target_fingerprint: "sha256:38f5aabeba389daf3679850015036bc10031b3b8bdd9367db166e48f2c1b8952"
target_path: "C:\\Users\\User\\Documents\\projetos\\crm\\front\\src\\pages\\Financial\\FinancialDashboard.tsx"
timestamp: 2026-11-10T13-29-10Z
slug: src-pages-financial-financialdashboard-tsx
---
Method: dual-agent (A: design review · B: detector+browser)

## Design Health Score (18/40, Poor)
| # | Heurística | Nota | Problema-chave |
|---|---|---|---|
| 1 | Status | 2 | Comparativo de 10 dias × outubro fechado sem aviso; Metas ~45s em esqueleto sem mensagem |
| 2 | Mundo real | 2 | "Payment(s)", "MEDIA", "cartao", "Gap diário", "p.p." |
| 3 | Controle | 3 | URL guarda aba; dois seletores de mês podem divergir |
| 4 | Consistência | 1 | Produção com 4 valores, A receber com 3, Projeção com 3; "21.6%" × "21,6%"; verde #00B57A fora do sistema |
| 5 | Prevenção de erro | 2 | Esperado > Otimista, taxa 1521% |
| 6 | Reconhecimento | 2 | mesma métrica com nomes/bases diferentes por aba |
| 7 | Eficiência | 2 | Ctrl+K e URL existem; sem atalho por seção; Marketing antes de Financeiro |
| 8 | Estética | 1 | Painel/Decisão saturados: 8 cards "MEDIA", hero vermelho, emojis, bordas arco-íris |
| 9 | Erros | 2 | texto de dev na UI (IndicadoresTab.tsx:150) |
| 10 | Ajuda | 1 | sem definição de Caixa/Produção/Antecipação/Ponto de equilíbrio |

## Specificity
Indicadores do mês e grade de 12 meses de Metas do ano são autorais; Painel completo, Inteligência e Projeção são template genérico (MUI + paleta hex solta). Detector: 65 achados advisory nos arquivos da tela (53 cor fora do sistema, 10 tamanho de fonte, 1 side-tab), contraste baixo em massa (gray-400 2,5:1; #10b981 2,5:1; botão #00B57A 2,7:1), texto de 10px em ~36 rótulos, cabeçalhos pulados (h1→h4→h6) em Inteligência/Projeção. IndicadoresTab e ProjecaoMensalTab limpos no CLI. Falso positivo: gray-on-color PlanningTab.tsx:1043.

## Priority Issues
- [P0] Uma métrica, vários números (Produção 10.995/9.595/12.360; A receber 2.510/3.910/3.530; Projeção 25.539/32.430/137.896; cenários invertidos). Fix: dicionário único de métricas, rótulo + qualificador visível, uma fonte no back; cenário absurdo vira "dados insuficientes". clarify + harden.
- [P1] IA com 4 níveis e 14 abas sobrepostas. Fix: Indicadores como home; 9 sub-abas viram 3 blocos recolhíveis (Dinheiro / Metas e projeção / Análise) com âncora e Ctrl+K; um seletor de mês. layout + distill (reagrupar, sem cortar).
- [P1] Painel completo fora do DESIGN.md + contraste/10px. Fix: card padrão, KPI text-2xl bold, esmeralda única, tint-shade-ring, ícone lucide no lugar de emoji, text-xs mínimo, pt-BR em todo número. quieter + typeset.
- [P2] Decisão Executiva repetitiva: 8 cards "MEDIA" → tabela ordenada recolhida com contagem; pendências duplicadas. distill + clarify.
- [P2] Contexto temporal e copy: "até dia 10 × outubro inteiro", sem texto de dev, "Payment"→"Pagamento", "R$ 2.200.00". clarify + polish.

## Persona Red Flags
Alex: sem deep-link por seção; Ctrl+K ranqueia Marketing; botão "Painel detalhado" duplica aba. Sam: sub-abas do Painel sem role=tab/setas (FinancialDashboardTab.tsx:2448); hero só por cor; emojis lidos; AnimatedValue em todo KPI. Secretária: jargão sem definição; alarme vermelho logo após "Operação saudável"; no celular o 5º KPI fica sozinho com 1.65rem e a tabela "O que fazer agora" espreme.

## Minor
"Meses batidos 1 de 10" com 4 sem meta; Meta realizada (caixa) = Caixa lado a lado; "Impacto R$ 1.959,50" rotulado errado; linhas R$ 0,00 com mesmo peso de pendência real.

## Questions
Qual Produção a dona fala na reunião? As 9 sub-abas não seriam seções de Indicadores? Secretária deve ver ranking nominal de profissionais?
