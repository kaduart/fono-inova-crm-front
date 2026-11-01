// Ações em lote reaproveitadas pelas listas (Carteira, Cancelamentos, Recebimentos, Despesas...).
// Só lê o que já está na tela: copiar telefones e baixar planilha. Nada vai para o back.
import { ArrowDown, ArrowUp, ArrowUpDown, Phone } from 'lucide-react';
import React from 'react';
import { toast } from '../../../utils/toast';

export const fmtPhoneBR = (p?: string | null) => {
    const d = String(p || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return p || '';
};

export async function copyPhones(phones: Array<string | null | undefined>) {
    const list = [...new Set(phones.map(fmtPhoneBR).filter(Boolean))];
    if (!list.length) { toast.info('Nenhum dos selecionados tem telefone'); return; }
    try {
        await navigator.clipboard.writeText(list.join('\n'));
        toast.success(`${list.length} telefone(s) copiados`);
    } catch {
        toast.error('Não consegui copiar. Tente de novo.');
    }
}

export function downloadCsv(fileName: string, header: string[], rows: Array<Array<string | number | null | undefined>>) {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const body = [header.map(esc).join(';'), ...rows.map(r => r.map(esc).join(';'))].join('\n');
    const blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const btn = 'inline-flex min-h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200';

export function BatchBar({ count, onCopyPhones, onCsv, onClear, children }: {
    count: number; onCopyPhones?: () => void; onCsv?: () => void; onClear: () => void; children?: React.ReactNode;
}) {
    if (count === 0) return null;
    return (
        <div className="sticky top-16 z-10 mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-900/40 dark:text-emerald-100">
            <b className="tabular-nums">{count} selecionado(s)</b>
            <span className="flex-1" />
            {children}
            {onCopyPhones && <button type="button" onClick={onCopyPhones} className={btn}><Phone size={14} aria-hidden />Copiar telefones</button>}
            {onCsv && <button type="button" onClick={onCsv} className={btn}>Baixar planilha</button>}
            <button type="button" onClick={onClear} className="px-2 text-sm underline">Limpar</button>
        </div>
    );
}

/** Cabeçalho clicável para ordenar (TanStack: column.getToggleSortingHandler / getIsSorted). */
export function SortHeader({ label, sorted, onToggle, className = '' }: {
    label: string; sorted: false | 'asc' | 'desc'; onToggle?: (e: unknown) => void; className?: string;
}) {
    const Icon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown;
    return (
        <button type="button" onClick={onToggle} className={`inline-flex items-center gap-1 uppercase tracking-wide hover:text-gray-800 dark:hover:text-gray-200 ${sorted ? 'text-gray-800 dark:text-gray-200' : ''} ${className}`}
            aria-label={`Ordenar por ${label}`}>
            {label}<Icon size={12} className={sorted ? '' : 'opacity-40'} aria-hidden />
        </button>
    );
}

export const checkboxCls = 'h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500';
