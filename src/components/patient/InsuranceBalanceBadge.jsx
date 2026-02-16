// src/components/patient/InsuranceBalanceBadge.jsx
import React from 'react';
import { Box, Chip, Tooltip, CircularProgress } from '@mui/material';
import { Shield, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useInsuranceGuides } from '../../hooks/useInsuranceGuides';

/**
 * Badge compacto para exibir saldo de guias de convênio
 *
 * Exibe resumo visual do saldo de guias por especialidade
 * Cores:
 * - Verde: Saldo suficiente (> 5 sessões)
 * - Amarelo: Saldo baixo (1-5 sessões)
 * - Vermelho: Sem saldo (0 sessões)
 * - Cinza: Sem guias cadastradas
 */
const InsuranceBalanceBadge = ({
  patientId,
  specialty,
  showIcon = true,
  size = 'medium',
  variant = 'filled'
}) => {
  const {
    balance,
    isLoadingBalance,
    error
  } = useInsuranceGuides(patientId, { specialty }, true);

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

  // Determinar cor baseada no saldo
  const getColor = () => {
    if (balance.remaining === 0) return 'error';
    if (balance.remaining <= 5) return 'warning';
    return 'success';
  };

  // Determinar ícone
  const getIcon = () => {
    if (!showIcon) return undefined;
    if (balance.remaining === 0) return <XCircle className="w-4 h-4" />;
    if (balance.remaining <= 5) return <AlertCircle className="w-4 h-4" />;
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

    if (balance.guides && balance.guides.length > 0) {
      lines.push('');
      lines.push('Guias ativas:');
      balance.guides.forEach(guide => {
        lines.push(`• #${guide.number}: ${guide.remaining}/${guide.total} (${guide.insurance})`);
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
