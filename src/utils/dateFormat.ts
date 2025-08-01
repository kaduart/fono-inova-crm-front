 
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

export function mergeDateAndTimeToAppointment(date: string, time: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);

  // Cria um Date em fuso local (UTC-3 se no Brasil)
  const localDate = new Date(year, month - 1, day, hours, minutes);

  // Monta string com fuso -03:00
  const pad = (n: number) => n.toString().padStart(2, '0');

  const dateStr = `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00-03:00`;

  return dateStr;
}


export const formatDateTimeForBackend = (dateStr: string, timeStr: string): string => {
  // Combina data e hora em formato ISO sem conversão de fuso
  return `${dateStr}T${timeStr}:00-03:00`; // -03:00 representa o fuso de Brasília
};


export function buildLocalDateOnly(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // cria com hora 00:00 no fuso local
}

export function buildLocalTime(timeString: string) {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function combineLocalDateTime(datePart: Date, timePart: Date): string {
  // Cria uma nova data no fuso local
  const combined = new Date(
    datePart.getFullYear(),
    datePart.getMonth(),
    datePart.getDate(),
    timePart.getHours(),
    timePart.getMinutes()
  );

  // Converte para ISO string com offset correto (-03:00 para Brasil)
  const offset = -combined.getTimezoneOffset() / 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  return `${combined.getFullYear()}-${pad(combined.getMonth()+1)}-${pad(combined.getDate())}T${pad(combined.getHours())}:${pad(combined.getMinutes())}:00${offset >= 0 ? '+' : '-'}${pad(Math.abs(offset))}:00`;
}