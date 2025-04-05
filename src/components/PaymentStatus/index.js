import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './index.css';

const PaymentStatus = () => {
    const [status, setStatus] = useState('Processing payment...');
    const [paymentDetails, setPaymentDetails] = useState(null);
    const [error, setError] = useState(null);
    const location = useLocation();
    const navigate = useNavigate();
    
    useEffect(() => {
        const verifyPayment = async () => {
            try {
                const params = new URLSearchParams(location.search);
                const order_id = params.get('order_id');
                const booking_id = params.get('booking_id');
                const isExtension = params.get('extension') === 'true';
                const isPrepone = params.get('prepone') === 'true';

                if (!order_id || !booking_id) {
                    setStatus('Invalid payment session');
                    setError('Missing order ID or booking ID');
                    return;
                }

                let paymentType = 'booking';
                if (isExtension) paymentType = 'extension';
                if (isPrepone) paymentType = 'prepone';

                console.log(`Verifying ${paymentType} payment for order: ${order_id}, booking: ${booking_id}`);
                setStatus(`Verifying ${paymentType} payment with Cashfree...`);

                // First, wait a few seconds to allow Cashfree to process the payment
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // Choose the appropriate endpoint based on payment type
                let endpoint = 'verify-payment';
                if (isExtension) endpoint = 'verify-extension-payment';
                if (isPrepone) endpoint = 'verify-prepone-payment';
                
                const response = await fetch(`https://exsel-backend-3.onrender.com/api/${endpoint}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ order_id, booking_id })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || `Failed to verify ${paymentType} payment`);
                }

                setPaymentDetails(data);
                setStatus('Payment successful!');

                // Redirect after 3 seconds
                setTimeout(() => {
                    navigate('/dashboard');
                }, 3000);
            } catch (error) {
                console.error('Payment verification error:', error);
                setError(error.message);
                setStatus('Payment verification failed');

                // Redirect after 5 seconds on error
                setTimeout(() => {
                    navigate('/dashboard');
                }, 5000);
            }
        };

        verifyPayment();
    }, [location, navigate]);

    return (
        <div className="payment-status-container">
            <div className="payment-status-card">
                <h2>Payment Status</h2>
                <div className="status-message">
                    {error ? (
                        <div className="error-message">
                            <i className="fas fa-times-circle"></i>
                            <p>{error}</p>
                        </div>
                    ) : (
                        <div className="success-message">
                            <i className="fas fa-check-circle"></i>
                            <p>{status}</p>
                        </div>
                    )}
                </div>
                {paymentDetails && (
                    <div className="payment-details">
                        <p>{paymentDetails.message}</p>
                        {paymentDetails.additionalCost && (
                            <p>Additional Amount Paid: ₹{paymentDetails.additionalCost}</p>
                        )}
                    </div>
                )}
                <p className="redirect-message">
                    Redirecting to dashboard{error ? ' in 5 seconds...' : ' in 3 seconds...'}
                </p>
            </div>
        </div>
    );
};

export default PaymentStatus; 