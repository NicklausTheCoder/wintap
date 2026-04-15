// pages/Terms.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Terms.css';

function Terms({ user }) {
  const location = useLocation();

  const navItems = user ? [
    { path: '/', icon: '🏠', label: 'Home' },
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/games', icon: '🎮', label: 'Games' },
    { path: '/profile', icon: '👤', label: 'Profile' },
    { path: '/leaderboard', icon: '🏆', label: 'Rank' }
  ] : [
    { path: '/', icon: '🏠', label: 'Home' },
    { path: '/games', icon: '🎮', label: 'Games' },
    { path: '/login', icon: '🔐', label: 'Login' },
    { path: '/register', icon: '📝', label: 'Sign Up' }
  ];

const documents = [
  {
    id: 'terms',
    title: 'Terms of Service',
    icon: '📜',
    description: 'Rules, eligibility, and legal agreement for using WinTap Games',
    buttonText: 'View Terms',
    url: '/documents/terms.pdf',
    color: '#7F77DD'
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    icon: '🔒',
    description: 'How we collect, use, and protect your personal data',
    buttonText: 'View Privacy Policy',
    url: '/documents/privacy.pdf',
    color: '#4A90E2'
  },
  {
    id: 'responsible',
    title: 'Responsible Gaming',
    icon: '🎯',
    description: 'Age verification, deposit limits, and self-exclusion options',
    buttonText: 'View Guidelines',
    url: '/documents/responsible-gaming.pdf',
    color: '#f59e0b'
  },
  {
    id: 'withdrawal',
    title: 'Withdrawal Policy',
    icon: '💸',
    description: 'Minimum amounts ($3), processing times (24-48hrs), and fees',
    buttonText: 'View Policy',
    url: '/documents/withdrawal-policy.pdf',
    color: '#1D9E75'
  },
  {
    id: 'refund',
    title: 'Refund Policy',
    icon: '🔄',
    description: 'No refunds on deposits, chargeback policy, and dispute resolution',
    buttonText: 'View Refund Policy',
    url: '/documents/refund-policy.pdf',
    color: '#ef4444'
  },
  {
    id: 'aml',
    title: 'Anti-Money Laundering',
    icon: '🛡️',
    description: 'KYC requirements, transaction monitoring, and suspicious activity reporting',
    buttonText: 'View AML Policy',
    url: '/documents/aml-policy.pdf',
    color: '#8b5cf6'
  },
  {
    id: 'fairplay',
    title: 'Fair Play Policy',
    icon: '⚖️',
    description: 'No cheating, bots, multi-accounting, or collusion',
    buttonText: 'View Fair Play Policy',
    url: '/documents/fairplay-policy.pdf',
    color: '#ec489a'
  },
  {
    id: 'cookies',
    title: 'Cookie Policy',
    icon: '🍪',
    description: 'How we use cookies and tracking technologies',
    buttonText: 'View Cookie Policy',
    url: '/documents/cookies-policy.pdf',
    color: '#14b8a6'
  }
];

  return (
    <div className="terms-page">
      {/* Header */}
      <header className="terms-header">
        <Link to="/" className="back-btn">← Back</Link>
        <h1>Legal Documents</h1>
      </header>

      <main className="terms-main">
        <div className="terms-container">
          <p className="terms-intro">
            Welcome to WinTap Games. Please review our legal documents below.
            Click any button to view the full document.
          </p>

          <div className="documents-grid">
            {documents.map(doc => (
              <div key={doc.id} className="document-card">
                <div className="document-icon" style={{ background: `${doc.color}20`, color: doc.color }}>
                  {doc.icon}
                </div>
                <h3>{doc.title}</h3>
                <p>{doc.description}</p>
                <a 
                  href={doc.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="document-btn"
                  style={{ background: doc.color }}
                >
                  {doc.buttonText} →
                </a>
              </div>
            ))}
          </div>

          <div className="legal-note">
            <p>📅 Last Updated: April 15, 2026</p>
            <p>⚡ For any legal questions, contact us at: <a href="mailto:legal@wintapgames.com">legal@wintapgames.com</a></p>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export default Terms;