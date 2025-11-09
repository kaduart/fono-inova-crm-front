interface ScoreBadgeProps {
  score?: number;
}

export const ScoreBadge: React.FC<ScoreBadgeProps> = ({ score }) => {
  if (!score) return <span className="text-slate-400 text-xs">—</span>;
  
  const getColor = (s: number) => {
    if (s >= 80) return "bg-red-100 text-red-700 border-red-200";
    if (s >= 60) return "bg-orange-100 text-orange-700 border-orange-200";
    if (s >= 40) return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-blue-100 text-blue-700 border-blue-200";
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getColor(score)}`}>
      {score}
    </span>
  );
};