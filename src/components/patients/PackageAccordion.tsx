// components/PackageAccordion.tsx
import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface PackageAccordionProps {
  packages: Array<{
    _id: string;
    sessionType: string;
    sessionsDone: number;
    totalSessions: number;
    sessionValue: number;
    status: string;
  }>;
}

const PackageAccordion: React.FC<PackageAccordionProps> = ({ packages }) => {
  const [expandedPackage, setExpandedPackage] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {packages.map((pkg) => (
        <div key={pkg._id} className="border rounded-lg overflow-hidden">
          <button
            className="w-full flex justify-between items-center p-3 hover:bg-gray-50 transition-colors"
            onClick={() => setExpandedPackage(expandedPackage === pkg._id ? null : pkg._id)}
          >
            <div className="flex items-center gap-3">
              <span className="font-medium capitalize text-sm">
                {pkg.sessionType}
              </span>
              <span className="text-xs bg-yellow-100 px-2 py-1 rounded-full">
                {pkg.sessionsDone}/{pkg.totalSessions} sessões
              </span>
            </div>
            {expandedPackage === pkg._id ? (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </button>

          {expandedPackage === pkg._id && (
            <div className="p-3 border-t bg-gray-50 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Valor por sessão:</span>
                <span className="font-medium">R$ {pkg.sessionValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Sessões restantes:</span>
                <span className="font-medium">{pkg.totalSessions - pkg.sessionsDone}</span>
              </div>
              <div className="pt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progresso</span>
                  <span>{Math.round((pkg.sessionsDone / pkg.totalSessions) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{
                      width: `${(pkg.sessionsDone / pkg.totalSessions) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default PackageAccordion;