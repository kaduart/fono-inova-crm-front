// src/components/appointments/InsuranceSelector.jsx
import React, { useState, useEffect, useMemo } from 'react';
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
  FileText
} from 'lucide-react';
import { getGuides } from '../../services/insuranceGuideApi';
import { buildGuidesPresentation } from '../../services/guidePresentationService';

/**
 * Componente para seleção de guia de convênio ao criar agendamento.
 *
 * Regra arquitetural: este componente NÃO calcula elegibilidade, vencimento
 * ou prioridade. Ele consome apenas `guide.lifecycle` via `GuidePresentationService`.
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

  const presentations = useMemo(() => buildGuidesPresentation(guides), [guides]);

  // Apenas guias elegíveis para agendamento, ordenadas por prioridade
  const selectablePresentations = useMemo(() => {
    return presentations
      .filter(p => p.canSchedule)
      .sort((a, b) => {
        const aUrgent = a.alerts.some(alert => alert.code === 'EXPIRING_SOON') ? 1 : 0;
        const bUrgent = b.alerts.some(alert => alert.code === 'EXPIRING_SOON') ? 1 : 0;
        if (aUrgent !== bUrgent) return bUrgent - aUrgent;
        const aDays = a.daysUntilExpiration ?? Infinity;
        const bDays = b.daysUntilExpiration ?? Infinity;
        return aDays - bDays;
      });
  }, [presentations]);

  // Buscar guias quando componente montar ou especialidade mudar
  useEffect(() => {
    if (!patientId || !specialty) {
      setGuides([]);
      return;
    }

    fetchGuides();
  }, [patientId, specialty]);

  // Auto-selecionar primeira guia elegível
  useEffect(() => {
    if (selectablePresentations.length > 0 && !selectedGuideId) {
      onGuideSelect(selectablePresentations[0].id);
    } else if (selectablePresentations.length === 0) {
      onGuideSelect(null);
    }
  }, [selectablePresentations, selectedGuideId, onGuideSelect]);

  const fetchGuides = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getGuides(patientId, { specialty });
      setGuides(data);
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
        <Button size="small" onClick={fetchGuides} className="ml-2">
          Tentar novamente
        </Button>
      </Alert>
    );
  }

  // Nenhuma guia disponível
  if (selectablePresentations.length === 0) {
    return (
      <Alert severity="warning" icon={<AlertCircle className="w-5 h-5" />}>
        <Typography variant="body2" className="font-medium mb-1">
          Nenhuma guia disponível
        </Typography>
        <Typography variant="caption" className="text-gray-700">
          Este paciente não possui guias elegíveis de {specialty} para agendamento.
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
          {selectablePresentations.length} guia(s) elegível(is) para {specialty}.
          A guia mais urgente é selecionada automaticamente.
        </Typography>
      </Box>

      {/* Lista de guias */}
      <RadioGroup value={selectedGuideId || ''} onChange={handleGuideChange}>
        <Box className="space-y-2">
          {selectablePresentations.map((presentation, index) => {
            const guide = presentation.rawGuide;
            const isRecommended = index === 0;

            return (
              <Card
                key={presentation.id}
                className={`
                  border-l-4 transition-all
                  ${selectedGuideId === presentation.id ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-sm'}
                  ${isRecommended ? 'border-green-500' : 'border-gray-300'}
                  ${disabled ? 'opacity-60' : ''}
                `}
              >
                <CardContent className="py-3">
                  <FormControlLabel
                    value={presentation.id}
                    control={<Radio disabled={disabled} />}
                    label={
                      <Box className="flex-1 ml-2">
                        {/* Cabeçalho */}
                        <Box className="flex items-start justify-between mb-2">
                          <Box className="flex items-center gap-2">
                            <Typography variant="body1" className="font-semibold">
                              Guia #{presentation.number}
                            </Typography>
                            {isRecommended && (
                              <Chip
                                label="Recomendada"
                                size="small"
                                color="success"
                                icon={<CheckCircle className="w-3 h-3" />}
                              />
                            )}
                            {presentation.alerts.map(alert => (
                              <Chip
                                key={alert.code}
                                label={alert.message}
                                size="small"
                                color={alert.severity === 'error' ? 'error' : alert.severity === 'warning' ? 'warning' : 'info'}
                                icon={<AlertCircle className="w-3 h-3" />}
                              />
                            ))}
                          </Box>
                        </Box>

                        {/* Informações */}
                        <Box className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2">
                          <Box>
                            <Typography variant="caption" className="text-gray-600">
                              Convênio
                            </Typography>
                            <Typography variant="body2" className="font-medium">
                              {presentation.insuranceLabel}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" className="text-gray-600">
                              Validade
                            </Typography>
                            <Box className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-gray-500" />
                              <Typography variant="body2" className="font-medium">
                                {presentation.expiryLabel || 'Sem vencimento por data'}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>

                        {/* Barra de progresso */}
                        <Box>
                          <Box className="flex items-center justify-between mb-1">
                            <Typography variant="caption" className="text-gray-700">
                              <strong>{presentation.remaining}</strong> de {presentation.totalSessions} sessões restantes
                            </Typography>
                            <Typography variant="caption" className="text-gray-600">
                              {presentation.progressPct.toFixed(0)}%
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={presentation.progressPct}
                            className="h-1.5 rounded"
                            sx={{
                              backgroundColor: 'rgba(0, 0, 0, 0.1)',
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: presentation.theme.to
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

      {/* Informação sobre seleção automática */}
      {selectablePresentations.length > 1 && (
        <Alert severity="info" icon={<AlertCircle className="w-5 h-5" />} className="mt-3">
          <Typography variant="caption">
            <strong>Seleção Automática:</strong> A guia mais urgente
            é recomendada para evitar desperdício de sessões.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default InsuranceSelector;
