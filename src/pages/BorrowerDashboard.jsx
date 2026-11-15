// src/pages/BorrowerDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Package, Calendar, Clock, AlertCircle } from 'lucide-react';
import { authService } from '../services/authService';
import { assetService } from '../services/assetService';
import { transactionService } from '../services/transactionService';
import { supabase } from '../config/supabase';

export default function BorrowerDashboard() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [requests, setRequests] = useState([]);
  const [user, setUser] = useState(null);
  
  const [selectedAsset, setSelectedAsset] = useState('');
  const [purpose, setPurpose] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const session = await authService.getCurrentSession();
      if (!session) {
        navigate('/login');
        return;
      }
      setUser(session.user);

      // Fetch assets that are currently available to borrow
      const availableAssets = await assetService.getBorrowableAssets();
      setAssets(availableAssets);

      // Fetch the logged-in user's previous and active requests
      const { data: myRequests } = await supabase
        .from('borrowing_requests')
        .select('*, assets(name, asset_tag)')
        .eq('borrower_id', session.user.id)
        .order('created_at', { ascending: false });
        
      if (myRequests) setRequests(myRequests);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleLogout = async () => {
    await authService.signOut();
    navigate('/login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    try {
      await transactionService.submitRequest(user.id, selectedAsset, startDate, endDate, purpose);
      setMessage({ type: 'success', text: 'Request submitted successfully!' });
      
      // Reset form fields after successful submission
      setSelectedAsset('');
      setPurpose('');
      setStartDate('');
      setEndDate('');
      loadData(); // Refresh the tables
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-blue-600 text-white shadow-md px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Package className="h-6 w-6" />
          <h1 className="text-xl font-bold tracking-wide">Faculty Asset Management</h1>
        </div>
        <button onClick={handleLogout} className="flex items-center space-x-2 text-sm font-medium hover:text-blue-200 transition-colors">
          <LogOut className="h-5 w-5" />
          <span>Sign Out</span>
        </button>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column: Request Form */}
        <div className="md:col-span-1 bg-white rounded-xl shadow-sm p-6 border border-gray-100 h-fit">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-blue-600" />
            New Borrowing Request
          </h2>
          
          {message.text && (
            <div className={`mb-4 p-3 rounded-md text-sm flex items-center ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Equipment</label>
              <select required value={selectedAsset} onChange={(e) => setSelectedAsset(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm bg-white">
                <option value="">-- Choose an asset --</option>
                {assets.map(asset => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name} ({asset.asset_tag})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
              <textarea required rows="3" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="State your reason for borrowing..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"></textarea>
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 transition-colors">
              Submit Request
            </button>
          </form>
        </div>

        {/* Right Column: Request History */}
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-blue-600" />
            My Requests
          </h2>
          
          {requests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p>You haven't made any borrowing requests yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 font-semibold rounded-tl-lg">Equipment</th>
                    <th className="px-4 py-3 font-semibold">Dates</th>
                    <th className="px-4 py-3 font-semibold">Purpose</th>
                    <th className="px-4 py-3 font-semibold rounded-tr-lg">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {requests.map(req => (
                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{req.assets?.name}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(req.requested_from).toLocaleDateString()} - {new Date(req.requested_to).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-gray-600 truncate max-w-[200px]">{req.purpose}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          req.status === 'Approved' ? 'bg-green-100 text-green-700' :
                          req.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {req.status}
                        </span>
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