// Comportamento comum dos modais de relatório (anamnese, escolar, médico):
// - edição: abre já preenchido com o relatório salvo;
// - criação: guarda rascunho neste navegador enquanto digita e recupera se a página cair;
// - fechar (X, Cancelar, fundo ou Esc) com algo preenchido pede confirmação.
// O rascunho é apagado sempre que o modal fecha (salvo ou descartado).
import { useCallback, useEffect, useRef } from 'react';
import { confirmDialog } from '../../../ui/ConfirmHost';
import { toast } from '../../../../utils/toast';

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Preenche o formulário vazio com o que veio salvo, sem perder campos novos do formulário. */
export function mergeInto<T>(blank: T, saved: unknown): T {
    if (!isObj(blank) || !isObj(saved)) return (saved ?? blank) as T;
    const out: Record<string, unknown> = { ...blank };
    for (const k of Object.keys(blank)) {
        const v = saved[k];
        if (v === undefined || v === null) continue;
        const b = blank[k];
        if (isObj(b)) out[k] = mergeInto(b, v);
        // Campo de data (yyyy-mm-dd) que voltou do banco como ISO completo.
        else if (typeof b === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b) && typeof v === 'string') out[k] = v.slice(0, 10);
        else out[k] = v;
    }
    return out as T;
}

interface Opts<T> {
    open: boolean;
    draftKey: string;
    formData: T;
    setFormData: (v: T) => void;
    /** Conteúdo salvo do relatório quando é edição. */
    editData?: unknown;
    onClose: () => void;
    onOpen?: () => void;
}

export function useReportDraft<T>({ open, draftKey, formData, setFormData, editData, onClose, onOpen }: Opts<T>) {
    const blankRef = useRef(formData);
    const baselineRef = useRef('');
    const confirmingRef = useRef(false);
    const wasOpen = useRef(false);
    const isEdit = editData != null;

    const read = () => { try { const raw = localStorage.getItem(draftKey); return raw ? JSON.parse(raw) : null; } catch { return null; } };
    const clear = () => { try { localStorage.removeItem(draftKey); } catch { /* sem storage */ } };

    useEffect(() => {
        if (open && !wasOpen.current) {
            let next = blankRef.current;
            if (isEdit) next = mergeInto(blankRef.current, editData);
            else {
                const draft = read();
                if (draft) { next = mergeInto(blankRef.current, draft); toast.info('Rascunho recuperado deste navegador.'); }
            }
            setFormData(next);
            baselineRef.current = JSON.stringify(isEdit ? next : blankRef.current);
            onOpen?.();
        }
        if (!open && wasOpen.current && !isEdit) clear();
        wasOpen.current = open;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const dirty = open && baselineRef.current !== '' && JSON.stringify(formData) !== baselineRef.current;

    useEffect(() => {
        if (!open || isEdit || !dirty) return;
        const t = setTimeout(() => { try { localStorage.setItem(draftKey, JSON.stringify(formData)); } catch { /* cheio ou bloqueado */ } }, 600);
        return () => clearTimeout(t);
    }, [open, isEdit, dirty, draftKey, formData]);

    const requestClose = useCallback(async () => {
        if (confirmingRef.current) return;
        if (!dirty) { onClose(); return; }
        confirmingRef.current = true;
        const ok = await confirmDialog(
            isEdit ? 'As alterações feitas neste relatório não serão salvas.' : 'O que você preencheu será descartado.',
            { title: 'Fechar sem salvar?', confirmText: 'Descartar', cancelText: 'Continuar editando' },
        );
        confirmingRef.current = false;
        if (ok) { if (!isEdit) clear(); onClose(); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dirty, isEdit, onClose]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !confirmingRef.current) { e.preventDefault(); requestClose(); } };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, requestClose]);

    return { requestClose, isEdit };
}
