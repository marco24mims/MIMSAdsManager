import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Campaigns from './pages/Campaigns';
import CampaignDetail from './pages/CampaignDetail';
import LineItemDetail from './pages/LineItemDetail';
import Reports from './pages/Reports';
import AdUnits from './pages/AdUnits';
import TargetingKeys from './pages/TargetingKeys';

function App() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Campaigns' },
    { path: '/ad-units', label: 'Ad Units' },
    { path: '/targeting-keys', label: 'Targeting Keys' },
    { path: '/reports', label: 'Reports' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-blue-600">MIMS Ad Manager</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      location.pathname === item.path
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<Campaigns />} />
          <Route path="/campaigns/:id" element={<CampaignDetail />} />
          <Route path="/line-items/:id" element={<LineItemDetail />} />
          <Route path="/ad-units" element={<AdUnits />} />
          <Route path="/targeting-keys" element={<TargetingKeys />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
