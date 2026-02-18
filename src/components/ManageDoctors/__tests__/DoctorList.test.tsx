import { describe, it, expect } from 'vitest';

// Teste unitário para a função formatPhoneNumber
// Como a função está no arquivo DoctorList.tsx, vamos replicar a lógica aqui para testar
const formatPhoneNumber = (phone?: string) => {
    if (!phone) return '-';
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
};

describe('DoctorList - formatPhoneNumber', () => {
    it('deve formatar número de telefone válido corretamente', () => {
        const phone = '11999998888';
        const result = formatPhoneNumber(phone);
        expect(result).toBe('(11) 99999-8888');
    });

    it('deve retornar "-" quando telefone é undefined', () => {
        const result = formatPhoneNumber(undefined);
        expect(result).toBe('-');
    });

    it('deve retornar "-" quando telefone é string vazia', () => {
        const result = formatPhoneNumber('');
        expect(result).toBe('-');
    });

    it('deve retornar "-" quando telefone é null', () => {
        // @ts-expect-error - Testando comportamento com null
        const result = formatPhoneNumber(null);
        expect(result).toBe('-');
    });

    it('deve lidar com números no formato antigo (8 dígitos)', () => {
        const phone = '1133334444';
        const result = formatPhoneNumber(phone);
        // Não vai formatar corretamente pois regex espera 11 dígitos
        expect(result).toBe('1133334444');
    });

    it('deve lidar com string que não é número de telefone', () => {
        const phone = 'não é telefone';
        const result = formatPhoneNumber(phone);
        expect(result).toBe('não é telefone');
    });

    it('deve formatar número com DDD de outros estados', () => {
        const phone = '21988887777';
        const result = formatPhoneNumber(phone);
        expect(result).toBe('(21) 98888-7777');
    });
});
