import {
    Avatar,
    Box,
    Card,
    CardContent,
    CardHeader,
    Chip,
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
    Gift,
    Mail,
    PhoneCall
} from 'lucide-react';
import { useState } from 'react';

const BirthdayCard = ({ patients = [] }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedPatient, setSelectedPatient] = useState(null);
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
    const getUtcDayMonth = (dateString) => {
        const d = new Date(dateString);
        return { day: d.getUTCDate(), month: d.getUTCMonth() };
    };

    // 🎂 Função para formatar a data de nascimento
    const formatBirthday = (dateString) => {
        const { day, month } = getUtcDayMonth(dateString);
        // date-fns `format()` lê os getters LOCAIS do Date — construir com o construtor local
        // (ano/mês/dia, não uma string ISO) evita reaplicar o fuso por cima do dia já extraído
        // em UTC acima. Ano fixo e arbitrário: só exibimos "d 'de' MMMM", nunca o ano.
        const date = new Date(2001, month, day);
        return format(date, "d 'de' MMMM", { locale: ptBR });
    };

    // Função para calcular idade
    const getAge = (dateString) => {
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

    const handleSendNotification = () => {
        if (!selectedPatient) return;
        handleMenuClose();
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
                        {patientsToShow.map((patient, index) => {
                            const { day: dobDay, month: dobMonth } = getUtcDayMonth(patient.dateOfBirth);
                            const isToday = dobDay === today.getDate() && dobMonth === today.getMonth();
                            const isPast = !isToday && dobDay < today.getDate();
                            const age = getAge(patient.dateOfBirth);

                            return (
                                <Box key={patient._id} sx={{
                                    position: 'relative',
                                    opacity: isPast ? 0.5 : 1,
                                    transition: 'opacity 0.2s ease',
                                    '&:hover': isPast ? { opacity: 0.75 } : {}
                                }}>
                                    <Card
                                        sx={{
                                            width: '100%',
                                            borderRadius: '14px',
                                            padding: '16px',
                                            background: isToday
                                                ? 'linear-gradient(135deg, rgba(255,249,219,0.6), rgba(255,243,176,0.4))'
                                                : isPast
                                                    ? '#f7f8fa'
                                                    : '#fff',
                                            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                                            border: isPast ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(0,0,0,0.03)',
                                            transition: 'all 0.2s ease',
                                            '&:hover': isPast ? {} : {
                                                transform: 'translateY(-3px)',
                                                boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                                                borderColor: 'rgba(0,0,0,0.05)'
                                            },
                                            position: 'relative',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            overflow: 'visible',
                                            height: '100%',
                                            filter: isPast ? 'grayscale(40%)' : 'none',
                                        }}
                                    >
                                        {isToday && <TodayBadge>HOJE</TodayBadge>}
                                        {isPast && (
                                            <Box sx={{
                                                position: 'absolute',
                                                top: 0,
                                                right: 0,
                                                background: '#e2e8f0',
                                                color: '#718096',
                                                borderRadius: '0 14px 0 10px',
                                                fontSize: '0.62rem',
                                                fontWeight: 700,
                                                padding: '4px 8px',
                                                zIndex: 2,
                                                letterSpacing: '0.04em'
                                            }}>
                                                PASSOU
                                            </Box>
                                        )}


                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                            <Avatar sx={{
                                                width: 56,
                                                height: 56,
                                                bgcolor: isToday ? '#FFD54F' : isPast ? '#E2E8F0' : '#CBD5E0',
                                                color: isToday ? '#7B4F00' : '#4A5568',
                                                fontWeight: 600,
                                                fontSize: '1.4rem',
                                                mr: 2
                                            }}>
                                                {patient.fullName.charAt(0)}
                                            </Avatar>

                                            <Box sx={{ width: 'calc(100% - 72px)' }}>
                                                {/* Nome em linha única com ellipsis */}
                                                <Typography variant="h6" sx={{
                                                    fontWeight: 700,
                                                    color: '#2D3748',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    width: '100%'
                                                }}>
                                                    {patient.fullName}
                                                </Typography>

                                                {/* Linha com data e idade */}
                                                <Box sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    mt: '4px',
                                                    width: '100%'
                                                }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <Calendar size={16} color="#718096" />
                                                        <Typography variant="body2" sx={{ color: '#718096' }}>
                                                            {formatBirthday(patient.dateOfBirth)}
                                                        </Typography>
                                                    </Box>

                                                    <Chip
                                                        label={`${age} anos`}
                                                        size="small"
                                                        sx={{
                                                            height: '22px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 700,
                                                            background: 'rgba(66, 153, 225, 0.15)',
                                                            color: '#2B6CB0',
                                                            ml: 'auto'
                                                        }}
                                                    />
                                                </Box>
                                            </Box>
                                        </Box>

                                        {patient.phone && (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(237, 242, 247, 0.5)', borderRadius: '12px', padding: '10px 14px', mt: 'auto' }}>
                                                <Box sx={{ background: 'rgba(66, 153, 225, 0.1)', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <PhoneCall size={18} color="#4299E1" />
                                                </Box>
                                                <Typography variant="body1" sx={{ fontWeight: 500, color: '#2D3748', fontSize: '1rem' }}>
                                                    {patient.phone}
                                                </Typography>
                                            </Box>
                                        )}

                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: '8px' }}>
                                            <Tooltip title="Enviar lembrete">
                                                <IconButton onClick={() => { setSelectedPatient(patient); handleSendNotification(); }} sx={{ borderRadius: '10px', background: 'rgba(66, 153, 225, 0.1)', '&:hover': { background: 'rgba(66, 153, 225, 0.2)' } }}>
                                                    <Bell size={18} color="#4299E1" />
                                                </IconButton>
                                            </Tooltip>

                                            <Tooltip title="Agendar consulta">
                                                <IconButton onClick={() => { setSelectedPatient(patient); handleScheduleAppointment(); }} sx={{ borderRadius: '10px', background: 'rgba(72, 187, 120, 0.1)', '&:hover': { background: 'rgba(72, 187, 120, 0.2)' } }}>
                                                    <CalendarDays size={18} color="#48BB78" />
                                                </IconButton>
                                            </Tooltip>

                                            {patient.email && (
                                                <Tooltip title="Enviar e-mail">
                                                    <IconButton onClick={() => window.location.href = `mailto:${patient.email}`} sx={{ borderRadius: '10px', background: 'rgba(246, 173, 85, 0.1)', '&:hover': { background: 'rgba(246, 173, 85, 0.2)' } }}>
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