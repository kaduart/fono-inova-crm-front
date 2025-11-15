// services/marketingService.js
import API from './api';

const marketingService = {
    getSiteAnalytics: async () => {
        try {
            const res = await API.get('/marketing/analytics/events');
            return res.data;
        } catch (error) {
            console.error('Erro ao buscar analytics:', error);
            return [];
        }
    },
    
    getGoogleAdsCampaigns: async () => {
        try {
            const res = await API.get('/marketing/google-ads/campaigns');
            return res.data;
        } catch (error) {
            console.error('Erro ao buscar campanhas Google Ads:', error);
            return [];
        }
    },
    
    getPerformanceOverTime: async () => {
        try {
            const res = await API.get('/marketing/analytics/performance');
            return res.data;
        } catch (error) {
            console.error('Erro ao buscar performance:', error);
            return { 
              byStatus: [], 
              byOrigin: [],
              byDate: [],
              summary: { totalLeads: 0, conversionRate: 0, avgResponseTime: "0h" }
            };
        }
    },
    
    getMarketingOverview: async () => {
        try {
            const res = await API.get('/marketing/overview');
            return res.data;
        } catch (error) {
            console.error('Erro ao buscar overview:', error);
            return null;
        }
    }
};

export default marketingService;