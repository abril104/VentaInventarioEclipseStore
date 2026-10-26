'use client';

import React, { useState, useEffect } from 'react';
import { UserProfile, CashSession } from '@/types';
import { Wallet, AlertTriangle, CheckCircle2, User, ChevronDown, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface AdminHeaderProps {
  currentUser: UserProfile;
}

export function AdminHeader({ currentUser }: AdminHeaderProps) {
  const [activeSession, setActiveSession] = useState<CashSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchSession();
    fetchProfiles();
  }, []);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/cash/session');
      const data = await res.json();
      setActiveSession(data.activeSession);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSession(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const res = await fetch('/api/auth/switch');
      const data = await res.json();
      setProfiles(data.profiles || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSwitchUser = async (targetUserId: string) => {
    try {
      await fetch('/api/auth/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: targetUserId }),
      });
      setUserDropdownOpen(false);
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-neutral-200 px-6 flex items-center justify-between sticky top-0 z-20 shadow-sm">
      <div className="flex items-center gap-4">
        <h1 className="text-sm font-bold text-neutral-900 tracking-wide uppercase">
          ECLISSI STORE &bull; Panel Stand Principal
        </h1>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Indicador de Estado de Caja Principal */}
        <Link
          href="/admin/caja"
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition ${
            activeSession
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
              : 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100 animate-pulse'
          }`}
          title="Ver o gestionar la caja principal"
        >
          <Wallet className="w-4 h-4" />
          {loadingSession ? (
            <span>Consultando caja...</span>
          ) : activeSession ? (
            <span>Caja Abierta: {activeSession.session_code}</span>
          ) : (
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Caja Cerrada (Abrir turno)
            </span>
          )}
        </Link>

        {/* Selector Rápido de Usuario / Vendedor */}
        <div className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-800 transition"
          >
            <div className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-bold">
              {currentUser.full_name[0]}
            </div>
            <span>{currentUser.full_name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
          </button>

          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-neutral-200 rounded-xl shadow-xl py-2 z-50">
              <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                Cambiar de Vendedor en Turno:
              </div>
              {profiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSwitchUser(p.id)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-neutral-50 transition ${
                    p.id === currentUser.id ? 'text-black font-bold bg-neutral-100' : 'text-neutral-700'
                  }`}
                >
                  <div className="flex flex-col">
                    <span>{p.full_name}</span>
                    <span className="text-[10px] text-neutral-500 capitalize">{p.role}</span>
                  </div>
                  {p.id === currentUser.id && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Botón Cerrar Sesión */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:text-red-600 hover:bg-red-50 border border-neutral-200 hover:border-red-200 rounded-lg transition"
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Cerrar Sesión</span>
        </button>
      </div>
    </header>
  );
}
