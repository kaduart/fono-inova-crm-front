import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import MaskedInput, { CurrencyInput } from '../MaskedInput';

function Date_() { const [v, setV] = useState(''); return <MaskedInput mask="99/99/9999" value={v} onChange={(e) => setV(e.target.value)} data-testid="d" />; }

describe('MaskedInput', () => {
  it('formata data enquanto digita e repassa o evento onChange', () => {
    const { getByTestId } = render(<Date_ />);
    const el = getByTestId('d') as HTMLInputElement;
    fireEvent.change(el, { target: { value: '01112026' } });
    expect(el.value).toBe('01/11/2026');
  });
  it('CurrencyInput devolve o número limpo', () => {
    const onValue = vi.fn();
    const { getByTestId } = render(<CurrencyInput value={null} onValue={onValue} data-testid="m" />);
    fireEvent.change(getByTestId('m'), { target: { value: '18050' } });
    expect(onValue).toHaveBeenLastCalledWith(180.5);
  });
});
