import { useState, useEffect } from 'react';
import { API } from '../App';

export default function SettingsPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCompany();
  }, []);

  const loadCompany = async () => {
    try {
      // Company info would be fetched from API
      // For now, we'll use mock data from user object
      setCompany({
        id: user.companyId,
        businessName: 'Sample Company',
        ntn: '1234567',
        strn: '1234567890123',
        address: '123 Main Street',
        province: 'Punjab',
        city: 'Lahore',
        contactPhone: '+92-21-111-222-333',
        contactEmail: 'info@company.com',
      });
    } catch (error) {
      console.error('Failed to load company:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // API call would be made here
      alert('Settings saved successfully!');
    } catch (error) {
      alert('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!company) return <div className="p-8 text-center">Company not found</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Settings</h1>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">Company Information</h2>
          </div>

          <form onSubmit={handleSave} className="p-6">
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-semibold mb-2">Business Name</label>
                <input
                  type="text"
                  value={company.businessName}
                  onChange={(e) => setCompany({ ...company, businessName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">NTN</label>
                <input
                  type="text"
                  value={company.ntn}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">STRN</label>
                <input
                  type="text"
                  value={company.strn}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Province</label>
                <input
                  type="text"
                  value={company.province}
                  onChange={(e) => setCompany({ ...company, province: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-semibold mb-2">Address</label>
                <input
                  type="text"
                  value={company.address}
                  onChange={(e) => setCompany({ ...company, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">City</label>
                <input
                  type="text"
                  value={company.city}
                  onChange={(e) => setCompany({ ...company, city: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Contact Phone</label>
                <input
                  type="text"
                  value={company.contactPhone}
                  onChange={(e) => setCompany({ ...company, contactPhone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Contact Email</label>
                <input
                  type="email"
                  value={company.contactEmail}
                  onChange={(e) => setCompany({ ...company, contactEmail: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-8 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        <div className="grid grid-cols-2 gap-6 mt-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-4">FBR Settings</h3>
            <p className="text-sm text-gray-600 mb-4">Mode: <span className="font-semibold text-yellow-600">Sandbox</span></p>
            <p className="text-xs text-gray-500 mb-4">You're currently in sandbox mode. Switch to production when FBR integration is complete.</p>
            <button className="w-full bg-yellow-600 text-white py-2 rounded-lg hover:bg-yellow-700 font-semibold">
              Switch to Production
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-4">Database Backup</h3>
            <p className="text-xs text-gray-500 mb-4">Backup your data securely. Required for compliance.</p>
            <div className="flex gap-2">
              <button className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-semibold text-sm">
                Backup Now
              </button>
              <button className="flex-1 bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 font-semibold text-sm">
                Restore
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow mt-6 p-6">
          <h3 className="text-lg font-bold mb-4">Tax Configuration</h3>
          <div className="grid grid-cols-4 gap-4">
            {[
              { rate: '0%', label: 'Zero-Rated' },
              { rate: '5%', label: 'Reduced' },
              { rate: '10%', label: 'Reduced' },
              { rate: '18%', label: 'Standard' },
            ].map((tax, idx) => (
              <div key={idx} className="border border-gray-300 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{tax.rate}</div>
                <div className="text-sm text-gray-600">{tax.label}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-4">Tax rates are configured per product. Customize in Products section.</p>
        </div>
      </div>
    </div>
  );
}
