const getStatusColor = (status: string) => {
    switch (status) {
        case 'agendado':
            return 'bg-yellow-100 text-yellow-800';
        case 'realizado':
            return 'bg-green-100 text-green-800';
        case 'cancelado':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

const StatusBadge = ({ status }: { status: string }) => {
    return (
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded ${getStatusColor(status)}`}>
            {status}
        </span>
    );
};

export default StatusBadge;