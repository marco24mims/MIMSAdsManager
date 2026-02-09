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
} from 'recharts';
import { getReportSummary, getDailyReport, type ReportSummary, type DailyStats } from '../api';

export default function Reports() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadData();
  }, [dateRange]);

  async function loadData() {
    try {
      setLoading(true);
      const [summaryData, dailyData] = await Promise.all([
        getReportSummary(dateRange.start, dateRange.end),
        getDailyReport(dateRange.start, dateRange.end),
      ]);
      setSummary(summaryData.summary);
      setDailyStats(dailyData.daily || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
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
        <div className="mt-3 sm:mt-0 flex items-center gap-4">
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
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

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
    </div>
  );
}
