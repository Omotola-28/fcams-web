// src/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ShieldCheck, CheckCircle, XCircle, Plus, X, ArrowLeftRight } from 'lucide-react';
import { authService } from '../services/authService';
import { assetService } from '../services/assetService';
import { transactionService } from '../services/transactionService';
import { supabase } from '../config/supabase';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [adminUser, setAdminUser] = useState(null);
  const [allRequests, setAllRequests] = useState([]);
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState('requests');
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAsset, setNewAsset] = useState({ name: '', asset_tag: '', category_id: '' });

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      const session = await authService.getCurrentSession();
      if (!session) {
        navigate('/login');
        return;
      }
      setAdminUser(session.user);

      const { data: requestsData } = await supabase
        .from('borrowing_requests')
        .select(`
          *,
          profiles!borrowing_requests_borrower_id_fkey(full_name, id_number),
          assets(name, asset_tag)
        `)
        .order('created_at', { ascending: false });
      if (requestsData) setAllRequests(requestsData);

      const assetsData = await assetService.getAllAssets();
      setAssets(assetsData);

      const { data: catData } = await supabase.from('categories').select('*');
      if (catData) setCategories(catData);

    } catch (error) {
      console.error("Error loading admin data:", error);
    }
  };

  const handleApprove = async (request) => {
    try {
      await transactionService.issueEquipment(
        request.id,
        adminUser.id,
        request.asset_id,
        request.requested_to,
        'Good'
      );
      loadAdminData(); 
    } catch (error) {
      alert("Error approving request: " + error.message);
    }
  };

  const handleReject = async (requestId) => {
    try {
      await supabase
        .from('borrowing_requests')
        .update({ status: 'Rejected', reviewed_by: adminUser.id, reviewed_at: new Date().toISOString() })
        .eq('id', requestId);
      loadAdminData();
    } catch (error) {
      alert("Error rejecting request: " + error.message);
    }
  };

  const handleAddAsset = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('assets').insert([{
        name: newAsset.name,
        asset_tag: newAsset.asset_tag,
        category_id: newAsset.category_id,
        status: 'Available'
      }]);
      if (error) throw error;
      
      setShowAddForm(false);
      setNewAsset({ name: '', asset_tag: '', category_id: '' });
      loadAdminData(); 
    } catch (error) {
      alert("Error adding equipment: " + error.message);
    }
  };

  // NEW: Function to handle returning equipment
  const handleReturn = async (assetId) => {
    try {
      const { error } = await supabase
        .from('assets')
        .update({ status: 'Available' })
        .eq('id', assetId);
      
      if (error) throw error;
      loadAdminData();
    } catch (error) {
      alert("Error returning equipment: " + error.message);
    }
  };

  const handleLogout = async () => {
    await authService.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gray-900 text-white shadow-md px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="h-6 w-6 text-blue-400" />
          <h1 className="text-xl font-bold tracking-wide">FCAMS Admin Portal</h1>
        </div>
        <button onClick={handleLogout} className="flex items-center space-x-2 text-sm font-medium hover:text-gray-300 transition-colors">
          <LogOut className="h-5 w-5" />
          <span>Sign Out</span>
        </button>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex space-x-4 mb-6 border-b border-gray-200 pb-2">
          <button 
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${activeTab === 'requests' ? 'text-blue-700 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            Pending Requests
          </button>
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${activeTab === 'inventory' ? 'text-blue-700 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            Asset Inventory
          </button>
        </div>

        {activeTab === 'requests' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 font-semibold">Borrower</th>
                  <th className="px-4 py-3 font-semibold">Equipment</th>
                  <th className="px-4 py-3 font-semibold">Dates</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allRequests.map(req => (
                  <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{req.profiles?.full_name}</div>
                      <div className="text-xs text-gray-500">{req.profiles?.id_number}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{req.assets?.name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(req.requested_from).toLocaleDateString()} to {new Date(req.requested_to).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        req.status === 'Approved' ? 'bg-green-100 text-green-700' :
                        req.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {req.status === 'Pending' && (
                        <div className="flex justify-end space-x-2">
                          <button onClick={() => handleApprove(req)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors" title="Approve">
                            <CheckCircle className="h-5 w-5" />
                          </button>
                          <button onClick={() => handleReject(req.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Reject">
                            <XCircle className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">Faculty Equipment</h2>
              <button 
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                <span>{showAddForm ? 'Cancel' : 'Add Equipment'}</span>
              </button>
            </div>

            {showAddForm && (
              <form onSubmit={handleAddAsset} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Name</label>
                  <input required type="text" value={newAsset.name} onChange={e => setNewAsset({...newAsset, name: e.target.value})} placeholder="e.g. Projector" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Asset Tag</label>
                  <input required type="text" value={newAsset.asset_tag} onChange={e => setNewAsset({...newAsset, asset_tag: e.target.value})} placeholder="e.g. PRJ-001" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select required value={newAsset.category_id} onChange={e => setNewAsset({...newAsset, category_id: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm bg-white">
                    <option value="">Select Category...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="w-full bg-gray-900 text-white font-medium py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm h-[38px]">
                  Save Asset
                </button>
              </form>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Tag</th>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {assets.map(asset => (
                    <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{asset.asset_tag}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{asset.name}</td>
                      <td className="px-4 py-3 text-gray-600">{asset.categories?.name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          asset.status === 'Available' ? 'bg-green-100 text-green-700' : 
                          asset.status === 'On Loan' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {asset.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {/* Show Return button only if the asset is currently On Loan */}
                        {asset.status === 'On Loan' && (
                          <button 
                            onClick={() => handleReturn(asset.id)} 
                            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors text-xs font-medium"
                          >
                            <ArrowLeftRight className="h-3.5 w-3.5" />
                            <span>Return</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}