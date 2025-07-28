export const dateFormat = (date: any): string => {
  date = new Date(date);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${day}/${month}/${year}`;
};

export const formatValidDate = (date: Date) => {
  const dateStr = date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    timeZone: 'UTC' // <- FORÇA UTC
  });

  const timeStr = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC' // <- FORÇA UTC
  });

  return { dateStr, timeStr };
};


// Função para formatar as datas no formato brasileiro (DD/MM/YYYY)
export const formatDateBrazilian = (date) => {
  if (!date) return '-';
  const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
  return new Date(date).toLocaleDateString('pt-BR', options);
};


export function mergeDateAndTime(dateString: string, timeString: string): Date {
  let year: number, month: number, day: number;

  // Detecta formato ISO: yyyy-MM-dd
  if (dateString.includes('-')) {
    [year, month, day] = dateString.split('-').map(Number);
  }
  // Detecta formato brasileiro: dd/MM/yyyy
  else if (dateString.includes('/')) {
    [day, month, year] = dateString.split('/').map(Number);
  } else {
    throw new Error('Formato de data inválido.');
  }

  const [hours, minutes] = timeString.split(':').map(Number);

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}


export const formatDateTimeForBackend = (dateStr: string, timeStr: string): string => {
  // Combina data e hora em formato ISO sem conversão de fuso
  return `${dateStr}T${timeStr}:00-03:00`; // -03:00 representa o fuso de Brasília
};


export function buildLocalDateOnly(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // cria com hora 00:00 no fuso local
}