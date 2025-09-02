import API from './api';

const marketingService = {
    getSiteAnalytics: async () => {
        const res = await API.get('/analytics/events');
        return res.data;
    },
    getGoogleAdsCampaigns: async () => {
        const res = await API.get('/google-ads/campaigns');
        return res.data;
    },
    getPerformanceOverTime: async () => {
        const res = await API.get('/analytics/performance');
        return res.data;
    }
};

export default marketingService;