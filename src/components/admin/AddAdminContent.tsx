import { Eye, EyeOff } from 'lucide-react';
import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Input from '../ui/Input';
import { Label } from '../ui/Label';

interface AddAdminContentProps {
    addNewAdmin: (adminData: { fullName: string; email: string; password: string; role?: string }) => Promise<void>;
    role?: 'admin' | 'secretary';
}

const AddAdminContent: React.FC<AddAdminContentProps> = ({ addNewAdmin, role = 'admin' }) => {
    const label = role === 'secretary' ? 'Secretária' : 'Admin';
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
        if (adminData.password !== adminData.confirmPassword) {
            alert("As senhas não coincidem");
            return;
        }
        try {
            await addNewAdmin({ ...adminData, role });
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
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Adicionar {label}</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Nome Completo</Label>
                            <Input id="fullName" name="fullName" value={adminData.fullName} onChange={handleInputChange} required />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" name="email" type="email" value={adminData.email} onChange={handleInputChange} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                name="password"
                                type={showAdminPassword ? "text" : "password"}
                                value={adminData.password}
                                onChange={handleInputChange}
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
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <div className="relative">
                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                type={showAdminPassword ? "text" : "password"}
                                value={adminData.confirmPassword}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                    </div>
                    <Button type="submit" className="ml-auto">Adicionar {label}</Button>
                </form>
            </CardContent>
        </Card>
    );
};

export default AddAdminContent;