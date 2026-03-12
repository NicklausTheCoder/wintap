// src/pages/PaynowTest.jsx
import React, { useState } from 'react';
import { PaynowPayment } from 'paynow-react';
import './PaynowTest.css';

function PaynowTest() {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');

  // Sample items for payment
  const items = [
    {
      title: 'Test Payment',
      amount: parseFloat(amount) || 10,
      quantity: 1,
    }
  ];

  const handleOpenPayment = () => {
    if (!amount || amount < 1) {
      alert('Please enter a valid amount (minimum $1)');
      return;
    }
    setIsOpen(true);
  };

  const handlePaymentClose = (data) => {
    console.log('Payment closed with data:', data);
    setIsOpen(false);
    
    if (data && data.status === 'success') {
      setPaymentStatus('✅ Payment successful!');
    } else if (data && data.status === 'failed') {
      setPaymentStatus('❌ Payment failed');
    } else {
      setPaymentStatus('⏹️ Payment cancelled');
    }
  };

  return (
    <div className="paynow-test-container">
      <div className="paynow-test-card">
        <h1>💰 Paynow Test Page</h1>
        <p>Simple integration test for Paynow React SDK</p>

        <div className="test-section">
          <h3>Enter Amount</h3>
          <div className="amount-input-group">
            <span className="currency">$</span>
            <input
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="10"
              className="amount-input"
            />
          </div>

          <button 
            onClick={handleOpenPayment}
            className="paynow-test-button"
            disabled={!amount}
          >
            💳 Pay with Paynow
          </button>

          {paymentStatus && (
            <div className={`payment-status ${paymentStatus.includes('✅') ? 'success' : paymentStatus.includes('❌') ? 'error' : 'info'}`}>
              {paymentStatus}
            </div>
          )}

          <div className="test-info">
            <h4>Debug Info:</h4>
            <p>Amount: ${amount || '0'}</p>
            <p>Modal Open: {isOpen ? 'Yes' : 'No'}</p>
            <p>Items: {JSON.stringify(items)}</p>
          </div>
        </div>

        <div className="test-instructions">
          <h3>📋 Instructions:</h3>
          <ol>
            <li>Enter an amount (minimum $1)</li>
            <li>Click "Pay with Paynow" to open the modal</li>
            <li>Complete payment in the modal</li>
            <li>Check console logs for payment data</li>
          </ol>
        </div>
      </div>

      {/* Paynow Payment Modal */}
      <PaynowPayment
        items={items}
        label="Test Payment"
        paymentMode="mobile" // Try 'mobile' for EcoCash or 'web' for card
        isOpen={isOpen}
        onClose={handlePaymentClose}
      />
    </div>
  );
}

export default PaynowTest;