// Frontend - schemas/packageSchema.ts
import { z } from 'zod';

export const createPackageSchema = z.object({
    patientId: z.string().min(1, 'Paciente é obrigatório'),
    doctorId: z.string().min(1, 'Médico é obrigatório'),
    sessionType: z.enum(['fonoaudiologia', 'terapeuta ocupacional', 'psicologia', 'fisioterapia']),
    sessionValue: z.number().min(0.01, 'Valor deve ser maior que zero'),
    amountPaid: z.number().min(0, 'Valor pago não pode ser negativo'),
    paymentMethod: z.enum(['dinheiro', 'pix', 'cartão']),
    dateTime: z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido'),
        time: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido')
    })
});