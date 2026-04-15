// pages/Contact.jsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ref, push, set } from 'firebase/database';
import { database } from '../firebase';
import './Contact.css';

function Contact({ user }) {
  const location = useLocation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: 'bug',
    message: '',
    priority: 'normal',
    attachments: []
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

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

  const categories = [
    { id: 'bug', icon: '🐛', label: 'Report a Bug', color: '#ef4444', description: 'Found a glitch or issue?' },
    { id: 'feature', icon: '💡', label: 'Feature Request', color: '#f59e0b', description: 'Suggest an improvement' },
    { id: 'support', icon: '🎮', label: 'Game Support', color: '#4A90E2', description: 'Gameplay or technical help' },
    { id: 'payment', icon: '💰', label: 'Payment Issue', color: '#1D9E75', description: 'Deposit/withdrawal problems' },
    { id: 'account', icon: '👤', label: 'Account Issue', color: '#7F77DD', description: 'Login, verification, or profile' },
    { id: 'feedback', icon: '💬', label: 'General Feedback', color: '#8b5cf6', description: 'Share your thoughts' },
    { id: 'partnership', icon: '🤝', label: 'Partnership', color: '#ec489a', description: 'Business inquiries' },
    { id: 'security', icon: '🔒', label: 'Security Concern', color: '#14b8a6', description: 'Report security issues' }
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.message.trim()) {
      setError('Please enter a message');
      return;
    }

    if (!formData.email && !user?.email) {
      setError('Please enter your email');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const ticketRef = push(ref(database, 'support_tickets'));
      await set(ticketRef, {
        ...formData,
        email: formData.email || user?.email,
        name: formData.name || user?.displayName || user?.email?.split('@')[0] || 'Anonymous',
        userId: user?.uid || null,
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ticketId: ticketRef.key
      });

      setSubmitted(true);
      setFormData({
        name: '',
        email: '',
        subject: '',
        category: 'bug',
        message: '',
        priority: 'normal',
        attachments: []
      });
    } catch (err) {
      console.error('Error submitting ticket:', err);
      setError('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="contact-page">
      {/* Header */}
      <header className="contact-header">
        <Link to="/" className="back-btn">← Back</Link>
        <h1>Support Center</h1>
      </header>

      <main className="contact-main">
        {submitted ? (
          <div className="success-container">
            <div className="success-icon">✅</div>
            <h2>Ticket Submitted!</h2>
            <p>Thank you for reaching out. Our support team will respond within 24 hours.</p>
            <Link to="/" className="btn-home">Return Home</Link>
            <button onClick={() => setSubmitted(false)} className="btn-new-ticket">
              Submit Another Ticket
            </button>
          </div>
        ) : (
          <>
            {/* Quick Contact Info */}
            <div className="contact-info-grid">
              <div className="info-card">
                <div className="info-icon">⏱️</div>
                <h3>Response Time</h3>
                <p>Within 24 hours</p>
                <small>Mon-Fri, 9AM-6PM</small>
              </div>
              <div className="info-card">
                <div className="info-icon">📧</div>
                <h3>Email Us</h3>
                <p>support@wintapgames.com</p>
                <small>For general inquiries</small>
              </div>
              <div className="info-card">
                <div className="info-icon">💬</div>
                <h3>Live Chat</h3>
                <p>Coming Soon</p>
                <small>Available 24/7</small>
              </div>
              <div className="info-card">
                <div className="info-icon">📱</div>
                <h3>WhatsApp</h3>
                <p>+263 77 123 4567</p>
                <small>Text only</small>
              </div>
            </div>

            {/* Bug Report Form */}
            <div className="contact-form-container">
              <h2>Report an Issue or Send Feedback</h2>
              <p className="form-description">
                Found a bug? Have a suggestion? Let us know and help us improve!
              </p>

              {error && <div className="error-message">{error}</div>}

              <form onSubmit={handleSubmit} className="contact-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Your Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder={user?.displayName || "Enter your name"}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder={user?.email || "your@email.com"}
                      className="form-input"
                      required={!user?.email}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Subject</label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="Brief description of your issue"
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Priority</label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleChange}
                      className="form-select"
                    >
                      <option value="low">Low - Minor issue</option>
                      <option value="normal">Normal - Something's wrong</option>
                      <option value="high">High - Can't play</option>
                      <option value="urgent">Urgent - Payment issue</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <div className="categories-grid">
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        className={`category-btn ${formData.category === cat.id ? 'active' : ''}`}
                        style={{
                          borderColor: formData.category === cat.id ? cat.color : 'transparent',
                          background: formData.category === cat.id ? `${cat.color}20` : 'rgba(255,255,255,0.05)'
                        }}
                        onClick={() => setFormData({ ...formData, category: cat.id })}
                      >
                        <span className="category-icon">{cat.icon}</span>
                        <div className="category-info">
                          <strong>{cat.label}</strong>
                          <small>{cat.description}</small>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Message</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Please describe the issue in detail. Include steps to reproduce if reporting a bug..."
                    className="form-textarea"
                    rows="6"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Additional Info (Optional)</label>
                  <div className="additional-info">
                    <input
                      type="text"
                      placeholder="Game name (if applicable)"
                      className="form-input"
                      onChange={(e) => setFormData({ ...formData, gameName: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Device / Browser"
                      className="form-input"
                      onChange={(e) => setFormData({ ...formData, device: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Lobby ID (if applicable)"
                      className="form-input"
                      onChange={(e) => setFormData({ ...formData, lobbyId: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-submit" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                  <Link to="/" className="btn-cancel">Cancel</Link>
                </div>

                <p className="form-note">
                  🔒 All reports are confidential. We'll get back to you within 24 hours.
                </p>
              </form>
            </div>

            {/* FAQ Section */}
            <div className="faq-section">
              <h2>Frequently Asked Questions</h2>
              <div className="faq-grid">
                <div className="faq-item">
                  <div className="faq-question">❓ How long do withdrawals take?</div>
                  <div className="faq-answer">Withdrawals are processed within 24-48 hours and sent to your Ecocash number.</div>
                </div>
                <div className="faq-item">
                  <div className="faq-question">❓ Minimum withdrawal amount?</div>
                  <div className="faq-answer">Minimum withdrawal is $3. Maximum is $500 per transaction.</div>
                </div>
                <div className="faq-item">
                  <div className="faq-question">❓ Game not loading?</div>
                  <div className="faq-answer">Try clearing your browser cache, updating Chrome, or using incognito mode.</div>
                </div>
                <div className="faq-item">
                  <div className="faq-question">❓ Winnings not showing?</div>
                  <div className="faq-answer">Winnings are added within 5 minutes after game completion. Refresh your wallet.</div>
                </div>
              </div>
            </div>

            {/* Bug Bounty Section */}
            <div className="bug-bounty">
              <div className="bounty-icon">🐛💰</div>
              <div className="bounty-content">
                <h3>Bug Bounty Program</h3>
                <p>Found a critical bug? Report it and earn rewards up to $100!</p>
                <small>Terms apply. Must be reproducible and reported first.</small>
              </div>
            </div>
          </>
        )}
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

export default Contact;