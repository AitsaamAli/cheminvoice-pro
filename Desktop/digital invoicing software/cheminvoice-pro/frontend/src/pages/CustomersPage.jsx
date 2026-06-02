import { useState, useEffect } from 'react';
import { API } from '../App';

const PROVINCES = ['Punjab', 'Sindh', 'KPK', 'Balochistan', 'Islamabad', 'AJK', 'Gilgit-Baltistan'];

export default function CustomersPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    businessName: '', ntn: '', cnic: '', strn: '',
    address: '', province: 'Punjab', city: '',
    registrationType: 'UNREGISTERED',
    contactPerson: '', contactPhone: '', contactEmail: '',
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { loadCustomers(); }, []);

  const loadCustomers = async () => {
    try {
      const res = await API.get(`/companies/${user.companyId}/customers`);
      setCustomers(res.data.customers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await API.put(`/customers/${editingId}`, form);
      } else {
        await API.post(`/companies/${user.companyId}/customers`, form);
      }
      await loadCustomers();
      resetForm();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.details?.map(d => d.message).join(', ') || 'Error saving customer';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (c) => { setForm(c); setEditingId(c.id); setShowForm(true); };
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this customer?')) return;
    try { await API.delete(`/customers/${id}`); loadCustomers(); }
    catch { alert('Error deleting customer'); }
  };
  const resetForm = () => { setForm(emptyForm); setEditingId(null); setShowForm(false); };
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Customers</h1>
          <button onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-semibold">
            {showForm ? 'Cancel' : '+ New Customer'}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit' : 'New'} Customer</h2>
            <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">

              {/* Business Name - Full Width */}
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Business Name *</label>
                <input type="text" placeholder="Enter business name" required
                  value={form.businessName} onChange={e => set('businessName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* Registration Type */}
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Registration Type *</label>
                <select value={form.registrationType} onChange={e => set('registrationType', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="UNREGISTERED">Unregistered (No NTN)</option>
                  <option value="REGISTERED">Registered (Has NTN)</option>
                  <option value="FOREIGN">Foreign</option>
                </select>
              </div>

              {/* NTN & STRN */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">NTN (7 digits)</label>
                <input type="text" placeholder="1234567" maxLength={7}
                  value={form.ntn} onChange={e => set('ntn', e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">STRN (13 digits)</label>
                <input type="text" placeholder="1234567890123" maxLength={13}
                  value={form.strn} onChange={e => set('strn', e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* CNIC */}
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">CNIC</label>
                <input type="text" placeholder="35202-1234567-1"
                  value={form.cnic} onChange={e => set('cnic', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* Address */}
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
                <input type="text" placeholder="Street address"
                  value={form.address} onChange={e => set('address', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* Province */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Province *</label>
                <select value={form.province} onChange={e => set('province', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">City *</label>
                <input type="text" placeholder="City" required
                  value={form.city} onChange={e => set('city', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* Contact */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Contact Person</label>
                <input type="text" placeholder="Name"
                  value={form.contactPerson} onChange={e => set('contactPerson', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
                <input type="text" placeholder="03001234567"
                  value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                <input type="email" placeholder="customer@email.com"
                  value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <p className="text-xs text-gray-500 mt-1">Customer can access portal with this email</p>
              </div>

              <button type="submit" disabled={saving}
                className="col-span-2 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50">
                {saving ? 'Saving...' : (editingId ? 'Update Customer' : 'Save Customer')}
              </button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-bold text-gray-700">All Customers ({customers.length})</h2>
          </div>
          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading...</div>
          ) : customers.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              <p className="text-xl mb-2">No customers yet</p>
              <p className="text-sm">Click "+ New Customer" to add your first customer</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Business Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">NTN/CNIC</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">City</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Phone</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customers.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-semibold text-gray-800">{c.businessName}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          c.registrationType === 'REGISTERED' ? 'bg-green-100 text-green-800' :
                          c.registrationType === 'FOREIGN' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'}`}>
                          {c.registrationType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{c.ntn || c.cnic || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{c.city || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{c.contactPhone || '-'}</td>
                      <td className="px-6 py-4 text-center space-x-3">
                        <button onClick={() => handleEdit(c)} className="text-blue-600 hover:text-blue-800 text-sm font-semibold">Edit</button>
                        <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-800 text-sm font-semibold">Delete</button>
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
