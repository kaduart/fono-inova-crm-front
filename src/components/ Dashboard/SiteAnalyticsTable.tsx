import React from 'react';
import { translateAction } from '../../utils/types/types';




const SiteAnalyticsTable: React.FC<SiteAnalyticsTableProps> = ({ data }) => (
    <div className="overflow-x-auto shadow rounded-lg">
        <table className="w-full table-auto border-collapse">
            <thead>
                <tr className="bg-blue-50 text-left">
                    <th className="p-3 font-semibold text-blue-700">Evento</th>
                    <th className="p-3 font-semibold text-blue-700">Categoria</th>
                    <th className="p-3 font-semibold text-blue-700">Descrição</th>
                    <th className="p-3 font-semibold text-blue-700">Data / Hora</th>
                    <th className="p-3 font-semibold text-blue-700 text-center">Valor</th>
                </tr>
            </thead>
            <tbody>
                {data.map((e, i) => (
                    <tr
                        key={i}
                        className="border-b hover:bg-blue-50 transition-colors duration-150"
                    >
                        <td className="p-3 text-gray-800 capitalize">{translateAction(e.action)}</td>
                        <td className="p-3 text-gray-800 capitalize">{e.category || '-'}</td>
                        <td className="p-3 text-gray-800">{e.label || '-'}</td>
                        <td className="p-3 text-gray-800">
                            {new Date(e.timestamp).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </td>
                        <td className="p-3 text-center text-gray-800">{e.value ?? 1}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

export default SiteAnalyticsTable;
