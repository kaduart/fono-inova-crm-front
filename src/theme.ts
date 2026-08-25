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
});

export default theme;
