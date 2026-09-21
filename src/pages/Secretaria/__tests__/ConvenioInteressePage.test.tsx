import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// MUI (menus, diálogos, tabelas) é pesado no jsdom: o padrão de 5s é curto para a suíte inteira da página
vi.setConfig({ testTimeout: 30000 });
import type { WaitlistEntry, WaitlistListResponse, WaitlistSummary } from '../../../services/convenioWaitlistService';

const api = vi.hoisted(() => ({ list: vi.fn(), summary: vi.fn(), update: vi.fn() }));
vi.mock('../../../services/convenioWaitlistService', () => ({ default: api, convenioWaitlistApi: api }));

const toastMock = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toastMock }));

import ConvenioInteressePage from '../ConvenioInteressePage';

const makeEntry = (overrides: Partial<WaitlistEntry> = {}): WaitlistEntry => ({
  _id: 'e1',
  name: 'Maria da Silva',
  phone: '5562992013573',
  email: 'maria@email.com',
  convenio: 'geap',
  convenioLabel: 'GEAP',
  especialidade: 'Terapia Ocupacional',
  idadeCrianca: 4,
  periodo: 'Manhã',
  status: 'aguardando',
  notifiedAt: null,
  notes: '',
  requestCount: 1,
  submissions: [],
  consent: { accepted: true, acceptedAt: '2026-09-21T15:00:00.000Z', version: 'convenio-interesse-2026-09' },
  source: { pagePath: '/convenio-geap-anapolis' },
  createdAt: '2026-09-18T15:00:00.000Z',
  updatedAt: '2026-09-18T15:00:00.000Z',
  ...overrides,
});

const summary: WaitlistSummary = {
  total: 6,
  porConvenio: {
    geap: { label: 'GEAP', total: 3, aguardando: 2, contatado: 1, agendado: 0, descartado: 0 },
    ipasgo: { label: 'IPASGO', total: 2, aguardando: 1, contatado: 0, agendado: 1, descartado: 0 },
    bradesco: { label: 'Bradesco Saúde', total: 1, aguardando: 1, contatado: 0, agendado: 0, descartado: 0 },
  },
};

const listOf = (data: WaitlistEntry[], extra: Partial<WaitlistListResponse> = {}): WaitlistListResponse => ({
  data,
  total: data.length,
  page: 1,
  limit: 20,
  pages: 1,
  ...extra,
});

const lastListParams = () => api.list.mock.calls[api.list.mock.calls.length - 1][0];

beforeEach(() => {
  vi.clearAllMocks();
  api.summary.mockResolvedValue(summary);
  api.list.mockResolvedValue(listOf([makeEntry(), makeEntry({ _id: 'e2', name: 'Bruno Lima', phone: '5562988887777', convenio: 'ipasgo', convenioLabel: 'IPASGO', email: null })]));
  api.update.mockImplementation(async (id: string, body: object) => ({ ...makeEntry({ _id: id }), ...body }));
});

describe('ConvenioInteressePage', () => {
  it('mostra título, resumo por convênio e a fila por ordem de chegada (aguardando)', async () => {
    render(<ConvenioInteressePage />);

    expect(screen.getByRole('heading', { name: /Interesse em Convênios/ })).toBeInTheDocument();
    expect(await screen.findByText('Maria da Silva')).toBeInTheDocument();
    expect(screen.getByText('Bruno Lima')).toBeInTheDocument();
    expect(screen.getByText('+55 (62) 99201-3573')).toBeInTheDocument();

    expect(lastListParams()).toMatchObject({ status: 'aguardando', order: 'asc', page: 1, limit: 20 });

    // cards: aguardando por convênio + total aguardando (2 + 1 + 1)
    const geapCard = await screen.findByRole('button', { name: 'Filtrar por GEAP' });
    expect(within(geapCard).getByText('2')).toBeInTheDocument();
    expect(within(geapCard).getByText(/1 contatados/)).toBeInTheDocument();
    expect(screen.getByText('Total aguardando').parentElement).toHaveTextContent('4');
    expect(screen.getByText(/6 cadastros no total/)).toBeInTheDocument();
  });

  it('avisa que o cadastro não garante cobertura e que só se deve contatar após o credenciamento', async () => {
    render(<ConvenioInteressePage />);
    expect(await screen.findByText(/O cadastro não garante cobertura ou vaga/)).toBeInTheDocument();
    expect(screen.getByText(/confirmação formal do credenciamento/)).toBeInTheDocument();
  });

  it('botão do WhatsApp abre wa.me com a mensagem pronta, sem prometer atendimento', async () => {
    render(<ConvenioInteressePage />);
    const link = await screen.findByRole('link', { name: 'Abrir WhatsApp de Maria da Silva' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    const href = link.getAttribute('href') as string;
    expect(href.startsWith('https://wa.me/5562992013573?text=')).toBe(true);
    expect(decodeURIComponent(href)).toContain('registrou interesse no convênio GEAP');
  });

  it("'Contatado' atualiza o status no servidor, avisa e recarrega lista e totais", async () => {
    render(<ConvenioInteressePage />);
    await screen.findByText('Maria da Silva');
    const listCalls = api.list.mock.calls.length;
    const summaryCalls = api.summary.mock.calls.length;

    fireEvent.click(screen.getAllByRole('button', { name: 'Contatado' })[0]);

    await waitFor(() => expect(api.update).toHaveBeenCalledWith('e1', { status: 'contatado' }));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalled());
    await waitFor(() => expect(api.list.mock.calls.length).toBeGreaterThan(listCalls));
    await waitFor(() => expect(api.summary.mock.calls.length).toBeGreaterThan(summaryCalls));
  });

  it('descartar exige confirmação antes de chamar a API', async () => {
    render(<ConvenioInteressePage />);
    await screen.findByText('Maria da Silva');

    fireEvent.click(screen.getByRole('button', { name: /Alterar status de Maria da Silva/ }));
    fireEvent.click(await screen.findByRole('menuitem', { name: /Descartado/ }));

    expect(await screen.findByText('Tirar da lista de interesse?')).toBeInTheDocument();
    expect(api.update).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    await waitFor(() => expect(api.update).toHaveBeenCalledWith('e1', { status: 'descartado' }));
  });

  it('cancelar a confirmação não altera nada', async () => {
    render(<ConvenioInteressePage />);
    await screen.findByText('Maria da Silva');
    fireEvent.click(screen.getByRole('button', { name: /Alterar status de Maria da Silva/ }));
    fireEvent.click(await screen.findByRole('menuitem', { name: /Descartado/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));
    expect(api.update).not.toHaveBeenCalled();
  });

  it('erro da API ao mudar status mostra a mensagem do servidor', async () => {
    api.update.mockRejectedValueOnce({ response: { data: { message: 'Já existe outro cadastro ativo deste telefone neste convênio' } } });
    render(<ConvenioInteressePage />);
    await screen.findByText('Maria da Silva');
    fireEvent.click(screen.getAllByRole('button', { name: 'Contatado' })[0]);
    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith('Já existe outro cadastro ativo deste telefone neste convênio'),
    );
  });

  it('clicar no card do convênio filtra e volta para a página 1; clicar de novo remove o filtro', async () => {
    render(<ConvenioInteressePage />);
    await screen.findByText('Maria da Silva');

    fireEvent.click(screen.getByRole('button', { name: 'Filtrar por GEAP' }));
    await waitFor(() => expect(lastListParams()).toMatchObject({ convenio: 'geap', page: 1 }));

    fireEvent.click(screen.getByRole('button', { name: 'Filtrar por GEAP' }));
    await waitFor(() => expect(lastListParams().convenio).toBe(''));
  });

  it('abas de status mostram contagem do resumo e trocam o filtro', async () => {
    render(<ConvenioInteressePage />);
    await screen.findByText('Maria da Silva');

    expect(await screen.findByRole('tab', { name: 'Aguardando (4)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Contatados (1)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Todos (6)' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Todos (6)' }));
    await waitFor(() => expect(lastListParams().status).toBe(''));

    fireEvent.click(screen.getByRole('tab', { name: 'Agendados (1)' }));
    await waitFor(() => expect(lastListParams().status).toBe('agendado'));
  });

  it('busca aplica o termo (sem espaços nas pontas) ao pressionar Enter e volta para a página 1', async () => {
    render(<ConvenioInteressePage />);
    await screen.findByText('Maria da Silva');

    const input = screen.getByPlaceholderText(/Buscar por nome, telefone ou e-mail/);
    fireEvent.change(input, { target: { value: '  bruno  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(lastListParams()).toMatchObject({ search: 'bruno', page: 1 }));
  });

  it('paginação pede a página seguinte ao servidor', async () => {
    api.list.mockResolvedValue(listOf([makeEntry()], { total: 45, pages: 3 }));
    render(<ConvenioInteressePage />);
    await screen.findByText('Maria da Silva');
    expect(screen.getByText('1–20 de 45')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next page|próxima/i }));
    await waitFor(() => expect(lastListParams()).toMatchObject({ page: 2, limit: 20 }));
  });

  it('cabeçalho Cadastro alterna a ordenação (fila ↔ mais recentes)', async () => {
    render(<ConvenioInteressePage />);
    await screen.findByText('Maria da Silva');
    fireEvent.click(screen.getByText('Cadastro'));
    await waitFor(() => expect(lastListParams().order).toBe('desc'));
  });

  it('notas: mostra consentimento/origem, salva só quando muda e envia apenas notes', async () => {
    render(<ConvenioInteressePage />);
    await screen.findByText('Maria da Silva');

    fireEvent.click(screen.getByRole('button', { name: 'Notas de Maria da Silva' }));
    expect(await screen.findByText(/Consentimento de contato e privacidade/)).toBeInTheDocument();
    expect(screen.getByText(/convenio-interesse-2026-09/)).toBeInTheDocument();
    expect(screen.getByText(/Origem: \/convenio-geap-anapolis/)).toBeInTheDocument();

    const save = screen.getByRole('button', { name: 'Salvar' });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Anotações da equipe'), { target: { value: 'Prefere tarde' } });
    expect(save).toBeEnabled();
    fireEvent.click(save);

    await waitFor(() => expect(api.update).toHaveBeenCalledWith('e1', { notes: 'Prefere tarde' }));
  });

  it('cadastro sem consentimento registrado avisa para não contatar', async () => {
    api.list.mockResolvedValue(listOf([makeEntry({ consent: undefined })]));
    render(<ConvenioInteressePage />);
    await screen.findByText('Maria da Silva');
    fireEvent.click(screen.getByRole('button', { name: 'Notas de Maria da Silva' }));
    expect(await screen.findByText(/Sem consentimento registrado — não entre em contato/)).toBeInTheDocument();
  });

  it('estado vazio sem filtros explica de onde vêm os cadastros', async () => {
    api.list.mockResolvedValue(listOf([]));
    api.summary.mockResolvedValue({ ...summary, total: 0 });
    render(<ConvenioInteressePage />);
    expect(await screen.findByText(/Nenhum interesse registrado ainda/)).toBeInTheDocument();
  });

  it('estado vazio com filtro oferece limpar filtros e volta ao padrão', async () => {
    render(<ConvenioInteressePage />);
    await screen.findByText('Maria da Silva');

    api.list.mockResolvedValue(listOf([]));
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar por IPASGO' }));
    expect(await screen.findByText(/Nenhum cadastro encontrado com esses filtros/)).toBeInTheDocument();

    api.list.mockResolvedValue(listOf([makeEntry()]));
    fireEvent.click(screen.getAllByRole('button', { name: 'Limpar filtros' })[0]);
    // volta ao padrão da tela: fila "Aguardando", sem convênio/busca
    await waitFor(() => expect(lastListParams()).toMatchObject({ convenio: '', status: 'aguardando', search: '' }));
  });

  it('sem ninguém aguardando (mas com outros cadastros) não manda "limpar filtros" nem diz que está vazio', async () => {
    api.list.mockResolvedValue(listOf([]));
    render(<ConvenioInteressePage />);
    expect(await screen.findByText('Ninguém aguardando contato no momento.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).not.toBeInTheDocument();
  });

  it('falha ao carregar mostra o erro com "Tentar novamente" e recarrega', async () => {
    api.list.mockRejectedValueOnce({ response: { data: { message: 'Erro ao buscar lista de interesse' } } });
    render(<ConvenioInteressePage />);
    expect(await screen.findByText('Erro ao buscar lista de interesse')).toBeInTheDocument();

    api.list.mockResolvedValue(listOf([makeEntry()]));
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Maria da Silva')).toBeInTheDocument();
  });

  it('falha só no resumo não derruba a lista', async () => {
    api.summary.mockRejectedValue(new Error('timeout'));
    render(<ConvenioInteressePage />);
    expect(await screen.findByText('Maria da Silva')).toBeInTheDocument();
    expect(await screen.findByText('timeout')).toBeInTheDocument();
  });
});
