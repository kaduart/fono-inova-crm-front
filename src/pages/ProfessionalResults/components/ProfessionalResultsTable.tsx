// src/pages/ProfessionalResults/components/ProfessionalResultsTable.tsx
import React from 'react';
import {
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Typography
} from '@mui/material';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';

export interface Column<T> {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  width?: number | string;
  render?: (row: T, index: number) => React.ReactNode;
}

interface ProfessionalResultsTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  getRowKey: (row: T) => string;
}

export function ProfessionalResultsTable<T>({
  columns,
  data,
  loading,
  emptyMessage = 'Nenhum registro encontrado.',
  onRowClick,
  getRowKey,
}: ProfessionalResultsTableProps<T>) {
  if (loading && data.length === 0) {
    return <LoadingSpinner centered size="medium" color="border-emerald-600" className="min-h-[200px]" />;
  }

  return (
    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
      <Table>
        <TableHead sx={{ bgcolor: 'grey.50' }}>
          <TableRow>
            {columns.map((col) => (
              <TableCell key={col.key} align={col.align} sx={{ width: col.width, fontWeight: 'bold' }}>
                {col.header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">{emptyMessage}</Typography>
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, index) => (
              <TableRow
                key={getRowKey(row)}
                hover
                onClick={() => onRowClick?.(row)}
                sx={{
                  '&:last-child td, &:last-child th': { border: 0 },
                  cursor: onRowClick ? 'pointer' : 'default',
                }}
              >
                {columns.map((col) => (
                  <TableCell key={col.key} align={col.align}>
                    {col.render ? col.render(row, index) : null}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
