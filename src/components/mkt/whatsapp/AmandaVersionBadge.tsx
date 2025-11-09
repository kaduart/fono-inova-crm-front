interface AmandaVersionBadgeProps {
    version: "1.0" | "2.0";
    score?: number;
}

export const AmandaVersionBadge: React.FC<AmandaVersionBadgeProps> = ({ version, score }) => {
    const isV2 = version === "2.0";

    return (
        <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${isV2
                    ? "bg-purple-100 text-purple-700 border border-purple-200"
                    : "bg-slate-100 text-slate-700 border border-slate-200"
                }`}>
                {isV2 ? "✨ Amanda 2.0" : "🤖 Amanda 1.0"}
            </span>

            {score && isV2 && (
                <span className="text-xs text-slate-600">
                    Score: <span className="font-semibold">{score}</span>
                </span>
            )}
        </div>
    );
};