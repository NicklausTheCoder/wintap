// src/pages/PaymentCallback.jsx
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function PaymentCallback() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Parse the URL parameters from Paynow
    const params = new URLSearchParams(location.search);
    
    // Paynow sends back parameters like status, reference, etc.
    const status = params.get('status');
    const reference = params.get('reference');
    const amount = params.get('amount');
    
    console.log('🔙 Payment callback received:', { status, reference, amount });

    // Redirect to wallet with the payment info
    if (reference) {
      navigate(`/wallet?reference=${reference}&status=${status || 'pending'}`);
    } else {
      navigate('/wallet');
    }
  }, [location, navigate]);

  return (
    <div className="payment-callback">
      <div className="loading-spinner"></div>
      <p>Processing your payment...</p>
    </div>
  );
}

export default PaymentCallback;