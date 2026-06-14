// src/pages/ProfessionalResults/components/ReceivablesCard.tsx
import React from 'react';
import { Box, Card, CardContent, CardHeader, Typography, Grid } from '@mui/material';
import { Wallet, Package, FileText, CreditCard, Scale } from 'lucide-react';
import { ReceivablesBreakdown } from '../../../services/professionalResultsService';

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface ReceivablesCardProps {
  receivables: ReceivablesBreakdown;
}

export const ReceivablesCard: React.FC<ReceivablesCardProps> = ({ receivables }) => {
  const realPending = receivables.insurance + receivables.particular + receivables.liminar;

  const items = [
    { label: 'Convênios', value: receivables.insurance, icon: <FileText size={20} />, color: '#8b5cf6' },
    { label: 'Particular', value: receivables.particular, icon: <CreditCard size={20} />, color: '#f59e0b' },
    { label: 'Liminar', value: receivables.liminar, icon: <Scale size={20} />, color: '#ec4899' },
  ];

  return (
    <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Wallet size={22} color="#f59e0b" />
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'grey.800' }}>
              A Receber
            </Typography>
          </Box>
        }
        subheader={
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'warning.main', mt: 1 }}>
              {formatCurrency(realPending)}
            </Typography>
            {receivables.packageConsumed > 0 && (
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                + {formatCurrency(receivables.packageConsumed)} de sessões de pacote pré-pago (valor já recebido na venda)
              </Typography>
            )}
          </Box>
        }
      />
      <CardContent>
        <Grid container spacing={2}>
          {items.map((item) => (
            <Grid item xs={6} key={item.label}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: `${item.color}10`,
                  border: `1px solid ${item.color}30`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: item.color }}>
                  {item.icon}
                  <Typography variant="body2" sx={{ fontWeight: 500, color: 'grey.700' }}>
                    {item.label}
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'grey.800' }}>
                  {formatCurrency(item.value)}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};
