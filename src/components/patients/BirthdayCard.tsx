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
import { format, isThisMonth, parseISO } from 'date-fns';
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

const BirthdayCard = ({ patients }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [viewMode, setViewMode] = useState('month'); // 'month' or 'upcoming'

    const today = new Date();

    // 🎂 Função para formatar a data de nascimento
    const formatBirthday = (dateString) => {
        const date = parseISO(dateString);
        return format(date, "d 'de' MMMM", { locale: ptBR });
    };

    // Função para calcular idade
    const getAge = (dateString) => {
        const today = new Date();
        const birthDate = new Date(dateString);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        return age;
    };

    // 🎯 Lista completa de aniversariantes do mês
    const birthdayPatients = patients.filter((patient) => {
        if (!patient.dateOfBirth) return false;
        const birthday = new Date(patient.dateOfBirth);
        return birthday.getMonth() === today.getMonth();
    });

    // 🔔 Lista reduzida: apenas os que ainda vão fazer aniversário neste mês
    const upcomingBirthdays = birthdayPatients.filter(patient => {
        const dob = new Date(patient.dateOfBirth);
        return dob.getDate() >= today.getDate() && isThisMonth(dob);
    });

    const patientsToShow = viewMode === 'month' ? birthdayPatients : upcomingBirthdays;

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
                                Aniversariantes do Mês
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#718096', mt: '2px' }}>
                                {format(today, 'MMMM', { locale: ptBR })} – {patientsToShow.length} {patientsToShow.length === 1 ? 'paciente' : 'pacientes'}
                            </Typography>
                        </Box>
                    </Box>
                }
                action={
                    <Box sx={{ display: 'flex', gap: '8px' }}>
                        <Tooltip title={viewMode === 'month' ? "Ver próximos aniversários" : "Ver todo o mês"}>
                            <IconButton
                                onClick={() => setViewMode(viewMode === 'month' ? 'upcoming' : 'month')}
                                sx={{
                                    background: viewMode === 'upcoming' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(0,0,0,0.03)',
                                    borderRadius: '12px',
                                    '&:hover': {
                                        background: 'rgba(0,0,0,0.05)'
                                    }
                                }}
                            >
                                {viewMode === 'month' ?
                                    <CalendarDays size={20} color="#4A5568" /> :
                                    <Bell size={20} color="#3B82F6" />
                                }
                            </IconButton>
                        </Tooltip>

                        <Chip
                            label={viewMode === 'month' ? "Todo mês" : "Próximos"}
                            size="small"
                            sx={{
                                fontWeight: 600,
                                background: viewMode === 'month' ? '#EDF2F7' : '#DBEAFE',
                                color: viewMode === 'month' ? '#4A5568' : '#3B82F6'
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
                            Nenhum aniversariante {viewMode === 'upcoming' ? 'nos próximos dias' : 'este mês'}
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
                            const dob = new Date(patient.dateOfBirth);
                            const isToday = dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth();
                            const age = getAge(patient.dateOfBirth);

                            return (
                                <Box key={patient._id} sx={{
                                    position: 'relative'
                                }}>
                                    <Card
                                        sx={{
                                            width: '100%',
                                            borderRadius: '14px',
                                            padding: '16px',
                                            background: isToday
                                                ? 'linear-gradient(135deg, rgba(255,249,219,0.6), rgba(255,243,176,0.4))'
                                                : '#fff',
                                            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                                            border: '1px solid rgba(0,0,0,0.03)',
                                            transition: 'all 0.2s ease',
                                            '&:hover': {
                                                transform: 'translateY(-3px)',
                                                boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                                                borderColor: 'rgba(0,0,0,0.05)'
                                            },
                                            position: 'relative',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            overflow: 'visible',
                                            height: '100%'
                                        }}
                                    >
                                        {isToday && <TodayBadge>HOJE</TodayBadge>}


                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                            <Avatar sx={{
                                                width: 56,
                                                height: 56,
                                                bgcolor: isToday ? '#FFD54F' : '#CBD5E0',
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