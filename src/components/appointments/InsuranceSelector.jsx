// src/components/appointments/InsuranceSelector.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  LinearProgress,
  Chip,
  Alert,
  CircularProgress,
  Button
} from '@mui/material';
import {
  Calendar,
  AlertCircle,
  CheckCircle,
  FileText,
  ExternalLink
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getGuides } from '../../services/insuranceGuideApi';

/**
 * Componente para seleção de guia de convênio ao criar agendamento
 *
 * Exibe guias válidas do paciente filtradas por especialidade
 * Permite seleção manual ou automática (FIFO)
 */
const InsuranceSelector = ({
  patientId,
  specialty,
  selectedGuideId,
  onGuideSelect,
  appointmentDate,
  disabled = false
}) => {
  const [guides, setGuides] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Buscar guias válidas quando componente montar ou especialidade mudar
  useEffect(() => {
    if (!patientId || !specialty) {
      setGuides([]);
      return;
    }

    fetchValidGuides();
  }, [patientId, specialty]);

  const fetchValidGuides = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getGuides(patientId, {
        specialty,
        status: 'active'
      });

      // Filtrar apenas guias válidas (ativas, com saldo, não expiradas)
      const validGuides = data.filter(guide => {
        const isActive = guide.status === 'active';
        const hasBalance = guide.remaining > 0;
        const notExpired = new Date(guide.expiresAt) >= new Date();
        return isActive && hasBalance && notExpired;
      });

      // Ordenar por data de expiração (FIFO - mais urgente primeiro)
      validGuides.sort((a, b) => {
        return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
      });

      setGuides(validGuides);

      // Auto-selecionar primeira guia se houver
      if (validGuides.length > 0 && !selectedGuideId) {
        onGuideSelect(validGuides[0]._id);
      } else if (validGuides.length === 0) {
        onGuideSelect(null);
      }
    } catch (err) {
      setError(err.message || 'Erro ao buscar guias');
      setGuides([]);
      onGuideSelect(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuideChange = (event) => {
    onGuideSelect(event.target.value);
  };

  const getDaysUntilExpiration = (expiresAt) => {
    return differenceInDays(parseISO(expiresAt), new Date());
  };

  const getProgressColor = (guide) => {
    const percentage = (guide.remaining / guide.totalSessions) * 100;
    if (percentage <= 20) return '#f59e0b'; // yellow
    if (percentage <= 50) return '#3b82f6'; // blue
    return '#10b981'; // green
  };

  // Estado de loading
  if (isLoading) {
    return (
      <Box className="flex items-center justify-center py-8">
        <CircularProgress size={32} />
        <Typography variant="body2" className="ml-3 text-gray-600">
          Buscando guias disponíveis...
        </Typography>
      </Box>
    );
  }

  // Estado de erro
  if (error) {
    return (
      <Alert severity="error" className="mb-4">
        {error}
        <Button size="small" onClick={fetchValidGuides} className="ml-2">
          Tentar novamente
        </Button>
      </Alert>
    );
  }

  // Nenhuma guia disponível
  if (guides.length === 0) {
    return (
      <Alert severity="warning" icon={<AlertCircle className="w-5 h-5" />}>
        <Typography variant="body2" className="font-medium mb-1">
          Nenhuma guia disponível
        </Typography>
        <Typography variant="caption" className="text-gray-700">
          Este paciente não possui guias ativas de {specialty} com saldo disponível.
          Cadastre uma nova guia ou utilize outro tipo de cobrança.
        </Typography>
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header informativo */}
      <Box className="mb-3">
        <Typography variant="subtitle2" className="font-semibold text-gray-700 mb-1">
          Selecione a Guia de Convênio
        </Typography>
        <Typography variant="caption" className="text-gray-600">
          {guides.length} guia(s) disponível(is) para {specialty}.
          A guia com menor prazo de validade é selecionada automaticamente (FIFO).
        </Typography>
      </Box>

      {/* Lista de guias */}
      <RadioGroup value={selectedGuideId || ''} onChange={handleGuideChange}>
        <Box className="space-y-2">
          {guides.map((guide, index) => {
            const daysLeft = getDaysUntilExpiration(guide.expiresAt);
            const isUrgent = daysLeft <= 7;
            const isRecommended = index === 0; // Primeira = recomendada (FIFO)
            const percentage = (guide.remaining / guide.totalSessions) * 100;

            return (
              <Card
                key={guide._id}
                className={`
                  border-l-4 transition-all
                  ${selectedGuideId === guide._id ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-sm'}
                  ${isRecommended ? 'border-green-500' : 'border-gray-300'}
                  ${disabled ? 'opacity-60' : ''}
                `}
              >
                <CardContent className="py-3">
                  <FormControlLabel
                    value={guide._id}
                    control={<Radio disabled={disabled} />}
                    label={
                      <Box className="flex-1 ml-2">
                        {/* Cabeçalho */}
                        <Box className="flex items-start justify-between mb-2">
                          <Box className="flex items-center gap-2">
                            <Typography variant="body1" className="font-semibold">
                              Guia #{guide.number}
                            </Typography>
                            {isRecommended && (
                              <Chip
                                label="Recomendada"
                                size="small"
                                color="success"
                                icon={<CheckCircle className="w-3 h-3" />}
                              />
                            )}
                            {isUrgent && (
                              <Chip
                                label={`${daysLeft}d restante(s)`}
                                size="small"
                                color="warning"
                                icon={<AlertCircle className="w-3 h-3" />}
                              />
                            )}
                          </Box>
                        </Box>

                        {/* Informações */}
                        <Box className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2">
                          <Box>
                            <Typography variant="caption" className="text-gray-600">
                              Convênio
                            </Typography>
                            <Typography variant="body2" className="font-medium">
                              {guide.insurance.split('-').map(word =>
                                word.charAt(0).toUpperCase() + word.slice(1)
                              ).join(' ')}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" className="text-gray-600">
                              Validade
                            </Typography>
                            <Box className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-gray-500" />
                              <Typography variant="body2" className="font-medium">
                                {format(parseISO(guide.expiresAt), 'dd/MM/yyyy', { locale: ptBR })}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>

                        {/* Barra de progresso */}
                        <Box>
                          <Box className="flex items-center justify-between mb-1">
                            <Typography variant="caption" className="text-gray-700">
                              <strong>{guide.remaining}</strong> de {guide.totalSessions} sessões restantes
                            </Typography>
                            <Typography variant="caption" className="text-gray-600">
                              {percentage.toFixed(0)}%
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={percentage}
                            className="h-1.5 rounded"
                            sx={{
                              backgroundColor: 'rgba(0, 0, 0, 0.1)',
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: getProgressColor(guide)
                              }
                            }}
                          />
                        </Box>

                        {/* Observações */}
                        {guide.notes && (
                          <Box className="mt-2 p-2 bg-gray-50 rounded">
                            <Typography variant="caption" className="text-gray-700">
                              <FileText className="w-3 h-3 inline mr-1" />
                              {guide.notes}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    }
                    className="w-full m-0"
                  />
                </CardContent>
              </Card>
            );
          })}
        </Box>
      </RadioGroup>

      {/* Informação sobre FIFO */}
      {guides.length > 1 && (
        <Alert severity="info" icon={<AlertCircle className="w-5 h-5" />} className="mt-3">
          <Typography variant="caption">
            <strong>Seleção Automática (FIFO):</strong> A guia com menor prazo de validade
            é recomendada para evitar desperdício de sessões por expiração.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default InsuranceSelector;
