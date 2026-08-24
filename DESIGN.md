---
name: CRM Clínica Fono Inova
description: Painel operacional interno para gestão de clínica multidisciplinar (agenda, financeiro, pacientes, profissionais)
colors:
  emerald-primary: "#26977B"
  emerald-header: "rgb(13, 138, 108)"
  emerald-deep: "#1E7A64"
  emerald-tint-50: "#E6F4F1"
  emerald-tint-100: "#D7EFE9"
  neutral-ink: "#111827"
  neutral-body: "#374151"
  neutral-muted: "#6b7280"
  neutral-faint: "#9ca3af"
  neutral-border: "#e5e7eb"
  neutral-surface: "#f9fafb"
  success-green: "#16a34a"
  danger-red: "#dc2626"
  warning-amber: "#d97706"
  info-blue: "#2563eb"
  info-purple: "#9333ea"
  info-cyan: "#0891b2"
  info-indigo: "#4f46e5"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.emerald-primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.emerald-deep}"
  button-outline:
    backgroundColor: "#ffffff"
    textColor: "{colors.emerald-primary}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  badge-neutral:
    backgroundColor: "#f3f4f6"
    textColor: "#374151"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  card:
    backgroundColor: "#ffffff"
    rounded: "{rounded.xl}"
    padding: "20px"
---

# Design System: CRM Clínica Fono Inova

## Overview

**Creative North Star: "The Clinical Control Room"**

Este não é um produto com público externo — é a cabine de comando interna de uma clínica multidisciplinar (Fono Inova): secretárias, administradores e profissionais operam agenda, financeiro, pacientes e comunicação (WhatsApp/Amanda) o dia inteiro, na mesma tela. O sistema não precisa seduzir ninguém a entrar; precisa deixar quem já está lá dentro encontrar o número certo, o paciente certo e o botão certo o mais rápido possível, sem fricção visual.

A identidade tem **uma única cor de marca e ação**: o **verde-esmeralda** (`rgb(13,138,108)` no header, `#26977B` como var de marca) é ao mesmo tempo o *chrome* (cabeçalho, logo, Home institucional) e a cor de *ação e foco* (botão primário, anel de foco de input, item ativo de navegação, ícone padrão de card). Uma versão anterior deste documento descrevia um sistema de duas cores (esmeralda para marca, azul para ação) — essa divisão nunca foi consistentemente aplicada no código (Login e busca de pacientes já usavam esmeralda no foco antes desta revisão) e foi abandonada em favor de uma identidade única: uma cor de marca reforça a especificidade do produto mais do que duas cores que não conversam entre si. Azul continua existindo no sistema, mas só com papel semântico/categórico (ver Colors → Semantic) — nunca mais como cor de ação genérica.

A superfície mais nova do sistema (o dashboard pós-login mais recente, com cards `rounded-2xl`, bordas `border-gray-100` quase invisíveis e sombra que só aparece no hover) mostra para onde o sistema está caminhando: mais respiro, mais hierarquia por peso tipográfico e menos dependência de cor de fundo saturada. Superfícies mais antigas (badges legados) ainda usam blocos de cor mais sólidos. Ambas convivem hoje; a direção nova é a referência para trabalho futuro.

**Key Characteristics:**
- Denso por padrão: `text-sm`/`text-xs` dominam a tipografia (>3.200 ocorrências combinadas); texto grande é reservado a título de página e KPI.
- Cinza neutro (`gray-50`…`gray-900`) é a base absoluta da superfície; cor só entra para status, ação e identidade de marca — nunca como decoração.
- Toda cor semântica segue a mesma fórmula: fundo `-50`/`-100`, texto `-600`/`-700`, borda/ring `-200`. Isso é consistente o bastante para ser tratado como regra, não coincidência.
- Uma única cor de ação/marca (esmeralda) — não duas competindo entre si.
- Sem modo escuro (uso residual, não é uma capacidade real do sistema).
- Sem fonte customizada — pilha de sistema operacional, deliberada para um painel interno de uso prolongado.

## Colors

Paleta funcional sobre base neutra: cor comunica papel (marca/ação, status), não decoração. Nenhuma cor é usada "porque sim".

### Primary — Marca e Ação
- **Esmeralda Fono Inova** (`rgb(13, 138, 108)` no header; `#26977B` na escala CSS `--brand-600`): a única cor de marca e de ação do sistema. Usada no header/nav principal, logo, avatar de perfil, dropdown de conta, botão primário (`components/ui/Button`), anel de foco de todo input (`focus:ring-emerald-500`), item ativo de navegação (`bg-emerald-100 text-emerald-700`), ícone padrão de card (`components/ui/Card`), spinner padrão de carregamento.

### Neutral
- **Gray 50/100** (`#f9fafb` / `#f3f4f6`): fundo de página, fundo de linha zebrada, fundo de skeleton/loading.
- **Gray 200/300** (`#e5e7eb` / `#d1d5db`): borda padrão de card, input, divisor — a borda "quase invisível" que substitui sombra pesada.
- **Gray 400/500** (`#9ca3af` / `#6b7280`): texto auxiliar, placeholder, metadado (`text-gray-500` é a cor de texto secundário mais usada do sistema, >900 ocorrências).
- **Gray 700/800/900** (`#374151` / `#1f2937` / `#111827`): texto de corpo e títulos.

### Named Rules
**The Tint-Shade-Ring Rule.** Todo indicador de status (badge, alerta, chip) usa a mesma tripla: fundo `{cor}-50` ou `{cor}-100`, texto `{cor}-600` ou `{cor}-700`, borda/ring `{cor}-200`. Nunca cor sólida `-500`/`-600` como fundo de badge — isso é reservado a botões e ícones.

**The One Action Color Rule.** Esmeralda é a única cor de marca/ação do sistema — chrome, botão primário e foco de formulário usam a mesma cor. Azul (e as demais cores semânticas) só aparecem com papel de status ou categorização, nunca como substituto do verde em botão primário, anel de foco ou estado ativo de navegação.

### Semantic (status, categorização)
- **Verde-sucesso** (`green-600`/`green-100`): pago, confirmado, enviado, positivo financeiro. Visualmente próximo do esmeralda de marca mas semanticamente separado — verde-sucesso é sempre sobre uma badge de status, esmeralda é sempre sobre chrome/ação.
- **Vermelho** (`red-600`/`red-100`): erro, cancelado, pendência crítica, ação destrutiva.
- **Âmbar** (`amber-600`/`amber-100`): aviso, aguardando, contador de pendência (badge numérica sobre item de menu).
- **Azul, Roxo, Índigo, Ciano** (`blue`, `purple`, `indigo`, `cyan`, cada um em `-100`/`-500`/`-600`): categorização não-crítica — cor de ícone por seção do menu (Gestão=roxo, Sistema=laranja, Vendas&Marketing=ciano), tag de tipo de cobrança (Convênio=azul, Liminar=roxo), status "processando" em badges, tags de especialidade clínica. Papel puramente identificador, nunca de ação ou status positivo/negativo.

## Typography

**Display/Body Font:** pilha de sistema (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif`) — sem fonte customizada carregada.
**Mono:** `source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace` (uso residual, blocos de código/debug).

**Character:** Utilitária e neutra de propósito — a tipografia não carrega personalidade própria; toda hierarquia vem de peso (`font-medium`/`font-semibold`/`font-bold`) e tamanho, não de troca de família. Isso é coerente com "denso e confiável": a fonte não deve competir com o dado.

### Hierarchy
- **Display** (bold 700, `text-2xl`/`text-3xl`, 1.2): título de página, hero da Home institucional. Uso raro — menos de 200 ocorrências de `text-3xl`+ em todo o projeto.
- **Title** (semibold 600, `text-lg`/`text-xl`, 1.3): cabeçalho de card, título de modal, título de seção dentro de dashboard.
- **Body** (normal/medium, `text-sm`, 1.5): texto corrido, valor de campo, conteúdo de tabela — a unidade tipográfica dominante do sistema (1.686 ocorrências de `text-sm`).
- **Label** (medium 500, `text-xs`, uppercase quando é rótulo de seção): metadado, timestamp, rótulo de formulário, badge. Segunda unidade mais usada (1.547 ocorrências de `text-xs`).
- **Micro** (`text-2xs` 11px / `text-3xs` 10px, `tailwind.config.cjs → theme.extend.fontSize`): contador de badge, rótulo dentro de card muito denso, subtítulo de KPI. Era usado em todo o app como valor arbitrário (`text-[10px]`/`text-[11px]`, 564 ocorrências em 55 arquivos) sem estar na escala documentada — nomeado aqui em vez de removido, porque é convenção real e consistente, não deriva.

### Named Rules
**The Two-Size Floor Rule.** Nenhuma tela nova deve ter corpo de texto abaixo de `text-xs` sem uma razão específica de densidade — quando precisar, use os passos nomeados `text-2xs`/`text-3xs`, nunca um valor arbitrário novo (`text-[Npx]`). No máximo 3 tamanhos distintos numa mesma seção.

## Layout

Grid flexível baseado em `flex`/`grid` do Tailwind, container `max-w-7xl mx-auto` para o header e para páginas de largura de leitura; dashboards de dados usam largura total com grid responsivo (`grid-cols-1` mobile → `md:grid-cols-2`/`lg:grid-cols-4` desktop).

**Ritmo de espaçamento:** escala de 4px do Tailwind, mas na prática o sistema converge em poucos valores: `gap-2` (8px) e `gap-3` (12px) para espaçamento entre itens relacionados (857 e 566 ocorrências), `p-4` (16px) como padding-padrão de card/seção (590 ocorrências), `p-6` (24px) para modais e containers de maior respiro.

**Responsivo:** mobile-first com breakpoint principal em `md:` (768px) — inclusive para o colapso do menu principal em hambúrguer; não usar `lg:` (1024px) para esse colapso, testado e revertido por regredir em janelas maximizadas comuns. Grids de card colapsam de 3-4 colunas para 1-2 colunas. FullCalendar tem overrides mobile dedicados (esconde botões "Semana"/"Hoje", reduz padding de toolbar).

**Densidade:** o sistema não tem um modo "confortável" — a densidade é constante e alta em todas as telas internas (agenda, financeiro, pacientes). A única superfície com respiro deliberadamente maior é a Home institucional pública, que não representa o uso real do produto.

## Elevation & Depth

Sombra suave e responsiva à interação, nunca decorativa em repouso: cards descansam em `shadow-sm` (334 ocorrências, a sombra mais usada do sistema) apoiados por uma borda quase invisível (`border-gray-100`/`200`), e ganham `shadow-md`/`shadow-lg` apenas no hover ou quando representam uma camada flutuante real (dropdown, modal, popover). A profundidade é um sinal de "isto responde a você", não um efeito de marca.

### Shadow Vocabulary
- **Repouso** (`box-shadow` equivalente a `shadow-sm`): todo card, input, botão padrão.
- **Hover/Elevado** (`shadow-md` a `shadow-lg`): card com `hover:shadow-md`, elemento arrastável, item em destaque.
- **Flutuante** (`shadow-xl`/`shadow-2xl`): dropdown de navegação, modal, menu de perfil — sempre combinado com `border` sutil (`border-emerald-200` nos dropdowns do header, `border-gray-100` nos modais neutros).

### Named Rules
**The Border-Before-Shadow Rule.** Quando dúvida entre usar borda ou sombra para separar um bloco do fundo, a borda (`border-gray-100`/`200`) vem primeiro; a sombra é reforço, não substituto.

## Shapes

Cantos consistentemente arredondados, escalando com o tamanho do elemento — nunca elementos quadrados de canto reto, nunca `rounded-full` fora de avatar/badge/dot.

- **`rounded-full`**: badge, chip, avatar, dot de status ao vivo (usado com `animate-ping` para indicadores em tempo real).
- **`rounded-md`** (~6-8px): botão, input, elemento de formulário compacto.
- **`rounded-lg`** (~10-12px): a unidade mais usada do sistema (1.173 ocorrências) — botão maior, card compacto, dropdown.
- **`rounded-xl`**/**`rounded-2xl`** (~14-20px): card de dashboard, container de seção — a superfície mais nova do produto tende para `rounded-2xl` como radius padrão de card.

## Components

### Buttons
- **Shape:** `rounded-md` (padrão) a `rounded-lg` (variantes maiores).
- **Primary:** fundo `emerald-600`, texto branco, `px-4 py-2 text-sm font-medium`, `shadow-sm`. Na Home institucional, o primário usa gradiente `from-green-600 to-emerald-600` — variação de marca dentro da mesma família de cor, não mais uma exceção de cor diferente.
- **Hover/Focus:** `hover:bg-emerald-700`, anel de foco `focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2`.
- **Outline/Ghost:** fundo branco/transparente, texto e borda `emerald-600`, `hover:bg-emerald-50`.

### Badges / Status Pills
- **Style:** `inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ring-1`, seguindo sempre a fórmula tint-shade-ring (ver Named Rule em Colors). Componente central: `components/ui/Badge.tsx`, com variantes green/yellow/red/blue/gray — `blue` aqui é status "processando", papel semântico, não ação.
- **Uso:** `StatusBadge` mapeia estados de domínio (enviado/agendado/falhou/processando) para as cores semânticas — nunca cor arbitrária por tela.

### Cards / Containers
- **Corner Style:** `rounded-lg` a `rounded-2xl` dependendo da geração do componente (ver Overview).
- **Background:** branco sólido sobre fundo `gray-50`.
- **Shadow Strategy:** ver Elevation & Depth — `shadow-sm` em repouso, `hover:shadow-md`.
- **Border:** `border border-gray-100` a `border-gray-200`, por vezes reforçada com `border-l-4` colorido para indicar categoria/urgência em cards de lista.
- **Internal Padding:** `p-4` (compacto) a `p-5`/`p-6` (dashboard mais recente).
- **Ícone padrão** (`CardHeader`): `text-emerald-600` — segue a cor de marca/ação, não mais azul.

### Inputs / Fields
- **Style:** fundo branco, `border border-gray-300`, `rounded-lg`, `shadow-sm`, label em `font-medium text-gray-700` acima do campo.
- **Focus:** `focus:ring-2 focus:ring-emerald-500 focus:border-transparent` — mesma cor de marca/ação em todo o sistema (`Input`, `InputCurrency`, `TextArea`, `SearchInput`, `Select`).
- **Error/Disabled:** não há um padrão único observado consistentemente; recomenda-se seguir a fórmula tint-shade-ring com vermelho ao introduzir estado de erro em campo novo.

### Navigation
- **Style:** header fixo (`sticky top-0 z-50`) em esmeralda sólido, texto branco, ícone colorido por categoria de menu (roxo=Gestão, âmbar=Agenda, verde=Financeiro, ciano=Vendas&Marketing, laranja=Sistema).
- **Default/Active:** item inativo em branco/`!text-white`; item ativo em `bg-emerald-100 text-emerald-700` — consistente com a cor de marca/ação em todo o sistema, desktop e mobile (mobile usa `bg-emerald-600 text-white` no item ativo — mesma família, saturação maior por estar sobre fundo já colorido).
- **Contadores:** badge circular pequena (`rounded-full`, `text-xs font-bold`, fundo `red-500` ou `amber-100`/`red-100`) sobreposta ao item de menu para pendências.

### Skeleton / Loading
- **Style:** blocos `bg-gray-100`/`bg-gray-50` com `animate-pulse`, mesmo raio do componente real que estão substituindo (`rounded-lg`/`rounded-xl`/`rounded-full` conforme o alvo). Todo dashboard de dado pesado (financeiro, agenda) tem um esqueleto dedicado — não um spinner genérico. Spinner padrão (`LoadingSpinner`/`ModalSpinner`) usa `border-emerald-600`/`border-emerald-500`, override por prop `color` quando necessário.

### Painel de Instrumentos do Hero (Home institucional)
- **O quê:** card branco flutuante (`rounded-2xl border border-gray-100 shadow-xl`, `HeroInstrumentPanel.tsx`) sobreposto ao gradiente verde-esmeralda do hero da Home, simulando uma prévia real do produto: lista de agenda do dia com badges de status na fórmula tint-shade-ring, dot "ao vivo" (`animate-ping`, mesmo padrão de indicador em tempo real do dashboard) e um KPI de faturamento que conta de R$0 até o valor final ao montar (`tabular-nums`).
- **Entrada:** cada bloco do card (dot, cada linha de agenda, o rodapé de KPI) entra em cascata — `opacity 0→1` + `translateY(14px)→0` + leve `scale`, com atraso individual via a variável CSS `--panel-delay` (`panel-rise` keyframes, `front/src/index.css`). É o único momento de entrada animada do sistema hoje — reservado a este card, não um padrão para replicar em toda tela nova sem motivo (ver The One Authored Moment Rule).
- **Reduced motion:** o estado base (sem animação) já é o estado final visível; o estado inicial oculto + a animação só existem dentro de `@media (prefers-reduced-motion: no-preference)`, então quem pede menos movimento nunca vê o card "aparecer" — ele já está lá, sem precisar de um caminho de JS separado. O contador de R$ segue a mesma regra via `matchMedia('(prefers-reduced-motion: reduce)')` em JS, pulando direto para o valor final.

### Named Rules
**The One Authored Moment Rule.** Animação de entrada (fade + translate + stagger) é reservada a um único momento por tela — hoje, o Painel de Instrumentos do hero da Home. Não é o padrão default para todo card/lista novos; adicionar em outro lugar exige a mesma justificativa (o elemento é o "momento" daquela tela), senão vira ruído.

## Do's and Don'ts

### Do:
- **Do** seguir a fórmula tint-shade-ring (`{cor}-50/100` fundo, `{cor}-600/700` texto, `{cor}-200` borda) para qualquer novo badge ou alerta de status.
- **Do** usar esmeralda (`emerald-600`) como cor de foco/ação em qualquer componente de formulário ou navegação interna novo — é a única cor de marca/ação do sistema.
- **Do** manter `text-sm`/`text-xs` como corpo padrão de qualquer tela operacional nova — reservar `text-lg`+ para título de página ou KPI.
- **Do** usar `border-gray-100`/`200` + `shadow-sm` como par padrão de elevação em repouso, subindo para `shadow-md` só no hover.
- **Do** tratar a superfície de dashboard mais recente (`rounded-2xl`, `border-gray-100`, `p-5`, ícone em quadrado tintado `rounded-xl bg-{cor}-100`) como a referência visual para telas novas, não os componentes mais antigos do `components/ui`.
- **Do** manter `md:` (768px) como o breakpoint de colapso do menu principal — não subir para `lg:` (1024px), já testado e revertido.
- **Do** dar a qualquer nova animação de entrada um estado base já visível, ativando o estado oculto + a animação só sob `@media (prefers-reduced-motion: no-preference)` — o padrão estabelecido pelo Painel de Instrumentos do hero, não uma checagem de `matchMedia` em JS por padrão.

### Don't:
- **Don't** usar azul (ou qualquer outra cor) como cor de ação/foco genérica — azul é reservado a papéis semânticos específicos (Convênio, status "processando", ícone de seção do menu).
- **Don't** usar cor sólida `-500`/`-600` como fundo de badge/chip — isso quebra a fórmula tint-shade-ring e destoa visualmente do resto do sistema.
- **Don't** introduzir uma nova fonte customizada — a pilha de sistema é deliberada para uma ferramenta interna de uso prolongado, não uma decisão em aberto.
- **Don't** desenhar para um público externo/anônimo — o sistema não tem uso comercial público; toda decisão de UX deve otimizar para o operador interno que já conhece o produto, não para conversão ou primeira impressão.
