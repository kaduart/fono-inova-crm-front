// src/components/patient/InsuranceLowBalanceAlert.jsx
import React, { useMemo } from 'react';
import { Alert, AlertTitle, Box, Typography, Chip, Button } from '@mui/material';
import { AlertTriangle, Calendar, ExternalLink } from 'lucide-react';
import { useInsuranceGuides } from '../../hooks/useInsuranceGuides';
import { buildGuidesPresentation } from '../../services/guidePresentationService';

/**
 * Componente de alerta para guias com alertas de ciclo de vida.
 *
 * Regra arquitetural: este componente NÃO calcula saldo, expiração ou urgência.
 * Ele consome apenas `guide.lifecycle` via `GuidePresentationService`.
 */
const InsuranceLowBalanceAlert = ({
  patientId,
  specialty,
  threshold = 5,
  onNavigateToGuides
}) => {
  const { guides, balance, isLoading } = useInsuranceGuides(
    patientId,
    { specialty },
    true
  );

  const presentations = useMemo(() => buildGuidesPresentation(guides), [guides]);

  // Apenas guias que possuem alertas de ciclo de vida
  const alertPresentations = useMemo(() => {
    return presentations
      .filter(p => p.alerts.length > 0)
      .sort((a, b) => {
        const severityOrder = { error: 0, warning: 1, info: 2 };
        const aWorst = Math.min(...a.alerts.map(alert => severityOrder[alert.severity] ?? 2));
        const bWorst = Math.min(...b.alerts.map(alert => severityOrder[alert.severity] ?? 2));
        return aWorst - bWorst;
      });
  }, [presentations]);

  // Alerta de saldo total baixo (dado agregado pelo backend)
  const totalBalanceLow = balance && balance.remaining <= threshold && balance.remaining > 0;

  // Não exibir se estiver carregando ou sem alertas
  if (isLoading || (alertPresentations.length === 0 && !totalBalanceLow)) {
    return null;
  }

  const getSeverity = () => {
    if (alertPresentations.some(p => p.alerts.some(a => a.severity === 'error'))) return 'error';
    if (alertPresentations.some(p => p.alerts.some(a => a.severity === 'warning')) || totalBalanceLow) return 'warning';
    return 'info';
  };

  return (
    <Box className="space-y-2">
      {/* Alerta de saldo total baixo */}
      {totalBalanceLow && (
        <Alert
          severity="warning"
          icon={<AlertTriangle className="w-5 h-5" />}
          action={
            onNavigateToGuides && (
              <Button
                color="inherit"
                size="small"
                onClick={onNavigateToGuides}
                endIcon={<ExternalLink className="w-4 h-4" />}
              >
                Ver guias
              </Button>
            )
          }
        >
          <AlertTitle className="font-semibold">Saldo baixo de sessões</AlertTitle>
          <Typography variant="body2">
            Este paciente possui apenas <strong>{balance.remaining} sessão(ões)</strong> restante(s)
            de {specialty || 'convênio'}. Considere solicitar renovação da guia.
          </Typography>
        </Alert>
      )}

      {/* Alertas individuais por guia */}
      {alertPresentations.length > 0 && (
        <Alert
          severity={getSeverity()}
          icon={<AlertTriangle className="w-5 h-5" />}
          action={
            onNavigateToGuides && (
              <Button
                color="inherit"
                size="small"
                onClick={onNavigateToGuides}
                endIcon={<ExternalLink className="w-4 h-4" />}
              >
                Gerenciar
              </Button>
            )
          }
        >
          <AlertTitle className="font-semibold">
            {alertPresentations.length === 1 ? 'Atenção necessária' : `${alertPresentations.length} guias requerem atenção`}
          </AlertTitle>

          <Box className="space-y-2 mt-2">
            {alertPresentations.map((presentation, index) => {
              const guide = presentation.rawGuide;
              const hasError = presentation.alerts.some(a => a.severity === 'error');
              const hasWarning = presentation.alerts.some(a => a.severity === 'warning');

              return (
                <Box
                  key={`${presentation.id}-${index}`}
                  className="p-2 bg-white bg-opacity-50 rounded"
                >
                  <Box className="flex items-start justify-between gap-2">
                    <Box className="flex-1">
                      <Typography variant="body2" className="font-medium mb-1">
                        {presentation.alerts.map(a => a.message).join(' ')}
                      </Typography>
                      <Box className="flex items-center gap-2 flex-wrap">
                        <Chip
                          label={presentation.insuranceLabel}
                          size="small"
                          variant="outlined"
                        />
                        {presentation.expiryLabel && (
                          <Chip
                            icon={<Calendar className="w-3 h-3" />}
                            label={presentation.expiryLabel}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        <Chip
                          label={`${presentation.remaining}/${presentation.totalSessions} sessões`}
                          size="small"
                          variant="outlined"
                          color={hasError ? 'error' : hasWarning ? 'warning' : 'default'}
                        />
                      </Box>
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>

          {/* Sugestões */}
          {alertPresentations.some(p => p.alerts.some(a => a.severity === 'error')) && (
            <Box className="mt-3 p-2 bg-white bg-opacity-70 rounded">
              <Typography variant="caption" className="font-medium text-gray-800">
                💡 <strong>Sugestão:</strong> Agende as sessões restantes o quanto antes ou
                solicite renovação da guia ao convênio para evitar desperdício.
              </Typography>
            </Box>
          )}
        </Alert>
      )}
    </Box>
  );
};

/**
 * Versão compacta do alerta (apenas contador)
 */
export const InsuranceLowBalanceCount = ({ patientId, specialty, onClick }) => {
  const { guides } = useInsuranceGuides(
    patientId,
    { specialty },
    true
  );

  const presentations = useMemo(() => buildGuidesPresentation(guides), [guides]);

  const alertCount = useMemo(() => {
    return presentations.filter(p => p.alerts.length > 0).length;
  }, [presentations]);

  if (alertCount === 0) return null;

  return (
    <Chip
      icon={<AlertTriangle className="w-4 h-4" />}
      label={`${alertCount} alerta(s)`}
      size="small"
      color="warning"
      onClick={onClick}
      clickable={Boolean(onClick)}
    />
  );
};

export default InsuranceLowBalanceAlert;
