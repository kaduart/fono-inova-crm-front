import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { AnalyticsRanking, categoryLabel } from './AnalyticsVisuals';
import { LandingPagePerformance } from './LandingPagePerformance';

describe('Analytics: leitura fiel dos dados', () => {
  it('ordena todos os resultados antes de limitar os dez, sem alterar os dados de origem', () => {
    const items = Array.from({ length: 11 }, (_, i) => ({ id: String(i), label: `Página ${i}`, value: i + 1 }));
    render(<AnalyticsRanking items={items} unit="views" empty="Sem dados" />);
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(10);
    expect(within(rows[0]).getByText('Página 10')).toBeInTheDocument();
    expect(items[0].label).toBe('Página 0');
  });

  it('não apresenta uma página vencedora ou conversão positiva quando não há tráfego', () => {
    render(<LandingPagePerformance pages={[]} />);
    expect(screen.getByText('Sem tráfego registrado')).toBeInTheDocument();
    expect(screen.getByText('Sem tráfego para avaliar')).toBeInTheDocument();
    expect(screen.getByText('Sem conversões elegíveis')).toBeInTheDocument();
  });

  it('transforma identificadores técnicos em rótulos legíveis', () => {
    expect(categoryLabel('terapia_ocupacional')).toBe('Terapia ocupacional');
    expect(categoryLabel('')).toBe('Sem categoria');
  });
});
