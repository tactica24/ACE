'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Film, 
  DollarSign, 
  Eye,
  Clock,
  BarChart3,
  PieChart,
  Activity,
  Star,
  Download,
  Filter,
  Calendar,
  Globe,
  Shield,
  AlertTriangle
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalRevenue: string;
    totalViews: number;
    conversionRate: number;
    avgSessionDuration: string;
  };
  trends: {
    userGrowth: Array<{ date: string; users: number; revenue: string }>;
    contentPerformance: Array<{ title: string; views: number; revenue: string; rating: number }>;
    geographicData: Array<{ country: string; users: number; revenue: string }>;
  };
  alerts: Array<{
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: string;
  }>;
}

export default function AdminAdvancedAnalytics() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedMetric, setSelectedMetric] = useState<'users' | 'revenue' | 'views'>('users');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate data loading
    const mockData: AnalyticsData = {
      overview: {
        totalUsers: 45234,
        activeUsers: 12847,
        totalRevenue: '$1,234,567',
        totalViews: 8923456,
        conversionRate: 3.4,
        avgSessionDuration: '24:35'
      },
      trends: {
        userGrowth: [
          { date: '2024-01-01', users: 12000, revenue: '$45,000' },
          { date: '2024-01-02', users: 12500, revenue: '$47,000' },
          { date: '2024-01-03', users: 13200, revenue: '$51,000' },
          { date: '2024-01-04', users: 14100, revenue: '$56,000' },
          { date: '2024-01-05', users: 15800, revenue: '$62,000' },
        ],
        contentPerformance: [
          { title: 'Premium Documentary Series', views: 234567, revenue: '$45,678', rating: 4.8 },
          { title: 'Action Thriller Film', views: 189234, revenue: '$38,234', rating: 4.6 },
          { title: 'Comedy Special', views: 156789, revenue: '$28,901', rating: 4.2 },
        ],
        geographicData: [
          { country: 'United States', users: 15678, revenue: '$456,789' },
          { country: 'United Kingdom', users: 8923, revenue: '$234,567' },
          { country: 'Nigeria', users: 6789, revenue: '$123,456' },
          { country: 'Canada', users: 4567, revenue: '$89,234' },
        ]
      },
      alerts: [
        {
          type: 'warning',
          message: 'User growth rate decreased by 12% compared to last period',
          timestamp: '2024-01-15 10:30:00'
        },
        {
          type: 'info',
          message: 'New content category performing 45% above average',
          timestamp: '2024-01-15 09:15:00'
        }
      ]
    };

    setTimeout(() => {
      setData(mockData);
      setLoading(false);
    }, 1000);
  }, [timeRange]);

  const MetricCard = ({ 
    title, 
    value, 
    change, 
    icon, 
    trend 
  }: { 
    title: string; 
    value: string; 
    change: number; 
    icon: React.ReactNode; 
    trend: 'up' | 'down' | 'stable';
  }) => (
    <div className="analytics-metric-card">
      <div className="analytics-metric-header">
        <div className="analytics-metric-icon">
          {icon}
        </div>
        <div className={`analytics-metric-trend ${trend}`}>
          {trend === 'up' && <TrendingUp className="w-4 h-4" />}
          {trend === 'down' && <TrendingDown className="w-4 h-4" />}
          {trend === 'stable' && <Activity className="w-4 h-4" />}
          <span className="text-sm font-medium ml-1">
            {change > 0 ? '+' : ''}{change}%
          </span>
        </div>
      </div>
      <div className="analytics-metric-content">
        <div className="analytics-metric-value">{value}</div>
        <div className="analytics-metric-title">{title}</div>
      </div>
    </div>
  );

  const AlertItem = ({ alert }: { alert: AnalyticsData['alerts'][0] }) => {
    const getAlertColor = (type: string) => {
      switch (type) {
        case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
        case 'error': return 'bg-red-50 border-red-200 text-red-800';
        case 'info': return 'bg-blue-50 border-blue-200 text-blue-800';
        default: return 'bg-gray-50 border-gray-200 text-gray-800';
      }
    };

    const getAlertIcon = (type: string) => {
      switch (type) {
        case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
        case 'error': return <AlertTriangle className="w-4 h-4 text-red-600" />;
        case 'info': return <Activity className="w-4 h-4 text-blue-600" />;
        default: return <Clock className="w-4 h-4 text-gray-600" />;
      }
    };

    return (
      <div className={`analytics-alert ${getAlertColor(alert.type)}`}>
        {getAlertIcon(alert.type)}
        <div className="flex-1">
          <p className="text-sm font-medium">{alert.message}</p>
          <p className="text-xs opacity-75 mt-1">{alert.timestamp}</p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="analytics-loading-spinner">
          <Activity className="w-8 h-8 animate-spin" />
        </div>
        <p>Loading advanced analytics...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="admin-advanced-analytics">
      {/* Header with Controls */}
      <div className="analytics-header">
        <div className="analytics-title-section">
          <h2 className="analytics-title">Advanced Analytics Dashboard</h2>
          <p className="analytics-subtitle">
            Real-time insights into platform performance, user behavior, and revenue metrics
          </p>
        </div>
        <div className="analytics-controls">
          <div className="analytics-time-range">
            <Calendar className="w-4 h-4 mr-2" />
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="analytics-select"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
          <button className="analytics-export-button">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="analytics-metrics-grid">
        <MetricCard
          title="Total Users"
          value={data.overview.totalUsers.toLocaleString()}
          change={12.5}
          icon={<Users className="w-6 h-6" />}
          trend="up"
        />
        <MetricCard
          title="Active Users"
          value={data.overview.activeUsers.toLocaleString()}
          change={8.3}
          icon={<Activity className="w-6 h-6" />}
          trend="up"
        />
        <MetricCard
          title="Total Revenue"
          value={data.overview.totalRevenue}
          change={15.7}
          icon={<DollarSign className="w-6 h-6" />}
          trend="up"
        />
        <MetricCard
          title="Total Views"
          value={data.overview.totalViews.toLocaleString()}
          change={-2.4}
          icon={<Eye className="w-6 h-6" />}
          trend="down"
        />
        <MetricCard
          title="Conversion Rate"
          value={`${data.overview.conversionRate}%`}
          change={3.2}
          icon={<TrendingUp className="w-6 h-6" />}
          trend="up"
        />
        <MetricCard
          title="Avg Session"
          value={data.overview.avgSessionDuration}
          change={5.8}
          icon={<Clock className="w-6 h-6" />}
          trend="up"
        />
      </div>

      {/* Charts and Detailed Analytics */}
      <div className="analytics-content-grid">
        {/* User Growth Chart */}
        <div className="analytics-card analytics-chart-card">
          <div className="analytics-card-header">
            <h3 className="analytics-card-title">User Growth & Revenue</h3>
            <div className="analytics-card-controls">
              <button 
                className={`analytics-metric-button ${selectedMetric === 'users' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('users')}
              >
                Users
              </button>
              <button 
                className={`analytics-metric-button ${selectedMetric === 'revenue' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('revenue')}
              >
                Revenue
              </button>
              <button 
                className={`analytics-metric-button ${selectedMetric === 'views' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('views')}
              >
                Views
              </button>
            </div>
          </div>
          <div className="analytics-chart-container">
            <div className="analytics-chart-placeholder">
              <BarChart3 className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-500">Interactive chart visualization</p>
              <p className="text-sm text-gray-400 mt-2">
                Showing {selectedMetric} data for {timeRange}
              </p>
            </div>
          </div>
        </div>

        {/* Content Performance */}
        <div className="analytics-card">
          <div className="analytics-card-header">
            <h3 className="analytics-card-title">Top Performing Content</h3>
            <Film className="w-5 h-5 text-gray-400" />
          </div>
          <div className="analytics-content-list">
            {data.trends.contentPerformance.map((content, index) => (
              <div key={index} className="analytics-content-item">
                <div className="analytics-content-rank">#{index + 1}</div>
                <div className="analytics-content-info">
                  <h4 className="analytics-content-title">{content.title}</h4>
                  <div className="analytics-content-stats">
                    <span className="analytics-content-stat">
                      <Eye className="w-3 h-3 mr-1" />
                      {content.views.toLocaleString()} views
                    </span>
                    <span className="analytics-content-stat">
                      <DollarSign className="w-3 h-3 mr-1" />
                      {content.revenue}
                    </span>
                    <span className="analytics-content-stat">
                      <Star className="w-3 h-3 mr-1" />
                      {content.rating}/5.0
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="analytics-card">
          <div className="analytics-card-header">
            <h3 className="analytics-card-title">Geographic Distribution</h3>
            <Globe className="w-5 h-5 text-gray-400" />
          </div>
          <div className="analytics-geo-list">
            {data.trends.geographicData.map((geo, index) => (
              <div key={index} className="analytics-geo-item">
                <div className="analytics-geo-flag">{geo.country.slice(0, 2).toUpperCase()}</div>
                <div className="analytics-geo-info">
                  <h4 className="analytics-geo-country">{geo.country}</h4>
                  <div className="analytics-geo-stats">
                    <span className="analytics-geo-stat">
                      <Users className="w-3 h-3 mr-1" />
                      {geo.users.toLocaleString()} users
                    </span>
                    <span className="analytics-geo-stat">
                      <DollarSign className="w-3 h-3 mr-1" />
                      {geo.revenue}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Alerts */}
        <div className="analytics-card">
          <div className="analytics-card-header">
            <h3 className="analytics-card-title">System Alerts & Insights</h3>
            <Shield className="w-5 h-5 text-gray-400" />
          </div>
          <div className="analytics-alerts-list">
            {data.alerts.map((alert, index) => (
              <AlertItem key={index} alert={alert} />
            ))}
          </div>
        </div>
      </div>

      {/* Advanced Controls */}
      <div className="analytics-advanced-controls">
        <h3 className="analytics-controls-title">Advanced Analytics Controls</h3>
        <div className="analytics-controls-grid">
          <button className="analytics-control-button">
            <Filter className="w-4 h-4 mr-2" />
            Custom Filters
          </button>
          <button className="analytics-control-button">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </button>
          <button className="analytics-control-button">
            <BarChart3 className="w-4 h-4 mr-2" />
            Custom Reports
          </button>
          <button className="analytics-control-button">
            <Activity className="w-4 h-4 mr-2" />
            Real-time Monitoring
          </button>
        </div>
      </div>
    </div>
  );
}
