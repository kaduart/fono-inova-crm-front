// hooks/useAdmin.ts
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Appointment } from '../utils/types';
import { AdminInfo } from '../utils/types/types';
import { adminService } from '../services/adminService';

export const useAdmin = () => {
    const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);
    const [editedInfo, setEditedInfo] = useState<AdminInfo | null>(null);
    const [completedAppointments, setCompletedAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const fetchAdminProfile = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                // Handle not authenticated case - mantendo comportamento original
                return;
            }

            setLoading(true);
            const response = await adminService.fetchProfile();

            if (response.status >= 200 && response.status < 300) {
                setAdminInfo(response.data);
                setEditedInfo(response.data);
            } else {
                // Handle error - mantendo comportamento original
                console.error('Failed to fetch admin profile');
            }
        } catch (error) {
            // Mantendo comportamento original
            console.error('Error fetching admin profile:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchCompletedAppointments = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            setLoading(true);
            const response = await adminService.fetchCompletedAppointments();

            if (response.status >= 200 && response.status < 300) {
                setCompletedAppointments(response.data);
            } else {
                // Mantendo comportamento original
                console.error('Failed to fetch completed/cancelled appointments');
            }
        } catch (error) {
            // Mantendo comportamento original
            console.error('Error fetching completed/cancelled appointments:', error);
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    const updateAdminProfile = useCallback(async (profileData: { fullName: string; email: string }) => {
        setLoading(true);
        setError(null);
        try {
            const response = await adminService.updateProfile(profileData);
            setAdminInfo(response.data.admin);
            toast.success("Perfil atualizado com sucesso.");
            return response.data;
        } catch (err: any) {
            setError(err.message);
            toast.error(err.response?.data?.message || "An error occurred");
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const addNewAdmin = useCallback(async (adminData: { fullName: string; email: string; password: string }) => {
        setLoading(true);
        setError(null);
        try {
            await adminService.addAdmin(adminData);
            toast.success('Admin adicionado com sucesso');
        } catch (err: any) {
            setError(err.message);
            toast.error(err.response?.data?.message || 'An error occurred. Please try again.');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAdminProfile();
        fetchCompletedAppointments();
    }, [fetchAdminProfile, fetchCompletedAppointments]);

    return {
        adminInfo,
        editedInfo,
        setEditedInfo,
        completedAppointments,
        loading,
        error,
        fetchAdminProfile,
        fetchCompletedAppointments,
        updateAdminProfile,
        addNewAdmin
    };
};