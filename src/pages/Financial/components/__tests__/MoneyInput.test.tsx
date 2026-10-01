import { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MoneyInput, parseMoneyText } from '../formKit';

const Harness = ({ initial = '' }: { initial?: string }) => {
  const [v, setV] = useState(initial);
  return (
    <>
      <MoneyInput value={v} onChange={setV} />
      <output data-testid="raw">{v}</output>
    </>
  );
};

const input = () => screen.getByPlaceholderText('0,00') as HTMLInputElement;
const raw = () => screen.getByTestId('raw').textContent;
// digita um caractere "no fim", como o usuário faria
const type = (digit: string) => fireEvent.change(input(), { target: { value: input().value + digit } });

describe('MoneyInput', () => {
  it('digitação entra pela direita (estilo app de banco)', () => {
    render(<Harness />);
    type('7');
    expect(input().value).toBe('0,07');
    type('5');
    expect(input().value).toBe('0,75');
    type('0');
    expect(input().value).toBe('7,50');
    type('0'); type('0'); type('0');
    expect(input().value).toBe('7.500,00');
    expect(raw()).toBe('7500.00');
  });

  it('mostra valor existente formatado (edição) e mantém decimal limpo no estado', () => {
    render(<Harness initial="7500" />);
    expect(input().value).toBe('7.500,00');
  });

  it('apagar um dígito remove da direita', () => {
    render(<Harness initial="7500" />);
    fireEvent.change(input(), { target: { value: '7.500,0' } }); // backspace no último dígito
    expect(input().value).toBe('750,00');
    expect(raw()).toBe('750.00');
  });

  it('apagar tudo limpa o campo (estado vazio, para a validação do modal barrar)', () => {
    render(<Harness initial="12.5" />);
    fireEvent.change(input(), { target: { value: '' } });
    expect(input().value).toBe('');
    expect(raw()).toBe('');
  });

  it('ignora letras e símbolos digitados', () => {
    render(<Harness />);
    fireEvent.change(input(), { target: { value: 'abc12x3' } });
    expect(raw()).toBe('1.23');
  });

  it('limita o tamanho (sem estourar em notação científica)', () => {
    render(<Harness />);
    fireEvent.change(input(), { target: { value: '9'.repeat(30) } });
    expect(raw()).toBe('999999999.99');
  });
});

describe('parseMoneyText (colar)', () => {
  it.each([
    ['1.234,56', '1234.56'],
    ['1234,5', '1234.50'],
    ['1234.56', '1234.56'],
    ['1.234', '1234.00'],
    ['7500', '7500.00'],
    ['R$ 7.500,00', '7500.00'],
    ['abc', ''],
  ])('"%s" → "%s"', (text, expected) => {
    expect(parseMoneyText(text)).toBe(expected);
  });
});
