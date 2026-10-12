import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import CreatePostModal from './CreatePostModal';
import BottomNav from './BottomNav';
import MobileTopNav from './MobileTopNav';

const Layout = () => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-transparent">
            {/* Desktop Sidebar */}
            <Sidebar openPostModal={() => setIsCreateModalOpen(true)} />

            {/* Mobile Top Navigation */}
            <MobileTopNav />

            {/* Main Content Area */}
            {/* Added pt-14 and pb-14 for mobile to account for fixed navbars, md:pt-0 pb-0 for desktop */}
            <div className="flex-grow md:ml-60 w-full min-h-screen pt-14 pb-14 md:pt-0 md:pb-0">
                <main className="max-w-screen-xl mx-auto">
                    <Outlet />
                </main>
            </div>

            {/* Mobile Bottom Navigation */}
            <BottomNav openPostModal={() => setIsCreateModalOpen(true)} />

            {isCreateModalOpen && (
                <CreatePostModal onClose={() => setIsCreateModalOpen(false)} />
            )}
        </div>
    );
};

export default Layout;
