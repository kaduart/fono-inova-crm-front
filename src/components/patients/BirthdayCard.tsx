import {
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Chip,
    CircularProgress,
    IconButton,
    Tooltip,
    Typography
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    Bell,
    Cake,
    Calendar,
    CalendarDays,
    Check,
    Gift,
    Mail,
    MessageCircle,
    PhoneCall
} from 'lucide-react';
import { useState } from 'react';
import { toast } from '../../utils/toast';
import { sendBirthdayMessage } from '../../services/whatsappService';

export interface BirthdayPatient {
    _id: string;
    fullName: string;
    dateOfBirth: string;
    phone?: string;
    email?: string;
    /** Calculado no backend: já recebeu o parabéns neste ano (manual ou automático). */
    birthdayMessageSent?: boolean;
}

interface BirthdayCardProps {
    patients?: BirthdayPatient[];
    /** Chamado após um envio bem-sucedido (ou "já enviado"), para o pai recarregar a contagem. */
    onSent?: () => void;
}

const BirthdayCard = ({ patients = [], onSent }: BirthdayCardProps) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedPatient, setSelectedPatient] = useState<BirthdayPatient | null>(null);
    const [sendingId, setSendingId] = useState<string | null>(null);
    // Pacientes que acabaram de receber o parabéns (a trava de verdade fica no backend; isto só
    // evita novo clique antes de a lista recarregar).
    const [sentIds, setSentIds] = useState<Set<string>>(new Set());
    // 🎯 (2026-09-22) Pedido do usuário: card de dashboard deve abrir mostrando só quem
    // faz aniversário HOJE, não o mês inteiro (isso é o que gerava a confusão da tela
    // cheia de nomes "PASSOU" com o aniversariante do dia escondido no meio). "Todo mês"
    // continua disponível a um clique pra quem quiser planejar a semana.
    const [viewMode, setViewMode] = useState('today'); // 'today' or 'month'

    const today = new Date();
    
    // Debug log
    console.log('🎂 BirthdayCard recebeu:', { patientsCount: patients?.length || 0 });

    // Se não houver pacientes, retorna mensagem
    if (!patients || patients.length === 0) {
        return (
            <Box sx={{ textAlign: 'center', p: 4, color: 'text.secondary' }}>
                <Cake size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                <Typography variant="body1">Nenhum aniversariante hoje</Typography>
            </Box>
        );
    }

    // 🐛 FIX (2026-09-22): dateOfBirth não tem semântica de horário — é gravado como meia-noite
    // UTC representando o dia pretendido (ver mesmo fix em back/routes/patient.js). Ler com
    // getDate()/getMonth() locais em Brasília (UTC-3) volta pro dia anterior — quem faz
    // aniversário hoje aparecia como "PASSOU" de ontem, e o card nunca acendia o badge "HOJE"
    // mesmo com o resumo do dashboard (DashboardContentOptimized.tsx) contando certo.
    // Sempre usar getUTC*/format com o horário zerado em UTC, nunca o Date local.
    const getUtcDayMonth = (dateString: string) => {
        const d = new Date(dateString);
        return { day: d.getUTCDate(), month: d.getUTCMonth() };
    };

    // 🎂 Função para formatar a data de nascimento
    const formatBirthday = (dateString: string) => {
        const { day, month } = getUtcDayMonth(dateString);
        // date-fns `format()` lê os getters LOCAIS do Date — construir com o construtor local
        // (ano/mês/dia, não uma string ISO) evita reaplicar o fuso por cima do dia já extraído
        // em UTC acima. Ano fixo e arbitrário: só exibimos "d 'de' MMMM", nunca o ano.
        const date = new Date(2001, month, day);
        return format(date, "d 'de' MMMM", { locale: ptBR });
    };

    // Função para calcular idade
    const getAge = (dateString: string) => {
        const { day, month } = getUtcDayMonth(dateString);
        const birthYear = new Date(dateString).getUTCFullYear();
        let age = today.getFullYear() - birthYear;
        const monthDiff = today.getMonth() - month;

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
            age--;
        }

        return age;
    };

    // 🎯 Lista completa de aniversariantes do mês
    const birthdayPatients = patients.filter((patient) => {
        if (!patient.dateOfBirth) return false;
        const { month } = getUtcDayMonth(patient.dateOfBirth);
        return month === today.getMonth();
    });

    // 🔔 Lista padrão: só quem faz aniversário hoje
    const todayBirthdays = birthdayPatients.filter(patient => {
        const { day, month } = getUtcDayMonth(patient.dateOfBirth);
        return day === today.getDate() && month === today.getMonth();
    });

    const patientsToShow = viewMode === 'month' ? birthdayPatients : todayBirthdays;

    // 🎛️ Ações do menu
    const handleMenuOpen = (event, patient) => {
        setAnchorEl(event.currentTarget);
        setSelectedPatient(patient);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedPatient(null);
    };

    // 💬 Parabéns pelo WhatsApp da clínica, no número cadastrado (mesmo canal da agenda).
    // O backend só envia no dia do aniversário e 1x por ano — e é o mesmo serviço do cron das 10h.
    const handleSendBirthdayMessage = async (patient: BirthdayPatient) => {
        if (!patient?.phone) {
            toast.error('Paciente sem telefone cadastrado');
            return;
        }
        if (sendingId) return;

        const firstName = patient.fullName.split(' ')[0];
        setSendingId(patient._id);
        try {
            await sendBirthdayMessage(patient._id);
            setSentIds(prev => new Set(prev).add(patient._id));
            toast.success(`🎂 Mensagem enviada para ${firstName}!`);
            onSent?.();
        } catch (err: any) {
            if (err?.response?.status === 409) {
                // já enviada (cron das 10h ou outro clique): só reflete na tela
                setSentIds(prev => new Set(prev).add(patient._id));
                toast.info(`A mensagem de ${firstName} já tinha sido enviada hoje.`);
                onSent?.();
            } else {
                toast.error(err?.response?.data?.message || err?.message || 'Erro ao enviar mensagem');
            }
        } finally {
            setSendingId(null);
        }
    };

    const handleScheduleAppointment = () => {
        if (!selectedPatient) return;
        handleMenuClose();
    };

    // Componente estilizado para o badge "Hoje" - CORRIGIDO
    const TodayBadge = styled('div')(({ theme }) => ({
        position: 'absolute',
        top: '0',
        right: '0',
        backgroundColor: '#FFA000',
        color: theme.palette.common.white,
        borderRadius: '0 14px 0 10px',
        fontSize: '0.65rem',
        fontWeight: 'bold',
        padding: '4px 8px',
        zIndex: 2, // Aumentado para ficar acima de outros elementos
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        transform: 'translate(0, 0)'
    }));

    return (

        <Card sx={{
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '16px',
            boxShadow: '0 10px 20px rgba(0,0,0,0.08), 0 6px 6px rgba(0,0,0,0.05)',
            background: 'linear-gradient(145deg, #ffffff, #f8f9fa)',
            border: '1px solid rgba(0,0,0,0.03)',
            overflow: 'hidden',
            height: '100%'
        }}>
            <CardHeader
                title={
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <Box sx={{
                            background: 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)',
                            borderRadius: '12px',
                            padding: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                        }}>
                            <Cake size={24} color="#fff" />
                        </Box>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#2d3748' }}>
                                Aniversariantes {viewMode === 'today' ? 'de Hoje' : 'do Mês'}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#718096', mt: '2px' }}>
                                {viewMode === 'today'
                                    ? format(today, "d 'de' MMMM", { locale: ptBR })
                                    : format(today, 'MMMM', { locale: ptBR })
                                } – {patientsToShow.length} {patientsToShow.length === 1 ? 'paciente' : 'pacientes'}
                            </Typography>
                        </Box>
                    </Box>
                }
                action={
                    <Box sx={{ display: 'flex', gap: '8px' }}>
                        <Tooltip title={viewMode === 'today' ? "Ver todo o mês" : "Ver só hoje"}>
                            <IconButton
                                aria-label={viewMode === 'today' ? "Ver todo o mês" : "Ver só hoje"}
                                onClick={() => setViewMode(viewMode === 'today' ? 'month' : 'today')}
                                sx={{
                                    background: viewMode === 'month' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(0,0,0,0.03)',
                                    borderRadius: '12px',
                                    '&:hover': {
                                        background: 'rgba(0,0,0,0.05)'
                                    }
                                }}
                            >
                                {viewMode === 'today' ?
                                    <CalendarDays size={20} color="#4A5568" /> :
                                    <Bell size={20} color="#3B82F6" />
                                }
                            </IconButton>
                        </Tooltip>

                        <Chip
                            label={viewMode === 'today' ? "Hoje" : "Todo mês"}
                            size="small"
                            sx={{
                                fontWeight: 600,
                                background: viewMode === 'today' ? '#DBEAFE' : '#EDF2F7',
                                color: viewMode === 'today' ? '#3B82F6' : '#4A5568'
                            }}
                        />
                    </Box>
                }
                sx={{
                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                    padding: '16px 20px',
                    background: 'transparent'
                }}
            />

            <CardContent sx={{
                flex: 1,
                overflowY: 'auto',
                p: 0,
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.8), rgba(249,250,251,0.8))',
                backgroundSize: '100% 40px',
                backgroundRepeat: 'no-repeat',
                height: '100%'
            }}>
                {patientsToShow.length === 0 ? (
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '300px',
                        p: 3,
                        textAlign: 'center'
                    }}>
                        <Box sx={{
                            background: 'rgba(237, 242, 247, 0.7)',
                            borderRadius: '50%',
                            width: '80px',
                            height: '80px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 2
                        }}>
                            <Gift size={36} color="#A0AEC0" />
                        </Box>
                        <Typography variant="body1" sx={{ fontWeight: 500, color: '#718096', mb: 1 }}>
                            Nenhum aniversariante {viewMode === 'today' ? 'hoje' : 'este mês'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#A0AEC0', maxWidth: '280px' }}>
                            Quando houver pacientes com aniversário, eles aparecerão aqui para celebrarmos juntos!
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'flex-start',
                        p: '16px',
                        gap: '16px',
                        '& > *': {
                            flex: '0 0 calc(33.333% - 11px)',
                            maxWidth: 'calc(33.333% - 11px)',
                            minWidth: '280px'
                        }
                    }}>
                        {patientsToShow.map((patient) => {
                            const { day: dobDay, month: dobMonth } = getUtcDayMonth(patient.dateOfBirth);
                            const isToday = dobDay === today.getDate() && dobMonth === today.getMonth();
                            const isPast = !isToday && dobDay < today.getDate();
                            const age = getAge(patient.dateOfBirth);
                            const alreadySent = sentIds.has(patient._id) || !!patient.birthdayMessageSent;
                            const isSending = sendingId === patient._id;
                            const blockedReason = !isToday
                                ? 'Só é possível enviar no dia do aniversário'
                                : !patient.phone
                                    ? 'Paciente sem telefone cadastrado'
                                    : alreadySent
                                        ? 'Mensagem de aniversário já enviada'
                                        : '';
                            const accent = isToday ? '#F59E0B' : isPast ? '#CBD5E0' : '#93C5FD';

                            return (
                                <Box key={patient._id} sx={{ position: 'relative', opacity: isPast ? 0.55 : 1, transition: 'opacity 0.2s ease', '&:hover': isPast ? { opacity: 0.8 } : {} }}>
                                    <Card
                                        sx={{
                                            width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                                            borderRadius: '16px', p: 0,
                                            background: isToday ? 'linear-gradient(160deg, #FFFBEB 0%, #FEF3C7 100%)' : isPast ? '#F7F8FA' : '#fff',
                                            border: '1px solid rgba(0,0,0,0.06)', borderTop: `4px solid ${accent}`,
                                            boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                                            filter: isPast ? 'grayscale(40%)' : 'none',
                                            transition: 'transform .2s ease, box-shadow .2s ease',
                                            '&:hover': isPast ? {} : { transform: 'translateY(-3px)', boxShadow: '0 10px 22px rgba(0,0,0,0.09)' },
                                        }}
                                    >
                                        {isToday && <TodayBadge>HOJE</TodayBadge>}
                                        {isPast && (
                                            <Box sx={{ position: 'absolute', top: 0, right: 0, background: '#e2e8f0', color: '#718096', borderRadius: '0 0 0 10px', fontSize: '0.62rem', fontWeight: 700, padding: '4px 8px', zIndex: 2, letterSpacing: '0.04em' }}>
                                                PASSOU
                                            </Box>
                                        )}

                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: '18px 16px 12px' }}>
                                            <Avatar sx={{ width: 52, height: 52, flexShrink: 0, bgcolor: isToday ? '#FBBF24' : '#CBD5E0', color: isToday ? '#78350F' : '#4A5568', fontWeight: 700, fontSize: '1.3rem' }}>
                                                {patient.fullName.charAt(0)}
                                            </Avatar>
                                            <Box sx={{ minWidth: 0, flex: 1, pr: isToday || isPast ? 5 : 0 }}>
                                                <Typography title={patient.fullName} sx={{ fontWeight: 700, fontSize: '1.02rem', lineHeight: 1.25, color: '#2D3748', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    {patient.fullName}
                                                </Typography>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', mt: '4px', color: '#718096' }}>
                                                    <Calendar size={14} />
                                                    <Typography variant="body2" sx={{ color: '#718096' }}>{formatBirthday(patient.dateOfBirth)}</Typography>
                                                </Box>
                                            </Box>
                                        </Box>

                                        <Box sx={{ mx: 2, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Chip label={isToday ? `🎂 Faz ${age} anos hoje` : `${age} anos`} size="small"
                                                sx={{ height: 24, fontWeight: 700, fontSize: '0.75rem', background: isToday ? 'rgba(245,158,11,0.18)' : 'rgba(66,153,225,0.15)', color: isToday ? '#92400E' : '#2B6CB0' }} />
                                        </Box>

                                        <Box sx={{ mx: 2, display: 'flex', alignItems: 'center', gap: 1.25, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '12px', p: '8px 12px', minHeight: 44 }}>
                                            <PhoneCall size={16} color={patient.phone ? '#4299E1' : '#CBD5E0'} />
                                            <Typography sx={{ fontWeight: 500, fontSize: '0.95rem', color: patient.phone ? '#2D3748' : '#A0AEC0', fontStyle: patient.phone ? 'normal' : 'italic' }}>
                                                {patient.phone || 'Sem telefone cadastrado'}
                                            </Typography>
                                        </Box>

                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2, mt: 'auto' }}>
                                            <Tooltip title={blockedReason || 'Enviar mensagem de aniversário (WhatsApp)'}>
                                                <span style={{ flex: 1 }}>
                                                    <Button
                                                        fullWidth
                                                        aria-label="Enviar lembrete"
                                                        disabled={!!blockedReason || !!sendingId}
                                                        onClick={() => handleSendBirthdayMessage(patient)}
                                                        startIcon={isSending ? <CircularProgress size={16} color="inherit" /> : alreadySent ? <Check size={16} /> : <MessageCircle size={16} />}
                                                        sx={{
                                                            textTransform: 'none', fontWeight: 700, borderRadius: '10px', py: 0.9,
                                                            color: alreadySent ? '#2F855A' : '#fff',
                                                            background: alreadySent ? 'rgba(72,187,120,0.15)' : '#22A06B',
                                                            '&:hover': { background: alreadySent ? 'rgba(72,187,120,0.2)' : '#1B8A5B' },
                                                            '&.Mui-disabled': { color: alreadySent ? '#2F855A' : '#A0AEC0', background: alreadySent ? 'rgba(72,187,120,0.15)' : '#EDF2F7' },
                                                        }}
                                                    >
                                                        {isSending ? 'Enviando…' : alreadySent ? 'Parabéns enviado' : 'Enviar parabéns'}
                                                    </Button>
                                                </span>
                                            </Tooltip>
                                            {patient.email && (
                                                <Tooltip title="Enviar e-mail">
                                                    <IconButton onClick={() => window.location.href = `mailto:${patient.email}`} sx={{ borderRadius: '10px', background: 'rgba(246,173,85,0.12)', '&:hover': { background: 'rgba(246,173,85,0.25)' } }}>
                                                        <Mail size={18} color="#F6AD55" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Box>
                                    </Card>
                                </Box>
                            );
                        })}
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

export default BirthdayCard;