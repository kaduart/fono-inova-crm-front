import { Eye, EyeOff } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Input from '../ui/Input';
import { Label } from '../ui/Label';

interface AddAdminContentProps {
    addNewAdmin: (adminData: { fullName: string; email: string; password: string; role?: string }) => Promise<void>;
    role?: 'admin' | 'secretary';
    onCreated?: () => void;
    onCancel?: () => void;
    modal?: boolean;
}

const AddAdminContent: React.FC<AddAdminContentProps> = ({ addNewAdmin, role = 'admin', onCreated, onCancel, modal = false }) => {
    const label = role === 'secretary' ? 'Secretária' : 'Admin';
    const { user } = useAuth();
    const [adminData, setAdminData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [showAdminPassword, setShowAdminPassword] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setAdminData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (role === 'admin' && user?.role !== 'admin') {
            toast.error('Apenas administradores podem criar perfis de Admin.');
            return;
        }
        if (adminData.password !== adminData.confirmPassword) {
            toast.error('As senhas não coincidem');
            return;
        }
        try {
            await addNewAdmin({ ...adminData, role });
            onCreated?.();
            setAdminData({
                fullName: '',
                email: '',
                password: '',
                confirmPassword: ''
            });
        } catch (error) {
            // Error is handled in the hook
        }
    };

    return (
        <Card className={`w-full max-w-2xl mx-auto overflow-hidden border border-slate-200 bg-white shadow-2xl hover:scale-100 ${modal ? 'rounded-2xl' : ''}`}>
            <CardHeader className="border-b border-slate-100 bg-white px-6 py-5">
                <div>
                    <CardTitle className="text-lg font-extrabold text-slate-900">Adicionar {label}</CardTitle>
                    <p className="mt-1 text-sm text-slate-500">Crie o acesso da nova integrante da equipe administrativa.</p>
                </div>
            </CardHeader>
            <CardContent className="bg-white px-6 py-5">
                <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="fullName" className="text-sm font-semibold text-slate-700">Nome completo</Label>
                            <Input id="fullName" name="fullName" value={adminData.fullName} onChange={handleInputChange} autoComplete="off" required />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-semibold text-slate-700">E-mail</Label>
                        <Input id="email" name="secretary-email" type="email" value={adminData.email} onChange={(event) => setAdminData(prev => ({ ...prev, email: event.target.value }))} autoComplete="off" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-semibold text-slate-700">Senha</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                name="password"
                                type={showAdminPassword ? "text" : "password"}
                                value={adminData.password}
                                onChange={handleInputChange}
                                autoComplete="new-password"
                                required
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowAdminPassword(!showAdminPassword)}
                            >
                                {showAdminPassword ? (
                                    <EyeOff className="h-4 w-4 text-gray-500" />
                                ) : (
                                    <Eye className="h-4 w-4 text-gray-500" />
                                )}
                                <span className="sr-only">
                                    {showAdminPassword ? "Hide password" : "Show password"}
                                </span>
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-700">Confirmar senha</Label>
                        <div className="relative">
                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                type={showAdminPassword ? "text" : "password"}
                                value={adminData.confirmPassword}
                                onChange={handleInputChange}
                                autoComplete="new-password"
                                required
                            />
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
                        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>}
                        <Button type="submit" className="bg-emerald-600 px-5 text-white hover:bg-emerald-700">Adicionar {label}</Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};

export default AddAdminContent;
