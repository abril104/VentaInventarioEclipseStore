import React from 'react';
import { getCurrentUser } from '@/lib/auth/session';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Panel Administrativo & POS - Eclipse Store',
  description: 'Sistema integral de Punto de Venta, Inventario, Caja Compartida y Reportes.',
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login?redirect=/admin/pos');
  }

  return (
    <div className="flex min-h-screen bg-neutral-100 text-neutral-900 font-sans">
      {/* Sidebar fijo */}
      <AdminSidebar currentUser={currentUser} />

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminHeader currentUser={currentUser} />
        <main className="flex-1 p-6 overflow-y-auto bg-neutral-100">
          {children}
        </main>
      </div>
    </div>
  );
}
