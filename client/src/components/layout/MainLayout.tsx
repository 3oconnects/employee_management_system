import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const PageSkeleton: React.FC = () => (
    <div className="p-6 space-y-4 animate-pulse">
        <div className="h-6 w-48 bg-gray-100 rounded-lg"></div>
        <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-100 rounded-xl"></div>
            ))}
        </div>
        <div className="h-64 bg-gray-50 rounded-xl"></div>
    </div>
);

const MainLayout: React.FC = () => {
    return (
        <div className="flex h-screen bg-[#F4F5F8] overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative shadow-[-8px_0_32px_rgba(0,0,0,0.02)]">
                <Topbar />
                <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#F8FAFC]">
                    <div className="min-h-full">
                        <Suspense fallback={<PageSkeleton />}>
                            <Outlet />
                        </Suspense>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
