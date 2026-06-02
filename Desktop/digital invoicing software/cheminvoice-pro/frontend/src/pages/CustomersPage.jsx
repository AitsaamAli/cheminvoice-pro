import { useState, useEffect } from 'react';
import { API } from '../App';

export default function CustomersPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    businessName: '',
    ntn: '',
    cnic: '',
    strn: '',
    address: '',
    province: '',
    city: '',
    registrationType: 'UNREGISTERED',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const res = await API.get(`/companies/${user.companyId}/customers`);
      setCustomers(res.data.customers || []);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await API.put(`/customers/${editingId}`, form);
      } else {
        await API.post(`/companies/${user.companyId}/customers`, form);
      }
      loadCustomers();
      resetForm();
    } catch (error) {
      alert(error.response?.data?.error || 'Error saving customer');
    }
  };

  const handleEdit = (customer) => {
    setForm(customer);
    setEditingId(customer.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this customer?')) {
      try {
        await API.delete(`/customers/${id}`);
        loadCustomers();
      } catch (error) {
        alert('Error deleting customer');
      }
    }
  };

  const resetForm = () => {
    setForm({
      businessName: '',
      ntn: '',
      cnic: '',
      strn: '',
      address: '',
      province: '',
      city: '',
      registrationType: 'UNREGISTERED',
      contactPerson: '',
      contactPhone: '',
      contactEmail: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Customers</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            {showForm ? 'Cancel' : '+ New Customer'}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit' : 'New'} Customer</h2>
            <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Business Name *"
                required
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                className="col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <input
                type="text"
                placeholder="NTN (7 digits)"
                value={form.ntn}
                onChange={(e) => setForm({ ...form, ntn: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <input
                type="text"
                placeholder="CNIC"
                value={form.cnic}
                onChange={(e) => setForm({ ...form, cnic: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <input
                type="text"
                placeholder="STRN (13 digits)"
                value={form.strn}
                onChange={(e) => setForm({ ...form, strn: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <select
                value={form.registrationType}
                onChange={(e) => setForm({ ...form, registrationType: e.target.value })}
                className="col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="REGISTERED">Registered</option>
                <option value="UNREGISTERED">Unregistered</option>
                <option value="FOREIGN">Foreign</option>
              </select>

              <input
                type="text"
                placeholder="Address *"
                required
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <input
                type="text"
                placeholder="Province *"
                required
                value={form.province}
                onChange={(e) => setForm({ ...form, province: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <input
                type="text"
                placeholder="City *"
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <input
                type="text"
                placeholder="Contact Person"
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <input
                type="text"
                placeholder="Contact Phone"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <input
                type="email"
                placeholder="Contact Email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <button
                type="submit"
                className="col-span-2 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-semibold"
              >
                {editingId ? 'Update' : 'Save'} Customer
              </button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="p-6 text-center">Loading...</div>
          ) : customers.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No customers yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Business Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Type</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">NTN/CNIC</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">City</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map(cust => (
                    <tr key={cust.id} className="border-t hover:bg-gray-50">
                      <td className="px-6 py-4 font-semibold">{cust.businessName}</td>
                      <td className="px-6 py-4 text-sm">{cust.registrationType}</td>
                      <td className="px-6 py-4 text-sm">{cust.ntn || cust.cnic || '-'}</td>
                      <td className="px-6 py-4 text-sm">{cust.city}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleEdit(cust)}
                          className="text-blue-600 hover:text-blue-800 text-sm mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(cust.id)}
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
