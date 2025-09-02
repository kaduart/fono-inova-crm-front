import { Dialog } from '@mui/material';
import { useEffect, useState } from 'react';

const ClientDialog = ({ open, onClose, children }) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return <Dialog open={open} onClose={onClose}>{children}</Dialog>;
};

export default ClientDialog;
