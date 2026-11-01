import { createTheme } from '@mui/material/styles';

// Escala de marca Fono Inova — mesma usada em src/App.css (--brand-*).
// Ver DESIGN.md: esmeralda é a única cor de marca/ação do sistema (The One Action Color Rule).
export const theme = createTheme({
  palette: {
    primary: {
      light: '#42B898',
      main: '#26977B',
      dark: '#1E7A64',
      contrastText: '#ffffff',
    },
    secondary: {
      light: '#8FD6C2',
      main: '#66C7AD',
      dark: '#42B898',
      contrastText: '#0F4037',
    },
  },
  // Novo design: mesma fonte do Tailwind, sem CAIXA ALTA em botões/abas, cantos e sombras discretos.
  typography: {
    fontFamily: "'Figtree', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiPaper: { styleOverrides: { elevation1: { boxShadow: '0 1px 2px rgba(15, 64, 55, .06), 0 0 0 1px rgba(15, 64, 55, .06)' } } },
    MuiCard: { styleOverrides: { root: { boxShadow: '0 1px 2px rgba(15, 64, 55, .06), 0 0 0 1px rgba(15, 64, 55, .06)' } } },
    MuiTableCell: { styleOverrides: { head: { fontWeight: 600 } } },
  },
});

export default theme;
