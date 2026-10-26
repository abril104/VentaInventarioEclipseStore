'use client';

import React, { useState, useEffect } from 'react';
import { Product, ProductVariant } from '@/types';
import {
  Shirt,
  Search,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Edit3,
  Image as ImageIcon,
  Check,
  AlertCircle,
  X,
  Filter,
  Eye,
  Camera,
  Upload,
  Plus,
  Trash2,
  Download,
  Sparkles,
} from 'lucide-react';

export default function ProductsAdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'todos' | 'sin_precio' | 'sin_foto' | 'dama' | 'hombre'>('todos');
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  // Modal de Crear Nuevo Producto
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createGender, setCreateGender] = useState<'dama' | 'hombre' | 'unisex'>('dama');
  const [createCategory, setCreateCategory] = useState('cat-dama');
  const [createBasePrice, setCreateBasePrice] = useState('0');
  const [createIsNew, setCreateIsNew] = useState(true);
  const [createIsPublished, setCreateIsPublished] = useState(true);
  const [createImages, setCreateImages] = useState<{ storage_path: string; is_primary: boolean }[]>([
    { storage_path: '', is_primary: true },
  ]);
  const [createVariants, setCreateVariants] = useState<{
    size: string;
    color: string;
    sku: string;
    stock: number;
    cost_price: string;
  }[]>([
    { size: 'M', color: 'NEGRO', sku: '', stock: 5, cost_price: '0' },
  ]);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Modal de Edición
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [newBasePrice, setNewBasePrice] = useState('');
  const [editImages, setEditImages] = useState<{ storage_path: string; is_primary: boolean }[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [variantPriceOverrides, setVariantPriceOverrides] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products/list');
      const data = await res.json();
      setProducts(data.products || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Abrir Modal de Edición
  const openEditModal = (prod: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingProduct(prod);
    setEditName(prod.name);
    setNewBasePrice(prod.base_price > 0 ? String(prod.base_price) : '0');

    // Cargar fotos existentes (1 a 5 fotos)
    const existingImgs = (prod.images && prod.images.length > 0)
      ? prod.images.map((img) => ({ storage_path: img.storage_path, is_primary: img.is_primary }))
      : (prod.primary_image ? [{ storage_path: prod.primary_image, is_primary: true }] : []);

    if (existingImgs.length === 0) {
      existingImgs.push({ storage_path: '', is_primary: true });
    }
    setEditImages(existingImgs);

    const initialOverrides: Record<string, string> = {};
    prod.variants?.forEach((v) => {
      if (v.price_override !== null && v.price_override !== undefined) {
        initialOverrides[v.id] = String(v.price_override);
      }
    });
    setVariantPriceOverrides(initialOverrides);
    setSaveSuccess(false);
  };

  // Guardar Cambios en Producto Existente
  const handleSaveProductChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setIsSaving(true);
    try {
      const cleanImages = editImages.filter((img) => img.storage_path.trim() !== '');

      const resProd = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim() || editingProduct.name,
          base_price: parseFloat(newBasePrice) || 0,
          image_url: cleanImages.find((i) => i.is_primary)?.storage_path || cleanImages[0]?.storage_path || '',
          images: cleanImages,
        }),
      });
      if (!resProd.ok) throw new Error('Error al actualizar la prenda');

      // Actualizar variantes
      for (const v of editingProduct.variants || []) {
        const overrideVal = variantPriceOverrides[v.id];
        await fetch(`/api/variants/${v.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            price_override: overrideVal && overrideVal.trim() !== '' ? parseFloat(overrideVal) : null,
          }),
        });
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setEditingProduct(null);
        loadProducts();
      }, 1000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Eliminar Producto
  const handleDeleteProduct = async (prodId: string, prodName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`¿Estás seguro de eliminar "${prodName}" y todas sus variantes del sistema? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/products/${prodId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      loadProducts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Crear Producto Completo
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!createName.trim()) {
      setCreateError('El nombre del producto es obligatorio.');
      return;
    }
    if (createVariants.length === 0) {
      setCreateError('Debe ingresar al menos una variante con talla y color.');
      return;
    }

    setIsCreating(true);
    try {
      const cleanImages = createImages.filter((img) => img.storage_path.trim() !== '');

      const payload = {
        name: createName.trim(),
        description: createDesc.trim() || undefined,
        category_id: createCategory,
        gender: createGender,
        base_price: parseFloat(createBasePrice) || 0,
        is_new: createIsNew,
        is_published: createIsPublished,
        images: cleanImages,
        variants: createVariants.map((v) => ({
          size: v.size.toUpperCase().trim() || 'ESTÁNDAR',
          color: v.color.toUpperCase().trim() || 'NEGRO',
          sku: v.sku.trim() || undefined,
          stock: v.stock >= 0 ? v.stock : 0,
          cost_price: v.cost_price ? parseFloat(v.cost_price) : undefined,
        })),
      };

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear producto');

      setCreateModalOpen(false);
      resetCreateForm();
      loadProducts();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const resetCreateForm = () => {
    setCreateName('');
    setCreateDesc('');
    setCreateGender('dama');
    setCreateBasePrice('0');
    setCreateIsNew(true);
    setCreateIsPublished(true);
    setCreateImages([{ storage_path: '', is_primary: true }]);
    setCreateVariants([{ size: 'M', color: 'NEGRO', sku: '', stock: 5, cost_price: '0' }]);
    setCreateError(null);
  };

  // Subir Foto (Creación o Edición)
  const handleUploadPhoto = async (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
    isEdit: boolean
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error subiendo foto');

      if (isEdit) {
        setEditImages((prev) =>
          prev.map((img, idx) => (idx === index ? { ...img, storage_path: data.url } : img))
        );
      } else {
        setCreateImages((prev) =>
          prev.map((img, idx) => (idx === index ? { ...img, storage_path: data.url } : img))
        );
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Filtros de listado
  const filtered = products.filter((p) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchSku = p.variants?.some((v) => v.sku.toLowerCase().includes(q));
      if (!matchName && !matchSku) return false;
    }

    if (filterMode === 'sin_precio') return p.base_price === 0;
    if (filterMode === 'sin_foto') return !p.primary_image;
    if (filterMode === 'dama') return p.gender === 'dama';
    if (filterMode === 'hombre') return p.gender === 'hombre';

    return true;
  });

  const countWithoutPrice = products.filter((p) => p.base_price === 0).length;
  const countWithoutPhoto = products.filter((p) => !p.primary_image).length;

  return (
    <div className="space-y-6 text-neutral-900">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center text-white">
            <Shirt className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-black uppercase tracking-wider">
              Gestión de Prendas, Variantes & Fotos
            </h2>
            <p className="text-neutral-500 text-xs">
              Crea nuevos productos con 1 a 5 fotos, administra precios base y variantes sin depender del Excel inicial.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              resetCreateForm();
              setCreateModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm transition transform active:scale-95"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>+ Nueva Prenda</span>
          </button>

          <a
            href="/api/excel/export?type=inventory"
            download
            className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-800 text-xs font-bold uppercase rounded-lg transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Exportar Excel</span>
          </a>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 max-w-md relative">
          <input
            type="text"
            placeholder="Buscar prenda por nombre o SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-black rounded-lg pl-9 pr-3 py-2 text-xs font-semibold text-neutral-900 placeholder-neutral-400 focus:outline-none transition"
          />
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterMode('todos')}
            className={`px-3 py-1.5 rounded-lg border transition ${
              filterMode === 'todos'
                ? 'bg-black text-white border-black'
                : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:border-black'
            }`}
          >
            Todos ({products.length})
          </button>
          <button
            onClick={() => setFilterMode('sin_precio')}
            className={`px-3 py-1.5 rounded-lg border transition flex items-center gap-1 ${
              filterMode === 'sin_precio'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-neutral-50 border-neutral-200 text-amber-700 hover:border-amber-500'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Pendientes Precio ({countWithoutPrice})</span>
          </button>
          <button
            onClick={() => setFilterMode('sin_foto')}
            className={`px-3 py-1.5 rounded-lg border transition flex items-center gap-1 ${
              filterMode === 'sin_foto'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-neutral-50 border-neutral-200 text-blue-700 hover:border-blue-500'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Sin Foto ({countWithoutPhoto})</span>
          </button>
          <button
            onClick={() => setFilterMode('dama')}
            className={`px-3 py-1.5 rounded-lg border transition ${
              filterMode === 'dama'
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:border-black'
            }`}
          >
            Damas
          </button>
          <button
            onClick={() => setFilterMode('hombre')}
            className={`px-3 py-1.5 rounded-lg border transition ${
              filterMode === 'hombre'
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:border-black'
            }`}
          >
            Hombres
          </button>
        </div>
      </div>

      {/* Lista / Grid de Productos */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm divide-y divide-neutral-100">
        {loading ? (
          <div className="py-20 text-center text-neutral-400 text-xs">Cargando catálogo completo...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-neutral-400 space-y-2">
            <Shirt className="w-8 h-8 mx-auto text-neutral-300" />
            <p className="text-xs font-bold text-neutral-700">No se encontraron prendas con este filtro.</p>
          </div>
        ) : (
          filtered.map((prod) => {
            const isExpanded = expandedProductId === prod.id;
            const hasZeroPrice = prod.base_price === 0;
            const hasNoPhoto = !prod.primary_image;
            const imgCount = prod.images?.length || (prod.primary_image ? 1 : 0);

            return (
              <div key={prod.id} className="transition hover:bg-neutral-50/50">
                <div
                  onClick={() => setExpandedProductId(isExpanded ? null : prod.id)}
                  className="p-4 flex items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Miniatura Foto */}
                    <div className="w-14 h-16 rounded-lg bg-neutral-100 border border-neutral-200 overflow-hidden flex items-center justify-center shrink-0">
                      {prod.primary_image ? (
                        <img
                          src={prod.primary_image}
                          alt={prod.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-neutral-400" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-neutral-100 text-neutral-800">
                          {prod.gender}
                        </span>
                        <h4 className="text-sm font-bold text-black truncate">{prod.name}</h4>
                        {imgCount > 1 && (
                          <span className="text-[10px] text-neutral-500 font-bold bg-neutral-100 px-1.5 py-0.5 rounded">
                            {imgCount} fotos
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
                        <span>
                          {prod.variants?.length || 0} variantes &bull;{' '}
                          {prod.variants?.reduce((s, v) => s + v.stock, 0) || 0} un. stock
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Precio Base */}
                    <div className="text-right">
                      {hasZeroPrice ? (
                        <span className="text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                          S/ 0.00 (Pendiente)
                        </span>
                      ) : (
                        <span className="text-sm font-black text-black">
                          S/ {prod.base_price.toFixed(2)}
                        </span>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => openEditModal(prod, e)}
                        className="px-3 py-1.5 bg-black hover:bg-neutral-800 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={(e) => handleDeleteProduct(prod.id, prod.name, e)}
                        className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Eliminar prenda"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-neutral-400">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Vista desplegada de Variantes */}
                {isExpanded && (
                  <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100">
                    <div className="text-xs font-bold uppercase tracking-wider text-neutral-600 mb-2">
                      Variantes de Tallas & SKU:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      {prod.variants?.map((v) => (
                        <div
                          key={v.id}
                          className="bg-white p-2.5 rounded-lg border border-neutral-200 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-mono text-[10px] font-bold text-neutral-800 block">
                              {v.sku}
                            </span>
                            <span className="font-bold text-black">{v.size}</span> &bull;{' '}
                            <span className="text-neutral-500">{v.color}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-black block">
                              S/ {(v.price_override ?? prod.base_price).toFixed(2)}
                            </span>
                            <span className="text-[10px] text-neutral-500">
                              Stock: {v.stock}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: CREAR NUEVA PRENDA COMPLETA */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-base font-black uppercase tracking-wider text-black">
                  Registrar Nueva Prenda Deportiva
                </h3>
                <p className="text-xs text-neutral-500">
                  Ingresa los datos generales, hasta 5 fotografías y las variantes de tallas/stock.
                </p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-neutral-400 hover:text-black font-bold text-xl"
              >
                &times;
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateProduct} className="space-y-5 text-xs">
              {/* Sección 1: Datos Generales */}
              <div className="space-y-3">
                <div className="font-bold uppercase tracking-wider text-neutral-700 border-b border-neutral-100 pb-1">
                  1. Información General
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">Nombre de la Prenda *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Polo Sam Sulek Oversized"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs font-semibold text-black focus:outline-none focus:border-black"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">Precio Base de Venta (S/) *</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      required
                      placeholder="0.00"
                      value={createBasePrice}
                      onChange={(e) => setCreateBasePrice(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs font-black text-black focus:outline-none focus:border-black"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">Público / Género *</label>
                    <select
                      value={createGender}
                      onChange={(e) => setCreateGender(e.target.value as any)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs font-bold text-black focus:outline-none focus:border-black"
                    >
                      <option value="dama">Dama / Mujer</option>
                      <option value="hombre">Hombre</option>
                      <option value="unisex">Unisex</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">Categoría</label>
                    <select
                      value={createCategory}
                      onChange={(e) => setCreateCategory(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs font-bold text-black focus:outline-none focus:border-black"
                    >
                      <option value="cat-dama">Ropa Deportiva Dama</option>
                      <option value="cat-hombre">Ropa Deportiva Hombre</option>
                      <option value="cat-accesorios">Accesorios Deportivos</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Sección 2: Fotografías (1 a 5 fotos) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-1">
                  <span className="font-bold uppercase tracking-wider text-neutral-700">
                    2. Fotografías (Entre 1 y 5 fotos)
                  </span>
                  {createImages.length < 5 && (
                    <button
                      type="button"
                      onClick={() => setCreateImages([...createImages, { storage_path: '', is_primary: false }])}
                      className="text-xs font-bold text-black hover:underline"
                    >
                      + Agregar otra foto
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {createImages.map((img, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-neutral-50 p-2 rounded-lg border border-neutral-200">
                      <div className="w-10 h-10 rounded bg-neutral-200 overflow-hidden shrink-0 flex items-center justify-center">
                        {img.storage_path ? (
                          <img src={img.storage_path} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-neutral-400" />
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="URL de foto o usa el botón subir..."
                        value={img.storage_path}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCreateImages(createImages.map((item, i) => (i === idx ? { ...item, storage_path: val } : item)));
                        }}
                        className="flex-1 bg-white border border-neutral-200 rounded px-2.5 py-1 text-xs text-black focus:outline-none"
                      />
                      <label className="cursor-pointer px-2.5 py-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded text-xs font-bold shrink-0">
                        Subir
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleUploadPhoto(e, idx, false)}
                        />
                      </label>
                      <label className="flex items-center gap-1 text-[11px] font-bold text-neutral-700 shrink-0 cursor-pointer">
                        <input
                          type="radio"
                          name="createPrimaryImg"
                          checked={img.is_primary}
                          onChange={() => {
                            setCreateImages(createImages.map((item, i) => ({ ...item, is_primary: i === idx })));
                          }}
                        />
                        <span>Principal</span>
                      </label>
                      {createImages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setCreateImages(createImages.filter((_, i) => i !== idx))}
                          className="text-neutral-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Sección 3: Variantes (Tallas y Colores) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-1">
                  <span className="font-bold uppercase tracking-wider text-neutral-700">
                    3. Variantes de Tallas, Color y Stock
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setCreateVariants([
                        ...createVariants,
                        { size: 'L', color: 'NEGRO', sku: '', stock: 5, cost_price: '0' },
                      ])
                    }
                    className="text-xs font-bold text-black hover:underline"
                  >
                    + Agregar otra variante
                  </button>
                </div>

                <div className="space-y-2">
                  {createVariants.map((v, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 bg-neutral-50 p-2.5 rounded-lg border border-neutral-200 items-center">
                      <div className="col-span-3">
                        <label className="block text-[10px] text-neutral-500 font-bold mb-0.5">Talla</label>
                        <input
                          type="text"
                          required
                          placeholder="S, M, L, XL..."
                          value={v.size}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCreateVariants(createVariants.map((item, i) => (i === idx ? { ...item, size: val } : item)));
                          }}
                          className="w-full bg-white border border-neutral-200 rounded p-1 text-xs uppercase font-bold text-black"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-[10px] text-neutral-500 font-bold mb-0.5">Color</label>
                        <input
                          type="text"
                          required
                          placeholder="NEGRO, AZUL..."
                          value={v.color}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCreateVariants(createVariants.map((item, i) => (i === idx ? { ...item, color: val } : item)));
                          }}
                          className="w-full bg-white border border-neutral-200 rounded p-1 text-xs uppercase font-bold text-black"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-[10px] text-neutral-500 font-bold mb-0.5">Stock Inicial</label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={v.stock}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setCreateVariants(createVariants.map((item, i) => (i === idx ? { ...item, stock: val } : item)));
                          }}
                          className="w-full bg-white border border-neutral-200 rounded p-1 text-xs font-bold text-black"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] text-neutral-500 font-bold mb-0.5">Costo (S/)</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          placeholder="0.00"
                          value={v.cost_price}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCreateVariants(createVariants.map((item, i) => (i === idx ? { ...item, cost_price: val } : item)));
                          }}
                          className="w-full bg-white border border-neutral-200 rounded p-1 text-xs font-bold text-black"
                        />
                      </div>
                      <div className="col-span-1 text-center pt-3">
                        {createVariants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setCreateVariants(createVariants.filter((_, i) => i !== idx))}
                            className="text-neutral-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5 mx-auto" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-200 flex gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold uppercase rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 py-3 bg-black hover:bg-neutral-800 text-white font-black uppercase rounded-lg shadow-md"
                >
                  {isCreating ? 'Guardando Prenda...' : 'Registrar Prenda en Sistema'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDITAR PRENDA Y SUS FOTOS (1 A 5) */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-base font-black uppercase text-black">
                  Editar Prenda &bull; {editingProduct.name}
                </h3>
                <p className="text-xs text-neutral-500">
                  Actualiza el nombre, precio base y sus fotografías (1 a 5 fotos).
                </p>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-neutral-400 hover:text-black font-bold text-xl"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveProductChanges} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">Nombre de la Prenda:</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs font-bold text-black focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">Precio Base de Venta (S/):</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  value={newBasePrice}
                  onChange={(e) => setNewBasePrice(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs font-black text-black focus:outline-none focus:border-black"
                />
              </div>

              {/* Fotografías (1 a 5) */}
              <div className="space-y-2 border-t border-neutral-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-neutral-700">
                    Fotografías del Producto ({editImages.length} de 5)
                  </span>
                  {editImages.length < 5 && (
                    <button
                      type="button"
                      onClick={() => setEditImages([...editImages, { storage_path: '', is_primary: false }])}
                      className="text-xs font-bold text-black hover:underline"
                    >
                      + Agregar otra foto
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {editImages.map((img, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-neutral-50 p-2 rounded-lg border border-neutral-200">
                      <div className="w-10 h-10 rounded bg-neutral-200 overflow-hidden shrink-0 flex items-center justify-center">
                        {img.storage_path ? (
                          <img src={img.storage_path} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-neutral-400" />
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="URL de foto o usa el botón subir..."
                        value={img.storage_path}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditImages(editImages.map((item, i) => (i === idx ? { ...item, storage_path: val } : item)));
                        }}
                        className="flex-1 bg-white border border-neutral-200 rounded px-2.5 py-1 text-xs text-black focus:outline-none"
                      />
                      <label className="cursor-pointer px-2.5 py-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded text-xs font-bold shrink-0">
                        Subir
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleUploadPhoto(e, idx, true)}
                        />
                      </label>
                      <label className="flex items-center gap-1 text-[11px] font-bold text-neutral-700 shrink-0 cursor-pointer">
                        <input
                          type="radio"
                          name="editPrimaryImg"
                          checked={img.is_primary}
                          onChange={() => {
                            setEditImages(editImages.map((item, i) => ({ ...item, is_primary: i === idx })));
                          }}
                        />
                        <span>Principal</span>
                      </label>
                      {editImages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setEditImages(editImages.filter((_, i) => i !== idx))}
                          className="text-neutral-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Variantes & Precios Específicos */}
              {editingProduct.variants && editingProduct.variants.length > 0 && (
                <div className="space-y-2 border-t border-neutral-100 pt-3">
                  <span className="font-bold uppercase tracking-wider text-neutral-700 block">
                    Precios Específicos por Talla (Opcional):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {editingProduct.variants.map((v) => (
                      <div key={v.id} className="flex items-center justify-between p-2 bg-neutral-50 rounded border border-neutral-200">
                        <div className="truncate pr-2">
                          <b className="text-black font-mono">{v.sku}</b>
                          <div className="text-[10px] text-neutral-500">{v.size} - {v.color}</div>
                        </div>
                        <div className="w-20">
                          <input
                            type="number"
                            step="0.5"
                            placeholder={newBasePrice || '0.00'}
                            value={variantPriceOverrides[v.id] ?? ''}
                            onChange={(e) =>
                              setVariantPriceOverrides({ ...variantPriceOverrides, [v.id]: e.target.value })
                            }
                            className="w-full bg-white border border-neutral-200 rounded px-1.5 py-0.5 text-right text-xs font-bold text-black"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {saveSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>¡Cambios guardados exitosamente!</span>
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-lg uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-black hover:bg-neutral-800 text-white font-black rounded-lg uppercase shadow-md"
                >
                  {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
