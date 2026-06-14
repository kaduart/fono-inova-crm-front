# Auditoria Funcional — Telas Financeiras do Frontend

> Data: 2026-06-13
> Foco: identificar o que a secretaria/recepção usa no dia a dia e se já existe substituto V2.

---

## Tela principal: `/admin/financial`

Componente: `FinancialDashboard.tsx` → abre `DashboardV3Tab.tsx`

### Abas do DashboardV3Tab

| # | Aba | Dados exibidos | Fonte de dados hoje | Substituto V2? |
|---|---|---|---|---|
| 0 | **Decisão Executiva** | Caixa, produção, a receber, margem, risco, ações sugeridas | `/api/v2/financial/dashboard` (`useFinancialDashboardV3`) | ✅ Sim |
| 1 | **Visão Geral** | Produção clínica, recebido, a receber, novos agendamentos, retornos | `/api/v2/financial/dashboard` + `/analytics/appointments/by-type` | ✅ Sim |
| 2 | **Caixa** | Caixa por tipo e por método, detalhamento de pacotes | `/api/v2/financial/dashboard` | ✅ Sim |
| 3 | **Produção** | Produção por tipo, status de pagamento | `/api/v2/financial/dashboard` | ✅ Sim |
| 4 | **Despesas** | Total de despesas, comissões, impacto no caixa | `/api/v2/financial/dashboard` | ✅ Sim |
| 5 | **Metas** | Meta do mês, ritmo, projeção, gap | `/api/v2/financial/dashboard` | ✅ Sim |
| 6 | **Projeção & Cenários** | Gráfico de projeção diária, lista de atendimentos realizados/confirmados/pendentes | `/financial/dashboard/projection-daily` (legado) + `/v2/appointments` | ⚠️ Parcial — só projeção diária é legado |
| 7 | **Insights** | Alertas, recomendações, riscos | `/api/v2/financial/dashboard` | ✅ Sim |
| 8 | **Ranking** | Especialidades, ranking de profissionais, pacientes VIP, performance | `/analytics/financial/*` + drillDown do V2 | ✅ Sim |

### Modais dentro do DashboardV3Tab

| Modal | Endpoint hoje | Substituto V2? |
|---|---|---|
| Débito Total (histórico) | `/api/financial/dashboard/debitos` | ✅ `/api/v2/financial/dashboard/debitos` (migrado com feature flag) |
| Débito do Mês | `/api/financial/dashboard/debitos?month=&year=` | ✅ `/api/v2/financial/dashboard/debitos?month=&year=` (migrado com feature flag) |
| Convênios pendentes | `paymentService.getInsuranceReceivables` | ✅ Endpoint ativo separado |

---

## Aba crítica: Projeção & Cenários

Componente: `AnaliseProjecaoTab.tsx` → exporta `ProjecaoCenarios`

### O que consome

| Endpoint | Uso | Status |
|---|---|---|
| `/api/v2/financial/dashboard` | Metas e dados financeiros | ✅ V2 |
| `/api/v2/appointments` | Lista de atendimentos do mês | ✅ V2 |
| `/api/financial/dashboard/projection-daily` | Gráfico de projeção acumulada dia a dia | ⚠️ **Legado** — depende de `FinancialDailySnapshot` |

### O que exibe

1. **Gráfico de projeção**: meta ideal acumulada, real acumulado, projeção futura.
2. **Tabela de atendimentos**: realizados, confirmados, pendentes (paginação).
3. **Cards de cenários**: otimista, realista, pessimista.

### Análise de risco

A única parte legada é o **gráfico de projeção diária**. Ele depende de `FinancialDailySnapshot`, que já foi identificado como problemático.

A lista de atendimentos e os cards de cenário usam dados do V2.

### Recomendação

Se a secretaria **usa** essa aba principalmente para:
- Ver o ritmo de produção vs meta → já coberto pela aba **Metas** do V2.
- Ver atendimentos do dia → não é o objetivo desta tela (existe agenda/calendário).
- Ver projeção de fim de mês → pode ser reimplementado com `unifiedFinancialService.calculateCashByDay()` + `Planning`.

**Decisão sugerida**: ver auditoria completa em [`SPRINT_3_10_1_AUDITORIA_PROJECAO_CENARIOS.md`](../../SPRINT_3_10_1_AUDITORIA_PROJECAO_CENARIOS.md). A feature flag `SHOW_PROJECTION_TAB` foi corrigida para respeitar `VITE_SHOW_PROJECTION_TAB=false`; o teste controlado de ocultar a aba por 7 dias pode ser feito assim que o time validar o uso real.

---

## Outras rotas financeiras no front

| Rota | Componente | Fonte de dados | Status |
|---|---|---|---|
| `/admin/financial` | `FinancialDashboard.tsx` | V2 | ✅ OK |
| `/admin/financial-metrics` | `FinancialMetricsDashboard.tsx` | `/api/v2/admin/financial-metrics` | ✅ OK |
| `/admin/system` (unified dashboard) | `SystemUnifiedDashboard.tsx` | `/api/v2/financial/dashboard/sanity-check` + `/api/v2/analytics/operational/recent-ops` | ✅ OK |

---

## Funcionalidades da secretaria — mapeamento

| Funcionalidade | Tela atual | Endpoint novo? | Status |
|---|---|---|---|
| Caixa do dia | `DashboardV3Tab` → Caixa | `/api/v2/financial/dashboard` | ✅ Replicado |
| Produção do dia | `DashboardV3Tab` → Visão Geral | `/api/v2/financial/dashboard` | ✅ Replicado |
| Faltas do dia | Calendário / Agenda | `/api/v2/appointments` | ✅ Replicado (outra tela) |
| Cancelamentos | Calendário / Agenda | `/api/v2/appointments` | ✅ Replicado (outra tela) |
| Atendimentos realizados | `DashboardV3Tab` → Projeção & Cenários | `/api/v2/appointments` | ✅ Replicado |
| Quanto entrou hoje | `DashboardV3Tab` → Decisão Executiva / Caixa | `/api/v2/financial/dashboard` | ✅ Replicado |
| Quanto falta receber | `DashboardV3Tab` → Visão Geral / A Receber | `/api/v2/financial/dashboard` | ✅ Replicado |
| Agenda de amanhã | Calendário | `/api/v2/appointments` | ✅ Replicado (outra tela) |
| Pendências do dia | `DashboardV3Tab` → Débitos | `/api/v2/financial/dashboard/debitos` | ✅ Migrado |
| Projeção mensal | `DashboardV3Tab` → Projeção & Cenários | `/financial/dashboard/projection-daily` (legado) | ⚠️ Não replicado |

---

## Conclusão

### Já replicado no V2

- Caixa, produção, despesas, metas, insights, ranking, débitos, convênios pendentes.
- Novos agendamentos, retornos, recorrentes (via analytics).
- Atendimentos realizados/confirmados/pendentes (via `/v2/appointments`).

### Ainda pendente

- **Projeção mensal diária** (`/financial/dashboard/projection-daily`).

### Recomendação

1. **Não remover** `financialMetrics.service.js` nem `dashboard.routes.js` ainda.
2. **Ver auditoria completa** em [`SPRINT_3_10_1_AUDITORIA_PROJECAO_CENARIOS.md`](../../SPRINT_3_10_1_AUDITORIA_PROJECAO_CENARIOS.md).
3. **Usar a feature flag já corrigida** (`VITE_SHOW_PROJECTION_TAB=false`) para ocultar a aba "Projeção & Cenários" por 7 dias.
4. **Monitorar** se alguém da secretaria reclama da ausência da aba.
5. Se ninguém reclamar → remover a aba e o endpoint legado.
6. Se alguém reclamar → reimplementar projeção com `unifiedFinancialService.calculateCashByDay()` + `Planning`.
