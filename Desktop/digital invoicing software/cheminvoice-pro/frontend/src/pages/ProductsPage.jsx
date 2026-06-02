import { useState, useEffect } from 'react';
import { API } from '../App';

export default function ProductsPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    productName: '',
    productCode: '',
    hsCode: '',
    description: '',
    unitOfMeasure: 'KGM',
    defaultSalePrice: 0,
    defaultTaxRate: 18,
    chemicalCategory: '',
    hazardClassification: '',
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const res = await API.get(`/companies/${user.companyId}/products`);
      setProducts(res.data.products || []);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await API.put(`/products/${editingId}`, form);
      } else {
        await API.post(`/companies/${user.companyId}/products`, form);
      }
      loadProducts();
      resetForm();
    } catch (error) {
      alert(error.response?.data?.error || 'Error saving product');
    }
  };

  const handleEdit = (product) => {
    setForm(product);
    setEditingId(product.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this product?')) {
      try {
        await API.delete(`/products/${id}`);
        loadProducts();
      } catch (error) {
        alert('Error deleting product');
      }
    }
  };

  const resetForm = () => {
    setForm({
      productName: '',
      productCode: '',
      hsCode: '',
      description: '',
      unitOfMeasure: 'KGM',
      defaultSalePrice: 0,
      defaultTaxRate: 18,
      chemicalCategory: '',
      hazardClassification: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Products (Chemicals)</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            {showForm ? 'Cancel' : '+ New Product'}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit' : 'New'} Product</h2>
            <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Product Name *"
                required
                value={form.productName}
                onChange={(e) => setForm({ ...form, productName: e.target.value })}
                className="col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <input
                type="text"
                placeholder="Product Code *"
                required
                value={form.productCode}
                onChange={(e) => setForm({ ...form, productCode: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <input
                type="text"
                placeholder="HS Code (4-8 digits) *"
                required
                value={form.hsCode}
                onChange={(e) => setForm({ ...form, hsCode: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <input
                type="text"
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <select
                value={form.unitOfMeasure}
                onChange={(e) => setForm({ ...form, unitOfMeasure: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="KGM">KG (Kilogram)</option>
                <option value="LTR">LTR (Litre)</option>
                <option value="TNE">TNE (Tonne)</option>
                <option value="DRM">DRM (Drum)</option>
                <option value="BAG">BAG</option>
                <option value="NUM">NUM (Number)</option>
              </select>

              <input
                type="number"
                step="0.01"
                placeholder="Default Sale Price *"
                required
                value={form.defaultSalePrice}
                onChange={(e) => setForm({ ...form, defaultSalePrice: parseFloat(e.target.value) })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <select
                value={form.defaultTaxRate}
                onChange={(e) => setForm({ ...form, defaultTaxRate: parseInt(e.target.value) })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="0">0% (Zero-rated)</option>
                <option value="5">5% (Reduced)</option>
                <option value="10">10% (Reduced)</option>
                <option value="18">18% (Standard)</option>
              </select>

              <input
                type="text"
                placeholder="Chemical Category (e.g., Sulfuric Acid)"
                value={form.chemicalCategory}
                onChange={(e) => setForm({ ...form, chemicalCategory: e.target.value })}
                className="col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <input
                type="text"
                placeholder="Hazard Classification"
                value={form.hazardClassification}
                onChange={(e) => setForm({ ...form, hazardClassification: e.target.value })}
                className="col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <button
                type="submit"
                className="col-span-2 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-semibold"
              >
                {editingId ? 'Update' : 'Save'} Product
              </button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="p-6 text-center">Loading...</div>
          ) : products.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No products yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Product Name</th>
                    <th className="px-4 py-3 text-left font-semibold">Code</th>
                    <th className="px-4 py-3 text-left font-semibold">HS Code</th>
                    <th className="px-4 py-3 text-left font-semibold">Unit</th>
                    <th className="px-4 py-3 text-right font-semibold">Price</th>
                    <th className="px-4 py-3 text-center font-semibold">Tax</th>
                    <th className="px-4 py-3 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(prod => (
                    <tr key={prod.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold">{prod.productName}</td>
                      <td className="px-4 py-3">{prod.productCode}</td>
                      <td className="px-4 py-3 font-mono text-blue-600">{prod.hsCode}</td>
                      <td className="px-4 py-3">{prod.unitOfMeasure}</td>
                      <td className="px-4 py-3 text-right">PKR {parseFloat(prod.defaultSalePrice).toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">{prod.defaultTaxRate}%</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleEdit(prod)}
                          className="text-blue-600 hover:text-blue-800 text-sm mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(prod.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
