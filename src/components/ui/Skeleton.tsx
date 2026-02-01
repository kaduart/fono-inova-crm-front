/**
 * 🚀 Componente Skeleton
 * 
 * Indicador de carregamento para estados de loading,
 * melhora a percepção de performance com animação suave.
 */

import React from 'react';

interface SkeletonProps {
    className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
    return (
        <div
            className={`
                animate-pulse 
                bg-gradient-to-r 
                from-gray-200 
                via-gray-300 
                to-gray-200 
                bg-[length:200%_100%]
                rounded
                ${className}
            `}
            style={{
                animation: 'shimmer 1.5s infinite'
            }}
        />
    );
};

// Adicionar keyframes ao documento (uma vez)
if (typeof document !== 'undefined') {
    const styleId = 'skeleton-animations';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            @keyframes shimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

export default Skeleton;
