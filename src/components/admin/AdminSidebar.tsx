'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Shirt,
  Truck,
  Wallet,
  Receipt,
  Users,
  FileSpreadsheet,
  BarChart3,
  Settings,
  Globe,
  UserCheck,
  LogOut,
} from 'lucide-react';
import { UserProfile } from '@/types';

interface AdminSidebarProps {
  currentUser: UserProfile;
}

export function AdminSidebar({ currentUser }: AdminSidebarProps) {
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (e) {
      console.error(e);
    }
  };

  const links = [
    {
      href: '/admin',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'vendedor'],
    },
    {
      href: '/admin/pos',
      label: 'Punto de Venta (POS)',
      icon: ShoppingCart,
      roles: ['admin', 'vendedor'],
      highlight: true,
    },
    {
      href: '/admin/inventario',
      label: 'Inventario & Kardex',
      icon: Boxes,
      roles: ['admin', 'vendedor'],
    },
    {
      href: '/admin/productos',
      label: 'Productos & Variantes',
      icon: Shirt,
      roles: ['admin'],
    },
    {
      href: '/admin/compras',
      label: 'Compras & Proveedores',
      icon: Truck,
      roles: ['admin'],
    },
    {
      href: '/admin/caja',
      label: 'Caja Principal Compartida',
      icon: Wallet,
      roles: ['admin', 'vendedor'],
    },
    {
      href: '/admin/ventas',
      label: 'Historial de Ventas',
      icon: Receipt,
      roles: ['admin', 'vendedor'],
    },
    {
      href: '/admin/clientes',
      label: 'Clientes & Historial',
      icon: Users,
      roles: ['admin', 'vendedor'],
    },
    {
      href: '/admin/importar',
      label: 'Importar / Exportar Excel',
      icon: FileSpreadsheet,
      roles: ['admin'],
    },
    {
      href: '/admin/reportes',
      label: 'Reportes Comerciales',
      icon: BarChart3,
      roles: ['admin'],
    },
    {
      href: '/admin/configuracion',
      label: 'Configuración & Usuarios',
      icon: Settings,
      roles: ['admin'],
    },
  ];

  const filteredLinks = links.filter((l) => l.roles.includes(currentUser.role));

  return (
    <aside className="w-64 bg-neutral-950 border-r border-neutral-800 flex flex-col justify-between h-screen sticky top-0 shrink-0 z-30">
      <div>
        {/* Header del Sidebar con Logo Oficial Ampliado */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-white/5">
          <div className="bg-white px-2 py-1.5 rounded-xl flex items-center shadow-sm w-full justify-center">
            <BrandLogo size="md" showTagline={false} />
          </div>
        </div>

        {/* Tarjeta de Usuario Activo */}
        <div className="p-3 mx-3 my-3 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-black border border-neutral-700 flex items-center justify-center text-amber-400 font-extrabold text-xs">
            {currentUser.full_name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{currentUser.full_name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${
                  currentUser.role === 'admin'
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-700/60'
                    : 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                }`}
              >
                {currentUser.role === 'admin' ? 'Administrador' : 'Vendedor'}
              </span>
            </div>
          </div>
        </div>

        {/* Navegación */}
        <nav className="px-3 space-y-1 overflow-y-auto max-h-[calc(100vh-250px)]">
          {filteredLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                  item.highlight
                    ? isActive
                      ? 'bg-white text-black shadow-lg font-black'
                      : 'bg-neutral-900 text-amber-400 border border-neutral-800 hover:bg-neutral-800'
                    : isActive
                    ? 'bg-neutral-800 text-white border border-neutral-700'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${item.highlight ? 'text-amber-400' : ''}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer del Sidebar */}
      <div className="p-3 border-t border-neutral-800 space-y-1.5 bg-neutral-950">
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-lg transition"
        >
          <Globe className="w-4 h-4 text-amber-400" />
          <span>Ver Catálogo Web</span>
        </Link>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition border border-transparent hover:border-red-900/50"
        >
          <LogOut className="w-4 h-4 text-red-400" />
          <span>Cerrar Sesión</span>
        </button>

        <div className="text-[10px] text-neutral-500 px-3 pt-1 flex items-center justify-between font-medium">
          <span>Stand Eclipse Store</span>
          <span>Soles (PEN)</span>
        </div>
      </div>
    </aside>
  );
}
