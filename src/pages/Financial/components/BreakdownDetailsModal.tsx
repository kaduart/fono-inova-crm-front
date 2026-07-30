// src/pages/Financial/components/BreakdownDetailsModal.tsx
// Modal reutilizável pra detalhar "o que compõe esse número" — usado pelos cards
// do Painel de Convênios (InsuranceTab) e do Resumo do Histórico (InsuranceHistorySection).
import { useEffect, useState } from 'react';
import { Box, Dialog, DialogTitle, DialogContent, Avatar, Typography, IconButton, Chip } from '@mui/material';
import { Close } from '@mui/icons-material';

export interface BreakdownRow {
    id: string;
    label: string;
    sublabel?: string;
    value: number;
    highlight?: boolean;
    highlightLabel?: string;
}

export interface BreakdownTab {
    key: string;
    label: string;
    predicate: (row: BreakdownRow) => boolean;
}

interface BreakdownDetailsModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    accentColor: string;
    rows: BreakdownRow[];
    /** Quando presente, mostra abas (ex: Todos/Atrasado/Mês atual) pra filtrar a lista sem fechar o modal */
    tabs?: BreakdownTab[];
}

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function initialsOf(name: string) {
    return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

export default function BreakdownDetailsModal({ open, onClose, title, accentColor, rows, tabs }: BreakdownDetailsModalProps) {
    const [activeTab, setActiveTab] = useState(tabs?.[0]?.key ?? 'all');

    useEffect(() => {
        if (open) setActiveTab(tabs?.[0]?.key ?? 'all');
    }, [open, tabs]);

    const activePredicate = tabs?.find(t => t.key === activeTab)?.predicate;
    const visibleRows = activePredicate ? rows.filter(activePredicate) : rows;
    const grandTotal = rows.reduce((s, r) => s + r.value, 0);
    const visibleTotal = visibleRows.reduce((s, r) => s + r.value, 0);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
            <Box sx={{ height: 4, background: `linear-gradient(90deg, ${accentColor}, ${accentColor}99)` }} />
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: tabs ? 1 : 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                    <Avatar sx={{ bgcolor: accentColor, width: 38, height: 38, fontSize: '0.8rem', fontWeight: 800, flexShrink: 0 }}>
                        {rows.length}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography fontWeight={800} fontSize="1rem" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {title}
                        </Typography>
                        <Typography fontSize="0.75rem" color="text.secondary">
                            {rows.length} registro{rows.length !== 1 ? 's' : ''} · {fmtBRL(grandTotal)}
                        </Typography>
                    </Box>
                </Box>
                <IconButton onClick={onClose} size="small" sx={{ flexShrink: 0 }}>
                    <Close fontSize="small" />
                </IconButton>
            </DialogTitle>

            {tabs && (
                <Box sx={{ display: 'flex', gap: 0.75, px: 2.5, pb: 1.5, flexWrap: 'wrap' }}>
                    {tabs.map(t => {
                        const count = rows.filter(t.predicate).length;
                        const active = t.key === activeTab;
                        return (
                            <Box
                                key={t.key}
                                onClick={() => setActiveTab(t.key)}
                                sx={{
                                    px: 1.5, py: 0.5, borderRadius: 999, cursor: 'pointer',
                                    fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5,
                                    bgcolor: active ? accentColor : 'action.hover',
                                    color: active ? '#fff' : 'text.secondary',
                                    transition: 'all 0.12s',
                                }}
                            >
                                {t.label}
                                <Box component="span" sx={{ opacity: active ? 0.85 : 0.6 }}>({count})</Box>
                            </Box>
                        );
                    })}
                </Box>
            )}

            <DialogContent sx={{ p: 0, maxHeight: '60vh', borderTop: '1px solid', borderColor: 'divider' }}>
                {visibleRows.length === 0 ? (
                    <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary', fontSize: '0.85rem' }}>
                        Nenhum registro encontrado.
                    </Box>
                ) : (
                    visibleRows.map((r, idx) => (
                        <Box
                            key={r.id}
                            sx={{
                                display: 'flex', alignItems: 'center', gap: 1.5,
                                px: 2.5, py: 1.35,
                                borderBottom: idx < visibleRows.length - 1 ? '1px solid' : 'none',
                                borderColor: 'divider',
                                bgcolor: r.highlight ? 'rgba(239,68,68,0.08)' : 'transparent',
                            }}
                        >
                            <Avatar sx={{
                                width: 30, height: 30, fontSize: '0.62rem', fontWeight: 700, flexShrink: 0,
                                bgcolor: r.highlight ? '#FCA5A5' : `${accentColor}26`,
                                color: r.highlight ? '#7F1D1D' : accentColor,
                            }}>
                                {initialsOf(r.label)}
                            </Avatar>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography fontWeight={600} fontSize="0.85rem" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {r.label}
                                </Typography>
                                {r.sublabel && (
                                    <Typography fontSize="0.71rem" color={r.highlight ? '#DC2626' : 'text.secondary'} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {r.sublabel}
                                    </Typography>
                                )}
                            </Box>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.4, flexShrink: 0 }}>
                                <Typography fontWeight={800} fontSize="0.87rem">{fmtBRL(r.value)}</Typography>
                                {r.highlight && r.highlightLabel && (
                                    <Chip
                                        label={r.highlightLabel}
                                        size="small"
                                        sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700, bgcolor: '#FEE2E2', color: '#DC2626', '& .MuiChip-label': { px: 0.75 } }}
                                    />
                                )}
                            </Box>
                        </Box>
                    ))
                )}
            </DialogContent>

            {visibleRows.length > 0 && (
                <Box sx={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    px: 2.5, py: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'action.hover',
                }}>
                    <Typography fontSize="0.68rem" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {tabs ? `Total (${tabs.find(t => t.key === activeTab)?.label})` : 'Total'}
                    </Typography>
                    <Typography fontWeight={800} fontSize="0.95rem">{fmtBRL(visibleTotal)}</Typography>
                </Box>
            )}
        </Dialog>
    );
}
