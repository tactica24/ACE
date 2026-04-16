'use client';

import Link from 'next/link';
import { useState } from 'react';
import { 
  Film, 
  Upload, 
  DollarSign, 
  FileText, 
  TrendingUp, 
  Users,
  PlayCircle,
  Settings,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Shield,
  Star,
  Zap
} from 'lucide-react';

interface CreatorWorkspacePanelProps {
  verified: boolean;
  libraryCount: number;
  pendingTitles: number;
  liveTitles: number;
  walletBalanceLabel: string;
  unsignedContracts: number;
  totalViews: number;
  totalRevenue: string;
  averageRating: number;
  recentUploads: number;
  accountStatus: 'active' | 'pending' | 'suspended';
}

interface WorkspaceSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  primaryAction: {
    label: string;
    href: string;
    variant: 'primary' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    href: string;
    variant: 'ghost';
  };
  metrics: Array<{
    label: string;
    value: string | number;
    trend?: 'up' | 'down' | 'stable';
    status?: 'success' | 'warning' | 'error';
  }>;
  alerts?: Array<{
    type: 'warning' | 'error' | 'info' | 'success';
    message: string;
  }>;
}

export default function CreatorPremiumWorkspacePanel({
  verified,
  libraryCount,
  pendingTitles,
  liveTitles,
  walletBalanceLabel,
  unsignedContracts,
  totalViews,
  totalRevenue,
  averageRating,
  recentUploads,
  accountStatus
}: CreatorWorkspacePanelProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'analytics'>('overview');

  const workspaceSections: WorkspaceSection[] = [
    {
      id: 'identity',
      title: 'Creator Profile & Verification',
      description: 'Manage your professional identity, verification status, and public presence on ACE Studio.',
      icon: <Users className="w-6 h-6" />,
      primaryAction: {
        label: 'Edit Profile',
        href: '/studio/onboarding',
        variant: 'primary'
      },
      secondaryAction: {
        label: 'View Public Profile',
        href: '/studio/profile',
        variant: 'ghost'
      },
      metrics: [
        {
          label: 'Verification Status',
          value: verified ? 'Verified' : 'Pending',
          status: verified ? 'success' : 'warning'
        },
        {
          label: 'Account Status',
          value: accountStatus.charAt(0).toUpperCase() + accountStatus.slice(1),
          status: accountStatus === 'active' ? 'success' : accountStatus === 'pending' ? 'warning' : 'error'
        }
      ],
      alerts: !verified ? [{
        type: 'warning',
        message: 'Complete verification to unlock all features'
      }] : []
    },
    {
      id: 'content',
      title: 'Content Management',
      description: 'Upload, manage, and track your film catalog with advanced content tools and analytics.',
      icon: <Film className="w-6 h-6" />,
      primaryAction: {
        label: 'Upload New Title',
        href: '/studio/upload',
        variant: 'primary'
      },
      secondaryAction: {
        label: 'Manage Library',
        href: '/studio/library',
        variant: 'ghost'
      },
      metrics: [
        {
          label: 'Total Library',
          value: libraryCount,
          trend: recentUploads > 0 ? 'up' : 'stable',
          status: 'success'
        },
        {
          label: 'Live Titles',
          value: liveTitles,
          trend: 'up',
          status: 'success'
        },
        {
          label: 'Pending Review',
          value: pendingTitles,
          status: pendingTitles > 0 ? 'warning' : 'success'
        }
      ],
      alerts: pendingTitles > 0 ? [{
        type: 'info',
        message: `${pendingTitles} titles in review queue`
      }] : []
    },
    {
      id: 'performance',
      title: 'Performance Analytics',
      description: 'Track viewer engagement, revenue performance, and content success metrics.',
      icon: <BarChart3 className="w-6 h-6" />,
      primaryAction: {
        label: 'View Analytics',
        href: '/studio/analytics',
        variant: 'primary'
      },
      secondaryAction: {
        label: 'Download Reports',
        href: '/studio/reports',
        variant: 'ghost'
      },
      metrics: [
        {
          label: 'Total Views',
          value: totalViews.toLocaleString(),
          trend: 'up',
          status: 'success'
        },
        {
          label: 'Average Rating',
          value: `${averageRating.toFixed(1)} / 5.0`,
          trend: averageRating > 4.0 ? 'up' : 'stable',
          status: averageRating > 4.0 ? 'success' : 'warning'
        },
        {
          label: 'Recent Revenue',
          value: totalRevenue,
          trend: 'up',
          status: 'success'
        }
      ]
    },
    {
      id: 'financial',
      title: 'Financial Management',
      description: 'Monitor earnings, manage payouts, and track financial performance with detailed insights.',
      icon: <DollarSign className="w-6 h-6" />,
      primaryAction: {
        label: 'Wallet Dashboard',
        href: '/studio/wallet',
        variant: 'primary'
      },
      secondaryAction: {
        label: 'Payout History',
        href: '/studio/wallet/history',
        variant: 'ghost'
      },
      metrics: [
        {
          label: 'Available Balance',
          value: walletBalanceLabel,
          status: 'success'
        },
        {
          label: 'Pending Payouts',
          value: '0',
          status: 'success'
        }
      ],
      alerts: unsignedContracts > 0 ? [{
        type: 'warning',
        message: `${unsignedContracts} contracts require signature`
      }] : []
    },
    {
      id: 'contracts',
      title: 'Contracts & Legal',
      description: 'Review, sign, and manage distribution contracts and legal documentation.',
      icon: <FileText className="w-6 h-6" />,
      primaryAction: {
        label: 'Review Contracts',
        href: '/studio/contracts',
        variant: 'primary'
      },
      secondaryAction: {
        label: 'Legal Resources',
        href: '/studio/legal',
        variant: 'ghost'
      },
      metrics: [
        {
          label: 'Active Contracts',
          value: libraryCount - unsignedContracts,
          status: 'success'
        },
        {
          label: 'Pending Signatures',
          value: unsignedContracts,
          status: unsignedContracts > 0 ? 'warning' : 'success'
        }
      ],
      alerts: unsignedContracts > 0 ? [{
        type: 'error',
        message: 'Action required: Sign pending contracts'
      }] : []
    }
  ];

  const getAccountStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'suspended': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getMetricStatusColor = (status?: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'info': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error': return 'bg-red-50 border-red-200 text-red-800';
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'success': return 'bg-green-50 border-green-200 text-green-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="premium-creator-workspace">
      {/* Header with Account Status */}
      <div className="creator-workspace-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="creator-workspace-title">Creator Studio</h1>
            <p className="creator-workspace-subtitle">
              Professional content management, analytics, and financial tools for creators
            </p>
          </div>
          <div className={`account-status-badge ${getAccountStatusColor(accountStatus)}`}>
            <Shield className="w-4 h-4 mr-2" />
            <span className="font-medium">
              {accountStatus === 'active' ? 'Account Active' : 
               accountStatus === 'pending' ? 'Account Pending' : 'Account Suspended'}
            </span>
          </div>
        </div>
      </div>

      {/* Creator Stats Overview */}
      <div className="creator-stats-overview">
        <div className="creator-stat-card">
          <div className="creator-stat-icon">
            <PlayCircle className="w-6 h-6" />
          </div>
          <div className="creator-stat-content">
            <div className="creator-stat-value">{totalViews.toLocaleString()}</div>
            <div className="creator-stat-label">Total Views</div>
          </div>
          <div className="creator-stat-trend positive">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="creator-stat-card">
          <div className="creator-stat-icon">
            <Star className="w-6 h-6" />
          </div>
          <div className="creator-stat-content">
            <div className="creator-stat-value">{averageRating.toFixed(1)}</div>
            <div className="creator-stat-label">Average Rating</div>
          </div>
          <div className="creator-stat-trend positive">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="creator-stat-card">
          <div className="creator-stat-icon">
            <DollarSign className="w-6 h-6" />
          </div>
          <div className="creator-stat-content">
            <div className="creator-stat-value">{walletBalanceLabel}</div>
            <div className="creator-stat-label">Available Balance</div>
          </div>
          <div className="creator-stat-trend stable">
            <Zap className="w-4 h-4" />
          </div>
        </div>

        <div className="creator-stat-card">
          <div className="creator-stat-icon">
            <Film className="w-6 h-6" />
          </div>
          <div className="creator-stat-content">
            <div className="creator-stat-value">{liveTitles}</div>
            <div className="creator-stat-label">Live Titles</div>
          </div>
          <div className="creator-stat-trend positive">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="creator-workspace-tabs">
        <button
          className={`creator-tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Overview
        </button>
        <button
          className={`creator-tab-button ${activeTab === 'content' ? 'active' : ''}`}
          onClick={() => setActiveTab('content')}
        >
          <Film className="w-4 h-4 mr-2" />
          Content
        </button>
        <button
          className={`creator-tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Analytics
        </button>
      </div>

      {/* Workspace Sections Grid */}
      <div className="creator-workspace-grid">
        {workspaceSections.map((section) => (
          <div key={section.id} className="creator-workspace-card">
            {/* Card Header */}
            <div className="creator-card-header">
              <div className="creator-card-icon">
                {section.icon}
              </div>
              <div className="creator-card-title-section">
                <h3 className="creator-card-title">{section.title}</h3>
                <p className="creator-card-description">{section.description}</p>
              </div>
            </div>

            {/* Alerts Section */}
            {section.alerts && section.alerts.length > 0 && (
              <div className="creator-card-alerts">
                {section.alerts.map((alert, index) => (
                  <div key={index} className={`creator-alert ${getAlertColor(alert.type)}`}>
                    {getAlertIcon(alert.type)}
                    <span className="text-sm font-medium">{alert.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Metrics Section */}
            <div className="creator-card-metrics">
              <h4 className="creator-metrics-title">Key Metrics</h4>
              <div className="creator-metrics-grid">
                {section.metrics.map((metric, index) => (
                  <div key={index} className="creator-metric-item">
                    <span className="creator-metric-label">{metric.label}</span>
                    <div className="creator-metric-value-row">
                      <span className={`creator-metric-value ${getMetricStatusColor(metric.status)}`}>
                        {metric.value}
                      </span>
                      {metric.trend && (
                        <div className={`creator-metric-trend ${metric.trend}`}>
                          {metric.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                          {metric.trend === 'down' && <TrendingUp className="w-3 h-3 rotate-180" />}
                          {metric.trend === 'stable' && <Clock className="w-3 h-3" />}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions Section */}
            <div className="creator-card-actions">
              <Link 
                href={section.primaryAction.href}
                className={`creator-action-button creator-action-primary`}
              >
                {section.primaryAction.label}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Link>
              {section.secondaryAction && (
                <Link 
                  href={section.secondaryAction.href}
                  className="creator-action-button creator-action-secondary"
                >
                  {section.secondaryAction.label}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions Bar */}
      <div className="creator-quick-actions">
        <h3 className="creator-quick-actions-title">Quick Actions</h3>
        <div className="creator-quick-actions-grid">
          <Link href="/studio/upload" className="creator-quick-action">
            <Upload className="w-5 h-5" />
            <span>Upload Content</span>
          </Link>
          <Link href="/studio/analytics" className="creator-quick-action">
            <BarChart3 className="w-5 h-5" />
            <span>View Analytics</span>
          </Link>
          <Link href="/studio/wallet" className="creator-quick-action">
            <DollarSign className="w-5 h-5" />
            <span>Manage Wallet</span>
          </Link>
          <Link href="/studio/contracts" className="creator-quick-action">
            <FileText className="w-5 h-5" />
            <span>Review Contracts</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
