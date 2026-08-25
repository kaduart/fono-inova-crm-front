---
target: site completo (front/src)
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-08-24T16-52-11Z
slug: front-src-site-completo
---
Method: dual-agent (A: revisão de design isolada · B: evidência mecânica isolada)

⚠️ Limitação declarada: sem ferramenta de browser nesta sessão, não houve captura visual ao vivo nem overlay no navegador. As duas avaliações se basearam em leitura de código-fonte (JSX/Tailwind/MUI) + scanner mecânico (detect.mjs).

## Design Health Score

| # | Heurística | Nota | Problema-chave |
|---|-----------|------|-----------------|
| 1 | Visibilidade do status do sistema | 3 | Skeletons e timestamps bons; window.confirm() nativo quebra o padrão em ações financeiras |
| 2 | Compatibilidade com o mundo real | 3 | Linguagem de domínio correta para a equipe treinada, mas sem explicação de termos ("Regime de Competência", "Liminar") |
| 3 | Controle e liberdade do usuário | 2 | Ações destrutivas financeiras sem desfazer, sem modal de marca |
| 4 | Consistência e padrões | 2 | A própria regra do DESIGN.md ("esmeralda=chrome, azul=ação") é quebrada no Login e na busca de pacientes |
| 5 | Prevenção de erros | 2 | Validações existem, mas o estado de erro do Login nunca é populado (código morto) |
| 6 | Reconhecimento vs. memorização | 3 | Abas com contadores ao vivo; porém o botão de perfil do header não mostra identidade nenhuma |
| 7 | Flexibilidade e eficiência | 1 | Nenhum atalho de teclado encontrado; nenhuma ação em lote; 8 abas em scroll horizontal no financeiro |
| 8 | Design estético e minimalista | 2 | Dashboard principal é disciplinado; tela de Caixa expandida empilha 16+ cards simultaneamente |
| 9 | Recuperação de erros | 2 | Toasts com mensagem real do backend (bom); caminho de erro do Login é inalcançável |
| 10 | Ajuda e documentação | 1 | Nenhum tooltip/glossário/ajuda contextual em nenhuma tela revisada |
| **Total** | | **21/40** | **Aceitável (52,5%)** |

## Veredito de Especificidade

O núcleo operacional é genuinamente autoral: UnifiedCashflowTab.tsx modela a contabilidade real da clínica (Caixa vs. Produção, Convênio/Liminar/Pacote, regime de competência) — nada disso vem de um template genérico. Mas a casca em volta não acompanha: Home.tsx é copy de SaaS de saúde genérico, e a cor de marca varia entre pelo menos 4 valores diferentes de verde pelo código.

Achado do scanner que confirma isso com evidência dura: 16 cores hexadecimais literais fora da paleta documentada, concentradas exatamente onde a revisão de design já suspeitava — UnifiedCashflowTab.tsx (linhas 500, 539, 579, 726) e ManagePatients.tsx (linhas 99, 101, 122, 124).

## Pontos Fortes

- DashboardContentOptimized.tsx: arquitetura de acordeões com estados padrão deliberados por seção, skeletons no formato exato do conteúdo real.
- PatientList.tsx (ManagePatients): cards de altura fixa comentados no código, abas com contadores ao vivo, copy de estado vazio adaptativa.
- "Receita Prevista × Realizada" no Cashflow: modelagem real do regime de competência da clínica.

## Problemas Prioritários

[P1] Sobrecarga cognitiva na tela financeira expandida
- Por que importa: 5 de 8 critérios de carga cognitiva falham assim que "Resumo do Dia" é expandido — 16+ cards simultaneamente coloridos, um gráfico, e 8 abas competindo.
- Fix: eleger 1-2 métricas-herói como primárias; consolidar as 8 abas em algo como "A Faturar" com sub-filtro.
- Arquivo: src/pages/Financial/UnifiedCashflowTab.tsx
- Comando sugerido: /impeccable layout

[P1] Ações financeiras destrutivas usam window.confirm() nativo
- Por que importa: excluir pagamento e registrar débito são ações difíceis de reverter num sistema que trata integridade financeira como invariante dura; diálogo nativo carrega peso visual zero.
- Fix: substituir por modal de marca com padrão tint-shade-ring de perigo, mostrando valor e paciente.
- Arquivo: src/pages/Financial/UnifiedCashflowTab.tsx (handleDeletePayment, handleRegisterDebit, ~linhas 175-187)
- Comando sugerido: /impeccable harden

[P2] A regra "esmeralda=marca, azul=ação" do DESIGN.md é quebrada nos dois campos de formulário mais usados
- Por que importa: regra mais explicitamente documentada do sistema, violada no Login (6 ocorrências) e na busca de pacientes.
- Fix: trocar focus:ring-green-500/emerald-500 por focus:ring-blue-500, ou formalizar esmeralda como cor de foco real.
- Arquivos: src/components/Login.tsx (~262, 313, 329, 357, 404, 419), src/components/ManagePatients/PatientList.tsx (242)
- Comando sugerido: /impeccable polish

[P2] Botão de perfil no header não mostra identidade nenhuma
- Por que importa: bloco de nome+avatar comentado no código, risco real numa clínica com estações compartilhadas entre turnos.
- Fix: restaurar bloco de nome/avatar ou adicionar rótulo visível + aria-label.
- Arquivo: src/components/admin/AdminHeader.tsx (~357-376)
- Comando sugerido: /impeccable clarify

[P3] Deriva da cor de marca entre telas
- Por que importa: 4+ valores de verde representam "marca"; token do DESIGN.md não é onde os devs buscam a cor.
- Fix: substituir hex/rgb ad-hoc pelo token Tailwind documentado.
- Arquivos: src/components/ManagePatients/ManagePatients.tsx (99-101, 122-124), src/components/patients/PatientModal.tsx (47), src/pages/Financial/UnifiedCashflowTab.tsx (500, 539, 579, 726)
- Comando sugerido: /impeccable polish

## Red Flags por Persona

Alex (Usuário Avançado): nenhum atalho de teclado; nenhuma ação em lote na lista de pacientes; 8 abas do Cashflow exigem scroll horizontal sem seletor rápido.

Sam (Dependente de Acessibilidade): botão de perfil do header é só ícone sem aria-label; cards de risco codificam severidade parcialmente só por cor; emojis como ícone sem alternativa textual.

Jordan (Secretária na primeira semana): dropdown "Sistema" expõe linguagem de engenharia crua; termos do Cashflow sem explicação; dificuldade começa ao abrir Financeiro ou Sistema.

## Observações Menores

- Login.tsx: estado de erro nunca populado no catch — bloco JSX de erro inline é código morto.
- Home.tsx/Header.tsx: imagens com alt="" vazio; ícones Font Awesome sem folha de estilo confirmada.
- Menu mobile do AdminHeader duplica manualmente o nav desktop; usa esmeralda como ativo vs. azul no desktop.
- Scanner: UnifiedCashflowTab.tsx:1804 border-l-4 condicional, :1013 text-purple-700 — achados reais, baixa severidade.
- Scanner encontrou 16 casos de "texto cinza sobre fundo colorido", 15 são falsos positivos (pares de classes em estados/ramos mutuamente exclusivos). Só AdminHeader.tsx:394 é real, severidade baixa.
- UnifiedCashflowTab.tsx tem 122 valores de fonte fora da escala do DESIGN.md, 119 nesse único arquivo de 2.855 linhas.

## Perguntas Provocativas

- E se a mesma disciplina que já colapsa "Resumo do Dia" por padrão dividisse o conteúdo expandido em 2-3 visões sequenciais?
- Se os dois campos mais usados do produto não seguem a regra azul=ação, ela é realmente vigente, ou o sistema deveria padronizar em esmeralda?
- O botão de perfil já mostrou nome e avatar antes (bloco comentado) — simplificação consciente ou placeholder esquecido?
