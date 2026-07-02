import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../context/AuthContext';

const DashboardLayout = ({ children, title }) => {
  const { user } = useAuth();

  return (
    <div className="flex h-screen bg-[#0A0F0D] w-full overflow-hidden">
      <Sidebar role={user?.role} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-transparent">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
