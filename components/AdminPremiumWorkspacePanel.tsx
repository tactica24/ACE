'use client';

import Link from 'next/link';
import { useState } from 'react';
import { 
  Users, 
  Film, 
  DollarSign, 
  MessageSquare, 
  TrendingUp, 
  Shield,
  Activity,
  Settings,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface AdminWorkspacePanelProps {
  creatorRequests: number;
  pendingModeration: number;
  openSupport: number;
  pendingPayouts: number;
  platformBalanceLabel: string;
  activeStreams: number;
  watchingUsers: number;
  recentRevenue: string;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

interface WorkspaceCard {
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
  kpis: Array<{
    label: string;
    value: string | number;
    trend?: 'up' | 'down' | 'stable';
    status?: 'success' | 'warning' | 'error';
  }>;
  alerts?: Array<{
    type: 'warning' | 'error' | 'info';
    message: string;
  }>;
}

export default function AdminPremiumWorkspacePanel({
  creatorRequests,
  pendingModeration,
  openSupport,
  pendingPayouts,
  platformBalanceLabel,
  activeStreams,
  watchingUsers,
  recentRevenue,
  systemHealth
}: AdminWorkspacePanelProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'operations' | 'analytics'>('overview');

  const workspaceCards: WorkspaceCard[] = [
    {
      id: 'users',
      title: 'User & Producer Management',
      description: 'Comprehensive control over user accounts, producer onboarding, verification workflows, and access management.',
      icon: <Users className="w-6 h-6" />,
      primaryAction: {
        label: 'User Control Center',
        href: '/admin/users',
        variant: 'primary'
      },
      secondaryAction: {
        label: 'Producer Approvals',
        href: '/admin/intake',
        variant: 'ghost'
      },
      kpis: [
        {
          label: 'Pending Approvals',
          value: creatorRequests,
          trend: creatorRequests > 0 ? 'up' : 'stable',
          status: creatorRequests > 10 ? 'warning' : 'success'
        },
        {
          label: 'Active Users',
          value: watchingUsers.toLocaleString(),
          trend: 'up',
          status: 'success'
        }
      ],
      alerts: creatorRequests > 5 ? [{
        type: 'warning',
        message: `${creatorRequests} producer requests pending review`
      }] : []
    },
    {
      id: 'content',
      title: 'Content & Moderation',
      description: 'Advanced content management, moderation workflows, quality control, and catalog optimization.',
      icon: <Film className="w-6 h-6" />,
      primaryAction: {
        label: 'Moderation Queue',
        href: '/admin/moderation',
        variant: 'primary'
      },
      secondaryAction: {
        label: 'Content Settings',
        href: '/admin/settings',
        variant: 'ghost'
      },
      kpis: [
        {
          label: 'Pending Review',
          value: pendingModeration,
          trend: pendingModeration > 0 ? 'up' : 'stable',
          status: pendingModeration > 20 ? 'error' : pendingModeration > 5 ? 'warning' : 'success'
        },
        {
          label: 'Active Streams',
          value: activeStreams.toLocaleString(),
          trend: 'up',
          status: 'success'
        }
      ],
      alerts: pendingModeration > 10 ? [{
        type: 'error',
        message: `${pendingModeration} titles require immediate attention`
      }] : []
    },
    {
      id: 'finance',
      title: 'Financial Operations',
      description: 'Revenue tracking, payout management, financial reconciliation, and payment processing oversight.',
      icon: <DollarSign className="w-6 h-6" />,
      primaryAction: {
        label: 'Payment Dashboard',
        href: '/admin/payments',
        variant: 'primary'
      },
      secondaryAction: {
        label: 'Payout Queue',
        href: '/admin/payments/payouts',
        variant: 'ghost'
      },
      kpis: [
        {
          label: 'Platform Balance',
          value: platformBalanceLabel,
          trend: 'up',
          status: 'success'
        },
        {
          label: 'Recent Revenue',
          value: recentRevenue,
          trend: 'up',
          status: 'success'
        },
        {
          label: 'Pending Payouts',
          value: pendingPayouts,
          trend: pendingPayouts > 0 ? 'up' : 'stable',
          status: pendingPayouts > 5 ? 'warning' : 'success'
        }
      ],
      alerts: pendingPayouts > 3 ? [{
        type: 'warning',
        message: `${pendingPayouts} payouts require processing`
      }] : []
    },
    {
      id: 'support',
      title: 'Support & Communications',
      description: 'Customer support management, ticket resolution, user communications, and feedback analysis.',
      icon: <MessageSquare className="w-6 h-6" />,
      primaryAction: {
        label: 'Support Inbox',
        href: '/admin/support',
        variant: 'primary'
      },
      secondaryAction: {
        label: 'Communication Logs',
        href: '/admin/support/logs',
        variant: 'ghost'
      },
      kpis: [
        {
          label: 'Open Tickets',
          value: openSupport,
          trend: openSupport > 0 ? 'up' : 'stable',
          status: openSupport > 15 ? 'error' : openSupport > 5 ? 'warning' : 'success'
        }
      ],
      alerts: openSupport > 10 ? [{
        type: 'error',
        message: `${openSupport} support tickets require attention`
      }] : []
    }
  ];

  const getSystemHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getKpiStatusColor = (status?: string) => {
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
      case 'info': return <Activity className="w-4 h-4 text-blue-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error': return 'bg-red-50 border-red-200 text-red-800';
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="premium-admin-workspace">
      {/* Header with System Health */}
      <div className="admin-workspace-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="admin-workspace-title">Administrative Control Center</h1>
            <p className="admin-workspace-subtitle">
              Comprehensive platform management with real-time insights and advanced controls
            </p>
          </div>
          <div className={`system-health-badge ${getSystemHealthColor(systemHealth)}`}>
            <Shield className="w-4 h-4 mr-2" />
            <span className="font-medium">
              {systemHealth === 'healthy' ? 'All Systems Operational' : 
               systemHealth === 'warning' ? 'System Warnings' : 'Critical Issues'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="admin-workspace-tabs">
        <button
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Overview
        </button>
        <button
          className={`tab-button ${activeTab === 'operations' ? 'active' : ''}`}
          onClick={() => setActiveTab('operations')}
        >
          <Settings className="w-4 h-4 mr-2" />
          Operations
        </button>
        <button
          className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <Activity className="w-4 h-4 mr-2" />
          Analytics
        </button>
      </div>

      {/* Workspace Cards Grid */}
      <div className="admin-workspace-grid">
        {workspaceCards.map((card) => (
          <div key={card.id} className="admin-workspace-card">
            {/* Card Header */}
            <div className="admin-card-header">
              <div className="admin-card-icon">
                {card.icon}
              </div>
              <div className="admin-card-title-section">
                <h3 className="admin-card-title">{card.title}</h3>
                <p className="admin-card-description">{card.description}</p>
              </div>
            </div>

            {/* Alerts Section */}
            {card.alerts && card.alerts.length > 0 && (
              <div className="admin-card-alerts">
                {card.alerts.map((alert, index) => (
                  <div key={index} className={`admin-alert ${getAlertColor(alert.type)}`}>
                    {getAlertIcon(alert.type)}
                    <span className="text-sm font-medium">{alert.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* KPIs Section */}
            <div className="admin-card-kpis">
              <h4 className="admin-kpis-title">Key Metrics</h4>
              <div className="admin-kpis-grid">
                {card.kpis.map((kpi, index) => (
                  <div key={index} className="admin-kpi-item">
                    <span className="admin-kpi-label">{kpi.label}</span>
                    <div className="admin-kpi-value-row">
                      <span className={`admin-kpi-value ${getKpiStatusColor(kpi.status)}`}>
                        {kpi.value}
                      </span>
                      {kpi.trend && (
                        <div className={`admin-kpi-trend ${kpi.trend}`}>
                          {kpi.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                          {kpi.trend === 'down' && <TrendingUp className="w-3 h-3 rotate-180" />}
                          {kpi.trend === 'stable' && <Activity className="w-3 h-3" />}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions Section */}
            <div className="admin-card-actions">
              <Link 
                href={card.primaryAction.href}
                className={`admin-action-button admin-action-primary`}
              >
                {card.primaryAction.label}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Link>
              {card.secondaryAction && (
                <Link 
                  href={card.secondaryAction.href}
                  className="admin-action-button admin-action-secondary"
                >
                  {card.secondaryAction.label}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions Bar */}
      <div className="admin-quick-actions">
        <h3 className="admin-quick-actions-title">Quick Actions</h3>
        <div className="admin-quick-actions-grid">
          <Link href="/admin/upload" className="admin-quick-action">
            <Film className="w-5 h-5" />
            <span>Upload Content</span>
          </Link>
          <Link href="/admin/users/create" className="admin-quick-action">
            <Users className="w-5 h-5" />
            <span>Create User</span>
          </Link>
          <Link href="/admin/reports" className="admin-quick-action">
            <TrendingUp className="w-5 h-5" />
            <span>View Reports</span>
          </Link>
          <Link href="/admin/settings/system" className="admin-quick-action">
            <Settings className="w-5 h-5" />
            <span>System Settings</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
