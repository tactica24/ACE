'use client';

import { useState, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  TrendingUp,
  Zap,
  Target,
  BarChart3,
  Calendar,
  Users,
  DollarSign,
  PlayCircle,
  Settings,
  ArrowRight,
  Lightbulb,
  Shield,
  Star
} from 'lucide-react';

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'in-progress' | 'pending' | 'blocked';
  estimatedTime: string;
  actualTime?: string;
  priority: 'high' | 'medium' | 'low';
  dependencies?: string[];
  tips?: string[];
}

interface ContentMetrics {
  totalUploads: number;
  averageProcessingTime: string;
  successRate: number;
  revenuePerTitle: string;
  averageRating: number;
  completionRate: number;
}

interface OptimizationSuggestion {
  type: 'efficiency' | 'quality' | 'revenue' | 'compliance';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  action: string;
}

export default function CreatorWorkflowOptimizer() {
  const [activeTab, setActiveTab] = useState<'overview' | 'workflow' | 'optimization'>('overview');
  const [selectedContent, setSelectedContent] = useState<string | null>(null);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [metrics, setMetrics] = useState<ContentMetrics | null>(null);
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);

  useEffect(() => {
    // Initialize workflow steps
    const steps: WorkflowStep[] = [
      {
        id: 'upload',
        title: 'Content Upload',
        description: 'Upload video files and metadata',
        status: 'completed',
        estimatedTime: '15 minutes',
        actualTime: '12 minutes',
        priority: 'high',
        tips: [
          'Use high-quality video files (1080p minimum)',
          'Ensure all metadata is complete before upload',
          'Compress files to reduce upload time'
        ]
      },
      {
        id: 'review',
        title: 'Content Review',
        description: 'Platform review and quality check',
        status: 'in-progress',
        estimatedTime: '24-48 hours',
        priority: 'high',
        dependencies: ['upload'],
        tips: [
          'Ensure content meets community guidelines',
          'Check for copyright compliance',
          'Verify all technical requirements'
        ]
      },
      {
        id: 'contracts',
        title: 'Contract Processing',
        description: 'Legal review and contract signing',
        status: 'pending',
        estimatedTime: '2-3 days',
        priority: 'medium',
        dependencies: ['review'],
        tips: [
          'Review contract terms carefully',
          'Have legal counsel review if needed',
          'Keep copies of all signed documents'
        ]
      },
      {
        id: 'publishing',
        title: 'Content Publishing',
        description: 'Final publishing and distribution',
        status: 'pending',
        estimatedTime: '1-2 hours',
        priority: 'medium',
        dependencies: ['contracts'],
        tips: [
          'Set appropriate pricing and availability',
          'Create compelling descriptions and tags',
          'Schedule optimal release timing'
        ]
      }
    ];

    const mockMetrics: ContentMetrics = {
      totalUploads: 24,
      averageProcessingTime: '36 hours',
      successRate: 94.5,
      revenuePerTitle: '$3,456',
      averageRating: 4.3,
      completionRate: 87.2
    };

    const mockSuggestions: OptimizationSuggestion[] = [
      {
        type: 'efficiency',
        title: 'Batch Upload Processing',
        description: 'Upload multiple titles simultaneously to reduce total processing time by 40%',
        impact: 'high',
        effort: 'medium',
        action: 'Enable batch upload in settings'
      },
      {
        type: 'quality',
        title: 'Enhanced Metadata Templates',
        description: 'Use predefined templates to ensure consistent, high-quality metadata',
        impact: 'medium',
        effort: 'low',
        action: 'Create and save metadata templates'
      },
      {
        type: 'revenue',
        title: 'Optimal Pricing Strategy',
        description: 'Adjust pricing based on market analysis to increase revenue by 25%',
        impact: 'high',
        effort: 'medium',
        action: 'Review pricing recommendations'
      },
      {
        type: 'compliance',
        title: 'Automated Compliance Checks',
        description: 'Pre-validate content to reduce rejection rates by 60%',
        impact: 'high',
        effort: 'low',
        action: 'Enable compliance pre-check'
      }
    ];

    setWorkflowSteps(steps);
    setMetrics(mockMetrics);
    setSuggestions(mockSuggestions);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in-progress': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-gray-600 bg-gray-100';
      case 'blocked': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const WorkflowStepCard = ({ step }: { step: WorkflowStep }) => (
    <div className="workflow-step-card">
      <div className="workflow-step-header">
        <div className="workflow-step-info">
          <h4 className="workflow-step-title">{step.title}</h4>
          <p className="workflow-step-description">{step.description}</p>
        </div>
        <div className="workflow-step-status">
          <span className={`workflow-status-badge ${getStatusColor(step.status)}`}>
            {step.status.replace('-', ' ')}
          </span>
          <span className={`workflow-priority-badge ${getPriorityColor(step.priority)}`}>
            {step.priority}
          </span>
        </div>
      </div>
      
      <div className="workflow-step-details">
        <div className="workflow-time-info">
          <div className="workflow-time-item">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>Estimated: {step.estimatedTime}</span>
          </div>
          {step.actualTime && (
            <div className="workflow-time-item">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Actual: {step.actualTime}</span>
            </div>
          )}
        </div>
        
        {step.tips && step.tips.length > 0 && (
          <div className="workflow-tips">
            <h5 className="workflow-tips-title">
              <Lightbulb className="w-4 h-4 mr-2" />
              Pro Tips
            </h5>
            <ul className="workflow-tips-list">
              {step.tips.map((tip, index) => (
                <li key={index} className="workflow-tip-item">{tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );

  const SuggestionCard = ({ suggestion }: { suggestion: OptimizationSuggestion }) => (
    <div className="suggestion-card">
      <div className="suggestion-header">
        <div className="suggestion-type">
          {suggestion.type === 'efficiency' && <Zap className="w-5 h-5 text-yellow-500" />}
          {suggestion.type === 'quality' && <Star className="w-5 h-5 text-blue-500" />}
          {suggestion.type === 'revenue' && <DollarSign className="w-5 h-5 text-green-500" />}
          {suggestion.type === 'compliance' && <Shield className="w-5 h-5 text-purple-500" />}
          <span className="suggestion-type-label">{suggestion.type}</span>
        </div>
        <div className="suggestion-impact-effort">
          <span className={`suggestion-badge ${getImpactColor(suggestion.impact)}`}>
            {suggestion.impact} impact
          </span>
          <span className={`suggestion-badge ${getImpactColor(suggestion.effort)}`}>
            {suggestion.effort} effort
          </span>
        </div>
      </div>
      
      <div className="suggestion-content">
        <h4 className="suggestion-title">{suggestion.title}</h4>
        <p className="suggestion-description">{suggestion.description}</p>
        <button className="suggestion-action-button">
          {suggestion.action}
          <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  );

  if (!metrics) return null;

  return (
    <div className="creator-workflow-optimizer">
      {/* Header */}
      <div className="optimizer-header">
        <div className="optimizer-title-section">
          <h2 className="optimizer-title">Workflow Optimization Center</h2>
          <p className="optimizer-subtitle">
            Streamline your content creation process with intelligent workflow management and optimization suggestions
          </p>
        </div>
        <div className="optimizer-controls">
          <button className="optimizer-control-button">
            <Settings className="w-4 h-4 mr-2" />
            Workflow Settings
          </button>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="optimizer-metrics-grid">
        <div className="optimizer-metric-card">
          <div className="optimizer-metric-icon">
            <Upload className="w-6 h-6" />
          </div>
          <div className="optimizer-metric-content">
            <div className="optimizer-metric-value">{metrics.totalUploads}</div>
            <div className="optimizer-metric-label">Total Uploads</div>
          </div>
        </div>

        <div className="optimizer-metric-card">
          <div className="optimizer-metric-icon">
            <Clock className="w-6 h-6" />
          </div>
          <div className="optimizer-metric-content">
            <div className="optimizer-metric-value">{metrics.averageProcessingTime}</div>
            <div className="optimizer-metric-label">Avg Processing Time</div>
          </div>
        </div>

        <div className="optimizer-metric-card">
          <div className="optimizer-metric-icon">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div className="optimizer-metric-content">
            <div className="optimizer-metric-value">{metrics.successRate}%</div>
            <div className="optimizer-metric-label">Success Rate</div>
          </div>
        </div>

        <div className="optimizer-metric-card">
          <div className="optimizer-metric-icon">
            <DollarSign className="w-6 h-6" />
          </div>
          <div className="optimizer-metric-content">
            <div className="optimizer-metric-value">{metrics.revenuePerTitle}</div>
            <div className="optimizer-metric-label">Revenue per Title</div>
          </div>
        </div>

        <div className="optimizer-metric-card">
          <div className="optimizer-metric-icon">
            <Star className="w-6 h-6" />
          </div>
          <div className="optimizer-metric-content">
            <div className="optimizer-metric-value">{metrics.averageRating}/5.0</div>
            <div className="optimizer-metric-label">Average Rating</div>
          </div>
        </div>

        <div className="optimizer-metric-card">
          <div className="optimizer-metric-icon">
            <Target className="w-6 h-6" />
          </div>
          <div className="optimizer-metric-content">
            <div className="optimizer-metric-value">{metrics.completionRate}%</div>
            <div className="optimizer-metric-label">Completion Rate</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="optimizer-tabs">
        <button
          className={`optimizer-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Overview
        </button>
        <button
          className={`optimizer-tab ${activeTab === 'workflow' ? 'active' : ''}`}
          onClick={() => setActiveTab('workflow')}
        >
          <Settings className="w-4 h-4 mr-2" />
          Workflow
        </button>
        <button
          className={`optimizer-tab ${activeTab === 'optimization' ? 'active' : ''}`}
          onClick={() => setActiveTab('optimization')}
        >
          <Zap className="w-4 h-4 mr-2" />
          Optimization
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="optimizer-overview">
          <div className="overview-grid">
            <div className="overview-card">
              <h3 className="overview-card-title">Workflow Efficiency</h3>
              <div className="overview-progress-bar">
                <div className="overview-progress-fill" style={{ width: '78%' }}></div>
              </div>
              <p className="overview-progress-text">78% optimized workflow efficiency</p>
            </div>

            <div className="overview-card">
              <h3 className="overview-card-title">Time Savings</h3>
              <div className="overview-stat">
                <span className="overview-stat-value">12 hours</span>
                <span className="overview-stat-label">Saved per month</span>
              </div>
            </div>

            <div className="overview-card">
              <h3 className="overview-card-title">Revenue Impact</h3>
              <div className="overview-stat">
                <span className="overview-stat-value">+23%</span>
                <span className="overview-stat-label">Revenue increase</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'workflow' && (
        <div className="optimizer-workflow">
          <div className="workflow-timeline">
            {workflowSteps.map((step, index) => (
              <div key={step.id} className="workflow-timeline-item">
                <div className="workflow-timeline-connector">
                  {index < workflowSteps.length - 1 && <div className="workflow-connector-line"></div>}
                </div>
                <WorkflowStepCard step={step} />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'optimization' && (
        <div className="optimizer-suggestions">
          <div className="suggestions-grid">
            {suggestions.map((suggestion, index) => (
              <SuggestionCard key={index} suggestion={suggestion} />
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="optimizer-quick-actions">
        <h3 className="quick-actions-title">Quick Actions</h3>
        <div className="quick-actions-grid">
          <button className="quick-action-button">
            <Upload className="w-5 h-5" />
            <span>Start New Upload</span>
          </button>
          <button className="quick-action-button">
            <FileText className="w-5 h-5" />
            <span>Review Contracts</span>
          </button>
          <button className="quick-action-button">
            <BarChart3 className="w-5 h-5" />
            <span>View Analytics</span>
          </button>
          <button className="quick-action-button">
            <Calendar className="w-5 h-5" />
            <span>Schedule Release</span>
          </button>
        </div>
      </div>
    </div>
  );
}
