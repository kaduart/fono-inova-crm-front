import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SegmentedTabs } from './SegmentedTabs';

describe('Abas compartilhadas', () => {
  it('permite escolher com as setas e leva o foco à opção correta', () => {
    const change = vi.fn();
    render(<SegmentedTabs label="Relatórios" value="a" onValueChange={change}
      options={[{ id: 'a', label: 'Resumo' }, { id: 'b', label: 'Detalhes' }]} />);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Resumo' }), { key: 'ArrowRight' });
    expect(change).toHaveBeenCalledWith('b');
    expect(screen.getByRole('tab', { name: 'Detalhes' })).toHaveFocus();
  });
});
