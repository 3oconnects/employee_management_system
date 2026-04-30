import { useState } from 'react';
import api from '../../../services/api';
import { toast } from '../../../components/ui';

export const useOrganizationForm = (onSuccess: () => void) => {
    const [modalType, setModalType] = useState<'dept' | 'team' | null>(null);
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [submitting, setSubmitting] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        department_id: '',
        parent_team_id: '',
        owner_id: '',
        category: 'core',
        metadata: {
            policy: '',
            documents: [] as string[],
            website: '',
            internal_code: '',
            cost_center: '',
            budget_limit: '',
            priority: 'medium',
            status: 'active'
        }
    });

    const [confirmData, setConfirmData] = useState<{ type: 'dept' | 'team', id: number, name: string } | null>(null);

    const openModal = (type: 'dept' | 'team', item: any = null, parentId: string = '') => {
        setModalType(type);
        setEditingItem(item);
        if (item) {
            const meta = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : (item.metadata || {});
            setFormData({
                name: item.name,
                description: item.description || '',
                department_id: (item.department_id || '').toString(),
                parent_team_id: (item.parent_team_id || '').toString(),
                owner_id: (item.owner_id || '').toString(),
                category: item.category || 'core',
                metadata: {
                    policy: meta.policy || '',
                    documents: meta.documents || [],
                    website: meta.website || '',
                    internal_code: meta.internal_code || '',
                    cost_center: meta.cost_center || '',
                    budget_limit: meta.budget_limit || '',
                    priority: meta.priority || 'medium',
                    status: meta.status || 'active'
                }
            });
        } else {
            setFormData({ 
                name: '', 
                description: '', 
                department_id: parentId,
                parent_team_id: '',
                owner_id: '',
                category: 'core',
                metadata: { 
                    policy: '', 
                    documents: [], 
                    website: '', 
                    internal_code: '',
                    cost_center: '',
                    budget_limit: '',
                    priority: 'medium',
                    status: 'active'
                }
            });
        }
    };

    const handleAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const endpoint = modalType === 'dept' ? '/organization/departments' : '/organization/teams';
            const payload = {
                ...formData,
                metadata: JSON.stringify(formData.metadata)
            };

            if (editingItem) {
                await api.put(`${endpoint}/${editingItem.id}`, payload);
                toast.success('Configuration updated');
            } else {
                await api.post(endpoint, payload);
                toast.success('New unit initialized');
            }
            setModalType(null);
            onSuccess();
        } catch (err) {
            toast.error('Strategic operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const triggerDelete = (type: 'dept' | 'team', item: any) => {
        setConfirmData({ type, id: item.id, name: item.name });
    };

    const executeDelete = async () => {
        if (!confirmData) return;
        setSubmitting(true);
        try {
            const endpoint = confirmData.type === 'dept' ? '/organization/departments' : '/organization/teams';
            await api.delete(`${endpoint}/${confirmData.id}`);
            toast.success('Unit decommissioned successfully');
            setConfirmData(null);
            onSuccess();
        } catch (err) {
            toast.error('Decommissioning failed');
        } finally {
            setSubmitting(false);
        }
    };

    return {
        modalType,
        setModalType,
        editingItem,
        submitting,
        formData,
        setFormData,
        confirmData,
        setConfirmData,
        openModal,
        handleAction,
        triggerDelete,
        executeDelete
    };
};
