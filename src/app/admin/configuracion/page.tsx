'use client';

import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole } from '@/types';
import {
  Settings,
  Phone,
  Store,
  Users,
  UserPlus,
  ShieldCheck,
  Check,
  Save,
  MessageSquare,
  AlertCircle,
  ExternalLink,
  MapPin,
  Sliders,
  Image as ImageIcon,
  Key,
  Trash2,
  Plus,
  Lock,
} from 'lucide-react';

interface SlideConfigItem {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  button_text?: string;
  link_url?: string;
  bg_color?: string;
  image_url?: string;
}

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Ajustes de Tienda & Stand Físico
  const [storeName, setStoreName] = useState('ECLISSI STORE');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [address, setAddress] = useState('Stand Comercial - Lima, Perú');
  const [storePhone, setStorePhone] = useState('+51 961 339 776');
  const [storeEmail, setStoreEmail] = useState('contacto@eclipsestore.pe');
  const [storeRuc, setStoreRuc] = useState('20608912345');
  const [ticketFooterPhrase, setTicketFooterPhrase] = useState(
    '¡Gracias por tu preferencia! Cambios válidos dentro de los 7 días con etiqueta intacta y comprobante.'
  );
  const [savedSettings, setSavedSettings] = useState(false);

  // Slider Promocional
  const [sliderSpeedSeconds, setSliderSpeedSeconds] = useState(5);
  const [sliderAutoplay, setSliderAutoplay] = useState(true);
  const [slides, setSlides] = useState<SlideConfigItem[]>([]);
  const [savedSlider, setSavedSlider] = useState(false);

  // Gestión de Contraseñas de Usuarios Existentes
  const [userPasswords, setUserPasswords] = useState<Record<string, string>>({});
  const [savingUser, setSavingUser] = useState<string | null>(null);
  const [userSuccessMessage, setUserSuccessMessage] = useState<string | null>(null);

  // Nuevo usuario con contraseña
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('vendedor');
  const [newPassword, setNewPassword] = useState('vendedor123');
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUserCreated, setNewUserCreated] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [uRes, setRes, slideRes] = await Promise.all([
        fetch('/api/auth/users'),
        fetch('/api/settings'),
        fetch('/api/settings/slider'),
      ]);
      const uData = await uRes.json();
      const sData = await setRes.json();
      const slideData = await slideRes.json();

      setProfiles(uData.profiles || []);

      if (sData.settings) {
        setStoreName(sData.settings.store_name || 'ECLISSI STORE');
        setWhatsappNumber(sData.settings.whatsapp_number || '');
        setAddress(sData.settings.address || 'Stand Comercial - Lima, Perú');
        setStorePhone(sData.settings.store_phone || '+51 961 339 776');
        setStoreEmail(sData.settings.store_email || 'contacto@eclipsestore.pe');
        setStoreRuc(sData.settings.store_ruc || '20608912345');
        setTicketFooterPhrase(
          sData.settings.ticket_footer_phrase ||
            '¡Gracias por tu preferencia! Cambios válidos dentro de los 7 días con etiqueta intacta y comprobante.'
        );
      }

      if (slideData.slider) {
        setSliderSpeedSeconds(Math.round((slideData.slider.speed_ms || 5000) / 1000));
        setSliderAutoplay(slideData.slider.autoplay !== false);
        setSlides(slideData.slider.slides || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Guardar datos generales y ubicación física del Stand
  const handleSaveStoreConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_name: storeName,
          whatsapp_number: whatsappNumber.replace(/[^0-9]/g, ''),
          address,
          store_phone: storePhone,
          store_email: storeEmail,
          store_ruc: storeRuc,
          ticket_footer_phrase: ticketFooterPhrase,
        }),
      });
      if (!res.ok) throw new Error('Error al guardar');

      setSavedSettings(true);
      setTimeout(() => setSavedSettings(false), 2500);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Guardar configuración del Slider
  const handleSaveSlider = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings/slider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          speed_ms: Math.max(2, sliderSpeedSeconds) * 1000,
          autoplay: sliderAutoplay,
          slides,
        }),
      });
      if (!res.ok) throw new Error('Error al guardar configuración del slider');

      setSavedSlider(true);
      setTimeout(() => setSavedSlider(false), 2500);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Subir imagen para un slide específico
  const handleUploadSlideImage = async (e: React.ChangeEvent<HTMLInputElement>, slideId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSlides((prev) =>
        prev.map((s) => (s.id === slideId ? { ...s, image_url: data.url } : s))
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Actualizar contraseña de un usuario existente
  const handleUpdateUserPassword = async (userId: string) => {
    const newPwd = userPasswords[userId];
    if (!newPwd || !newPwd.trim()) {
      alert('Ingresa una contraseña válida.');
      return;
    }

    setSavingUser(userId);
    try {
      const target = profiles.find((p) => p.id === userId);
      const res = await fetch('/api/auth/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          full_name: target?.full_name,
          role: target?.role,
          password: newPwd.trim(),
        }),
      });
      if (!res.ok) throw new Error('Error actualizando contraseña');

      setUserSuccessMessage(`Contraseña de ${target?.full_name} actualizada exitosamente.`);
      setTimeout(() => setUserSuccessMessage(null), 3000);
      setUserPasswords((prev) => ({ ...prev, [userId]: '' }));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingUser(null);
    }
  };

  // Crear nuevo usuario con contraseña
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail.trim(),
          full_name: newName.trim(),
          role: newRole,
          password: newPassword.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNewUserCreated(true);
      setNewEmail('');
      setNewName('');
      setNewPassword('vendedor123');
      loadData();
      setTimeout(() => setNewUserCreated(false), 2500);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreatingUser(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl text-neutral-900">
      {/* Header */}
      <div className="flex items-center gap-3 bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center text-white">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-black text-black uppercase tracking-wider">
            Configuración del Stand, Slider & Cuentas
          </h2>
          <p className="text-neutral-500 text-xs">
            Gestiona la ubicación oficial del stand, velocidad e imágenes del slider promocional, y credenciales de acceso.
          </p>
        </div>
      </div>

      {/* 1. SECCIÓN: STAND FÍSICO Y UBICACIÓN OFICIAL */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
          <MapPin className="w-5 h-5 text-amber-500" />
          <div>
            <h3 className="text-sm font-black uppercase text-black">
              Ubicación del Stand Físico & Pedidos WhatsApp
            </h3>
            <p className="text-[11px] text-neutral-500">
              Al modificar la dirección del stand, se actualiza automáticamente en toda la página (barra superior, footer, catálogo y comprobantes).
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveStoreConfig} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Nombre de la Tienda:
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs font-bold text-black focus:outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Número Oficial de WhatsApp (ej. 51987654321):
              </label>
              <input
                type="text"
                placeholder="51999999999"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs font-bold text-black focus:outline-none focus:border-black"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Dirección / Ubicación del Stand Físico:
              </label>
              <input
                type="text"
                placeholder="Ej. Stand #104, Galería Gamarra Plaza - La Victoria, Lima, Perú"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs font-bold text-black focus:outline-none focus:border-black"
              />
              <span className="text-[10px] text-neutral-400 mt-1 block">
                Este texto se refleja inmediatamente en la barra superior del sitio web, detalle de prendas y tickets impresos.
              </span>
            </div>

            <div>
              <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1">
                RUC de la Tienda (Comprobantes):
              </label>
              <input
                type="text"
                placeholder="20608912345"
                value={storeRuc}
                onChange={(e) => setStoreRuc(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs font-bold text-black focus:outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Teléfono del Stand (Boleta/Factura):
              </label>
              <input
                type="text"
                placeholder="+51 961 339 776"
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs font-bold text-black focus:outline-none focus:border-black"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Correo Electrónico de la Tienda:
              </label>
              <input
                type="email"
                placeholder="contacto@eclipsestore.pe"
                value={storeEmail}
                onChange={(e) => setStoreEmail(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs font-bold text-black focus:outline-none focus:border-black"
              />
            </div>

            <div className="sm:col-span-2 bg-neutral-50 border border-neutral-200 rounded-xl p-3.5 space-y-1.5">
              <label className="block font-bold text-neutral-900 uppercase tracking-wider text-xs">
                Frase personalizada al final del Ticket / Comprobante:
              </label>
              <p className="text-[10px] text-neutral-500">
                Esta frase aparecerá impresa al pie de los tickets térmicos y comprobantes del Punto de Venta (POS).
              </p>
              <textarea
                rows={2}
                value={ticketFooterPhrase}
                onChange={(e) => setTicketFooterPhrase(e.target.value)}
                placeholder="Ej. ¡Gracias por tu preferencia! Cambios válidos dentro de los 7 días con etiqueta y comprobante."
                className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs text-black font-medium focus:outline-none focus:border-black"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {savedSettings ? (
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>¡Ubicación y datos de tienda guardados en todo el sistema!</span>
              </span>
            ) : <span />}

            <button
              type="submit"
              className="px-5 py-2.5 bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm transition"
            >
              Guardar Ubicación y Stand
            </button>
          </div>
        </form>
      </div>

      {/* 2. SECCIÓN: ADMINISTRACIÓN DEL SLIDER PROMOCIONAL */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-black" />
            <div>
              <h3 className="text-sm font-black uppercase text-black">
                Slider Promocional del Catálogo
              </h3>
              <p className="text-[11px] text-neutral-500">
                Ajusta la velocidad de transición, sube fotos de portada y personaliza los textos promocionales.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              setSlides([
                ...slides,
                {
                  id: 'slide-' + Date.now(),
                  title: 'NUEVO LANZAMIENTO ECLISSI',
                  subtitle: 'Descubre las prendas más destacadas de la temporada.',
                  badge: 'NOVEDAD',
                  button_text: 'Ver Catálogo',
                  link_url: '#productos',
                  bg_color: '#000000',
                  image_url: '',
                },
              ])
            }
            className="text-xs font-bold text-black hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Agregar Slide</span>
          </button>
        </div>

        <form onSubmit={handleSaveSlider} className="space-y-4 text-xs">
          {/* Configuración de Velocidad y Autoplay */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
            <div>
              <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Velocidad de Cambio de Slide (Segundos):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="2"
                  max="30"
                  required
                  value={sliderSpeedSeconds}
                  onChange={(e) => setSliderSpeedSeconds(parseInt(e.target.value, 10) || 5)}
                  className="w-24 bg-white border border-neutral-200 rounded-lg px-3 py-1.5 text-xs font-bold text-black focus:outline-none"
                />
                <span className="text-neutral-500 text-xs font-medium">segundos por diapositiva</span>
              </div>
            </div>

            <div className="flex items-center pt-4 sm:pt-0">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sliderAutoplay}
                  onChange={(e) => setSliderAutoplay(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-black focus:ring-black"
                />
                <span className="font-bold text-neutral-800 text-xs uppercase tracking-wide">
                  Reproducción Automática (Autoplay)
                </span>
              </label>
            </div>
          </div>

          {/* Lista de Slides */}
          <div className="space-y-3">
            {slides.map((s, idx) => (
              <div key={s.id} className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                  <span className="font-black uppercase tracking-wider text-black text-xs">
                    Slide #{idx + 1}
                  </span>
                  {slides.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSlides(slides.filter((item) => item.id !== s.id))}
                      className="text-neutral-400 hover:text-red-600 text-xs font-bold"
                    >
                      Eliminar Slide
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-neutral-500 font-bold uppercase mb-0.5">Título Principal:</label>
                    <input
                      type="text"
                      required
                      value={s.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSlides(slides.map((item) => (item.id === s.id ? { ...item, title: val } : item)));
                      }}
                      className="w-full bg-white border border-neutral-200 rounded px-2.5 py-1 text-xs font-bold text-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 font-bold uppercase mb-0.5">Subtítulo Descriptivo:</label>
                    <input
                      type="text"
                      value={s.subtitle}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSlides(slides.map((item) => (item.id === s.id ? { ...item, subtitle: val } : item)));
                      }}
                      className="w-full bg-white border border-neutral-200 rounded px-2.5 py-1 text-xs text-neutral-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 font-bold uppercase mb-0.5">Etiqueta Badge:</label>
                    <input
                      type="text"
                      value={s.badge || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSlides(slides.map((item) => (item.id === s.id ? { ...item, badge: val } : item)));
                      }}
                      className="w-full bg-white border border-neutral-200 rounded px-2.5 py-1 text-xs text-neutral-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 font-bold uppercase mb-0.5">Texto del Botón:</label>
                    <input
                      type="text"
                      value={s.button_text || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSlides(slides.map((item) => (item.id === s.id ? { ...item, button_text: val } : item)));
                      }}
                      className="w-full bg-white border border-neutral-200 rounded px-2.5 py-1 text-xs font-bold text-black focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-neutral-500 font-bold uppercase mb-0.5">Fotografía de Fondo (Subir o URL):</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="URL de la imagen de portada..."
                        value={s.image_url || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSlides(slides.map((item) => (item.id === s.id ? { ...item, image_url: val } : item)));
                        }}
                        className="flex-1 bg-white border border-neutral-200 rounded px-2.5 py-1 text-xs text-black focus:outline-none"
                      />
                      <label className="cursor-pointer px-3 py-1 bg-black text-white rounded text-xs font-bold uppercase tracking-wider shrink-0 hover:bg-neutral-800">
                        Subir Foto
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleUploadSlideImage(e, s.id)}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            {savedSlider ? (
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>¡Configuración del slider actualizada en vivo!</span>
              </span>
            ) : <span />}

            <button
              type="submit"
              className="px-5 py-2.5 bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm transition"
            >
              Guardar Configuración del Slider
            </button>
          </div>
        </form>
      </div>

      {/* 3. SECCIÓN: GESTIÓN DE USUARIOS Y CONTRASEÑAS */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
          <Lock className="w-5 h-5 text-black" />
          <div>
            <h3 className="text-sm font-black uppercase text-black">
              Cuentas de Usuarios & Contraseñas
            </h3>
            <p className="text-[11px] text-neutral-500">
              Modifica las contraseñas de vendedores o crea nuevos accesos para el personal del stand.
            </p>
          </div>
        </div>

        {userSuccessMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{userSuccessMessage}</span>
          </div>
        )}

        {/* Lista de Usuarios con Cambio de Contraseña */}
        <div className="space-y-3">
          <span className="font-bold uppercase tracking-wider text-neutral-700 text-xs block">
            Usuarios Registrados en el Sistema:
          </span>
          <div className="divide-y divide-neutral-200 border border-neutral-200 rounded-xl overflow-hidden">
            {profiles.map((p) => (
              <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-black text-sm">{p.full_name}</span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                      p.role === 'admin' ? 'bg-amber-100 text-amber-900' : 'bg-neutral-100 text-neutral-800'
                    }`}>
                      {p.role === 'admin' ? 'Administrador' : 'Vendedor'}
                    </span>
                  </div>
                  <span className="text-neutral-500 text-xs">{p.email}</span>
                </div>

                {/* Formulario rápido para actualizar contraseña */}
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    placeholder="Nueva contraseña..."
                    value={userPasswords[p.id] || ''}
                    onChange={(e) =>
                      setUserPasswords({ ...userPasswords, [p.id]: e.target.value })
                    }
                    className="w-36 sm:w-44 bg-neutral-50 border border-neutral-200 rounded px-2.5 py-1 text-xs text-black focus:outline-none focus:border-black"
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdateUserPassword(p.id)}
                    disabled={savingUser === p.id || !userPasswords[p.id]}
                    className="px-3 py-1 bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase rounded transition disabled:opacity-30"
                  >
                    {savingUser === p.id ? 'Guardando...' : 'Cambiar Clave'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Crear Nuevo Usuario con Contraseña */}
        <div className="pt-4 border-t border-neutral-100 space-y-3">
          <span className="font-bold uppercase tracking-wider text-neutral-700 text-xs block">
            Crear Nueva Cuenta de Usuario:
          </span>
          <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-neutral-50 p-4 rounded-xl border border-neutral-200 text-xs">
            <div>
              <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-0.5">Nombre Completo:</label>
              <input
                type="text"
                required
                placeholder="Ej. Juan Pérez"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-white border border-neutral-200 rounded px-2.5 py-1.5 text-xs text-black focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-0.5">Correo Electrónico:</label>
              <input
                type="email"
                required
                placeholder="juan@eclipsestore.pe"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full bg-white border border-neutral-200 rounded px-2.5 py-1.5 text-xs text-black focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-0.5">Rol:</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
                className="w-full bg-white border border-neutral-200 rounded px-2.5 py-1.5 text-xs font-bold text-black focus:outline-none"
              >
                <option value="vendedor">Vendedor Stand</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-0.5">Contraseña Inicial:</label>
              <input
                type="text"
                required
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-white border border-neutral-200 rounded px-2.5 py-1.5 text-xs font-bold text-black focus:outline-none"
              />
            </div>

            <div className="sm:col-span-4 flex items-center justify-between pt-2">
              {newUserCreated && (
                <span className="text-xs font-bold text-emerald-700">
                  ¡Usuario creado correctamente! Ya puede ingresar con sus credenciales.
                </span>
              )}
              <button
                type="submit"
                disabled={creatingUser}
                className="ml-auto px-4 py-2 bg-black hover:bg-neutral-800 text-white font-black text-xs uppercase tracking-wider rounded-lg shadow-sm"
              >
                {creatingUser ? 'Registrando...' : '+ Crear Usuario'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
