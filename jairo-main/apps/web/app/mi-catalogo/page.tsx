"use client";

import { useState, useEffect, useRef } from "react";
import { Package, Plus, Edit, Trash2, Upload, Search, Grid, List, Eye, DollarSign, RefreshCw, FileSpreadsheet, X, Check, AlertCircle, Download } from "lucide-react";

interface Product {
    id: string;
    name: string;
    description: string;
    sku: string;
    price: number;
    price_dop?: number;
    currency: 'USD' | 'DOP';
    min_order_qty: number;
    images: string[];
    views: number;
    status: string;
    category_name: string;
    created_at: string;
}

interface CsvProduct {
    name: string;
    description?: string;
    sku?: string;
    price: number;
    minOrderQty?: number;
    valid?: boolean;
    error?: string;
}

type Currency = 'USD' | 'DOP';

export default function MiCatalogoPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showCreate, setShowCreate] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [displayCurrency, setDisplayCurrency] = useState<Currency>('DOP');
    const [exchangeRate, setExchangeRate] = useState<number>(59.50);
    const [rateLoading, setRateLoading] = useState(false);
    const [newProduct, setNewProduct] = useState({
        name: '',
        description: '',
        sku: '',
        price: 0,
        currency: 'DOP' as Currency,
        minOrderQty: 1
    });

    // CSV Import state
    const [csvProducts, setCsvProducts] = useState<CsvProduct[]>([]);
    const [csvFileName, setCsvFileName] = useState('');
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jairoapp.renace.tech/api';
    const getToken = () => localStorage.getItem("token");

    // Parse CSV file
    const parseCSV = (text: string): CsvProduct[] => {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) return [];

        const headerLine = lines[0]!;
        const headers = headerLine.toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
        const products: CsvProduct[] = [];

        for (let i = 1; i < lines.length; i++) {
            const dataLine = lines[i]!;
            const values = dataLine.split(',').map(v => v.trim().replace(/"/g, ''));
            const product: CsvProduct = {
                name: '',
                price: 0,
                valid: true
            };

            headers.forEach((header, idx) => {
                const value = values[idx] || '';
                if (header.includes('nombre') || header === 'name') product.name = value;
                else if (header.includes('descripcion') || header === 'description') product.description = value;
                else if (header === 'sku' || header.includes('codigo')) product.sku = value;
                else if (header.includes('precio') || header === 'price') product.price = parseFloat(value) || 0;
                else if (header.includes('cantidad') || header.includes('min') || header === 'qty') product.minOrderQty = parseInt(value) || 1;
            });

            // Validate
            if (!product.name) {
                product.valid = false;
                product.error = 'Nombre requerido';
            } else if (product.price <= 0) {
                product.valid = false;
                product.error = 'Precio inválido';
            }

            products.push(product);
        }

        return products;
    };

    // Handle file upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setCsvFileName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const parsed = parseCSV(text);
            setCsvProducts(parsed);
        };
        reader.readAsText(file);
    };

    // Import products to backend
    const importProducts = async () => {
        const validProducts = csvProducts.filter(p => p.valid);
        if (validProducts.length === 0) return;

        setImporting(true);
        setImportResult(null);

        try {
            const res = await fetch(`${API_URL}/products/import`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${getToken()}`
                },
                body: JSON.stringify({ products: validProducts })
            });

            const data = await res.json();
            setImportResult({
                success: data.imported || validProducts.length,
                failed: data.failed || 0
            });

            // Reload products after successful import
            loadProducts();
        } catch {
            setImportResult({ success: 0, failed: validProducts.length });
        } finally {
            setImporting(false);
        }
    };

    // Download CSV template
    const downloadTemplate = () => {
        const template = 'nombre,descripcion,sku,precio,cantidad_minima\nProducto Ejemplo,Descripción del producto,SKU-001,100.00,1';
        const blob = new Blob([template], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'plantilla_productos.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    useEffect(() => {
        loadProducts();
        fetchExchangeRate();
    }, []);

    // Fetch current DOP/USD exchange rate
    const fetchExchangeRate = async () => {
        setRateLoading(true);
        try {
            // Using a free exchange rate API
            const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
            const data = await res.json();
            if (data.rates?.DOP) {
                setExchangeRate(data.rates.DOP);
            }
        } catch {
            // Keep default rate of 59.50
        } finally {
            setRateLoading(false);
        }
    };

    const loadProducts = async () => {
        try {
            const res = await fetch(`${API_URL}/products/my/catalog`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            const data = await res.json();
            setProducts(data.productos || []);
        } catch {
            setLoading(false);
        }
    };

    const [createError, setCreateError] = useState('');

    const createProduct = async () => {
        setCreateError('');

        // Validate required fields
        if (!newProduct.name.trim()) {
            setCreateError('El nombre del producto es requerido');
            return;
        }
        if (newProduct.price <= 0) {
            setCreateError('El precio debe ser mayor a 0');
            return;
        }

        try {
            const priceData = {
                name: newProduct.name.trim(),
                description: newProduct.description.trim(),
                sku: newProduct.sku.trim(),
                min_order_qty: newProduct.minOrderQty || 1,
                // Always store in USD for consistency, convert if entered in DOP
                price: newProduct.currency === 'DOP'
                    ? newProduct.price / exchangeRate
                    : newProduct.price,
                price_dop: newProduct.currency === 'DOP'
                    ? newProduct.price
                    : newProduct.price * exchangeRate
            };

            const res = await fetch(`${API_URL}/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${getToken()}`
                },
                body: JSON.stringify(priceData)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                setCreateError(errData.message || 'Error al crear el producto');
                return;
            }

            setShowCreate(false);
            setNewProduct({ name: '', description: '', sku: '', price: 0, currency: 'DOP', minOrderQty: 1 });
            loadProducts();
        } catch {
            setCreateError('Error de conexión al servidor');
        }
    };

    const deleteProduct = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este producto?')) return;

        try {
            await fetch(`${API_URL}/products/${id}/delete`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            loadProducts();
        } catch {
            // Silent fail
        }
    };

    // Format currency based on selected display currency
    const formatPrice = (usdPrice: number) => {
        if (!usdPrice) return '—';

        if (displayCurrency === 'USD') {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2
            }).format(usdPrice);
        } else {
            const dopPrice = usdPrice * exchangeRate;
            return new Intl.NumberFormat('es-DO', {
                style: 'currency',
                currency: 'DOP',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(dopPrice);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Package className="text-primary" size={24} />
                            <h1 className="text-xl font-bold text-gray-900">Mi Catálogo</h1>
                            <span className="text-sm text-gray-500">({products.length} productos)</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowCreate(true)}
                                className="bg-primary text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 hover:bg-primary-600"
                            >
                                <Plus size={20} /> Agregar Producto
                            </button>
                        </div>
                    </div>

                    {/* Search, Currency Toggle & View Toggle */}
                    <div className="flex items-center gap-4 mt-4 flex-wrap">
                        <div className="flex-1 relative min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar productos..."
                                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>

                        {/* Currency Toggle */}
                        <div className="flex items-center gap-2">
                            <div className="flex bg-gradient-to-r from-gray-100 to-gray-50 rounded-xl p-1 border border-gray-200">
                                <button
                                    onClick={() => setDisplayCurrency('DOP')}
                                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${displayCurrency === 'DOP'
                                        ? 'bg-primary text-white shadow-md'
                                        : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                >
                                    🇩🇴 RD$
                                </button>
                                <button
                                    onClick={() => setDisplayCurrency('USD')}
                                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${displayCurrency === 'USD'
                                        ? 'bg-green-600 text-white shadow-md'
                                        : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                >
                                    🇺🇸 US$
                                </button>
                            </div>
                            <button
                                onClick={fetchExchangeRate}
                                disabled={rateLoading}
                                className="p-2 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-lg transition-all"
                                title={`Tasa: 1 USD = ${exchangeRate.toFixed(2)} DOP`}
                            >
                                <RefreshCw size={16} className={rateLoading ? 'animate-spin' : ''} />
                            </button>
                        </div>

                        {/* View Mode Toggle */}
                        <div className="flex bg-gray-100 rounded-xl p-1">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}
                            >
                                <Grid size={20} className={viewMode === 'grid' ? 'text-primary' : 'text-gray-500'} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
                            >
                                <List size={20} className={viewMode === 'list' ? 'text-primary' : 'text-gray-500'} />
                            </button>
                        </div>
                    </div>

                    {/* Exchange Rate Info */}
                    <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                        <DollarSign size={12} />
                        <span>Tasa de cambio: 1 USD = {exchangeRate.toFixed(2)} DOP</span>
                        {rateLoading && <span className="text-primary">(actualizando...)</span>}
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border">
                        <Package className="mx-auto text-gray-300 mb-4" size={64} />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No hay productos</h3>
                        <p className="text-gray-500 mb-6">Agrega productos para que otras empresas puedan encontrarlos</p>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => setShowCreate(true)}
                                className="bg-primary text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2"
                            >
                                <Plus size={20} /> Agregar Producto
                            </button>
                            <button
                                onClick={() => setShowImport(true)}
                                className="border border-gray-200 px-6 py-3 rounded-xl font-medium flex items-center gap-2 hover:bg-gray-50"
                            >
                                <Upload size={20} /> Importar CSV
                            </button>
                        </div>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredProducts.map((product) => (
                            <div key={product.id} className="bg-white rounded-2xl border overflow-hidden hover:shadow-lg transition-all group">
                                <div className="h-48 bg-gray-100 flex items-center justify-center">
                                    {product.images && product.images[0] ? (
                                        <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <Package className="text-gray-300" size={48} />
                                    )}
                                </div>
                                <div className="p-4">
                                    <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                                    {product.sku && <p className="text-sm text-gray-500">SKU: {product.sku}</p>}
                                    <div className="flex items-center justify-between mt-3">
                                        <span className="text-lg font-bold text-primary">{formatPrice(product.price)}</span>
                                        <div className="flex items-center gap-1 text-sm text-gray-500">
                                            <Eye size={14} /> {product.views || 0}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        <button className="flex-1 py-2 bg-gray-100 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-200 flex items-center justify-center gap-1">
                                            <Edit size={14} /> Editar
                                        </button>
                                        <button
                                            onClick={() => deleteProduct(product.id)}
                                            className="py-2 px-3 bg-red-50 rounded-lg text-red-600 hover:bg-red-100"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="text-left py-3 px-4 font-medium text-gray-700">Producto</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-700">SKU</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-700">Precio</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-700">Vistas</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-700">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                                    <Package className="text-gray-400" size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{product.name}</p>
                                                    <p className="text-sm text-gray-500 truncate max-w-xs">{product.description}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-gray-600">{product.sku || '—'}</td>
                                        <td className="py-3 px-4 font-medium text-primary">{formatPrice(product.price)}</td>
                                        <td className="py-3 px-4 text-gray-600">{product.views || 0}</td>
                                        <td className="py-3 px-4">
                                            <div className="flex justify-end gap-2">
                                                <button className="p-2 hover:bg-gray-100 rounded-lg">
                                                    <Edit size={16} className="text-gray-500" />
                                                </button>
                                                <button
                                                    onClick={() => deleteProduct(product.id)}
                                                    className="p-2 hover:bg-red-50 rounded-lg"
                                                >
                                                    <Trash2 size={16} className="text-red-500" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Agregar Producto</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                                <input
                                    type="text"
                                    value={newProduct.name}
                                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                                    placeholder="Nombre del producto"
                                    className="w-full px-4 py-3 bg-white border rounded-xl text-gray-900"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                                <textarea
                                    value={newProduct.description}
                                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                                    placeholder="Describe el producto..."
                                    rows={3}
                                    className="w-full px-4 py-3 bg-white border rounded-xl text-gray-900 resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                                    <input
                                        type="text"
                                        value={newProduct.sku}
                                        onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                                        placeholder="ABC-123"
                                        className="w-full px-4 py-3 bg-white border rounded-xl text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio (USD)</label>
                                    <input
                                        type="number"
                                        value={newProduct.price || ''}
                                        onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) })}
                                        placeholder="0.00"
                                        className="w-full px-4 py-3 bg-white border rounded-xl text-gray-900"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad mínima de pedido</label>
                                <input
                                    type="number"
                                    value={newProduct.minOrderQty}
                                    onChange={(e) => setNewProduct({ ...newProduct, minOrderQty: parseInt(e.target.value) })}
                                    min="1"
                                    className="w-full px-4 py-3 bg-white border rounded-xl text-gray-900"
                                />
                            </div>
                        </div>

                        {/* Error Message */}
                        {createError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mt-4 flex items-center gap-2">
                                <AlertCircle size={18} className="flex-shrink-0" />
                                <span className="text-sm">{createError}</span>
                            </div>
                        )}

                        <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowCreate(false);
                                    setCreateError('');
                                }}
                                className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-100 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={createProduct}
                                disabled={!newProduct.name || newProduct.price <= 0}
                                className="flex-1 py-3 bg-primary text-white rounded-xl font-medium disabled:opacity-50 hover:bg-primary-600 transition-colors"
                            >
                                Agregar Producto
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CSV Import Modal */}
            {showImport && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                        {/* Header */}
                        <div className="p-6 border-b flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-xl">
                                    <FileSpreadsheet className="text-primary" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Importar Productos</h2>
                                    <p className="text-sm text-gray-500">Carga múltiples productos desde un archivo CSV</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowImport(false);
                                    setCsvProducts([]);
                                    setCsvFileName('');
                                    setImportResult(null);
                                }}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            {/* Template Download */}
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                                <div className="flex items-start gap-3">
                                    <Download className="text-blue-600 mt-0.5" size={20} />
                                    <div className="flex-1">
                                        <h3 className="font-medium text-blue-900">Plantilla CSV</h3>
                                        <p className="text-sm text-blue-700 mb-2">Descarga la plantilla para asegurar el formato correcto</p>
                                        <button
                                            onClick={downloadTemplate}
                                            className="text-sm font-medium text-blue-600 hover:text-blue-800 underline"
                                        >
                                            Descargar plantilla
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* File Upload */}
                            <div className="mb-6">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary hover:bg-primary/5 transition-all"
                                >
                                    <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                                    <p className="font-medium text-gray-700">
                                        {csvFileName || 'Haz clic para seleccionar un archivo CSV'}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">o arrastra y suelta aquí</p>
                                </button>
                            </div>

                            {/* Preview Table */}
                            {csvProducts.length > 0 && (
                                <div className="border rounded-xl overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
                                        <span className="font-medium text-gray-900">
                                            Vista previa ({csvProducts.length} productos)
                                        </span>
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="flex items-center gap-1 text-green-600">
                                                <Check size={14} /> {csvProducts.filter(p => p.valid).length} válidos
                                            </span>
                                            {csvProducts.filter(p => !p.valid).length > 0 && (
                                                <span className="flex items-center gap-1 text-red-600">
                                                    <AlertCircle size={14} /> {csvProducts.filter(p => !p.valid).length} errores
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 sticky top-0">
                                                <tr>
                                                    <th className="px-4 py-2 text-left">Estado</th>
                                                    <th className="px-4 py-2 text-left">Nombre</th>
                                                    <th className="px-4 py-2 text-left">SKU</th>
                                                    <th className="px-4 py-2 text-right">Precio</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {csvProducts.map((product, idx) => (
                                                    <tr key={idx} className={`border-t ${!product.valid ? 'bg-red-50' : ''}`}>
                                                        <td className="px-4 py-2">
                                                            {product.valid ? (
                                                                <Check className="text-green-500" size={16} />
                                                            ) : (
                                                                <span className="flex items-center gap-1 text-red-500 text-xs">
                                                                    <AlertCircle size={14} /> {product.error}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2 font-medium">{product.name || '-'}</td>
                                                        <td className="px-4 py-2 text-gray-500">{product.sku || '-'}</td>
                                                        <td className="px-4 py-2 text-right">${product.price.toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Import Result */}
                            {importResult && (
                                <div className={`mt-4 p-4 rounded-xl ${importResult.failed > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                                    <div className="flex items-center gap-2">
                                        {importResult.failed === 0 ? (
                                            <Check className="text-green-600" size={20} />
                                        ) : (
                                            <AlertCircle className="text-yellow-600" size={20} />
                                        )}
                                        <span className={importResult.failed === 0 ? 'text-green-800' : 'text-yellow-800'}>
                                            {importResult.success} productos importados correctamente
                                            {importResult.failed > 0 && `, ${importResult.failed} fallaron`}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t flex gap-3">
                            <button
                                onClick={() => {
                                    setShowImport(false);
                                    setCsvProducts([]);
                                    setCsvFileName('');
                                    setImportResult(null);
                                }}
                                className="flex-1 py-3 border rounded-xl font-medium hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={importProducts}
                                disabled={importing || csvProducts.filter(p => p.valid).length === 0}
                                className="flex-1 py-3 bg-primary text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {importing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Importando...
                                    </>
                                ) : (
                                    <>
                                        <Upload size={18} />
                                        Importar {csvProducts.filter(p => p.valid).length} Productos
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
