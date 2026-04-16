'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  CreditCard, 
  Smartphone, 
  DollarSign, 
  Shield, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  TrendingUp,
  Users,
  FileText,
  Download,
  RefreshCw,
  Eye,
  BarChart3
} from 'lucide-react';

interface PaymentMethod {
  id: string;
  type: 'card' | 'mobile' | 'bank';
  name: string;
  icon: React.ReactNode;
  last4?: string;
  isDefault?: boolean;
}

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  bonus?: number;
  popular?: boolean;
}

interface Transaction {
  id: string;
  type: 'purchase' | 'unlock' | 'refund';
  amount: number;
  credits: number;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  timestamp: Date;
  videoTitle?: string;
  creatorName?: string;
  taxWithheld: number;
  gatewayFee: number;
}

interface AuditTrail {
  id: string;
  userId: string;
  action: string;
  videoId?: string;
  amount?: number;
  credits?: number;
  metadata: any;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
}

export default function WebPaymentSystem() {
  const [activeTab, setActiveTab] = useState<'payment' | 'credits' | 'audit'>('payment');
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditTrail[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const creditPackages: CreditPackage[] = [
    {
      id: 'starter',
      name: 'Starter Pack',
      credits: 10,
      price: 1000,
      currency: 'NGN',
      bonus: 0
    },
    {
      id: 'standard',
      name: 'Standard Pack',
      credits: 25,
      price: 2300,
      currency: 'NGN',
      bonus: 2,
      popular: true
    },
    {
      id: 'premium',
      name: 'Premium Pack',
      credits: 50,
      price: 4500,
      currency: 'NGN',
      bonus: 5
    },
    {
      id: 'enterprise',
      name: 'Enterprise Pack',
      credits: 100,
      price: 8500,
      currency: 'NGN',
      bonus: 15
    }
  ];

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'flutterwave',
      type: 'card',
      name: 'Flutterwave Card',
      icon: <CreditCard className="w-5 h-5" />,
      last4: '4242',
      isDefault: true
    },
    {
      id: 'paystack',
      type: 'mobile',
      name: 'Paystack Mobile',
      icon: <Smartphone className="w-5 h-5" />
    }
  ];

  const mockTransactions = useMemo(() => [
    {
      id: 'txn_001',
      type: 'purchase',
      description: 'Premium Credit Package - 100 Credits',
      amount: 5000,
      credits: 100,
      bonusCredits: 20,
      status: 'completed',
      paymentMethod: 'Flutterwave Card',
      timestamp: new Date('2024-01-15T10:30:00Z'),
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0...',
      sessionId: 'sess_123456'
    },
    {
      id: 'txn_002',
      type: 'purchase',
      description: 'Standard Credit Package - 50 Credits',
      amount: 2500,
      credits: 50,
      bonusCredits: 0,
      status: 'completed',
      paymentMethod: 'Paystack Mobile',
      timestamp: new Date('2024-01-14T15:45:00Z'),
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0...',
      sessionId: 'sess_123456'
    },
    {
      id: 'txn_003',
      type: 'refund',
      description: 'Refund - Failed Transaction',
      amount: -2500,
      credits: -50,
      bonusCredits: 0,
      status: 'completed',
      paymentMethod: 'Paystack Mobile',
      timestamp: new Date('2024-01-13T09:20:00Z'),
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0...',
      sessionId: 'sess_123456'
    },
    {
      id: 'txn_004',
      type: 'purchase',
      description: 'Premium Credit Package - 100 Credits',
      amount: 5000,
      credits: 100,
      bonusCredits: 20,
      status: 'pending',
      paymentMethod: 'Flutterwave Card',
      timestamp: new Date('2024-01-16T14:20:00Z'),
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0...',
      sessionId: 'sess_123456'
    }
  ], []);

  const mockAuditTrail = useMemo(() => [
    {
      id: 'audit_001',
      userId: 'user_123',
      action: 'credit_purchase_initiated',
      details: 'User initiated purchase of Premium Credit Package - 100 Credits',
      timestamp: new Date('2024-01-15T10:30:00Z'),
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0...',
      sessionId: 'sess_123456'
    },
    {
      id: 'audit_002',
      userId: 'user_123',
      action: 'credit_purchase_completed',
      details: 'Payment processed successfully - Flutterwave Card',
      timestamp: new Date('2024-01-15T10:32:00Z'),
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0...',
      sessionId: 'sess_123456'
    },
    {
      id: 'audit_003',
      userId: 'user_123',
      action: 'credits_added_to_wallet',
      details: '100 credits + 20 bonus added to user wallet',
      timestamp: new Date('2024-01-15T10:32:15Z'),
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0...',
      sessionId: 'sess_123456'
    },
    {
      id: 'audit_004',
      userId: 'user_123',
      action: 'payment_method_updated',
      details: 'User updated default payment method to Paystack Mobile',
      timestamp: new Date('2024-01-14T15:40:00Z'),
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0...',
      sessionId: 'sess_123456'
    }
  ], []);

  useEffect(() => {
    setTransactions(mockTransactions);
    setAuditTrail(mockAuditTrail);
  }, [mockTransactions, mockAuditTrail]);

  const handlePurchase = async () => {
    if (!selectedPackage || !paymentMethod) return;

    setIsProcessing(true);
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const packageData = creditPackages.find(p => p.id === selectedPackage);
      const methodData = paymentMethods.find(m => m.id === paymentMethod);
      
      // Add new transaction
      const newTransaction: Transaction = {
        id: `txn_${Date.now()}`,
        type: 'purchase',
        amount: packageData!.price,
        credits: packageData!.credits + (packageData!.bonus || 0),
        description: `${packageData!.name} Purchase via ${methodData!.name}`,
        status: 'completed',
        timestamp: new Date(),
        taxWithheld: Math.round(packageData!.price * 0.075),
        gatewayFee: Math.round(packageData!.price * 0.03)
      };
      
      setTransactions(prev => [newTransaction, ...prev]);
      setSelectedPackage('');
      setPaymentMethod('');
    } catch (error) {
      console.error('Payment failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'refunded': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'failed': return <AlertTriangle className="w-4 h-4" />;
      case 'refunded': return <RefreshCw className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="web-payment-system">
      {/* Header */}
      <div className="payment-header">
        <div className="header-content">
          <h1 className="header-title">Payment & Credits Center</h1>
          <p className="header-subtitle">Manage your credits and view transaction history</p>
        </div>
        
        <div className="header-stats">
          <div className="stat-card">
            <div className="stat-icon">
              <DollarSign className="w-6 h-6" />
            </div>
            <div className="stat-content">
              <div className="stat-value">45</div>
              <div className="stat-label">Available Credits</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="stat-content">
              <div className="stat-value">₦8,500</div>
              <div className="stat-label">Total Spent</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <Shield className="w-6 h-6" />
            </div>
            <div className="stat-content">
              <div className="stat-value">12</div>
              <div className="stat-label">Titles Unlocked</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="payment-tabs">
        <button
          className={`tab-button ${activeTab === 'payment' ? 'active' : ''}`}
          onClick={() => setActiveTab('payment')}
        >
          <DollarSign className="w-5 h-5" />
          <span>Purchase Credits</span>
        </button>
        
        <button
          className={`tab-button ${activeTab === 'credits' ? 'active' : ''}`}
          onClick={() => setActiveTab('credits')}
        >
          <BarChart3 className="w-5 h-5" />
          <span>Transaction History</span>
        </button>
        
        <button
          className={`tab-button ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <Eye className="w-5 h-5" />
          <span>Audit Trail</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Purchase Credits Tab */}
        {activeTab === 'payment' && (
          <div className="payment-content">
            <div className="payment-sections">
              {/* Credit Packages */}
              <div className="packages-section">
                <h2 className="section-title">Choose Credit Package</h2>
                <div className="packages-grid">
                  {creditPackages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className={`package-card ${selectedPackage === pkg.id ? 'selected' : ''} ${pkg.popular ? 'popular' : ''}`}
                      onClick={() => setSelectedPackage(pkg.id)}
                    >
                      {pkg.popular && (
                        <div className="popular-badge">Most Popular</div>
                      )}
                      
                      <div className="package-header">
                        <h3 className="package-name">{pkg.name}</h3>
                        <div className="package-credits">
                          {pkg.credits + (pkg.bonus || 0)} Credits
                          {pkg.bonus > 0 && (
                            <span className="bonus-text">+{pkg.bonus} bonus</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="package-price">
                        <div className="price-amount">₦{pkg.price.toLocaleString()}</div>
                        <div className="price-per-credit">
                          ₦{Math.round(pkg.price / (pkg.credits + (pkg.bonus || 0)))} per credit
                        </div>
                      </div>
                      
                      {pkg.bonus > 0 && (
                        <div className="package-savings">
                          Save ₦{Math.round((pkg.bonus * 100))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Methods */}
              <div className="payment-methods-section">
                <h2 className="section-title">Payment Method</h2>
                <div className="payment-methods-grid">
                  {paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className={`payment-method-card ${paymentMethod === method.id ? 'selected' : ''} ${method.isDefault ? 'default' : ''}`}
                      onClick={() => setPaymentMethod(method.id)}
                    >
                      <div className="method-header">
                        <div className="method-icon">{method.icon}</div>
                        <div className="method-info">
                          <div className="method-name">{method.name}</div>
                          {method.last4 && (
                            <div className="method-details">•••• {method.last4}</div>
                          )}
                        </div>
                        {method.isDefault && (
                          <div className="default-badge">Default</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Purchase Button */}
            <div className="purchase-section">
              <button
                className={`purchase-button ${!selectedPackage || !paymentMethod || isProcessing ? 'disabled' : ''}`}
                onClick={handlePurchase}
                disabled={!selectedPackage || !paymentMethod || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <DollarSign className="w-5 h-5" />
                    <span>Complete Purchase</span>
                  </>
                )}
              </button>
              
              <div className="security-info">
                <Shield className="w-4 h-4" />
                <span>Secure payment powered by Flutterwave & Paystack</span>
              </div>
            </div>
          </div>
        )}

        {/* Transaction History Tab */}
        {activeTab === 'credits' && (
          <div className="credits-content">
            <div className="transactions-header">
              <h2 className="section-title">Transaction History</h2>
              <div className="transaction-filters">
                <select className="filter-select">
                  <option value="all">All Transactions</option>
                  <option value="purchase">Purchases</option>
                  <option value="unlock">Unlocks</option>
                  <option value="refund">Refunds</option>
                </select>
                <button className="export-button">
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
              </div>
            </div>
            
            <div className="transactions-list">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="transaction-item">
                  <div className="transaction-icon">
                    {transaction.type === 'purchase' ? (
                      <DollarSign className="w-5 h-5" />
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                  </div>
                  
                  <div className="transaction-details">
                    <div className="transaction-header">
                      <h3 className="transaction-title">{transaction.description}</h3>
                      <div className={`transaction-status ${getStatusColor(transaction.status)}`}>
                        {getStatusIcon(transaction.status)}
                        <span>{transaction.status}</span>
                      </div>
                    </div>
                    
                    <div className="transaction-meta">
                      {transaction.videoTitle && (
                        <div className="meta-item">
                          <span className="meta-label">Video:</span>
                          <span className="meta-value">{transaction.videoTitle}</span>
                        </div>
                      )}
                      {transaction.creatorName && (
                        <div className="meta-item">
                          <span className="meta-label">Creator:</span>
                          <span className="meta-value">{transaction.creatorName}</span>
                        </div>
                      )}
                      <div className="meta-item">
                        <span className="meta-label">Date:</span>
                        <span className="meta-value">
                          {transaction.timestamp.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="transaction-amounts">
                    <div className="amount-row">
                      <span className="amount-label">Amount:</span>
                      <span className="amount-value">₦{transaction.amount.toLocaleString()}</span>
                    </div>
                    <div className="amount-row">
                      <span className="amount-label">Credits:</span>
                      <span className="amount-value credits">+{transaction.credits}</span>
                    </div>
                    {transaction.taxWithheld > 0 && (
                      <div className="amount-row">
                        <span className="amount-label">Tax:</span>
                        <span className="amount-value tax">-₦{transaction.taxWithheld.toLocaleString()}</span>
                      </div>
                    )}
                    {transaction.gatewayFee > 0 && (
                      <div className="amount-row">
                        <span className="amount-label">Fee:</span>
                        <span className="amount-value fee">-₦{transaction.gatewayFee.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audit Trail Tab */}
        {activeTab === 'audit' && (
          <div className="audit-content">
            <div className="audit-header">
              <h2 className="section-title">Audit Trail</h2>
              <div className="audit-filters">
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
              {auditTrail.map((audit) => (
                <div key={audit.id} className="audit-item">
                  <div className="audit-icon">
                    <FileText className="w-5 h-5" />
                  </div>
                  
                  <div className="audit-details">
                    <div className="audit-header">
                      <h3 className="audit-action">{audit.action.replace(/_/g, ' ')}</h3>
                      <div className="audit-timestamp">
                        {audit.timestamp.toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="audit-meta">
                      {audit.videoId && (
                        <div className="meta-item">
                          <span className="meta-label">Video ID:</span>
                          <span className="meta-value">{audit.videoId}</span>
                        </div>
                      )}
                      {audit.amount && (
                        <div className="meta-item">
                          <span className="meta-label">Amount:</span>
                          <span className="meta-value">₦{audit.amount.toLocaleString()}</span>
                        </div>
                      )}
                      {audit.credits && (
                        <div className="meta-item">
                          <span className="meta-label">Credits:</span>
                          <span className="meta-value">{audit.credits}</span>
                        </div>
                      )}
                      <div className="meta-item">
                        <span className="meta-label">IP Address:</span>
                        <span className="meta-value">{audit.ipAddress}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Session ID:</span>
                        <span className="meta-value">{audit.sessionId}</span>
                      </div>
                    </div>
                    
                    {audit.metadata && Object.keys(audit.metadata).length > 0 && (
                      <div className="audit-metadata">
                        <h4 className="metadata-title">Additional Information</h4>
                        <pre className="metadata-content">
                          {JSON.stringify(audit.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
