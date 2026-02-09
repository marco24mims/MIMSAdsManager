import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  getReportSummary,
  getDailyReport,
  getKeyValueReport,
  getLineItemReport,
  type ReportSummary,
  type DailyStats,
} from '../api';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

interface KeyValueStat {
  key: string;
  value: string;
  impressions: number;
  clicks: number;
  viewable: number;
  ctr: number;
}

interface LineItemStat {
  line_item_id: number;
  line_item_name: string;
  campaign_name: string;
  impressions: number;
  clicks: number;
  viewable: number;
  ctr: number;
}

export default function Reports() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [keyValueStats, setKeyValueStats] = useState<KeyValueStat[]>([]);
  const [lineItemStats, setLineItemStats] = useState<LineItemStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState('country');
  const [activeTab, setActiveTab] = useState<'overview' | 'keyvalue' | 'lineitems'>('overview');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadData();
  }, [dateRange, selectedKey]);

  async function loadData() {
    try {
      setLoading(true);
      const [summaryData, dailyData, kvData, liData] = await Promise.all([
        getReportSummary(dateRange.start, dateRange.end),
        getDailyReport(dateRange.start, dateRange.end),
        getKeyValueReport(selectedKey, dateRange.start, dateRange.end),
        getLineItemReport(dateRange.start, dateRange.end),
      ]);
      setSummary(summaryData.summary);
      setDailyStats(dailyData.daily || []);
      setKeyValueStats(kvData.data || []);
      setLineItemStats(liData.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }

  function handleExport(format: string, groupBy: string) {
    const params = new URLSearchParams({
      start_date: dateRange.start,
      end_date: dateRange.end,
      format,
      group_by: groupBy,
    });
    const apiUrl = import.meta.env.VITE_API_URL || '';
    window.open(`${apiUrl}/api/reports/export?${params}`, '_blank');
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
        <div className="mt-3 sm:mt-0 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">From:</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">To:</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            />
          </div>
          <div className="relative">
            <button
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              onClick={() => document.getElementById('export-menu')?.classList.toggle('hidden')}
            >
              Export
              <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div
              id="export-menu"
              className="hidden absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10"
            >
              <div className="py-1">
                <button
                  onClick={() => handleExport('csv', 'daily')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Daily Report (CSV)
                </button>
                <button
                  onClick={() => handleExport('csv', 'country')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  By Country (CSV)
                </button>
                <button
                  onClick={() => handleExport('csv', 'section')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  By Section (CSV)
                </button>
                <button
                  onClick={() => handleExport('csv', 'full')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Full Detail (CSV)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'keyvalue', label: 'Key-Value Breakdown' },
            { id: 'lineitems', label: 'Line Items' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-sm font-medium text-gray-500">Impressions</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {summary?.total_impressions.toLocaleString() || 0}
              </div>
            </div>
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-sm font-medium text-gray-500">Clicks</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {summary?.total_clicks.toLocaleString() || 0}
              </div>
            </div>
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-sm font-medium text-gray-500">CTR</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {summary?.ctr.toFixed(2) || 0}%
              </div>
            </div>
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-sm font-medium text-gray-500">Viewable</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {summary?.total_viewable.toLocaleString() || 0}
              </div>
            </div>
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-sm font-medium text-gray-500">Viewability Rate</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {summary?.viewability_rate.toFixed(2) || 0}%
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Performance</h3>
            {dailyStats.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No data available for the selected date range.
              </div>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[...dailyStats].reverse()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      labelFormatter={(label) => new Date(label).toLocaleDateString()}
                      formatter={(value: number) => value.toLocaleString()}
                    />
                    <Legend />
                    <Bar dataKey="impressions" fill="#3B82F6" name="Impressions" />
                    <Bar dataKey="clicks" fill="#10B981" name="Clicks" />
                    <Bar dataKey="viewable" fill="#F59E0B" name="Viewable" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'keyvalue' && (
        <>
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mr-2">Group by:</label>
            <select
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            >
              <option value="country">Country</option>
              <option value="section">Section</option>
              <option value="platform">Platform</option>
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Impressions by {selectedKey.charAt(0).toUpperCase() + selectedKey.slice(1)}
              </h3>
              {keyValueStats.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No data available.</div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={keyValueStats}
                        dataKey="impressions"
                        nameKey="value"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ value, percent }) => `${value} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {keyValueStats.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Table */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Breakdown Table</h3>
              {keyValueStats.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No data available.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          {selectedKey}
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          Impr.
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          Clicks
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          CTR
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          View.
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {keyValueStats.map((row, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-sm text-gray-900">{row.value || '(empty)'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">
                            {row.impressions.toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">
                            {row.clicks.toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">{row.ctr.toFixed(2)}%</td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">
                            {row.viewable.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'lineitems' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Campaign
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Line Item
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Impressions
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Clicks
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  CTR
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Viewable
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {lineItemStats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No data available.
                  </td>
                </tr>
              ) : (
                lineItemStats.map((row) => (
                  <tr key={row.line_item_id}>
                    <td className="px-6 py-4 text-sm text-gray-900">{row.campaign_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{row.line_item_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">
                      {row.impressions.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">
                      {row.clicks.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">{row.ctr.toFixed(2)}%</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">
                      {row.viewable.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
