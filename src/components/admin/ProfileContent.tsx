import React from 'react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/Card';
import Input from '../ui/Input';
import { Label } from '../ui/Label';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface ProfileContentProps {
    adminInfo: any;
    editedInfo: any;
    setEditedInfo: (info: any) => void;
    isEditing: boolean;
    setIsEditing: (editing: boolean) => void;
    updateAdminProfile: (profileData: { fullName: string; email: string }) => Promise<void>;
}

const ProfileContent: React.FC<ProfileContentProps> = ({
    adminInfo,
    editedInfo,
    setEditedInfo,
    isEditing,
    setIsEditing,
    updateAdminProfile
}) => {
    if (!adminInfo) {
        return <div><LoadingSpinner /></div>;
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditedInfo((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!editedInfo) return;
        try {
            await updateAdminProfile({
                fullName: editedInfo.fullName,
                email: editedInfo.email
            });
        } catch (error) {
            // Error is handled in the hook
        }
    };

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Admin Perfil</CardTitle>
            </CardHeader>
            <CardContent>
                <form className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Nome Completo</Label>
                            <Input
                                id="fullName"
                                name="fullName"
                                value={isEditing ? editedInfo.fullName : adminInfo.fullName}
                                onChange={handleInputChange}
                                readOnly={!isEditing}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            value={isEditing ? editedInfo.email : adminInfo.email}
                            onChange={handleInputChange}
                            readOnly={!isEditing}
                        />
                    </div>
                </form>
            </CardContent>
            <CardFooter>
                {isEditing ? (
                    <>
                        <Button onClick={handleSave} className="mr-2">Salvar</Button>
                        <Button onClick={() => setIsEditing(false)} variant="outline">Cancelar</Button>
                    </>
                ) : (
                    <Button onClick={() => setIsEditing(true)} className="ml-auto">Editar Perfil</Button>
                )}
            </CardFooter>
        </Card>
    );
};

export default ProfileContent;