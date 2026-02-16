// src/components/patient/InsuranceLowBalanceAlert.jsx
import React, { useMemo } from 'react';
import { Alert, AlertTitle, Box, Typography, Chip, Button } from '@mui/material';
import { AlertTriangle, Calendar, ExternalLink } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useInsuranceGuides } from '../../hooks/useInsuranceGuides';

/**
 * Componente de alerta para saldos baixos ou guias próximas da expiração
 *
 * Exibe avisos quando:
 * - Saldo de sessões está baixo (≤ 5 sessões)
 * - Guia está próxima de expirar (≤ 7 dias)
 * - Guia vai expirar com saldo não utilizado
 */
const InsuranceLowBalanceAlert = ({
  patientId,
  specialty,
  threshold = 5,
  expirationThreshold = 7,
  onNavigateToGuides
}) => {
  const { guides, balance, isLoading } = useInsuranceGuides(
    patientId,
    { specialty, status: 'active' },
    true
  );

  // Analisar guias para identificar alertas
  const alerts = useMemo(() => {
    if (!guides || guides.length === 0) return [];

    const warnings = [];

    guides.forEach(guide => {
      const daysUntilExpiration = differenceInDays(parseISO(guide.expiresAt), new Date());
      const hasLowBalance = guide.remaining <= threshold && guide.remaining > 0;
      const isExpiringSoon = daysUntilExpiration <= expirationThreshold && daysUntilExpiration >= 0;
      const willExpireWithBalance = isExpiringSoon && guide.remaining > 0;

      // Alerta crítico: vai expirar com saldo
      if (willExpireWithBalance) {
        warnings.push({
          type: 'critical',
          guide,
          daysLeft: daysUntilExpiration,
          message: `Guia #${guide.number} expira em ${daysUntilExpiration} dia(s) com ${guide.remaining} sessão(ões) não utilizada(s)`
        });
      }
      // Alerta de aviso: saldo baixo
      else if (hasLowBalance) {
        warnings.push({
          type: 'warning',
          guide,
          daysLeft: daysUntilExpiration,
          message: `Guia #${guide.number} possui apenas ${guide.remaining} sessão(ões) restante(s)`
        });
      }
      // Alerta informativo: expirando em breve
      else if (isExpiringSoon) {
        warnings.push({
          type: 'info',
          guide,
          daysLeft: daysUntilExpiration,
          message: `Guia #${guide.number} expira em ${daysUntilExpiration} dia(s)`
        });
      }
    });

    // Ordenar por criticidade: critical > warning > info
    warnings.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return order[a.type] - order[b.type];
    });

    return warnings;
  }, [guides, threshold, expirationThreshold]);

  // Alerta de saldo total baixo
  const totalBalanceLow = balance && balance.remaining <= threshold && balance.remaining > 0;

  // Não exibir se estiver carregando ou sem alertas
  if (isLoading || (alerts.length === 0 && !totalBalanceLow)) {
    return null;
  }

  // Determinar severidade do alerta principal
  const getSeverity = () => {
    if (alerts.some(a => a.type === 'critical')) return 'error';
    if (alerts.some(a => a.type === 'warning') || totalBalanceLow) return 'warning';
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
      {alerts.length > 0 && (
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
            {alerts.length === 1 ? 'Atenção necessária' : `${alerts.length} guias requerem atenção`}
          </AlertTitle>

          <Box className="space-y-2 mt-2">
            {alerts.map((alert, index) => (
              <Box
                key={`${alert.guide._id}-${index}`}
                className="p-2 bg-white bg-opacity-50 rounded"
              >
                <Box className="flex items-start justify-between gap-2">
                  <Box className="flex-1">
                    <Typography variant="body2" className="font-medium mb-1">
                      {alert.message}
                    </Typography>
                    <Box className="flex items-center gap-2 flex-wrap">
                      <Chip
                        label={alert.guide.insurance.split('-').map(w =>
                          w.charAt(0).toUpperCase() + w.slice(1)
                        ).join(' ')}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        icon={<Calendar className="w-3 h-3" />}
                        label={`Validade: ${format(parseISO(alert.guide.expiresAt), 'dd/MM/yyyy', { locale: ptBR })}`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={`${alert.guide.remaining}/${alert.guide.totalSessions} sessões`}
                        size="small"
                        variant="outlined"
                        color={
                          alert.type === 'critical' ? 'error' :
                          alert.type === 'warning' ? 'warning' :
                          'default'
                        }
                      />
                    </Box>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>

          {/* Sugestões */}
          {alerts.some(a => a.type === 'critical') && (
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
  const { guides, balance } = useInsuranceGuides(
    patientId,
    { specialty, status: 'active' },
    true
  );

  const alertCount = useMemo(() => {
    if (!guides || guides.length === 0) return 0;

    let count = 0;
    guides.forEach(guide => {
      const daysUntilExpiration = differenceInDays(parseISO(guide.expiresAt), new Date());
      const hasLowBalance = guide.remaining <= 5 && guide.remaining > 0;
      const isExpiringSoon = daysUntilExpiration <= 7 && daysUntilExpiration >= 0;

      if (hasLowBalance || isExpiringSoon) {
        count++;
      }
    });

    return count;
  }, [guides]);

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
