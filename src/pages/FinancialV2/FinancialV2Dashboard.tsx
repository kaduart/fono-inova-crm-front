import { useState } from 'react';
import {
    DollarSign,
    TrendingUp,
    Target,
} from 'lucide-react';
import { Tabs, Tab, Box, Paper } from '@mui/material';
import { CaixaTab } from './components/CaixaTab';
import { MetasTab } from './components/MetasTab';

// ======================================================
// DASHBOARD V2 - SIMPLIFICADO (sem redundância)
// ======================================================
export const FinancialV2Dashboard = () => {
    const [activeTab, setActiveTab] = useState(0);
    
    return (
        <div className="p-6 space-y-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard Financeiro V2</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Controle de caixa e metas
                    </p>
                </div>
            </div>
            
            {/* Abas - SÓ 2: Caixa e Metas */}
            <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Tabs 
                    value={activeTab} 
                    onChange={(_, v) => setActiveTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{ 
                        borderBottom: 1, 
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        '& .MuiTabs-flexContainer': { gap: 1, px: 1 }
                    }}
                >
                    <Tab 
                        icon={<DollarSign className="w-5 h-5" />} 
                        label="Caixa" 
                        sx={{ textTransform: 'none', fontWeight: 600, minHeight: 56 }}
                    />
                    <Tab 
                        icon={<Target className="w-5 h-5" />} 
                        label="Metas" 
                        sx={{ textTransform: 'none', fontWeight: 600, minHeight: 56 }}
                    />
                </Tabs>
                
                <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
                    {activeTab === 0 && <CaixaTab />}
                    {activeTab === 1 && <MetasTab />}
                </Box>
            </Paper>
            
            {/* Footer */}
            <div className="text-center text-xs text-gray-400 pt-4">
                <p>Financial V2 • Sistema de contabilidade por competência</p>
            </div>
        </div>
    );
};

export default FinancialV2Dashboard;
