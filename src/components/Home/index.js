import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import './index.css';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Home = () => {
    const navigate = useNavigate();
    const userDetails = JSON.parse(localStorage.getItem('userDetails'));
    const [activeTab, setActiveTab] = useState('profile');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [bookingHistory, setBookingHistory] = useState([]);
    const [availableSlots, setAvailableSlots] = useState(null);
    const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

    const [locations, setLocations] = useState({
        states: [],
        districts: [],
        areas: [],
        parkingLots: []
    });

    const [formData, setFormData] = useState({
        state: '',
        district: '',
        area: '',
        parking_lot_id: '',
        car_number: userDetails?.car_number || '',
        rfid_number: '', // Add this line
        aadhar_number: userDetails?.aadhar_number || '',
        date: '',
        arrival_time: '',
        departure_time: '',
        driver_aadhar: userDetails?.aadhar_number || '',
        actual_arrival_time: '',
        actual_departed_time: ''
    });

    const [slotInfo, setSlotInfo] = useState({
        availableSlots: null,
        totalSlots: 0,
        showAvailability: false
    });

    const [loading, setLoading] = useState(false);

    // Add this state for filter
    const [bookingFilter, setBookingFilter] = useState('all');

    // Add all state variables
    const [showExtendModal, setShowExtendModal] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [extensionTime, setExtensionTime] = useState('');
    const [extendLoading, setExtendLoading] = useState(false);
    const [extendBookingData, setExtendBookingData] = useState(null);
    const [extendHours, setExtendHours] = useState(1);
    const [extendError, setExtendError] = useState(null);

    // Add these new state variables
    const [userLocation, setUserLocation] = useState(null);
    const [distances, setDistances] = useState({});
    const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
    const GOOGLE_MAPS_API_KEY = ''; // Replace with your actual API key

    // Constants for TIFAC parking coordinates
    const TIFAC_COORDINATES = {
        latitude: 9.5750616,  // Verify this is correct
        longitude: 77.6793517 // Verify this is correct
    };

    // Add this state for booking amount
    const [bookingAmount, setBookingAmount] = useState({
        amount: null,
        duration: null
    });

    // Add state for payment
    const [paymentProcessing, setPaymentProcessing] = useState(false);

    // Add this state for parking lot details dropdown
    const [showLotDetails, setShowLotDetails] = useState(false);

    // Add this state for notifications near your other state declarations
    const [notification, setNotification] = useState(null);

    // Add these state variables near your other state declarations
    const [showExtendTimeModal, setShowExtendTimeModal] = useState(false);
    const [selectedBookingForExtension, setSelectedBookingForExtension] = useState(null);
    const [extensionHours, setExtensionHours] = useState(1);
    const [extensionCost, setExtensionCost] = useState(0);
    const [isExtending, setIsExtending] = useState(false);
    const [extensionError, setExtensionError] = useState(null);

    // Add state variables for prepone functionality
    const [showPreponeModal, setShowPreponeModal] = useState(false);
    const [selectedBookingForPrepone, setSelectedBookingForPrepone] = useState(null);
    const [newArrivalTime, setNewArrivalTime] = useState('');
    const [preponeError, setPreponeError] = useState(null);
    const [isPreponingBooking, setIsPreponingBooking] = useState(false);

    // Add function to handle prepone arrival button click
    const handlePreponeArrival = (booking) => {
        setSelectedBookingForPrepone(booking);
        setNewArrivalTime('');
        setPreponeError(null);
        setShowPreponeModal(true);
    };

    // Add function to handle prepone submission
    const handlePreponeSubmit = async () => {
        try {
            setIsPreponingBooking(true);
            setError(null);

            if (!selectedBookingForPrepone || !newArrivalTime) {
                setError('Missing required information');
                return;
            }

            // First, check availability and get prepone info
            const response = await fetch('http://localhost:3001/api/prepone-arrival', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    booking_id: selectedBookingForPrepone.booking_id,
                    new_arrival_time: newArrivalTime
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create prepone request');
            }

            const preponeInfo = data.prepone_info;

            // If there's an additional cost, create a payment order
            if (preponeInfo.additional_cost > 0) {
                // Create order for payment
                const orderResponse = await fetch('http://localhost:3001/api/create-prepone-order', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        amount: preponeInfo.additional_cost,
                        bookingId: selectedBookingForPrepone.booking_id,
                        userDetails: userDetails
                    })
                });

                const orderData = await orderResponse.json();

                if (!orderResponse.ok) {
                    throw new Error(orderData.error || 'Failed to create payment order');
                }

                // Initialize Cashfree payment
                const cashfree = new window.Cashfree({
                    mode: "sandbox" // or "production"
                });

                await cashfree.init({
                    orderToken: orderData.payment_session_id
                });

                // Render payment UI
                await cashfree.redirect();
            } else {
                // If no additional cost, directly confirm the prepone
                const confirmResponse = await fetch('https://exsel-backend-3.onrender.com/api/confirm-prepone', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        booking_id: selectedBookingForPrepone.booking_id
                    })
                });

                const confirmData = await confirmResponse.json();

                if (!confirmResponse.ok) {
                    throw new Error(confirmData.error || 'Failed to confirm prepone');
                }

                // Close modal and refresh booking history
                setShowPreponeModal(false);
                fetchBookingHistory();
                toast.success('Booking preponed successfully!');
            }
        } catch (error) {
            console.error('Error in handlePreponeSubmit:', error);
            setError(error.message);
            toast.error(`Failed to prepone booking: ${error.message}`);
        } finally {
            setIsPreponingBooking(false);
        }
    };

    // Add prepone modal render function
    const renderPreponeModal = () => {
        if (!showPreponeModal || !selectedBookingForPrepone) return null;

        return (
            <div className="modal-overlay">
                <div className="modal-content">
                    <div className="modal-header">
                        <h2>Prepone Arrival</h2>
                        <button 
                            className="close-btn" 
                            onClick={() => setShowPreponeModal(false)}
                            disabled={isPreponingBooking}
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div className="modal-body">
                        <div className="current-booking-info">
                            <p>Current Arrival Time: <strong>{selectedBookingForPrepone.actual_arrival_time}</strong></p>
                            <p>Slot Number: <strong>{selectedBookingForPrepone.slot_number}</strong></p>
                        </div>

                        <div className="prepone-form">
                            <div className="form-group">
                                <label>New Arrival Time:</label>
                                <input
                                    type="time"
                                    value={newArrivalTime}
                                    onChange={(e) => setNewArrivalTime(e.target.value)}
                                    disabled={isPreponingBooking}
                                />
                            </div>
                        </div>

                        {preponeError && (
                            <div className="error-message">
                                <i className="fas fa-exclamation-circle"></i>
                                {preponeError}
                            </div>
                        )}
                    </div>
                    
                    <div className="modal-footer">
                        <button 
                            className="cancel-btn" 
                            onClick={() => setShowPreponeModal(false)}
                            disabled={isPreponingBooking}
                        >
                            Cancel
                        </button>
                        <button 
                            className="confirm-btn" 
                            onClick={handlePreponeSubmit}
                            disabled={isPreponingBooking || !newArrivalTime}
                        >
                            {isPreponingBooking ? (
                                <><i className="fas fa-spinner fa-spin"></i> Processing...</>
                            ) : (
                                <>Confirm Prepone</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Add this helper function before your component
    const formatDateTime = (date) => {
        if (!date) return '';
        
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit'
        };
        
        return new Date(date).toLocaleString('en-US', options);
    };

    // Add this function after your state declarations and before your other functions
    const resetForm = () => {
        setFormData({
            state: '',
            district: '',
            area: '',
            parking_lot_id: '',
            driver_name: userDetails?.first_name + ' ' + userDetails?.last_name || '',
            car_number: userDetails?.car_number || '',
            rfid_number: '', // Add this line
            aadhar_number: userDetails?.aadhar_number || '',
            date: '',
            arrival_time: '',
            departure_time: '',
            driver_aadhar: userDetails?.aadhar_number || '',
            actual_arrival_time: '',
            actual_departed_time: ''
        });

        // Reset other relevant states
        setBookingAmount({ amount: null, duration: null });
        setAvailableSlots(null);
        
        // Reset locations except states
        setLocations(prev => ({
            states: prev.states,
            districts: [],
            areas: [],
            parkingLots: []
        }));
    };

    // Get user location function
    const getLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userLoc = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    console.log('User location:', userLoc);
                    setUserLocation(userLoc);
                },
                (error) => {
                    console.error('Error getting location:', error);
                    alert('Please enable location access to see distance information');
                }
            );
        }
    };

    // Add this function to load Google Maps script
    useEffect(() => {
        const loadGoogleMapsScript = () => {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
            script.async = true;
            script.defer = true;
            script.onload = () => {
                console.log('Google Maps loaded successfully');
                setIsGoogleMapsLoaded(true);
            };
            document.head.appendChild(script);
        };

        loadGoogleMapsScript();
    }, []);

    // Update handleAreaChange function to use Google Maps Distance Matrix API
    const handleAreaChange = async (e) => {
        const area = e.target.value;
        setFormData(prev => ({ ...prev, area, parking_lot_id: '' }));
        
        try {
            const response = await fetch(
                `https://exsel-backend-3.onrender.com/api/parking-lots/${formData.state}/${formData.district}/${area}`
            );
            const data = await response.json();

            if (data.success && data.parking_lots) {
                setLocations(prev => ({ ...prev, parkingLots: data.parking_lots }));

                // Get user's current location
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(async (position) => {
                        const userLocation = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        };

                        console.log('🎯 User Current Location:', userLocation);

                        // Process each parking lot
                        const updatedDistances = {};
                        
                        for (const lot of data.parking_lots) {
                            try {
                                // Special logging for Kalasalingam University
                                if (lot.name === 'Kalasalingam University') {
                                    console.log('🔍 Processing Kalasalingam University:', {
                                        name: lot.name,
                                        address: lot.address,
                                        latitude: lot.latitude,
                                        longitude: lot.longitude,
                                        userLocation
                                    });
                                }

                                // Enhanced coordinate validation
                                const lat = parseFloat(lot.latitude);
                                const lng = parseFloat(lot.longitude);
                                
                                if (!lot.latitude || !lot.longitude || 
                                    isNaN(lat) || isNaN(lng) ||
                                    lat < -90 || lat > 90 ||
                                    lng < -180 || lng > 180) {
                                    console.warn(`⚠️ Invalid coordinates for parking lot: ${lot.name}`, {
                                        latitude: lot.latitude,
                                        longitude: lot.longitude
                                    });
                                        updatedDistances[lot.id] = {
                                        distance: 'N/A',
                                        duration: 'N/A'
                                    };
                                    continue;
                                }

                                // OpenRouteService API configuration
                                const apiKey = "5b3ce3597851110001cf62485b6c8f862da94241b6079e49235ccbaf";
                                const url = "https://api.openrouteservice.org/v2/matrix/driving-car";

                                // Prepare request body
                                const requestBody = {
                                    locations: [
                                        [userLocation.lng, userLocation.lat], // Start (Longitude, Latitude)
                                        [lng, lat] // Destination (Longitude, Latitude)
                                    ],
                                    metrics: ["distance", "duration"] // We need both distance and duration
                                };

                                if (lot.name === 'Kalasalingam University') {
                                    console.log('🚗 OpenRouteService Request for Kalasalingam:', requestBody);
                                }

                                const response = await fetch(url, {
                                    method: "POST",
                                    headers: {
                                        "Authorization": apiKey,
                                        "Content-Type": "application/json"
                                    },
                                    body: JSON.stringify(requestBody)
                                });

                                if (!response.ok) {
                                    const errorText = await response.text();
                                    console.error(`❌ OpenRouteService API error for ${lot.name}:`, {
                                        status: response.status,
                                        statusText: response.statusText,
                                        error: errorText
                                    });
                                    throw new Error(`API error: ${response.status} ${response.statusText}`);
                                }

                                const result = await response.json();
                                
                                if (lot.name === 'Kalasalingam University') {
                                    console.log('🛣️ OpenRouteService Response for Kalasalingam:', result);
                                }

                                if (result.distances && result.durations) {
                                    const distanceMeters = result.distances[0][1];
                                    const durationSeconds = result.durations[0][1];
                                    
                                    const distanceInKm = (distanceMeters / 1000).toFixed(2);
                                    const durationInMinutes = (durationSeconds / 60).toFixed(0);
                                    
                                    updatedDistances[lot.id] = {
                                        distance: `${distanceInKm} km`,
                                        duration: `${durationInMinutes} mins`
                                    };

                                    if (lot.name === 'Kalasalingam University') {
                                        console.log(`
                                            📍 Final Distance Calculation for Kalasalingam:
                                            Distance: ${distanceInKm} km
                                            Duration: ${durationInMinutes} minutes
                                        `);
                                    }
                                } else {
                                    throw new Error('Invalid distance or duration in API response');
                                }
        } catch (error) {
                                console.error(`❌ Error calculating distance for ${lot.name}:`, error);
                                updatedDistances[lot.id] = {
                                    distance: 'Error',
                                    duration: 'Error'
                                };
                            }
                        }

                        console.log('📊 Final Distance Calculations:', updatedDistances);
                        setDistances(updatedDistances);
                    }, 
                    (error) => {
                        console.error('❌ Geolocation error:', error);
                        toast.error('Please enable location access to see distance information');
                    });
                } else {
                    console.warn('⚠️ Geolocation is not supported by this browser');
                    toast.warning('Geolocation is not supported by your browser');
                }
                }
            } catch (error) {
            console.error('❌ Error in handleAreaChange:', error);
            toast.error('Failed to fetch parking lots');
        }
    };

    // Update the parking lot details display
    const renderParkingLotDetails = (lot) => {
        const distanceInfo = distances[lot.id];
        
        return (
            <div className="lot-details">
                <h3>Parking Lot Details</h3>
                <div className="detail-item">
                    <span className="label">Name</span>
                    <span className="value">{lot.name}</span>
                </div>
                <div className="detail-item">
                    <span className="label">Address</span>
                    <span className="value">{lot.address}</span>
                </div>
                <div className="detail-item">
                    <span className="label">Operating Hours</span>
                    <span className="value">24/7</span>
                </div>
                <div className="detail-item">
                    <span className="label">Price</span>
                    <span className="value">₹{lot.price_per_hour} per hour</span>
                </div>
                <div className="detail-item">
                    <span className="label">Total Slots</span>
                    <span className="value">{lot.total_slots}</span>
                </div>
                <div className="detail-item">
                    <span className="label">Distance</span>
                    <span className="value">
                        {distanceInfo ? (
                            distanceInfo.distance === 'Error' ? (
                                <span className="error-text">
                                    <i className="fas fa-exclamation-circle"></i> Error calculating distance
                                </span>
                            ) : distanceInfo.distance === 'N/A' ? (
                                <span className="na-text">
                                    <i className="fas fa-question-circle"></i> Distance not available
                                </span>
                            ) : (
                            <>
                                {distanceInfo.distance}
                                <br />
                                <small>({distanceInfo.duration} drive time)</small>
                            </>
                            )
                        ) : (
                            <span className="loading-text">
                                <i className="fas fa-spinner fa-spin"></i> Calculating...
                            </span>
                        )}
                    </span>
                </div>
                {lot.url && (
                    <a 
                        href={lot.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="view-on-map"
                    >
                        <i className="fas fa-map-marker-alt"></i> View on Google Maps
                    </a>
                )}
            </div>
        );
    };

    // Get user location when component mounts
    useEffect(() => {
        getLocation();
    }, []);

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Check availability when date or time fields change
        if (['date', 'arrival_time', 'departure_time', 'parking_lot_id'].includes(name)) {
            setAvailableSlots(null); // Reset available slots
        }
    };

    // Update the handleSubmit function
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Convert times to Date objects for comparison
        const arrivedDate = new Date(formData.arrival_time);
        const completedDate = new Date(formData.departure_time);
        const currentDate = new Date();

        // Validate times
        if (arrivedDate >= completedDate) {
            toast.error("Arrived time must be before completed time");
            return;
        }

        // Check if arrival time is in the past
        if (formData.date === currentDate.toISOString().split('T')[0]) {
            const [hours, minutes] = formData.arrival_time.split(':');
            const selectedDateTime = new Date(currentDate);
            selectedDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            if (selectedDateTime < currentDate) {
                toast.error("Cannot book slot for past time");
                return;
            }
        }

        try {
            setPaymentProcessing(true);

            // Log the request data for debugging
            const requestData = {
                parking_lot_id: parseInt(formData.parking_lot_id),
                driver_name: formData.driver_name || userDetails.first_name + ' ' + userDetails.last_name,
                car_number: formData.car_number,
                rfid_number: formData.rfid_number,
                aadhar_number: formData.aadhar_number,
                date: formData.date,
                actual_arrival_time: formData.arrival_time,
                actual_departed_time: formData.departure_time,
                user_id: userDetails.id
            };

            console.log('Sending booking request with data:', requestData);

            // First create the booking
            const bookingResponse = await fetch('https://exsel-backend-3.onrender.com/api/book-slot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            // Check if the response is ok before trying to parse JSON
            if (!bookingResponse.ok) {
                const errorText = await bookingResponse.text();
                console.error('Booking response error:', errorText);
                throw new Error(`Server error: ${bookingResponse.status} ${bookingResponse.statusText}`);
            }

            // Try to parse the JSON response
            let bookingData;
            try {
                bookingData = await bookingResponse.json();
            } catch (parseError) {
                console.error('Error parsing booking response:', parseError);
                throw new Error('Invalid response from server');
            }

            console.log('Booking created successfully:', bookingData);

            // Create Cashfree order
            const orderResponse = await fetch('https://exsel-backend-3.onrender.com/api/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    amount: bookingData.amount,
                    booking_id: bookingData.booking_id,
                    userDetails: userDetails
                })
            });

            // Check if the order response is ok before trying to parse JSON
            if (!orderResponse.ok) {
                const errorText = await orderResponse.text();
                console.error('Order response error:', errorText);
                throw new Error(`Payment error: ${orderResponse.status} ${orderResponse.statusText}`);
            }

            // Try to parse the JSON response
            let orderData;
            try {
                orderData = await orderResponse.json();
            } catch (parseError) {
                console.error('Error parsing order response:', parseError);
                throw new Error('Invalid response from payment server');
            }

            console.log('Payment order created successfully:', orderData);

            // Initialize Cashfree payment
            if (typeof window.Cashfree === 'undefined') {
                throw new Error('Cashfree SDK not loaded');
            }

            const cashfree = new window.Cashfree(orderData.payment_session_id);
            
            // Open Cashfree payment page
            await cashfree.redirect();

        } catch (error) {
            console.error('Error processing booking:', error);
            toast.error(error.message || 'Failed to process booking');
        } finally {
            setPaymentProcessing(false);
        }
    };

    // Update the useEffect for loading Cashfree script
    useEffect(() => {
        const loadCashfreeScript = () => {
            const script = document.createElement('script');
            script.src = 'https://sdk.cashfree.com/js/ui/2.0.0/cashfree.sandbox.js';
            script.async = true;
            script.onload = () => {
                console.log('Cashfree SDK loaded successfully');
            };
            script.onerror = (error) => {
                console.error('Error loading Cashfree SDK:', error);
            };
            document.body.appendChild(script);
        };

        loadCashfreeScript();

        return () => {
            const script = document.querySelector('script[src="https://sdk.cashfree.com/js/ui/2.0.0/cashfree.sandbox.js"]');
            if (script) {
                document.body.removeChild(script);
            }
        };
    }, []);

    // Add this function after the handleSubmit function and before the useEffect hooks
    const verifyPayment = async (orderId, bookingId) => {
        try {
            const response = await fetch('https://exsel-backend-3.onrender.com/api/verify-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order_id: orderId,
                    booking_id: bookingId
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Payment verification failed');
            }

            if (data.success) {
                alert('Payment successful! Your booking is confirmed.');
                // Reset the form and refresh booking history
                resetForm();
                fetchBookingHistory();
                // Switch to booking history tab
                setActiveTab('history');
            } else {
                throw new Error('Payment verification failed');
            }
        } catch (error) {
            console.error('Error verifying payment:', error);
            alert('Failed to verify payment: ' + error.message);
        }
    };

    // Add this function after the verifyPayment function
    const verifyExtensionPayment = async (orderId, bookingId, extensionId) => {
        try {
            const response = await fetch('https://exsel-backend-3.onrender.com/api/verify-extension-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order_id: orderId,
                    booking_id: bookingId,
                    extension_id: extensionId
                })
            });

            // Handle potential non-JSON responses
            let data;
            try {
                const text = await response.text();
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    console.error('Failed to parse verification response:', text);
                    throw new Error('Server returned an invalid response format for payment verification');
                }
            } catch (error) {
                console.error('Error reading verification response:', error);
                throw new Error('Failed to read server response for payment verification');
            }

            if (!response.ok) {
                throw new Error(data.error || 'Extension payment verification failed');
            }

            if (data.success) {
                toast.success('Payment successful! Your booking has been extended.');
                // Refresh booking history to show updated data
                fetchBookingHistory();
            } else {
                throw new Error('Extension payment verification failed');
            }
        } catch (error) {
            console.error('Error verifying extension payment:', error);
            toast.error(`Failed to verify extension payment: ${error.message}`);
        }
    };

    // Helper function to convert time to minutes
    const convertTimeToMinutes = (time) => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    };

    useEffect(() => {
        const jwtToken = Cookies.get('jwt_token');
        if (!jwtToken) {
            navigate('/login');
        }
    }, [navigate]);

    useEffect(() => {
        const fetchUserDetails = async () => {
            try {
                setIsLoading(true);
                const userId = localStorage.getItem('userData'); // Get the user ID
                
                const response = await fetch(`https://exsel-backend-3.onrender.com/api/user-details?userId=${userId}`, {
                    headers: {
                        'Authorization': `Bearer ${Cookies.get('jwt_token')}`
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Failed to fetch user details');
                }
                
                const data = await response.json();
                localStorage.setItem('userDetails', JSON.stringify(data));
                setIsLoading(false);
            } catch (err) {
                setError(err.message);
                setIsLoading(false);
            }
        };

        fetchUserDetails();
    }, []);

    // Fetch states on component mount
    useEffect(() => {
        const fetchStates = async () => {
            try {
                const response = await fetch('https://exsel-backend-3.onrender.com/api/states');
                const data = await response.json();
                // Ensure we're setting an array
                setLocations(prev => ({ ...prev, states: Array.isArray(data) ? data : [] }));
            } catch (error) {
                console.error('Error fetching states:', error);
                setLocations(prev => ({ ...prev, states: [] }));
            }
        };
        fetchStates();
    }, []);

    // Handle state selection
    const handleStateChange = async (e) => {
        const state = e.target.value;
        setFormData(prev => ({ 
            ...prev, 
            state,
            district: '',
            area: '',
            parking_lot_id: ''
        }));
        
        try {
            const response = await fetch(`https://exsel-backend-3.onrender.com/api/districts/${state}`);
            const districts = await response.json();
            setLocations(prev => ({ 
                ...prev, 
                districts,
                areas: [],
                parkingLots: []
            }));
        } catch (error) {
            console.error('Error fetching districts:', error);
        }
    };

    // Handle district selection
    const handleDistrictChange = async (e) => {
        const district = e.target.value;
        setFormData(prev => ({ 
            ...prev, 
            district,
            area: '',
            parking_lot_id: ''
        }));
        
        try {
            const response = await fetch(
                `https://exsel-backend-3.onrender.com/api/areas/${formData.state}/${district}`
            );
            const areas = await response.json();
            setLocations(prev => ({ 
                ...prev, 
                areas,
                parkingLots: []
            }));
        } catch (error) {
            console.error('Error fetching areas:', error);
        }
    };

    // Modified useEffect for Google Maps loading
    useEffect(() => {
        const loadGoogleMaps = () => {
            if (!window.google) {
                const script = document.createElement('script');
                script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
                script.async = true;
                script.defer = true;
                
                script.onload = () => {
                    console.log('Google Maps loaded successfully');
                    setIsGoogleMapsLoaded(true);
                    getLocation();
                };

                script.onerror = (error) => {
                    console.error('Error loading Google Maps:', error);
                };

                document.head.appendChild(script);
            } else {
                setIsGoogleMapsLoaded(true);
                getLocation();
            }
        };

        loadGoogleMaps();
    }, []);

    const onClickLogout = () => {
        Cookies.remove('jwt_token');
        localStorage.removeItem('userDetails');
        localStorage.removeItem('userData');
        navigate('/login');
    };

    // Updated renderProfile function with a more beautiful design
    const renderProfile = () => {
        if (isLoading) {
            return (
                <div className="profile-container">
                    <div className="profile-header-section">
                        <h2>User Profile</h2>
                    </div>
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Loading your profile...</p>
                    </div>
                </div>
            );
        }

        if (error) {
            return (
                <div className="profile-container">
                    <div className="profile-header-section">
                        <h2>User Profile</h2>
                    </div>
                    <div className="error-container">
                        <i className="fas fa-exclamation-circle"></i>
                        <p>Error: {error}</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="profile-container">
                <div className="profile-header-section">
                <h2>User Profile</h2>
                    <p className="profile-subtitle">Manage your personal information and preferences</p>
                    </div>

                <div className="profile-card-container">
                    <div className="profile-main-card">
                        <div className="profile-banner"></div>
                        <div className="profile-avatar-wrapper">
                            <div className="profile-avatar">
                                <span>{userDetails?.first_name?.charAt(0)}{userDetails?.last_name?.charAt(0)}</span>
                    </div>
                    </div>
                        <div className="profile-main-info">
                            <h3 className="profile-name">{userDetails?.first_name} {userDetails?.last_name}</h3>
                            <p className="profile-username">@{userDetails?.username}</p>
                            <p className="profile-joined">
                                <i className="fas fa-calendar-alt"></i> 
                                Joined {new Date(userDetails?.created_at).toLocaleDateString('en-US', { 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                })}
                            </p>
                    </div>
                        <div className="profile-stats">
                            <div className="stat-item">
                                <span className="stat-value">{bookingHistory?.length || 0}</span>
                                <span className="stat-label">Bookings</span>
                    </div>
                            <div className="stat-item">
                                <span className="stat-value">
                                    {bookingHistory?.filter(b => b.status === 'allow' || b.booking_status === 'COMPLETED').length || 0}
                                </span>
                                <span className="stat-label">Completed</span>
                    </div>
                            <div className="stat-item">
                                <span className="stat-value">
                                    {bookingHistory?.filter(b => 
                                        b.booking_status === 'CONFIRMED' && 
                                        !b.departed_time && 
                                        b.status !== 'allow'
                                    ).length || 0}
                                </span>
                                <span className="stat-label">Upcoming</span>
                    </div>
                    </div>
                    </div>

                    <div className="profile-details-grid">
                        <div className="profile-detail-card">
                            <div className="detail-card-header">
                                <i className="fas fa-user"></i>
                                <h3>Personal Information</h3>
                    </div>
                            <div className="detail-card-content">
                                <div className="detail-item">
                                    <span className="detail-label">First Name</span>
                                    <span className="detail-value">{userDetails?.first_name}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Last Name</span>
                                    <span className="detail-value">{userDetails?.last_name}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Gender</span>
                                    <span className="detail-value">{userDetails?.gender}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Date of Birth</span>
                                    <span className="detail-value">{userDetails?.date_of_birth}</span>
                                </div>
                            </div>
                        </div>

                        <div className="profile-detail-card">
                            <div className="detail-card-header">
                                <i className="fas fa-id-card"></i>
                                <h3>Identity Information</h3>
                            </div>
                            <div className="detail-card-content">
                                <div className="detail-item">
                                    <span className="detail-label">Aadhar Number</span>
                                    <span className="detail-value">
                                        {userDetails?.aadhar_number ? 
                                            `XXXX-XXXX-${userDetails.aadhar_number.slice(-4)}` : 
                                            'Not provided'}
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Car Number</span>
                                    <span className="detail-value">{userDetails?.car_number}</span>
                                </div>
                            </div>
                        </div>

                        <div className="profile-detail-card">
                            <div className="detail-card-header">
                                <i className="fas fa-envelope"></i>
                                <h3>Contact Information</h3>
                            </div>
                            <div className="detail-card-content">
                                <div className="detail-item">
                                    <span className="detail-label">Email</span>
                                    <span className="detail-value">{userDetails?.email}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Phone Number</span>
                                    <span className="detail-value">{userDetails?.phone_number}</span>
                                </div>
                            </div>
                        </div>

                        <div className="profile-detail-card">
                            <div className="detail-card-header">
                                <i className="fas fa-shield-alt"></i>
                                <h3>Account Security</h3>
                            </div>
                            <div className="detail-card-content">
                                <div className="detail-item">
                                    <span className="detail-label">Username</span>
                                    <span className="detail-value">{userDetails?.username}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Password</span>
                                    <span className="detail-value">••••••••</span>
                                </div>
                                <button className="profile-action-btn">
                                    <i className="fas fa-key"></i>
                                    Change Password
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Add this helper function to check if a booking is completed
    const isBookingCompleted = (booking) => {
        const currentDate = new Date();
        const bookingDate = new Date(booking.booked_date);
        const [bookingHours, bookingMinutes] = booking.actual_departed_time.split(':');
        const bookingEndTime = new Date(bookingDate);
        bookingEndTime.setHours(parseInt(bookingHours), parseInt(bookingMinutes));

        return currentDate > bookingEndTime;
    };

    // Update the filter function to exclude bookings with slot_number = 0
    const filterBookings = (bookings) => {
        if (!bookings) return [];
        
        // First filter out any bookings with slot_number = 0
        const validBookings = bookings.filter(booking => booking.slot_number !== 0);
        
        switch (bookingFilter) {
                case 'upcoming':
                return validBookings.filter(booking => 
                    booking.booking_status === 'CONFIRMED' && 
                    !booking.departed_time && 
                    booking.status !== 'allow'
                );
                case 'completed':
                return validBookings.filter(booking => 
                    booking.status === 'allow' || 
                    booking.booking_status === 'COMPLETED'
                );
            case 'cancelled':
                return validBookings.filter(booking => 
                    booking.booking_status === 'CANCELLED'
                );
                default:
                return validBookings;
            }
    };

    // Add this function after your state declarations
    const showNotification = (message, type = 'success') => {
        // Use the existing toast functionality since you already have react-toastify imported
        if (type === 'success') {
            toast.success(message);
        } else if (type === 'error') {
            toast.error(message);
            } else {
            toast.info(message);
        }
    };

    // Update the handleStatusUpdate function to set status to "allow" when marking as DEPARTED
    const handleStatusUpdate = async (bookingId, newStatus) => {
        try {
            // Optimistically update the UI first
            if (newStatus === 'DEPARTED') {
                // Find the booking in the current state and update it
                setBookingHistory(prevHistory => 
                    prevHistory.map(booking => 
                        booking.booking_id === bookingId 
                            ? { 
                                ...booking, 
                                departed_time: new Date().toTimeString().split(' ')[0],
                                status: 'allow' // Set status to "allow"
                            } 
                            : booking
                    )
                );
            }
            
            const response = await fetch('https://exsel-backend-2.onrender.com/api/update-booking-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    bookingId: bookingId,
                    status: newStatus
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Failed to update booking status to ${newStatus}`);
            }

            console.log(`Booking ${bookingId} marked as ${newStatus}:`, data);

            // Refresh booking history to show updated status
            fetchBookingHistory();

            // Show success message using toast directly
            toast.success(`Booking successfully marked as ${newStatus}!`);
        } catch (error) {
            console.error(`Error updating booking status to ${newStatus}:`, error);
            toast.error(`Failed to update status: ${error.message}`);
            
            // If there was an error, revert the optimistic update
            if (newStatus === 'DEPARTED') {
                fetchBookingHistory();
            }
        }
    };

    // Add this function to debug the booking data
    const debugBookingData = (booking) => {
        console.log('Booking data debug:', {
            id: booking.booking_id,
            payment_status: booking.payment_status,
            booking_status: booking.booking_status,
            arrived_time: booking.arrived_time,
            status: booking.status,
            actual_arrival: booking.actual_arrival_time,
            actual_departure: booking.actual_departed_time
        });
    };

    // Add this function to your component before it's used in renderBookingCard
    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed':
                return 'fa-check-circle';
            case 'in-progress':
                return 'fa-hourglass-half';
            case 'confirmed':
                return 'fa-calendar-check';
            case 'cancelled':
                return 'fa-ban';
            case 'pending':
            default:
                return 'fa-clock';
        }
    };

    // Updated renderBookingCard function to display payment amount
    const renderBookingCard = (booking) => {
        // Skip rendering if slot_number is 0
        if (booking.slot_number === 0) {
            return null;
        }
        
        // Debug log to check booking data
        console.log('Rendering booking card:', booking);
        console.log('Payment details:', {
            amount_paid: booking.amount_paid,
            payment_id: booking.payment_id,
            payment_status: booking.payment_status
        });
        
        // Format date
        const bookingDate = new Date(booking.booked_date);
        const month = bookingDate.toLocaleString('default', { month: 'short' });
        const day = bookingDate.getDate();
        const year = bookingDate.getFullYear();
        
        // Check if arrival is late
        const isLate = booking.arrived_time && 
                   booking.arrived_time > booking.actual_arrival_time;
        
        // Determine status for display - improved logic
        let statusClass = 'pending';
        let statusText = 'PENDING';

        // If the booking has a departed_time, it's completed regardless of other statuses
        if (booking.departed_time) {
            statusClass = 'completed';
            statusText = 'COMPLETED';
        } 
        // If it has arrived_time but no departed_time, it's in progress
        else if (booking.arrived_time) {
            statusClass = 'in-progress';
            statusText = 'IN PROGRESS';
        }
        // If it has status='allow', it's also completed
        else if (booking.status === 'allow') {
            statusClass = 'completed';
            statusText = 'COMPLETED';
        }
        // If it's confirmed but not arrived yet
        else if (booking.booking_status === 'CONFIRMED' && booking.payment_status === 'COMPLETED') {
            statusClass = 'confirmed';
            statusText = 'CONFIRMED';
        }
        // If it's cancelled
        else if (booking.booking_status === 'CANCELLED') {
            statusClass = 'cancelled';
            statusText = 'CANCELLED';
        }
        
        // For testing, set a default amount_paid if it's null or undefined
        const amountPaid = booking.amount_paid !== null && booking.amount_paid !== undefined 
            ? booking.amount_paid 
            : 150;
        
        // Determine if booking can be extended
        const canExtendBooking = () => {
            // Can only extend if booking is confirmed or arrived (not departed or cancelled)
            const isActive = booking.booking_status === 'CONFIRMED' || 
                             booking.arrived_time;
            
            // Can't extend if already departed
            const notDeparted = !booking.departed_time;
            
            // Can't extend if it's past the end time
            const notExpired = new Date() < new Date(booking.end_time);
            
            return isActive && notDeparted && notExpired;
        };

        // Add this right before the return statement in renderBookingCard
        console.log('Extend Time button conditions:', {
            bookingId: booking.booking_id,
            bookingStatus: booking.booking_status,
            paymentStatus: booking.payment_status,
            departedTime: booking.departed_time,
            status: booking.status,
            arrivedTime: booking.arrived_time,
            shouldShowButton: (booking.booking_status === 'CONFIRMED' || booking.arrived_time) && 
                              booking.payment_status === 'COMPLETED' && 
                              !booking.departed_time && 
                              booking.status !== 'allow'
        });

        return (
            <div className="booking-card" key={booking.booking_id}>
                <div className="booking-card-header">
                    <div className="date-time">
                        <div className="date">
                            <span className="month">{month}</span>
                            <span className="day">{day}</span>
                        </div>
                        <div className="time">
                            <span>{year}</span>
                            <span className={`status-badge ${statusClass}`}>
                                <i className={`fas ${getStatusIcon(statusClass)}`}></i>
                        {statusText}
                    </span>
                </div>
                    </div>
                </div>
                
                <div className="booking-details">
                    <div className="booking-time-info">
                        <div className="time-group">
                            <span className="time-label">Scheduled Arrival</span>
                            <span className="time-value">{booking.actual_arrival_time}</span>
                        </div>
                        {booking.arrived_time && (
                            <div className="time-group">
                                <span className="time-label">Actual Arrival</span>
                                <span className="time-value">
                                    {booking.arrived_time}
                                    {isLate && <span className="late">Late</span>}
                                </span>
                            </div>
                        )}
                        <div className="time-group">
                            <span className="time-label">Scheduled Departure</span>
                            <span className="time-value">{booking.actual_departed_time}</span>
                        </div>
                        {booking.departed_time && (
                            <div className="time-group">
                                <span className="time-label">Actual Departure</span>
                                <span className="time-value">{booking.departed_time}</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="detail-row">
                        <div className="detail-item">
                            <i className="fas fa-car"></i>
                            <div className="detail-text">
                                <span className="label">Car Number</span>
                                <span className="value">{booking.car_number}</span>
                            </div>
                        </div>
                        {/* Add RFID display */}
                        <div className="detail-item">
                            <i className="fas fa-tag"></i>
                            <div className="detail-text">
                                <span className="label">RFID Number</span>
                                <span className="value">{booking.rfid_number || 'N/A'}</span>
                            </div>
                        </div>
                        <div className="detail-item">
                            <i className="fas fa-parking"></i>
                            <div className="detail-text">
                                <span className="label">Slot Number</span>
                                <span className="value">{booking.slot_number}</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Always show payment information section */}
                    <div className="payment-info">
                        <div className="payment-header">
                            <i className="fas fa-receipt"></i>
                            <span>Payment Information</span>
                        </div>
                        <div className="payment-details">
                            <div className="payment-item">
                                <span className="payment-label">Amount Paid</span>
                                <span className="payment-value">₹{amountPaid}</span>
                            </div>
                            <div className="payment-item">
                                <span className="payment-label">Payment Status</span>
                                <span className="payment-value">{booking.payment_status || 'Unknown'}</span>
                            </div>
                            {booking.payment_id && (
                                <div className="payment-item">
                                    <span className="payment-label">Payment ID</span>
                                    <span className="payment-value">{booking.payment_id}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="booking-card-actions">
                    {/* Only show action buttons if not completed */}
                    {statusClass !== 'completed' && statusClass !== 'cancelled' && (
                        <div className="booking-actions">
                            {/* Add Prepone button for confirmed bookings that haven't started yet */}
                            {booking.booking_status === 'CONFIRMED' && 
                             !booking.arrived_time &&
                             booking.payment_status === 'COMPLETED' && (
                                <button 
                                    className="action-btn prepone-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handlePreponeArrival(booking);
                                    }}
                                >
                                    <i className="fas fa-clock"></i>
                                    Prepone Arrival
                                </button>
                            )}
                            
                            {booking.arrived_time && !booking.departed_time && booking.status !== 'allow' && (
                                <button 
                                    className="action-btn depart-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusUpdate(booking.booking_id, 'DEPARTED');
                                    }}
                                >
                                    <i className="fas fa-sign-out-alt"></i>
                                    Mark as Departed
                                </button>
                            )}
                            
                            {/* Add the Extend Time button - only show for active bookings that aren't departed yet */}
                            {(booking.booking_status === 'CONFIRMED' || booking.arrived_time) && 
                             booking.payment_status === 'COMPLETED' && 
                             !booking.departed_time && 
                             booking.status !== 'allow' && (
                                <button 
                                    className="action-btn extend-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleExtendBookingTime(booking);
                                    }}
                                >
                                    <i className="fas fa-clock"></i>
                                    Extend Time
                                </button>
                            )}
                        </div>
                    )}
                    
                    <div className="booking-utilities">
                        <a 
                            href={booking.location} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="utility-btn map-btn"
                        >
                            <i className="fas fa-map-marker-alt"></i>
                            View in Maps
                        </a>
                        
                        {/* Add Extend Booking button */}
                        {canExtendBooking() && (
                            <button 
                                className="extend-booking-btn"
                                onClick={() => handleExtendBooking(booking)}
                            >
                                <i className="fas fa-clock"></i> Extend Booking
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // Updated booking history rendering with filter functionality
    const renderBookingHistory = () => {
        if (isLoading) {
            return (
                <div className="booking-history-container">
                    <div className="booking-header">
                        <h2><i className="fas fa-history"></i> Booking History</h2>
                    </div>
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Loading your bookings...</p>
                    </div>
                </div>
            );
        }

        if (error) {
            return (
                <div className="booking-history-container">
                    <div className="booking-header">
                        <h2><i className="fas fa-history"></i> Booking History</h2>
                    </div>
                    <div className="error-container">
                        <i className="fas fa-exclamation-circle"></i>
                        <p>Error: {error}</p>
                    </div>
                </div>
            );
        }

        const filteredBookings = filterBookings(bookingHistory);

        return (
            <div className="booking-history-container">
                <div className="booking-header">
                    <h2><i className="fas fa-history"></i> Booking History</h2>
                </div>
                
                <div className="booking-filter">
                    <button 
                        className={`filter-btn ${bookingFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setBookingFilter('all')}
                    >
                        <i className="fas fa-list"></i>
                        <span>All Bookings</span>
                    </button>
                    <button 
                        className={`filter-btn ${bookingFilter === 'upcoming' ? 'active' : ''}`}
                        onClick={() => setBookingFilter('upcoming')}
                    >
                        <i className="fas fa-calendar-alt"></i>
                        <span>Upcoming</span>
                    </button>
                    <button 
                        className={`filter-btn ${bookingFilter === 'completed' ? 'active' : ''}`}
                        onClick={() => setBookingFilter('completed')}
                    >
                        <i className="fas fa-check-circle"></i>
                        <span>Completed</span>
                    </button>
                    <button 
                        className={`filter-btn ${bookingFilter === 'cancelled' ? 'active' : ''}`}
                        onClick={() => setBookingFilter('cancelled')}
                    >
                        <i className="fas fa-ban"></i>
                        <span>Cancelled</span>
                    </button>
                </div>

                <div className="booking-cards">
                    {filteredBookings.length > 0 ? (
                        filteredBookings.map(booking => renderBookingCard(booking))
                    ) : (
                        <div className="no-bookings">
                            <i className="fas fa-calendar-times"></i>
                            <p>No {bookingFilter !== 'all' ? bookingFilter : ''} bookings found</p>
                                    </div>
                    )}
                                    </div>
                                </div>
        );
    };

    // Add function to calculate estimated amount
    const calculateEstimatedAmount = () => {
        if (formData.arrival_time && formData.departure_time && formData.parking_lot_id) {
            const selectedLot = locations.parkingLots.find(
                lot => lot.id.toString() === formData.parking_lot_id
            );
            
            if (selectedLot) {
                const [arrivalHours, arrivalMinutes] = formData.arrival_time.split(':').map(Number);
                const [departureHours, departureMinutes] = formData.departure_time.split(':').map(Number);
                
                const totalMinutes = (departureHours * 60 + departureMinutes) - 
                                   (arrivalHours * 60 + arrivalMinutes);
                
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                
                const amount = (hours * selectedLot.price_per_hour) + 
                             ((minutes / 60) * selectedLot.price_per_hour);
                
                setBookingAmount({
                    amount: Math.ceil(amount),
                    duration: { hours, minutes }
                });
            }
        }
    };

    // Add useEffect to calculate amount when times or parking lot changes
    useEffect(() => {
        calculateEstimatedAmount();
    }, [formData.arrival_time, formData.departure_time, formData.parking_lot_id]);

    // Modify the renderBookAppointment function to include amount display
    const renderBookAppointment = () => (
        <div className="booking-form-container">
            <h2>Book a Parking Slot</h2>
            <form onSubmit={handleSubmit} className="booking-form">
                <div className="form-group">
                    <label>State</label>
                    <select 
                        name="state"
                        value={formData.state}
                        onChange={handleStateChange}
                        required
                    >
                        <option value="">Select State</option>
                        {Array.isArray(locations.states) && locations.states.map((state, index) => (
                            <option key={index} value={state}>{state}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>District</label>
                    <select 
                        name="district"
                        value={formData.district}
                        onChange={handleDistrictChange}
                        required
                        disabled={!formData.state}
                    >
                        <option value="">Select District</option>
                        {Array.isArray(locations.districts) && locations.districts.map((district, index) => (
                            <option key={index} value={district}>{district}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Area</label>
                    <select 
                        name="area"
                        value={formData.area}
                        onChange={handleAreaChange}
                        required
                        disabled={!formData.district}
                    >
                        <option value="">Select Area</option>
                        {Array.isArray(locations.areas) && locations.areas.map((area, index) => (
                            <option key={index} value={area}>{area}</option>
                        ))}
                    </select>
                </div>

                {/* Parking lot selection */}
                <div className="parking-lot-select-container">
                        <select 
                            name="parking_lot_id"
                            value={formData.parking_lot_id}
                        onChange={(e) => {
                            setFormData(prev => ({ 
                                ...prev, 
                                parking_lot_id: e.target.value 
                            }));
                            setShowLotDetails(true);
                        }}
                            required
                            disabled={!formData.area}
                            className="parking-lot-select"
                        >
                            <option value="">Select Parking Lot</option>
                            {locations.parkingLots.map((lot) => {
                                const distanceInfo = distances[lot.id];
                                const distanceText = distanceInfo 
                                    ? `(${distanceInfo.distance} • ${distanceInfo.duration} drive)`
                                    : '';

                                return (
                                    <option key={lot.id} value={lot.id}>
                                        {lot.name} - ₹{lot.price_per_hour}/hr {distanceText}
                                    </option>
                                );
                            })}
                        </select>

                        {/* Show selected parking lot details */}
                        {formData.parking_lot_id && locations.parkingLots && (
                            <div className="parking-lot-details">
                                {locations.parkingLots
                                    .filter(lot => lot.id.toString() === formData.parking_lot_id)
                                    .map(lot => (
                                    <div key={lot.id}>
                                        <div 
                                            className="lot-details-header"
                                            onClick={() => setShowLotDetails(!showLotDetails)}
                                        >
                                            <h3>
                                                <i className="fas fa-info-circle"></i>
                                                Parking Lot Details
                                            </h3>
                                            <i className={`fas fa-chevron-${showLotDetails ? 'up' : 'down'}`}></i>
                                        </div>
                                        {showLotDetails && (
                                            <div className="lot-details-content open">
                                                {renderParkingLotDetails(lot)}
                                            </div>
                                        )}
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>

                <div className="form-group">
                    <label>Driver Name</label>
                    <input 
                        type="text"
                        name="driver_name"
                        value={formData.driver_name}
                        onChange={handleInputChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Car Number</label>
                    <input 
                        type="text"
                        name="car_number"
                        value={formData.car_number}
                        onChange={handleInputChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>RFID Number</label>
                    <input 
                        type="text"
                        name="rfid_number"
                        value={formData.rfid_number || ''}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter your RFID tag number"
                    />
                </div>

                <div className="form-group">
                    <label>Driver Aadhar Number</label>
                    <input 
                        type="text"
                        name="aadhar_number"
                        value={formData.aadhar_number}
                        onChange={handleInputChange}
                        required
                        pattern="[0-9]{12}"
                        title="Please enter a valid 12-digit Aadhar number"
                    />
                </div>

                <div className="form-group">
                    <label>Date</label>
                    <input 
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        min={new Date().toISOString().split('T')[0]}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Arrival Time</label>
                    <input 
                        type="time"
                        name="arrival_time"
                        value={formData.arrival_time}
                        onChange={(e) => {
                            const selectedTime = e.target.value;
                            const currentDate = new Date();
                            const [hours, minutes] = selectedTime.split(':');
                            const selectedDateTime = new Date(currentDate);
                            selectedDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

                            // If the selected date is today, check if the time is in the past
                            if (formData.date === currentDate.toISOString().split('T')[0]) {
                                if (selectedDateTime < currentDate) {
                                    toast.error('Cannot select past time for today');
                                    return;
                                }
                            }

                            handleInputChange(e);
                        }}
                        required
                    />
                    <small className="form-text text-muted">
                        Select a future time for arrival
                    </small>
                </div>

                <div className="form-group">
                    <label>Departure Time</label>
                    <input 
                        type="time"
                        name="departure_time"
                        value={formData.departure_time}
                        onChange={handleInputChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Driver Aadhar</label>
                    <input 
                        type="text"
                        name="driver_aadhar"
                        value={formData.driver_aadhar}
                        onChange={handleInputChange}
                        required
                        pattern="[0-9]{12}"
                    />
                </div>

                {/* Add estimated amount display after the time inputs */}
                {bookingAmount.amount !== null && (
                    <div className="estimated-amount">
                        <h3>Estimated Charges</h3>
                        <div className="amount-details">
                            <p className="duration">
                                Duration: {bookingAmount.duration.hours} hours{' '}
                                {bookingAmount.duration.minutes > 0 ? 
                                    `${bookingAmount.duration.minutes} minutes` : ''}
                            </p>
                            <p className="amount">
                                Amount: ₹{bookingAmount.amount}
                            </p>
                        </div>
                    </div>
                )}

                <button 
                    type="submit" 
                    className="submit-btn"
                    disabled={availableSlots === null || availableSlots === 0}
                >
                    Book Slot
                </button>
            </form>
        </div>
    );

    const renderUpcomingAppointments = () => (
        <div className="dashboard-section">
            <h2>Upcoming Bookings</h2>
            <div className="appointment-list">
                {/* Add upcoming appointments here */}
                <p>No upcoming bookings.</p>
            </div>
        </div>
    );

    // Fetch booking history
    const fetchBookingHistory = async () => {
        try {
            setIsLoading(true);
            if (!userDetails?.id) {
                throw new Error('User ID not found');
            }

            console.log('Fetching booking history for user:', userDetails.id);
            
            const response = await fetch(`https://exsel-backend-3.onrender.com/api/booking-history/${userDetails.id}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch booking history');
            }

            // Log the raw data to see what's coming from the API
            console.log('Raw booking history data:', data);

            // Filter out bookings with slot_number = 0 and process the data
            const processedData = data
                .filter(booking => booking.slot_number !== 0) // Filter out slot_number = 0
                .map(booking => {
                    console.log(`Processing booking ${booking.booking_id}, amount_paid:`, booking.amount_paid);
                    return {
                        ...booking,
                        // Ensure booking_status is set correctly
                        booking_status: booking.booking_status || 'CONFIRMED', // Default to CONFIRMED if not set
                        // Ensure payment_status is set correctly
                        payment_status: booking.payment_status || 'COMPLETED', // Default to COMPLETED if not set
                        // Format amount_paid if it exists
                        amount_paid: booking.amount_paid !== undefined ? booking.amount_paid : null
                    };
                });

            console.log('Processed booking history data:', processedData);
            setBookingHistory(processedData);
        } catch (error) {
            console.error('Error fetching booking history:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Add this function to fetch available slots
    const fetchAvailableSlots = async (parkingLotId, date, time) => {
        try {
            const response = await fetch(
                `https://exsel-backend-3.onrender.com/api/available-slots/${parkingLotId}/${date}/${time}`
            );
            const data = await response.json();
            if (response.ok) {
                setAvailableSlots(data.available_slots);
            }
        } catch (error) {
            console.error('Error fetching available slots:', error);
        }
    };

    // Add this function to update completed bookings
    const updateCompletedBookings = async () => {
        try {
            await fetch('/api/update-completed-bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
        } catch (error) {
            console.error('Error updating completed bookings:', error);
        }
    };

    // Add this useEffect to periodically check for completed bookings
    useEffect(() => {
        // Update completed bookings immediately when component mounts
        updateCompletedBookings();

        // Set up interval to check every minute
        const interval = setInterval(updateCompletedBookings, 60000);

        // Clean up interval on component unmount
        return () => clearInterval(interval);
    }, []);

    // Update the checkAvailability function
    const checkAvailability = async () => {
        if (!formData.parking_lot_id || !formData.date || !formData.arrival_time || !formData.departure_time) {
            alert('Please fill all required fields');
            return;
        }

        setIsCheckingAvailability(true);
        try {
            const response = await fetch('https://exsel-backend-3.onrender.com/api/check-slot-availability', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    parking_lot_id: formData.parking_lot_id,
                    date: formData.date,
                    arrival_time: formData.arrival_time,
                    departure_time: formData.departure_time
                }),
            });

            // Log the raw response for debugging
            const responseText = await response.text();
            console.log('Raw response:', responseText);

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('Failed to parse response:', e);
                throw new Error('Invalid response from server');
            }

            if (!response.ok) {
                throw new Error(data.error || 'Failed to check availability');
            }

            setAvailableSlots(data.availableSlots);
            if (data.availableSlots > 0) {
                alert(`${data.availableSlots} slots available!`);
            } else {
                alert('No slots available for selected time');
            }
        } catch (error) {
            console.error('Error checking availability:', error);
            setAvailableSlots(null);
            alert(error.message);
        } finally {
            setIsCheckingAvailability(false);
        }
    };

    // Call this when relevant form fields change
    useEffect(() => {
        if (formData.parking_lot_id && formData.date && 
            formData.arrival_time && formData.departure_time) {
            checkAvailability();
        }
    }, [formData.parking_lot_id, formData.date, formData.arrival_time, formData.departure_time]);

    // Handle extend button click
    const handleExtendBooking = (booking) => {
        setExtendBookingData(booking);
        setExtendHours(1);
        setExtendError(null);
        setShowExtendModal(true);
    };

    // Function to calculate the new end time and price
    const calculateExtendedBooking = () => {
        if (!extendBookingData) return null;
        
        // Parse the current end time
        const currentEndTime = new Date(extendBookingData.end_time);
        
        // Calculate new end time by adding hours
        const newEndTime = new Date(currentEndTime);
        newEndTime.setHours(newEndTime.getHours() + parseInt(extendHours));
        
        // Calculate additional cost
        const hourlyRate = extendBookingData.price_per_hour || 10; // Default to 10 if not available
        const additionalCost = hourlyRate * extendHours;
        
        return {
            currentEndTime: formatDateTime(currentEndTime),
            newEndTime: formatDateTime(newEndTime),
            additionalHours: extendHours,
            additionalCost: additionalCost,
            totalCost: (extendBookingData.amount_paid || 0) + additionalCost
        };
    };

    // Function to submit the booking extension request
    const submitExtendBooking = async () => {
        if (!extendBookingData) return;
        
        setExtendLoading(true);
        setExtendError(null);
        
        try {
            // Calculate the new end time
            const currentEndTime = new Date(extendBookingData.end_time);
            const newEndTime = new Date(currentEndTime);
            newEndTime.setHours(newEndTime.getHours() + parseInt(extendHours));
            
            // Prepare the request data
            const requestData = {
                booking_id: extendBookingData.booking_id,
                parking_lot_id: extendBookingData.parking_lot_id,
                slot_number: extendBookingData.slot_number,
                current_end_time: extendBookingData.end_time,
                new_end_time: newEndTime.toISOString(),
                additional_hours: parseInt(extendHours)
            };
            
            console.log('Extending booking with data:', requestData);
            
            // Send the request to the backend
            const response = await fetch('https://exsel-backend-2.onrender.com/api/extend-booking', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to extend booking');
            }
            
            console.log('Booking extended successfully:', data);
            
            // Close the modal and refresh booking history
            setShowExtendModal(false);
            fetchBookingHistory();
            
            // Show success message
            toast.success('Booking extended successfully!');
        } catch (error) {
            console.error('Error extending booking:', error);
            setExtendError(error.message);
            toast.error(`Failed to extend booking: ${error.message}`);
        } finally {
            setExtendLoading(false);
        }
    };

    // Render the extend booking modal
    const renderExtendBookingModal = () => {
        if (!showExtendModal || !extendBookingData) return null;
        
        const extendedBooking = calculateExtendedBooking();
        
        return (
            <div className="modal-overlay">
                <div className="modal-content extend-booking-modal">
                    <div className="modal-header">
                        <h2>Extend Booking</h2>
                        <button className="close-btn" onClick={() => setShowExtendModal(false)}>
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div className="modal-body">
                        <div className="booking-summary">
                            <h3>Current Booking Details</h3>
                            <div className="summary-item">
                                <span className="summary-label">Parking Lot:</span>
                                <span className="summary-value">{extendBookingData.parking_lot_name}</span>
                            </div>
                            <div className="summary-item">
                                <span className="summary-label">Slot Number:</span>
                                <span className="summary-value">{extendBookingData.slot_number}</span>
                            </div>
                            <div className="summary-item">
                                <span className="summary-label">Current End Time:</span>
                                <span className="summary-value">{extendedBooking?.currentEndTime}</span>
                            </div>
                        </div>
                        
                        <div className="extend-options">
                            <h3>Extension Details</h3>
                            <div className="form-group">
                                <label htmlFor="extend-hours">Additional Hours:</label>
                                <select 
                                    id="extend-hours" 
                                    value={extendHours} 
                                    onChange={(e) => setExtendHours(parseInt(e.target.value))}
                                >
                                    {[1, 2, 3, 4, 5, 6].map(hours => (
                                        <option key={hours} value={hours}>{hours} hour{hours > 1 ? 's' : ''}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="extension-summary">
                                <div className="summary-item">
                                    <span className="summary-label">New End Time:</span>
                                    <span className="summary-value">{extendedBooking?.newEndTime}</span>
                                </div>
                                <div className="summary-item">
                                    <span className="summary-label">Additional Cost:</span>
                                    <span className="summary-value">₹{extendedBooking?.additionalCost}</span>
                                </div>
                            </div>
                            
                            {extendError && (
                                <div className="error-message">
                                    <i className="fas fa-exclamation-circle"></i> {extendError}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="modal-footer">
                        <button 
                            className="cancel-btn" 
                            onClick={() => setShowExtendModal(false)}
                            disabled={extendLoading}
                        >
                            Cancel
                        </button>
                        <button 
                            className="confirm-btn" 
                            onClick={submitExtendBooking}
                            disabled={extendLoading}
                        >
                            {extendLoading ? (
                                <><i className="fas fa-spinner fa-spin"></i> Processing...</>
                            ) : (
                                <>Confirm Extension</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Add this function to handle the extend booking time button click
    const handleExtendBookingTime = (booking) => {
        setSelectedBookingForExtension(booking);
        setExtensionHours(1);
        
        // Calculate initial extension cost based on the booking's hourly rate
        const hourlyRate = booking.price_per_hour || 10; // Default to 10 if not available
        setExtensionCost(hourlyRate);
        
        setExtensionError(null);
        setShowExtendTimeModal(true);
    };

    const handleExtensionHoursChange = (hours) => {
        setExtensionHours(hours);
        
        // Recalculate cost
        const hourlyRate = selectedBookingForExtension?.price_per_hour || 10; // Change from 150 to 10
        setExtensionCost(hourlyRate * hours);
    };

    const submitExtendTime = async () => {
        if (!selectedBookingForExtension) return;
        
        setIsExtending(true);
        setExtensionError(null);
        
        try {
            // Calculate the new departure time
            const bookingDate = new Date(selectedBookingForExtension.booked_date);
            const [departureHours, departureMinutes] = selectedBookingForExtension.actual_departed_time.split(':').map(Number);
            
            // Set the departure time
            bookingDate.setHours(departureHours, departureMinutes, 0, 0);
            
            // Add the extension hours
            bookingDate.setHours(bookingDate.getHours() + extensionHours);
            
            // Format the new departure time
            const newDepartureTime = `${String(bookingDate.getHours()).padStart(2, '0')}:${String(bookingDate.getMinutes()).padStart(2, '0')}:00`;
            
            // Prepare the request data for creating extension request
            const extensionData = {
                bookingId: selectedBookingForExtension.booking_id,
                extensionHours: extensionHours,
                newDepartureTime: newDepartureTime,
                additionalCost: extensionCost,
                userId: userDetails.id
            };
            
            console.log('Creating extension request with data:', extensionData);
            
            // First create the extension request
            const extensionResponse = await fetch('https://exsel-backend-3.onrender.com/api/create-extension-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(extensionData)
            });
            
            // Handle potential non-JSON responses
            let extensionResult;
            try {
                const text = await extensionResponse.text();
                try {
                    extensionResult = JSON.parse(text);
                } catch (e) {
                    console.error('Failed to parse extension response:', text);
                    throw new Error('Server returned an invalid response format for extension request');
                }
            } catch (error) {
                console.error('Error reading extension response:', error);
                throw new Error('Failed to read server response');
            }
            
            if (!extensionResponse.ok) {
                throw new Error(extensionResult.error || 'Failed to create extension request');
            }
            
            console.log('Extension request created successfully:', extensionResult);
            
            // Now create a Cashfree order for the extension payment
            const orderResponse = await fetch('https://exsel-backend-3.onrender.com/api/create-extension-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    amount: extensionCost,
                    bookingId: selectedBookingForExtension.booking_id,
                    extensionId: extensionResult.extensionId || extensionResult.id, // Use the ID from the response
                    userDetails: userDetails
                })
            });
            
            // Handle potential non-JSON responses for order creation
            let orderData;
            try {
                const text = await orderResponse.text();
                try {
                    orderData = JSON.parse(text);
                } catch (e) {
                    console.error('Failed to parse order response:', text);
                    throw new Error('Server returned an invalid response format for payment order');
                }
            } catch (error) {
                console.error('Error reading order response:', error);
                throw new Error('Failed to read server response');
            }
            
            if (!orderResponse.ok) {
                throw new Error(orderData.error || 'Failed to create payment order');
            }
            
            console.log('Payment order created successfully:', orderData);
            
            // Close the modal before redirecting to payment
            setShowExtendTimeModal(false);
            
            // Initialize Cashfree payment
            if (typeof window.Cashfree === 'undefined') {
                throw new Error('Cashfree SDK not loaded');
            }
            
            // Create and redirect to Cashfree payment page
            const cashfree = new window.Cashfree(orderData.payment_session_id);
            cashfree.redirect();
            
            // The rest of the flow will be handled by the payment callback
            
        } catch (error) {
            console.error('Error extending booking time:', error);
            setExtensionError(error.message);
            toast.error(`Failed to extend booking time: ${error.message}`);
            setIsExtending(false);
        }
    };

    // Render the extend time modal
    const renderExtendTimeModal = () => {
        if (!showExtendTimeModal || !selectedBookingForExtension) return null;
        
        return (
            <div className="modal-overlay">
                <div className="modal-content extend-time-modal">
                    <div className="modal-header">
                        <h2>Extend Booking Time</h2>
                        <button 
                            className="close-btn" 
                            onClick={() => setShowExtendTimeModal(false)}
                            disabled={isExtending}
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div className="modal-body">
                        <div className="booking-summary">
                            <h3>Current Booking Details</h3>
                            <div className="summary-item">
                                <span className="summary-label">Parking Lot:</span>
                                <span className="summary-value">{selectedBookingForExtension.parking_lot_name}</span>
                            </div>
                            <div className="summary-item">
                                <span className="summary-label">Slot Number:</span>
                                <span className="summary-value">{selectedBookingForExtension.slot_number}</span>
                            </div>
                            <div className="summary-item">
                                <span className="summary-label">Current Departure Time:</span>
                                <span className="summary-value">{selectedBookingForExtension.actual_departed_time}</span>
                            </div>
                        </div>
                        
                        <div className="extend-options">
                            <h3>Extension Details</h3>
                            <div className="form-group">
                                <label htmlFor="extension-hours">Additional Hours:</label>
                                <select 
                                    id="extension-hours" 
                                    value={extensionHours} 
                                    onChange={(e) => handleExtensionHoursChange(parseInt(e.target.value))}
                                    disabled={isExtending}
                                >
                                    {[1, 2, 3, 4, 5, 6].map(hours => (
                                        <option key={hours} value={hours}>{hours} hour{hours > 1 ? 's' : ''}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="extension-summary">
                                <div className="summary-item">
                                    <span className="summary-label">Additional Cost:</span>
                                    <span className="summary-value">₹{extensionCost}</span>
                                </div>
                            </div>
                            
                            {extensionError && (
                                <div className="error-message">
                                    <i className="fas fa-exclamation-circle"></i> {extensionError}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="modal-footer">
                        <button 
                            className="cancel-btn" 
                            onClick={() => setShowExtendTimeModal(false)}
                            disabled={isExtending}
                        >
                            Cancel
                        </button>
                        <button 
                            className="confirm-btn" 
                            onClick={submitExtendTime}
                            disabled={isExtending}
                        >
                            {isExtending ? (
                                <><i className="fas fa-spinner fa-spin"></i> Processing...</>
                            ) : (
                                <>Confirm & Pay</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Fetch booking history when component mounts
    useEffect(() => {
        fetchBookingHistory();
    }, []);

    return (
        <div className="home-container">
            <nav className="navbar">
                <div className="navbar-content">
                    <div className="navbar-left">
                        <img
                            className="navbar-logo"
                            src="https://res.cloudinary.com/dcgmeefn2/image/upload/v1740811794/car_moving_iqyr65.jpg"
                            alt="website logo"
                        />
                        <h1 className="navbar-title">Park Smart</h1>
                    </div>
                    
                    
                    <div className="navbar-right">
                        <div className="user-info">
                            <span className="user-name">{userDetails?.first_name || 'User'}</span>
                            <div className="user-avatar">
                                {userDetails?.first_name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                        </div>
                        <button type="button" className="logout-btn" onClick={onClickLogout}>
                            <i className="fas fa-sign-out-alt"></i>
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </nav>
            
            <div className="dashboard-container">
                <div className="sidebar">
                    <button 
                        className={`sidebar-btn ${activeTab === 'profile' ? 'active' : ''}`}
                        onClick={() => setActiveTab('profile')}
                        data-tab="profile"
                    >
                        <i className="fas fa-user"></i>
                        <span>Profile</span>
                    </button>
                    <button 
                        className={`sidebar-btn ${activeTab === 'history' ? 'active' : ''}`}
                        onClick={() => setActiveTab('history')}
                        data-tab="history"
                    >
                        <i className="fas fa-history"></i>
                        <span>Booking History</span>
                    </button>
                    <button 
                        className={`sidebar-btn ${activeTab === 'book' ? 'active' : ''}`}
                        onClick={() => setActiveTab('book')}
                        data-tab="book"
                    >
                        <i className="fas fa-parking"></i>
                        <span>Book Slot</span>
                    </button>
                    <button 
                        className={`sidebar-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
                        onClick={() => setActiveTab('upcoming')}
                        data-tab="upcoming"
                    >
                        <i className="fas fa-calendar-alt"></i>
                        <span>Upcoming Bookings</span>
                    </button>
                </div>
                
                <div className="dashboard-content">
                    {activeTab === 'profile' && renderProfile()}
                    {activeTab === 'history' && renderBookingHistory()}
                    {activeTab === 'book' && renderBookAppointment()}
                    {activeTab === 'upcoming' && renderUpcomingAppointments()}
                </div>
            </div>

            {/* Add ToastContainer for notifications */}
            <ToastContainer position="top-right" autoClose={5000} />
            
            {/* Render the extend booking modal */}
            {renderExtendBookingModal()}
            {renderExtendTimeModal()}
            {renderPreponeModal()}
        </div>
    );
};

export default Home; 
