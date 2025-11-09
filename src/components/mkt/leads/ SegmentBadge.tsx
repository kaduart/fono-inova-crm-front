interface SegmentBadgeProps {
    segment?: {
        label: "hot" | "warm" | "cold";
        emoji: string;
        color: string;
    };
}

export const SegmentBadge: React.FC<SegmentBadgeProps> = ({ segment }) => {
    if (!segment) return <span className="text-slate-400 text-xs">—</span>;

    const styles = {
        hot: "bg-red-50 text-red-700 border-red-200",
        warm: "bg-yellow-50 text-yellow-700 border-yellow-200",
        cold: "bg-blue-50 text-blue-700 border-blue-200"
    };

    return (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold border inline-flex items-center gap-1 ${styles[segment.label]}`}>
            <span>{segment.emoji}</span>
            <span className="capitalize">{segment.label}</span>
        </span>
    );
};