import { Skeleton } from '@mui/material';

const cardColors = ['#10B981', '#3B82F6', '#F59E0B', '#10B981'];

export const CashflowPageSkeleton = () => (
    <div className="p-2">
        {/* Filtros de período */}
        <div className="flex gap-2 mb-4 flex-wrap">
            {[44, 52, 88, 112, 72, 88].map((w, i) => (
                <Skeleton key={i} variant="rounded" width={w} height={26} sx={{ borderRadius: 99 }} />
            ))}
        </div>
        {/* 4 cards premium */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            {cardColors.map((color, i) => (
                <div key={i} className="border rounded-2xl p-5 shadow-sm" style={{ borderColor: `${color}25`, backgroundColor: `${color}05` }}>
                    <div className="flex items-center gap-3 mb-4">
                        <Skeleton variant="rounded" width={36} height={36} sx={{ borderRadius: 10, bgcolor: `${color}20` }} />
                        <div className="flex-1">
                            <Skeleton variant="text" width="55%" height={11} sx={{ bgcolor: `${color}20` }} />
                            <Skeleton variant="text" width="70%" height={11} />
                        </div>
                    </div>
                    <Skeleton variant="text" width="80%" height={38} sx={{ bgcolor: `${color}18` }} />
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2.5">
                        <Skeleton variant="text" width="35%" height={10} />
                        {[0, 1, 2].map(j => (
                            <div key={j} className="flex items-center justify-between">
                                <Skeleton variant="text" width="48%" height={13} />
                                <Skeleton variant="text" width="30%" height={13} />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 pb-1 mb-3">
            {[90, 90, 80, 90, 110, 110].map((w, i) => (
                <Skeleton key={i} variant="rounded" width={w} height={36} sx={{ borderRadius: 6 }} />
            ))}
        </div>
        {/* Tabela */}
        <Skeleton variant="rounded" width="100%" height={40} sx={{ borderRadius: 6, mb: 0.5 }} />
        {[...Array(5)].map((_, i) => (
            <Skeleton key={i} variant="rounded" width="100%" height={52} sx={{ borderRadius: 6, mb: 0.5 }} />
        ))}
    </div>
);

export default CashflowPageSkeleton;
