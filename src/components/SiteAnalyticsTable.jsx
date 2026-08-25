
const SiteAnalyticsTable = ({ data }) => (
    <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] table-auto border-collapse border border-gray-200">
            <thead>
                <tr className="bg-gray-100">
                    <th className="border p-2">Evento</th>
                    <th className="border p-2">Categoria</th>
                    <th className="border p-2">Label</th>
                    <th className="border p-2">Timestamp</th>
                </tr>
            </thead>
            <tbody>
                {data.map((e, i) => (
                    <tr key={i}>
                        <td className="border p-2">{e.action}</td>
                        <td className="border p-2">{e.category}</td>
                        <td className="border p-2">{e.label}</td>
                        <td className="border p-2">{new Date(e.timestamp).toLocaleString()}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

export default SiteAnalyticsTable;
