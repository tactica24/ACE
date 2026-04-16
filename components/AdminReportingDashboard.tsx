'use client';

import { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  Filter, 
  Search, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Eye, 
  BarChart3, 
  PieChart, 
  Activity,
  Settings,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  FilePdf,
  FileCsv,
  User,
  Film,
  CreditCard,
  DollarSignIcon,
  Target,
  Zap,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  Tv,
  Ban,
  CheckSquare,
  XSquare,
  Edit,
  Trash2,
  Plus,
  Minus,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Copy,
  ExternalLink
} from 'lucide-react';

interface Movie {
  id: string;
  title: string;
  creator: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  totalViews: number;
  totalRevenue: number;
  totalUnlocks: number;
  createdAt: Date;
  lastActivity: Date;
  genre: string;
  duration: number;
  rating: string;
  contentWarnings: string[];
}

interface ReportData {
  movieId: string;
  movieTitle: string;
  period: string;
  totalViews: number;
  totalRevenue: number;
  totalUnlocks: number;
  uniqueViewers: number;
  averageWatchTime: number;
  completionRate: number;
  revenueByDevice: {
    mobile: number;
    desktop: number;
    tablet: number;
    tv: number;
  };
  revenueByCountry: {
    [country: string]: number;
  };
  topReferrers: Array<{
    source: string;
    views: number;
    revenue: number;
  }>;
}

interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  videoId?: string;
  videoTitle?: string;
  amount?: number;
  credits?: number;
  metadata: any;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  userName?: string;
  userEmail?: string;
}

interface AdminSettings {
  autoApproveThreshold: number;
  taxRate: number;
  platformFee: number;
  creatorShare: number;
  referralCommission: number;
  maxDailyUnlocks: number;
  enableContentWarnings: boolean;
  enableGeoblocking: boolean;
  maintenanceMode: boolean;
}

export default function AdminReportingDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'audit' | 'controls'>('overview');
  const [selectedMovies, setSelectedMovies] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date()
  });
  const [reportType, setReportType] = useState<'financial' | 'engagement' | 'audit' | 'tax'>('financial');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'title' | 'revenue' | 'views' | 'date'>('revenue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [adminSettings, setAdminSettings] = useState<AdminSettings>({
    autoApproveThreshold: 1000,
    taxRate: 7.5,
    platformFee: 29.5,
    creatorShare: 60,
    referralCommission: 10,
    maxDailyUnlocks: 50,
    enableContentWarnings: true,
    enableGeoblocking: false,
    maintenanceMode: false
  });

  // Mock data
  const movies: Movie[] = [
    {
      id: 'movie_1',
      title: 'The Last Guardian',
      creator: 'John Doe',
      status: 'APPROVED',
      totalViews: 15420,
      totalRevenue: 308400,
      totalUnlocks: 1542,
      createdAt: new Date('2024-01-15'),
      lastActivity: new Date('2024-01-20'),
      genre: 'Action',
      duration: 120,
      rating: 'PG-13',
      contentWarnings: ['Violence', 'Language']
    },
    {
      id: 'movie_2',
      title: 'Digital Dreams',
      creator: 'Jane Smith',
      status: 'APPROVED',
      totalViews: 8930,
      totalRevenue: 178600,
      totalUnlocks: 893,
      createdAt: new Date('2024-01-10'),
      lastActivity: new Date('2024-01-19'),
      genre: 'Sci-Fi',
      duration: 95,
      rating: 'PG',
      contentWarnings: ['Mild Language']
    }
  ];

  const auditEntries: AuditEntry[] = [
    {
      id: 'audit_1',
      userId: 'user_123',
      action: 'UNLOCK_SUCCESS',
      videoId: 'movie_1',
      videoTitle: 'The Last Guardian',
      amount: 200,
      credits: 2,
      metadata: {
        source: 'WALLET',
        creatorEarnings: 120,
        platformEarnings: 59,
        taxWithheld: 15,
        gatewayFee: 6
      },
      timestamp: new Date('2024-01-20T14:30:00Z'),
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0...',
      sessionId: 'sess_123456',
      userName: 'Alice Johnson',
      userEmail: 'alice@example.com'
    }
  ];

  const filteredMovies = movies
    .filter(movie => {
      const matchesSearch = movie.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         movie.creator.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || movie.status === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'revenue':
          comparison = a.totalRevenue - b.totalRevenue;
          break;
        case 'views':
          comparison = a.totalViews - b.totalViews;
          break;
        case 'date':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const selectedMoviesData = movies.filter(movie => selectedMovies.includes(movie.id));
  const totalSelectedRevenue = selectedMoviesData.reduce((sum, movie) => sum + movie.totalRevenue, 0);
  const totalSelectedViews = selectedMoviesData.reduce((sum, movie) => sum + movie.totalViews, 0);
  const totalSelectedUnlocks = selectedMoviesData.reduce((sum, movie) => sum + movie.totalUnlocks, 0);

  const handleGenerateReport = async () => {
    if (selectedMovies.length === 0) {
      alert('Please select at least one movie to generate a report');
      return;
    }

    setIsGenerating(true);
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Generate report based on type
      const reportData = generateReportData(selectedMoviesData, dateRange, reportType);
      
      // Download report
      downloadReport(reportData, exportFormat);
      
      // Show success message
      alert(`Report generated successfully for ${selectedMovies.length} movie(s)`);
    } catch (error) {
      console.error('Report generation failed:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateReportData = (movies: Movie[], dateRange: { start: Date; end: Date }, type: string) => {
    const baseData = {
      generatedAt: new Date(),
      period: {
        start: dateRange.start,
        end: dateRange.end
      },
      movies: movies.map(movie => ({
        id: movie.id,
        title: movie.title,
        creator: movie.creator,
        status: movie.status,
        genre: movie.genre,
        duration: movie.duration,
        rating: movie.rating,
        contentWarnings: movie.contentWarnings,
        metrics: {
          totalViews: movie.totalViews,
          totalRevenue: movie.totalRevenue,
          totalUnlocks: movie.totalUnlocks,
          averageRevenuePerView: movie.totalRevenue / movie.totalViews,
          averageRevenuePerUnlock: movie.totalRevenue / movie.totalUnlocks,
          conversionRate: (movie.totalUnlocks / movie.totalViews) * 100
        }
      })),
      summary: {
        totalMovies: movies.length,
        totalRevenue: movies.reduce((sum, movie) => sum + movie.totalRevenue, 0),
        totalViews: movies.reduce((sum, movie) => sum + movie.totalViews, 0),
        totalUnlocks: movies.reduce((sum, movie) => sum + movie.totalUnlocks, 0),
        averageRevenuePerMovie: movies.reduce((sum, movie) => sum + movie.totalRevenue, 0) / movies.length
      }
    };

    if (type === 'financial') {
      return {
        ...baseData,
        financialDetails: {
          taxWithheld: movies.reduce((sum, movie) => sum + (movie.totalRevenue * 0.075), 0),
          platformFees: movies.reduce((sum, movie) => sum + (movie.totalRevenue * 0.295), 0),
          creatorEarnings: movies.reduce((sum, movie) => sum + (movie.totalRevenue * 0.60), 0),
          gatewayFees: movies.reduce((sum, movie) => sum + (movie.totalRevenue * 0.03), 0)
        }
      };
    }

    return baseData;
  };

  const downloadReport = (data: any, format: string) => {
    const filename = `ace-studio-report-${new Date().toISOString().split('T')[0]}`;
    
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    // Add other format handlers (PDF, Excel) as needed
  };

  const toggleMovieSelection = (movieId: string) => {
    setSelectedMovies(prev => 
      prev.includes(movieId) 
        ? prev.filter(id => id !== movieId)
        : [...prev, movieId]
    );
  };

  const selectAllMovies = () => {
    setSelectedMovies(filteredMovies.map(movie => movie.id));
  };

  const clearSelection = () => {
    setSelectedMovies([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'text-green-600 bg-green-100';
      case 'PENDING': return 'text-yellow-600 bg-yellow-100';
      case 'REJECTED': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return <CheckCircle className="w-4 h-4" />;
      case 'PENDING': return <Clock className="w-4 h-4" />;
      case 'REJECTED': return <XSquare className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="admin-reporting-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1 className="header-title">Admin Reporting & Control Center</h1>
          <p className="header-subtitle">Advanced analytics, audit trails, and system controls</p>
        </div>
        
        <div className="header-actions">
          <div className="date-range-selector">
            <Calendar className="w-5 h-5" />
            <input
              type="date"
              value={dateRange.start.toISOString().split('T')[0]}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: new Date(e.target.value) }))}
              className="date-input"
            />
            <span className="date-separator">to</span>
            <input
              type="date"
              value={dateRange.end.toISOString().split('T')[0]}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: new Date(e.target.value) }))}
              className="date-input"
            />
          </div>
          
          <button className="refresh-button">
            <RefreshCw className="w-5 h-5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="dashboard-tabs">
        <button
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart3 className="w-5 h-5" />
          <span>Overview</span>
        </button>
        
        <button
          className={`tab-button ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <FileText className="w-5 h-5" />
          <span>Reports</span>
        </button>
        
        <button
          className={`tab-button ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <Eye className="w-5 h-5" />
          <span>Audit Trail</span>
        </button>
        
        <button
          className={`tab-button ${activeTab === 'controls' ? 'active' : ''}`}
          onClick={() => setActiveTab('controls')}
        >
          <Settings className="w-5 h-5" />
          <span>Controls</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-content">
            {/* Key Metrics */}
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-icon">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div className="metric-content">
                  <div className="metric-value">₦487,000</div>
                  <div className="metric-label">Total Revenue</div>
                  <div className="metric-change positive">
                    <ArrowUpRight className="w-4 h-4" />
                    <span>+12.5%</span>
                  </div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon">
                  <Users className="w-6 h-6" />
                </div>
                <div className="metric-content">
                  <div className="metric-value">24,350</div>
                  <div className="metric-label">Total Views</div>
                  <div className="metric-change positive">
                    <ArrowUpRight className="w-4 h-4" />
                    <span>+8.3%</span>
                  </div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div className="metric-content">
                  <div className="metric-value">2,435</div>
                  <div className="metric-label">Total Unlocks</div>
                  <div className="metric-change positive">
                    <ArrowUpRight className="w-4 h-4" />
                    <span>+15.7%</span>
                  </div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon">
                  <Film className="w-6 h-6" />
                </div>
                <div className="metric-content">
                  <div className="metric-value">156</div>
                  <div className="metric-label">Active Movies</div>
                  <div className="metric-change positive">
                    <ArrowUpRight className="w-4 h-4" />
                    <span>+4.2%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="recent-activity">
              <h2 className="section-title">Recent Activity</h2>
              <div className="activity-list">
                {auditEntries.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="activity-item">
                    <div className="activity-icon">
                      {getStatusIcon(entry.action.replace(/_/g, ''))}
                    </div>
                    <div className="activity-details">
                      <div className="activity-title">
                        {entry.action.replace(/_/g, ' ')} - {entry.videoTitle}
                      </div>
                      <div className="activity-meta">
                        <span className="activity-user">{entry.userName}</span>
                        <span className="activity-time">{entry.timestamp.toLocaleString()}</span>
                        {entry.amount && (
                          <span className="activity-amount">₦{entry.amount.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="reports-content">
            {/* Report Controls */}
            <div className="report-controls">
              <div className="control-section">
                <h3 className="control-title">Select Movies</h3>
                <div className="movie-selection-controls">
                  <button 
                    className="selection-button"
                    onClick={selectAllMovies}
                  >
                    <CheckSquare className="w-4 h-4" />
                    <span>Select All</span>
                  </button>
                  <button 
                    className="selection-button"
                    onClick={clearSelection}
                  >
                    <XSquare className="w-4 h-4" />
                    <span>Clear</span>
                  </button>
                  <div className="selection-count">
                    {selectedMovies.length} of {filteredMovies.length} selected
                  </div>
                </div>
              </div>

              <div className="control-section">
                <h3 className="control-title">Report Type</h3>
                <select 
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as any)}
                  className="report-type-select"
                >
                  <option value="financial">Financial Report</option>
                  <option value="engagement">Engagement Report</option>
                  <option value="audit">Audit Report</option>
                  <option value="tax">Tax Report</option>
                </select>
              </div>

              <div className="control-section">
                <h3 className="control-title">Export Format</h3>
                <div className="format-buttons">
                  <button 
                    className={`format-button ${exportFormat === 'pdf' ? 'active' : ''}`}
                    onClick={() => setExportFormat('pdf')}
                  >
                    <FilePdf className="w-4 h-4" />
                    <span>PDF</span>
                  </button>
                  <button 
                    className={`format-button ${exportFormat === 'excel' ? 'active' : ''}`}
                    onClick={() => setExportFormat('excel')}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Excel</span>
                  </button>
                  <button 
                    className={`format-button ${exportFormat === 'csv' ? 'active' : ''}`}
                    onClick={() => setExportFormat('csv')}
                  >
                    <FileCsv className="w-4 h-4" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>

              <div className="control-section">
                <h3 className="control-title">Generate Report</h3>
                <button 
                  className={`generate-button ${selectedMovies.length === 0 || isGenerating ? 'disabled' : ''}`}
                  onClick={handleGenerateReport}
                  disabled={selectedMovies.length === 0 || isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      <span>Generate Report</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Movies List */}
            <div className="movies-section">
              <div className="movies-header">
                <h2 className="section-title">Movies</h2>
                <div className="movies-filters">
                  <div className="search-box">
                    <Search className="w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search movies..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input"
                    />
                  </div>
                  
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="filter-select"
                  >
                    <option value="all">All Status</option>
                    <option value="APPROVED">Approved</option>
                    <option value="PENDING">Pending</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                  
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="sort-select"
                  >
                    <option value="revenue">Sort by Revenue</option>
                    <option value="views">Sort by Views</option>
                    <option value="title">Sort by Title</option>
                    <option value="date">Sort by Date</option>
                  </select>
                  
                  <button 
                    className="sort-order-button"
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {selectedMovies.length > 0 && (
                <div className="selection-summary">
                  <div className="summary-stats">
                    <div className="summary-item">
                      <span className="summary-label">Selected Movies:</span>
                      <span className="summary-value">{selectedMovies.length}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Total Revenue:</span>
                      <span className="summary-value">₦{totalSelectedRevenue.toLocaleString()}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Total Views:</span>
                      <span className="summary-value">{totalSelectedViews.toLocaleString()}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Total Unlocks:</span>
                      <span className="summary-value">{totalSelectedUnlocks.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="movies-grid">
                {filteredMovies.map((movie) => (
                  <div 
                    key={movie.id}
                    className={`movie-card ${selectedMovies.includes(movie.id) ? 'selected' : ''}`}
                  >
                    <div className="movie-header">
                      <div className="movie-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedMovies.includes(movie.id)}
                          onChange={() => toggleMovieSelection(movie.id)}
                        />
                      </div>
                      <div className="movie-status">
                        <div className={`status-badge ${getStatusColor(movie.status)}`}>
                          {getStatusIcon(movie.status)}
                          <span>{movie.status}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="movie-content">
                      <h3 className="movie-title">{movie.title}</h3>
                      <p className="movie-creator">by {movie.creator}</p>
                      
                      <div className="movie-meta">
                        <span className="meta-item">{movie.genre}</span>
                        <span className="meta-item">{movie.rating}</span>
                        <span className="meta-item">{movie.duration} min</span>
                      </div>
                      
                      {movie.contentWarnings.length > 0 && (
                        <div className="content-warnings">
                          {movie.contentWarnings.map((warning, index) => (
                            <span key={index} className="warning-tag">
                              <AlertTriangle className="w-3 h-3" />
                              {warning}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="movie-metrics">
                      <div className="metric-row">
                        <span className="metric-label">Views:</span>
                        <span className="metric-value">{movie.totalViews.toLocaleString()}</span>
                      </div>
                      <div className="metric-row">
                        <span className="metric-label">Unlocks:</span>
                        <span className="metric-value">{movie.totalUnlocks.toLocaleString()}</span>
                      </div>
                      <div className="metric-row">
                        <span className="metric-label">Revenue:</span>
                        <span className="metric-value revenue">₦{movie.totalRevenue.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredMovies.length === 0 && (
                <div className="no-results">
                  <FileText className="w-12 h-12" />
                  <h3>No movies found</h3>
                  <p>Try adjusting your search or filters</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Audit Trail Tab */}
        {activeTab === 'audit' && (
          <div className="audit-content">
            <div className="audit-header">
              <h2 className="section-title">Audit Trail</h2>
              <div className="audit-filters">
                <div className="search-box">
                  <Search className="w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search audit entries..."
                    className="search-input"
                  />
                </div>
                
                <select className="filter-select">
                  <option value="all">All Actions</option>
                  <option value="UNLOCK_SUCCESS">Successful Unlocks</option>
                  <option value="UNLOCK_FAILED">Failed Unlocks</option>
                  <option value="CREDIT_DEDUCTED">Credit Deductions</option>
                  <option value="CREATOR_PAID">Creator Payments</option>
                </select>
                
                <button className="export-button">
                  <Download className="w-4 h-4" />
                  <span>Export Audit Log</span>
                </button>
              </div>
            </div>
            
            <div className="audit-list">
              {auditEntries.map((entry) => (
                <div key={entry.id} className="audit-item">
                  <div className="audit-icon">
                    <FileText className="w-5 h-5" />
                  </div>
                  
                  <div className="audit-details">
                    <div className="audit-header">
                      <h3 className="audit-action">{entry.action.replace(/_/g, ' ')}</h3>
                      <div className="audit-timestamp">
                        {entry.timestamp.toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="audit-meta">
                      {entry.videoTitle && (
                        <div className="meta-item">
                          <span className="meta-label">Video:</span>
                          <span className="meta-value">{entry.videoTitle}</span>
                        </div>
                      )}
                      {entry.userName && (
                        <div className="meta-item">
                          <span className="meta-label">User:</span>
                          <span className="meta-value">{entry.userName}</span>
                        </div>
                      )}
                      {entry.amount && (
                        <div className="meta-item">
                          <span className="meta-label">Amount:</span>
                          <span className="meta-value">₦{entry.amount.toLocaleString()}</span>
                        </div>
                      )}
                      {entry.credits && (
                        <div className="meta-item">
                          <span className="meta-label">Credits:</span>
                          <span className="meta-value">{entry.credits}</span>
                        </div>
                      )}
                      <div className="meta-item">
                        <span className="meta-label">IP Address:</span>
                        <span className="meta-value">{entry.ipAddress}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Session ID:</span>
                        <span className="meta-value">{entry.sessionId}</span>
                      </div>
                    </div>
                    
                    {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                      <div className="audit-metadata">
                        <h4 className="metadata-title">Additional Information</h4>
                        <pre className="metadata-content">
                          {JSON.stringify(entry.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Controls Tab */}
        {activeTab === 'controls' && (
          <div className="controls-content">
            <h2 className="section-title">System Controls</h2>
            
            <div className="controls-grid">
              <div className="control-card">
                <h3 className="control-card-title">Financial Settings</h3>
                <div className="control-fields">
                  <div className="field-group">
                    <label className="field-label">Tax Rate (%)</label>
                    <input
                      type="number"
                      value={adminSettings.taxRate}
                      onChange={(e) => setAdminSettings(prev => ({ ...prev, taxRate: parseFloat(e.target.value) }))}
                      className="field-input"
                      step="0.1"
                      min="0"
                      max="100"
                    />
                  </div>
                  
                  <div className="field-group">
                    <label className="field-label">Platform Fee (%)</label>
                    <input
                      type="number"
                      value={adminSettings.platformFee}
                      onChange={(e) => setAdminSettings(prev => ({ ...prev, platformFee: parseFloat(e.target.value) }))}
                      className="field-input"
                      step="0.1"
                      min="0"
                      max="100"
                    />
                  </div>
                  
                  <div className="field-group">
                    <label className="field-label">Creator Share (%)</label>
                    <input
                      type="number"
                      value={adminSettings.creatorShare}
                      onChange={(e) => setAdminSettings(prev => ({ ...prev, creatorShare: parseFloat(e.target.value) }))}
                      className="field-input"
                      step="0.1"
                      min="0"
                      max="100"
                    />
                  </div>
                  
                  <div className="field-group">
                    <label className="field-label">Referral Commission (%)</label>
                    <input
                      type="number"
                      value={adminSettings.referralCommission}
                      onChange={(e) => setAdminSettings(prev => ({ ...prev, referralCommission: parseFloat(e.target.value) }))}
                      className="field-input"
                      step="0.1"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
              </div>
              
              <div className="control-card">
                <h3 className="control-card-title">Content Settings</h3>
                <div className="control-fields">
                  <div className="field-group">
                    <label className="field-label">Auto-approve Threshold (views)</label>
                    <input
                      type="number"
                      value={adminSettings.autoApproveThreshold}
                      onChange={(e) => setAdminSettings(prev => ({ ...prev, autoApproveThreshold: parseInt(e.target.value) }))}
                      className="field-input"
                      min="0"
                    />
                  </div>
                  
                  <div className="field-group">
                    <label className="field-label">Max Daily Unlocks</label>
                    <input
                      type="number"
                      value={adminSettings.maxDailyUnlocks}
                      onChange={(e) => setAdminSettings(prev => ({ ...prev, maxDailyUnlocks: parseInt(e.target.value) }))}
                      className="field-input"
                      min="0"
                    />
                  </div>
                  
                  <div className="field-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={adminSettings.enableContentWarnings}
                        onChange={(e) => setAdminSettings(prev => ({ ...prev, enableContentWarnings: e.target.checked }))}
                      />
                      <span className="checkbox-text">Enable Content Warnings</span>
                    </label>
                  </div>
                  
                  <div className="field-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={adminSettings.enableGeoblocking}
                        onChange={(e) => setAdminSettings(prev => ({ ...prev, enableGeoblocking: e.target.checked }))}
                      />
                      <span className="checkbox-text">Enable Geoblocking</span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="control-card">
                <h3 className="control-card-title">System Status</h3>
                <div className="control-fields">
                  <div className="field-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={adminSettings.maintenanceMode}
                        onChange={(e) => setAdminSettings(prev => ({ ...prev, maintenanceMode: e.target.checked }))}
                      />
                      <span className="checkbox-text">Maintenance Mode</span>
                    </label>
                    <p className="field-description">
                      Enable maintenance mode to temporarily disable user access
                    </p>
                  </div>
                  
                  <div className="field-group">
                    <button className="save-settings-button">
                      <CheckSquare className="w-4 h-4" />
                      <span>Save Settings</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
