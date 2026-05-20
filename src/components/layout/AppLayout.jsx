import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import PullToRefresh from '@/components/PullToRefresh';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function AppLayout() {
  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-hidden">
        <PullToRefresh>
          <div className="p-4 lg:p-8 pt-16 lg:pt-8">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </PullToRefresh>
      </main>
    </div>
  );
}