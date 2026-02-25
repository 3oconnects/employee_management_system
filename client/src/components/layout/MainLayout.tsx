import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const PageSkeleton: React.FC = () => (
    <div className="p-8 animate-pulse">
        <div className="h-8 w-64 bg-gray-200 rounded mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-100 rounded-xl"></div>
            ))}
        </div>
        <div className="h-64 bg-gray-50 rounded-xl"></div>
    </div>
);

const MainLayout: React.FC = () => {
    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Topbar />

                <main className="flex-1 overflow-y-auto overflow-x-hidden">
                    <div className="max-w-[1600px] mx-auto">
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
