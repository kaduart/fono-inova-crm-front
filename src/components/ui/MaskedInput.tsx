// Campo com máscara (data, hora, telefone…) feito com react-number-format.
// Aceita a mesma prop `mask` do antigo react-input-mask ("99/99/9999", "99:99", "(99) 99999-9999"),
// então serve de troca direta — inclusive como `customInput` do react-datepicker.
import { forwardRef, type InputHTMLAttributes } from 'react';
import { NumberFormatBase, PatternFormat } from 'react-number-format';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'defaultValue' | 'type' | 'size'> & {
  mask: string;
  value?: string | number | null;
};

const MaskedInput = forwardRef<HTMLInputElement, Props>(function MaskedInput({ mask, value, ...rest }, ref) {
  return (
    <PatternFormat
      {...rest}
      format={mask.replace(/9/g, '#')}
      mask="_"
      value={value ?? ''}
      valueIsNumericString={false}
      getInputRef={ref}
    />
  );
});

export default MaskedInput;

/** Valor em R$ que formata enquanto digita; `onValue` recebe o número limpo (ex.: 180.5). */
export const CurrencyInput = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, 'defaultValue' | 'type' | 'size' | 'value'> & {
  value?: number | null;
  onValue?: (v: number | null) => void;
}>(function CurrencyInput({ value, onValue, ...rest }, ref) {
  const fmt = (v: string) => {
    const n = Number(v || '0') / 100;
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  return (
    <NumberFormatBase
      {...rest}
      inputMode="numeric"
      value={value == null ? '' : Math.round(value * 100)}
      valueIsNumericString
      format={fmt}
      removeFormatting={(s) => s.replace(/\D/g, '')}
      onValueChange={(v) => onValue?.(v.value === '' ? null : Number(v.value) / 100)}
      getInputRef={ref}
    />
  );
});
