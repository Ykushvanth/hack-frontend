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

                if (!order_id || !booking_id) {
                    setStatus('Invalid payment session');
                    setError('Missing order ID or booking ID');
                    return;
                }

                console.log(`Verifying ${isExtension ? 'extension' : 'booking'} payment for order: ${order_id}, booking: ${booking_id}`);
                setStatus(`Verifying ${isExtension ? 'extension' : 'booking'} payment with Cashfree...`);

                // First, wait a few seconds to allow Cashfree to process the payment
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // Choose the appropriate endpoint based on whether this is an extension payment
                const endpoint = isExtension ? 'verify-extension-payment' : 'verify-payment';
                
                const response = await fetch(`http://localhost:3001/api/${endpoint}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ order_id, booking_id })
                });

                const data = await response.json();
                console.log(`${isExtension ? 'Extension' : 'Payment'} verification response:`, data);

                if (response.ok && data.success) {
                    setStatus(`${isExtension ? 'Extension' : 'Payment'} successful! Redirecting to booking history...`);
                    setPaymentDetails({
                        slotNumber: data.slot_number,
                        amountPaid: data.amount_paid,
                        newDepartureTime: data.newDepartureTime,
                        additionalCost: data.additionalCost,
                        isExtension: isExtension
                    });
                    
                    setTimeout(() => {
                        navigate('/', { state: { activeTab: 'history' } });
                    }, 5000);
                } else {
                    const errorMessage = data.error || 'Unknown error occurred';
                    setStatus(`${isExtension ? 'Extension' : 'Payment'} verification failed: ${errorMessage}`);
                    setError(errorMessage);
                    
                    setTimeout(() => {
                        navigate('/', { state: { activeTab: 'history' } });
                    }, 5000);
                }
            } catch (error) {
                console.error('Error verifying payment:', error);
                setStatus('Error connecting to payment server. Please contact support.');
                setError(error.message);
                
                setTimeout(() => {
                    navigate('/', { state: { activeTab: 'history' } });
                }, 5000);
            }
        };

        verifyPayment();
    }, [location, navigate]);

    return (
        <div className="payment-status-container">
            <div className="payment-status-card">
                <div className="status-icon">
                    {status.includes('successful') ? (
                        <i className="fas fa-check-circle success"></i>
                    ) : status.includes('failed') || status.includes('Error') ? (
                        <i className="fas fa-times-circle error"></i>
                    ) : (
                        <i className="fas fa-spinner fa-spin processing"></i>
                    )}
                </div>
                <h2>Payment Status</h2>
                <p>{status}</p>
                
                {paymentDetails && (
                    <div className="payment-details">
                        {paymentDetails.isExtension ? (
                            <>
                                {paymentDetails.additionalCost && (
                                    <div className="payment-detail-item">
                                        <span>Additional Amount Paid:</span>
                                        <strong>₹{paymentDetails.additionalCost}</strong>
                                    </div>
                                )}
                                {paymentDetails.newDepartureTime && (
                                    <div className="payment-detail-item">
                                        <span>New Departure Time:</span>
                                        <strong>{paymentDetails.newDepartureTime}</strong>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="payment-detail-item">
                                    <span>Slot Number:</span>
                                    <strong>{paymentDetails.slotNumber}</strong>
                                </div>
                                {paymentDetails.amountPaid && (
                                    <div className="payment-detail-item">
                                        <span>Amount Paid:</span>
                                        <strong>₹{paymentDetails.amountPaid}</strong>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
                
                {error && (
                    <div className="payment-error">
                        <p>Error details: {error}</p>
                        <p>If you've been charged, please contact support for assistance.</p>
                    </div>
                )}
                
                <div className="navigation-hint">
                    <p>You will be redirected automatically in a few seconds...</p>
                    <button 
                        className="manual-redirect-btn"
                        onClick={() => navigate('/', { state: { activeTab: 'history' } })}
                    >
                        Go back to dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentStatus; 