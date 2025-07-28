interface CardProps {
    children: React.ReactNode;
    className?: string;
}

export const Card = ({ children, className = '' }: CardProps) => (
    <div className={`rounded-lg shadow-md shadow-lg border-l-4 transition-transform duration-300 ease-in-out hover:scale-105 hover:shadow-lg
     ${className}`}>
        {children}
    </div>
);

interface CardHeaderProps {
    children: React.ReactNode;
    className?: string;
    icon?: React.ComponentType<{ className?: string }>;
}

export const CardHeader = ({ children, icon: Icon, className = '' }: CardHeaderProps) => (
    <div className={`px-4 py-5 border-b border-gray-200 sm:px-6 flex items-center justify-between ${className}`}>
        {children}
        {Icon && <Icon className="h-5 w-5 text-blue-600 ml-2" />}
    </div>
);

export const CardTitle = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <h3 className={`text-lg leading-6 font-medium ${className}`}>{children}</h3>
);

export const CardContent = ({ children }: { children: React.ReactNode }) => (
    <div className="px-4 py-5 sm:p-6">{children}</div>
);

export const CardFooter = ({ children }: { children: React.ReactNode }) => (
    <div className="px-4 py-4 sm:px-6">{children}</div>
);