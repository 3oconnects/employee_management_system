import React, { useState } from 'react'; 
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../../../components/ui';
import api from '../../../services/api';

// Components
import OrganizationTree from '../components/OrganizationTree';
import OrganizationHeader from '../components/OrganizationHeader';
import DepartmentCard from '../components/DepartmentCard';
import DepartmentGridCard from '../components/DepartmentGridCard';
import EntityModal from '../components/EntityModal';
import EntityDetailPanel from '../components/EntityDetailPanel';
import DecommissionModal from '../components/DecommissionModal';

// Hooks
import { useOrganizationData } from '../hooks/useOrganizationData';
import { useOrganizationForm } from '../hooks/useOrganizationForm';

const OrganizationPage: React.FC = () => {
    const navigate = useNavigate();
    const { 
        departments, teams, users, loading, viewMembers, loadingMembers, 
        resolvedOwnership, fetchData, fetchMembers, fetchGovernance, setResolvedOwnership 
    } = useOrganizationData();

    const { 
        modalType, setModalType, editingItem, submitting, formData, setFormData, 
        confirmData, setConfirmData, openModal, handleAction, triggerDelete, executeDelete 
    } = useOrganizationForm(fetchData);

    const [searchTerm, setSearchTerm] = useState('');
    const [expandedDepts, setExpandedDepts] = useState<number[]>([]);
    const [activeView, setActiveView] = useState<'list' | 'grid' | 'graph'>('list');
    const [viewingItem, setViewingItem] = useState<{ type: 'dept' | 'team' | 'node', item: any } | null>(null);

    const openView = async (type: 'dept' | 'team' | 'node', item: any) => {
        setViewingItem({ type, item });
        setResolvedOwnership(null);
        if (type === 'node') {
            fetchMembers('node', item.entity_id, { item });
            fetchGovernance(item.id);
        } else {
            fetchMembers(type, item.id);
            const nodeRes = await api.get('/governance/tree');
            const findNode = (nodes: any[]): any => {
                for (const n of nodes) {
                    if (n.entity_type === type && n.entity_id === item.id) return n;
                    if (n.children) {
                        const found = findNode(n.children);
                        if (found) return found;
                    }
                }
            };
            const node = findNode(nodeRes.data.data);
            if (node) fetchGovernance(node.id);
        }
    };

    const filteredDepts = departments.filter(d => 
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        teams.some(t => t.department_id === d.id && t.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) return <LoadingSpinner text="Synchronizing Enterprise Hierarchy..." />;

    return (
        <div className="p-6 max-w-[1500px] mx-auto pb-20 animate-in fade-in duration-700">
            <OrganizationHeader 
                activeView={activeView}
                setActiveView={setActiveView}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                onAddDivision={() => openModal('dept')}
            />

            {activeView === 'list' && (
                <div className="space-y-4">
                    {filteredDepts.map((dept) => (
                        <DepartmentCard 
                            key={dept.id}
                            dept={dept}
                            teams={teams.filter(t => String(t.department_id) === String(dept.id))}
                            isExpanded={expandedDepts.includes(dept.id)}
                            onToggle={() => setExpandedDepts(prev => prev.includes(dept.id) ? prev.filter(id => id !== dept.id) : [...prev, dept.id])}
                            onView={openView}
                            onAddSquad={(parentId) => openModal('team', null, parentId)}
                            onEdit={openModal}
                            onDelete={triggerDelete}
                        />
                    ))}
                </div>
            )}

            {activeView === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredDepts.map((dept) => (
                        <DepartmentGridCard 
                            key={dept.id}
                            dept={dept}
                            teams={teams.filter(t => String(t.department_id) === String(dept.id))}
                            onView={openView}
                            onEdit={openModal}
                            onDelete={triggerDelete}
                        />
                    ))}
                </div>
            )}

            {activeView === 'graph' && (
                <div className="bg-white border border-slate-100 rounded-3xl p-8 h-[750px] shadow-sm relative overflow-hidden">
                    <OrganizationTree onNodeClick={(node) => openView('node', node)} />
                </div>
            )}

            <EntityModal 
                modalType={modalType}
                editingItem={editingItem}
                formData={formData}
                setFormData={setFormData}
                submitting={submitting}
                departments={departments}
                teams={teams}
                users={users}
                onSubmit={handleAction}
                onClose={() => setModalType(null)}
            />

            <DecommissionModal 
                confirmData={confirmData}
                submitting={submitting}
                onClose={() => setConfirmData(null)}
                onConfirm={executeDelete}
            />

            <EntityDetailPanel 
                viewingItem={viewingItem}
                resolvedOwnership={resolvedOwnership}
                viewMembers={viewMembers}
                loadingMembers={loadingMembers}
                onClose={() => setViewingItem(null)}
                onManageTeam={() => {
                    if (viewingItem) {
                        const targetType = viewingItem.type === 'node' ? (viewingItem.item.entity_type === 'department' ? 'dept' : 'team') : viewingItem.type;
                        const targetId = viewingItem.type === 'node' ? viewingItem.item.entity_id : viewingItem.item.id;
                        navigate(`/organization/deep-dive/${targetType}/${targetId}`);
                    }
                }}
            />
        </div>
    );
};

export default OrganizationPage;
