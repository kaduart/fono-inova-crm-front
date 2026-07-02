// src/components/patient/InsuranceBalanceBadge.jsx
import React, { useMemo } from 'react';
import { Box, Chip, Tooltip, CircularProgress } from '@mui/material';
import { Shield, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useInsuranceGuides } from '../../hooks/useInsuranceGuides';
import { buildGuidesPresentation } from '../../services/guidePresentationService';

/**
 * Badge compacto para exibir saldo de guias de convênio.
 *
 * Regra arquitetural: a severidade visual é derivada do ciclo de vida das guias
 * via GuidePresentationService, não calculada localmente a partir de thresholds.
 */
const InsuranceBalanceBadge = ({
  patientId,
  specialty,
  showIcon = true,
  size = 'medium',
  variant = 'filled'
}) => {
  const {
    guides,
    balance,
    isLoadingBalance,
    error
  } = useInsuranceGuides(patientId, { specialty }, true);

  const presentations = useMemo(() => buildGuidesPresentation(guides), [guides]);

  // Estado de loading
  if (isLoadingBalance) {
    return (
      <Chip
        icon={<CircularProgress size={14} />}
        label="..."
        size={size}
        variant="outlined"
      />
    );
  }

  // Estado de erro
  if (error) {
    return (
      <Tooltip title={`Erro ao carregar saldo: ${error}`}>
        <Chip
          icon={showIcon ? <AlertCircle className="w-4 h-4" /> : undefined}
          label="Erro"
          size={size}
          color="error"
          variant="outlined"
        />
      </Tooltip>
    );
  }

  // Nenhuma guia ou sem saldo
  if (!balance || balance.total === 0) {
    return (
      <Tooltip title="Nenhuma guia de convênio cadastrada">
        <Chip
          icon={showIcon ? <XCircle className="w-4 h-4" /> : undefined}
          label="Sem guias"
          size={size}
          color="default"
          variant={variant}
        />
      </Tooltip>
    );
  }

  // Determinar severidade a partir do pior alerta de ciclo de vida
  const getColor = () => {
    const hasError = presentations.some(p => p.alerts.some(a => a.severity === 'error'));
    const hasWarning = presentations.some(p => p.alerts.some(a => a.severity === 'warning'));
    if (hasError) return 'error';
    if (hasWarning) return 'warning';
    return 'success';
  };

  // Determinar ícone
  const getIcon = () => {
    if (!showIcon) return undefined;
    const color = getColor();
    if (color === 'error') return <XCircle className="w-4 h-4" />;
    if (color === 'warning') return <AlertCircle className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  // Mensagem de tooltip
  const getTooltipMessage = () => {
    const guideCount = balance.guides?.length || 0;
    const lines = [
      `Saldo total: ${balance.remaining} de ${balance.total} sessões`,
      `Utilizadas: ${balance.used} sessões`,
      `${guideCount} guia(s) ativa(s)`
    ];

    if (presentations.length > 0) {
      lines.push('');
      lines.push('Guias:');
      presentations.forEach(presentation => {
        const alertLabels = presentation.alerts.map(a => a.message).join(', ');
        lines.push(`• #${presentation.number}: ${presentation.remaining}/${presentation.total}${alertLabels ? ` — ${alertLabels}` : ''}`);
      });
    }

    return lines.join('\n');
  };

  return (
    <Tooltip title={<div style={{ whiteSpace: 'pre-line' }}>{getTooltipMessage()}</div>}>
      <Chip
        icon={getIcon()}
        label={`${balance.remaining} sessões`}
        size={size}
        color={getColor()}
        variant={variant}
      />
    </Tooltip>
  );
};

/**
 * Badge agregado mostrando saldo de múltiplas especialidades
 */
export const InsuranceBalanceSummary = ({ patientId, specialties = [] }) => {
  if (!specialties || specialties.length === 0) {
    return null;
  }

  return (
    <Box className="flex flex-wrap gap-2">
      {specialties.map(specialty => (
        <Box key={specialty} className="flex items-center gap-1">
          <Shield className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-700 capitalize">
            {specialty.replace('-', ' ')}:
          </span>
          <InsuranceBalanceBadge
            patientId={patientId}
            specialty={specialty}
            showIcon={false}
            size="small"
          />
        </Box>
      ))}
    </Box>
  );
};

export default InsuranceBalanceBadge;
