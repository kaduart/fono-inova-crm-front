# 🩺 Refatoração dos Hooks de Doctor - Documentação

## 📋 Resumo

Esta documentação descreve a refatoração dos hooks relacionados ao gerenciamento de profissionais (doctors), dividindo responsabilidades e adicionando cache para melhorar performance.

## 🎯 Objetivos

1. **Separar responsabilidades**: Dividir `useDoctorDashboard` em hooks menores e especializados
2. **Melhorar performance**: Implementar cache com stale-while-revalidate
3. **Manter compatibilidade**: O hook original continua funcionando
4. **Testes robustos**: Cobertura completa com testes unitários e de integração

## 📁 Novos Arquivos Criados

### Hooks

| Arquivo | Responsabilidade | Exportações |
|---------|-----------------|-------------|
| `useDoctorList.ts` | Gerenciamento da lista de médicos | `useDoctorList`, `invalidateDoctorListCache` |
| `useDoctorStats.ts` | Estatísticas e dados analíticos | `useDoctorStats`, `invalidateDoctorStatsCache` |

### Testes

| Arquivo | Tipo | Quantidade de Testes |
|---------|------|---------------------|
| `useDoctorList.test.ts` | Unitário | 15 testes |
| `useDoctorStats.test.ts` | Unitário | 13 testes |
| `doctorFlow.integration.test.ts` | Integração | 12 testes |

**Total: 40 testes**

## 🔧 API dos Hooks

### useDoctorList

```typescript
interface UseDoctorListReturn {
  doctors: Doctor[];           // Lista de médicos
  loading: boolean;            // Estado de loading
  error: string | null;        // Mensagem de erro
  hasError: boolean;           // Se há erro
  refresh: () => Promise<void>;      // Atualiza (usa cache)
  refetch: () => Promise<void>;      // Força nova requisição
  lastUpdated: Date | null;    // Timestamp da última atualização
  count: number;               // Total de médicos
  activeCount: number;         // Médicos ativos
  inactiveCount: number;       // Médicos inativos
}

// Uso
const { doctors, loading, refresh } = useDoctorList({
  filter: 'all',      // 'all' | 'active' | 'inactive'
  autoFetch: true,    // Busca automática no mount
  onError: (err) => {} // Callback de erro
});
```

### useDoctorStats

```typescript
interface UseDoctorStatsReturn {
  // Dados
  stats: DoctorStats | null;
  attendanceSummary: AttendanceSummary[];
  doctorOverview: DoctorOverview | null;
  calendarEvents: CalendarEvent[];
  totalDoctors: number;
  
  // Loadings individuais
  loadingStats: boolean;
  loadingAttendance: boolean;
  loadingOverview: boolean;
  loadingCalendar: boolean;
  loading: boolean; // Geral
  
  // Erros
  error: string | null;
  hasError: boolean;
  
  // Ações
  refreshStats: () => Promise<void>;
  refreshAttendance: () => Promise<void>;
  refreshOverview: () => Promise<void>;
  refreshCalendar: () => Promise<void>;
  refreshAll: () => Promise<void>;
  
  lastUpdated: Date | null;
}

// Uso
const { stats, loading, refreshAll } = useDoctorStats({
  doctorId: '123',    // Opcional - se não passar, pega do médico logado
  autoFetch: true,
  onError: (err) => {}
});
```

## ⚡ Performance

### Cache

- **Duração**: 5 minutos para lista, 3 minutos para stats
- **Estratégia**: Stale-while-revalidate
- **Invalidação**: Funções exportadas para limpar cache quando necessário

### Race Conditions

- Requisições concorrentes são evitadas
- Apenas a requisição mais recente atualiza o estado
- Cancelamento automático de requisições obsoletas

### Memory Leaks

- Verificação de componente montado antes de atualizar estado
- Cleanup automático no unmount

## 🔄 Migração Gradual

### Fase 1: Coexistência (ATUAL)
- Novos hooks criados e testados
- Hook original `useDoctorDashboard` continua funcionando
- Nenhuma breaking change

### Fase 2: Adoção Parcial
```typescript
// Antes
const { doctors, stats, refreshData } = useDoctorDashboard();

// Depois (opcional)
const { doctors, refresh } = useDoctorList();
const { stats, refreshAll } = useDoctorStats();
```

### Fase 3: Substituição Completa (FUTURO)
- Remover `useDoctorDashboard` quando todos os componentes migrarem

## 🧪 Rodando os Testes

```bash
# Todos os testes dos hooks de doctor
npm run test:run -- src/hooks/__tests__/useDoctorList.test.ts
npm run test:run -- src/hooks/__tests__/useDoctorStats.test.ts
npm run test:run -- src/hooks/__tests__/doctorFlow.integration.test.ts

# Todos juntos
npm run test:run -- src/hooks/__tests__/useDoctorList.test.ts \
                   src/hooks/__tests__/useDoctorStats.test.ts \
                   src/hooks/__tests__/doctorFlow.integration.test.ts

# Com UI
npm run test:ui
```

## 📊 Cobertura de Testes

### useDoctorList (15 testes)
- ✅ Inicialização (3)
- ✅ Filtragem (3)
- ✅ Refresh e Refetch (2)
- ✅ Tratamento de Erros (3)
- ✅ Race Conditions (2)
- ✅ Última Atualização (1)
- ✅ Cache (1)

### useDoctorStats (13 testes)
- ✅ Inicialização (2)
- ✅ Busca de Stats (2)
- ✅ Attendance Summary (2)
- ✅ Calendar Events (1)
- ✅ Refresh All (2)
- ✅ Tratamento de Erros (2)
- ✅ Estados de Loading (1)
- ✅ Cache (1)

### doctorFlow.integration (12 testes)
- ✅ Consistência de Dados (2)
- ✅ Inativação de Médico (2)
- ✅ Dashboard do Admin (2)
- ✅ Performance (1)
- ✅ Error Handling (2)
- ✅ Cache Independence (1)
- ✅ ManageDoctors Flow (2)

## 🚨 Compatibilidade

### ✅ Mantido
- Hook `useDoctorDashboard` original continua funcionando
- Todas as rotas da API preservadas
- Componentes existentes não quebram

### ⚠️ Notas
- Os novos hooks usam cache em memória (não persiste entre reloads)
- É necessário invalidar o cache manualmente após mutações (create/update/delete)

## 📝 Exemplos de Uso

### Lista de Médicos com Tabs
```tsx
function DoctorTabs() {
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  
  const { doctors, loading } = useDoctorList({
    filter: activeTab,
    autoFetch: true
  });

  if (loading) return <Spinner />;
  
  return (
    <>
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tab value="active">Ativos</Tab>
        <Tab value="inactive">Inativos</Tab>
      </Tabs>
      <DoctorList doctors={doctors} />
    </>
  );
}
```

### Dashboard com Stats
```tsx
function DoctorDashboard({ doctorId }: { doctorId: string }) {
  const { 
    stats, 
    attendanceSummary,
    calendarEvents,
    loading,
    refreshAll 
  } = useDoctorStats({ doctorId });

  if (loading) return <Spinner />;

  return (
    <>
      <StatsCards stats={stats} />
      <AttendanceTable data={attendanceSummary} />
      <Calendar events={calendarEvents} />
      <Button onClick={refreshAll}>Atualizar</Button>
    </>
  );
}
```

### Após Mutação
```tsx
function CreateDoctorForm() {
  const { refetch } = useDoctorList();

  const handleSubmit = async (data) => {
    await doctorService.createDoctor(data);
    // Invalida cache para forçar busca nova
    invalidateDoctorListCache();
    await refetch();
  };

  return <Form onSubmit={handleSubmit} />;
}
```

## 🔮 Próximos Passos Sugeridos

1. **Migrar componentes gradualmente**:
   - Começar com componentes simples
   - Manter `useDoctorDashboard` para componentes complexos
   - Testar cada migração

2. **Adicionar React Query** (opcional futuro):
   - Substituir cache customizado pelo React Query
   - Melhor gerenciamento de estado global
   - Devtools para debugging

3. **Otimizar chamadas de API**:
   - Criar endpoint único para dados do dashboard
   - Usar GraphQL ou similar para reduzir over-fetching

## 📞 Suporte

Se encontrar algum problema:
1. Verifique se o cache foi invalidado após mutações
2. Confira se os testes passam isoladamente
3. Consulte os exemplos nesta documentação

---

**Versão**: 1.0.0  
**Data**: 2024  
**Autor**: Sistema CRM Clínica
