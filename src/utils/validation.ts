
// utils/validation.ts
export const validatePatient = (patient: IPatient, existingPatients: IPatient[]) => {
    // Verifica CPF
    if (patient.cpf && patient.cpf.trim() !== '') {
        const cpfExists = existingPatients.some(p =>
            p.cpf && p.cpf.trim() === patient.cpf.trim()
        );
        if (cpfExists) throw new Error('CPF já cadastrado');
    }

    // Verifica RG
    if (patient.rg && patient.rg.trim() !== '') {
        const rgExists = existingPatients.some(p =>
            p.rg && p.rg.trim() === patient.rg.trim()
        );
        if (rgExists) throw new Error('RG já cadastrado');
    }

    // Verifica Email
    if (!patient.email || patient.email.trim() === '') {
        throw new Error('Email é obrigatório');
    }
};