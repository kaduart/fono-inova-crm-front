// src/constants/insuranceProviders.ts

export interface InsuranceProvider {
    id: string;
    name: string;
    city?: string;
    defaultValue?: number; // valor padrão da tabela
}

export const INSURANCE_PROVIDERS: InsuranceProvider[] = [
    { id: 'unimed-anapolis', name: 'Unimed Anápolis', city: 'Anápolis', defaultValue: 80 },
    { id: 'unimed-goiania', name: 'Unimed Goiânia', city: 'Goiânia', defaultValue: 140 },
    { id: 'unimed-campinas', name: 'Unimed Campinas', city: 'Campinas', defaultValue: 140 },
    { id: 'bradesco-saude', name: 'Bradesco Saúde', defaultValue: 130 },
    { id: 'sulamerica', name: 'SulAmérica', defaultValue: 135 },
    { id: 'amil', name: 'Amil', defaultValue: 125 },
    { id: 'hapvida', name: 'Hapvida', defaultValue: 100 },
    { id: 'ipasgo', name: 'IPASGO', city: 'Goiás', defaultValue: 120 },
    { id: 'outro', name: 'Outro Convênio', defaultValue: 0 },
];

export const getProviderById = (id: string) =>
    INSURANCE_PROVIDERS.find(p => p.id === id);

export const getProviderName = (id: string) =>
    getProviderById(id)?.name || id;