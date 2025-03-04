import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import './index.css';

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

    // Add these new state variables
    const [userLocation, setUserLocation] = useState(null);
    const [distances, setDistances] = useState({});
    const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
    const GOOGLE_MAPS_API_KEY = 'AIzaSyBYKr2fCP0ro0Wj6GxsX-bv1dpI6xp3CzQ';

    // Constants for TIFAC parking coordinates
    const TIFAC_COORDINATES = {
        lat: 9.5750616,
        lng: 77.6793517
    };

    // Simple distance calculation function
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2); 
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        const d = R * c; // Distance in km
        return d;
    };

    const deg2rad = (deg) => {
        return deg * (Math.PI/180);
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

    // Modified handleAreaChange function
    const handleAreaChange = async (e) => {
        const area = e.target.value;
        console.log('Area changed to:', area);
        
        setFormData(prev => ({ 
            ...prev, 
            area,
            parking_lot_id: ''
        }));
        
        try {
            const response = await fetch(
                `https://exsel-backend-1.onrender.com/api/parking-lots/${formData.state}/${formData.district}/${area}`
            );
            const data = await response.json();
            console.log('Received parking lots data:', data);

            if (data.success && data.parking_lots) {
                setLocations(prev => ({ 
                    ...prev, 
                    parkingLots: data.parking_lots 
                }));

                if (userLocation) {
                    data.parking_lots.forEach(lot => {
                        console.log('Processing lot:', lot);
                        if (lot.latitude && lot.longitude) {
                            const distance = calculateDistance(
                                userLocation.lat,
                                userLocation.lng,
                                parseFloat(lot.latitude),
                                parseFloat(lot.longitude)
                            );
                            
                            setDistances(prev => ({
                                ...prev,
                                [lot.id]: {
                                    distance: distance < 1 ? 
                                        `${Math.round(distance * 1000)} meters` : 
                                        `${distance.toFixed(2)} km`
                                }
                            }));
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error in handleAreaChange:', error);
        }
    };

    // Get user location when component mounts
    useEffect(() => {
        getLocation();
    }, []);

    // Calculate distance when user location changes
    useEffect(() => {
        if (userLocation && locations.parkingLots?.length > 0) {
            locations.parkingLots.forEach(lot => {
                if (lot.latitude && lot.longitude) {
                    const distance = calculateDistance(
                        userLocation.lat,
                        userLocation.lng,
                        parseFloat(lot.latitude),
                        parseFloat(lot.longitude)
                    );
                    
                    setDistances(prev => ({
                        ...prev,
                        [lot.id]: {
                            distance: distance < 1 ? 
                                `${Math.round(distance * 1000)} meters` : 
                                `${distance.toFixed(2)} km`
                        }
                    }));
                }
            });
        }
    }, [userLocation, locations.parkingLots]);

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

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            const userId = userDetails.id;

            // Convert times to comparable format (minutes since midnight)
            const arrivalMinutes = convertTimeToMinutes(formData.arrival_time);
            const departureMinutes = convertTimeToMinutes(formData.departure_time);

            // Validate times
            if (arrivalMinutes >= departureMinutes) {
                alert('Departure time must be after arrival time');
                return;
            }

            const response = await fetch('https://exsel-backend-1.onrender.com/api/book-slot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    parking_lot_id: parseInt(formData.parking_lot_id),
                    driver_name: formData.driver_name,
                    car_number: formData.car_number,
                    aadhar_number: formData.aadhar_number,
                    date: formData.date,
                    actual_arrival_time: formData.arrival_time,
                    actual_departed_time: formData.departure_time,
                    user_id: userId
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to book slot');
            }

            // Show success message
            alert(`Booking successful!\nBooking ID: ${data.booking_id}\nSlot Number: ${data.slot_number}`);
            
            // Reset form
            setFormData({
                state: '',
                district: '',
                area: '',
                parking_lot_id: '',
                driver_name: userDetails?.first_name + ' ' + userDetails?.last_name || '',
                car_number: userDetails?.car_number || '',
                aadhar_number: userDetails?.aadhar_number || '',
                date: '',
                arrival_time: '',
                departure_time: '',
                actual_arrival_time: '',
                actual_departed_time: ''
            });

            // Reset location selections
            setLocations({
                states: locations.states,
                districts: [],
                areas: [],
                parkingLots: []
            });

        } catch (error) {
            console.error('Error booking slot:', error);
            alert('Failed to book slot: ' + error.message);
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
                
                const response = await fetch(`https://exsel-backend-1.onrender.com/api/user-details?userId=${userId}`, {
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
                const response = await fetch('https://exsel-backend-1.onrender.com/api/states');
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
            const response = await fetch(`https://exsel-backend-1.onrender.com/api/districts/${state}`);
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
                `https://exsel-backend-1.onrender.com/api/areas/${formData.state}/${district}`
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
        console.log('Loading Google Maps...');
        if (!window.google) {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
            script.async = true;
            script.onload = () => {
                console.log('Google Maps API loaded successfully');
                setIsGoogleMapsLoaded(true);
                getLocation();
            };
            script.onerror = (error) => {
                console.error('Error loading Google Maps:', error);
            };
            document.head.appendChild(script);
        } else {
            console.log('Google Maps already loaded');
            getLocation();
        }
    }, []);

    const onClickLogout = () => {
        Cookies.remove('jwt_token');
        localStorage.removeItem('userDetails');
        localStorage.removeItem('userData');
        navigate('/login');
    };

    const renderProfile = () => {
        if (isLoading) {
            return (
                <div className="profile-loading">
                    Loading user details...
                </div>
            );
        }

        if (error) {
            return (
                <div className="profile-error">
                    Error loading user details: {error}
                </div>
            );
        }

        return (
            <div className="dashboard-section">
                <h2>User Profile</h2>
                <div className="profile-details">
                    <div className="profile-item">
                        <span>First Name:</span>
                        <p>{userDetails?.first_name}</p>
                    </div>
                    <div className="profile-item">
                        <span>Last Name:</span>
                        <p>{userDetails?.last_name}</p>
                    </div>
                    <div className="profile-item">
                        <span>Username:</span>
                        <p>{userDetails?.username}</p>
                    </div>
                    <div className="profile-item">
                        <span>Gender:</span>
                        <p>{userDetails?.gender}</p>
                    </div>
                    <div className="profile-item">
                        <span>Date of Birth:</span>
                        <p>{userDetails?.date_of_birth}</p>
                    </div>
                    <div className="profile-item">
                        <span>Car Number:</span>
                        <p>{userDetails?.car_number}</p>
                    </div>
                    <div className="profile-item">
                        <span>Aadhar Number:</span>
                        <p>{userDetails?.aadhar_number}</p>
                    </div>
                    <div className="profile-item">
                        <span>Created At:</span>
                        <p>{new Date(userDetails?.created_at).toLocaleDateString()}</p>
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

    // Add this helper function
    const filterBookings = (bookings) => {
        const currentDate = new Date();
        
        return bookings.filter(booking => {
            const bookingDate = new Date(booking.booked_date);
            const [hours, minutes] = booking.actual_departed_time.split(':');
            const bookingEndTime = new Date(bookingDate);
            bookingEndTime.setHours(parseInt(hours), parseInt(minutes));
            
            const isCompleted = currentDate > bookingEndTime;
            
            switch(bookingFilter) {
                case 'upcoming':
                    return !isCompleted;
                case 'completed':
                    return isCompleted;
                default:
                    return true;
            }
        });
    };

    // Update the renderBookingHistory function
    const renderBookingHistory = () => {
        if (isLoading) {
            return <div className="loading">Loading booking history...</div>;
        }

        if (error) {
            return <div className="error">Error: {error}</div>;
        }

        const filteredBookings = filterBookings(bookingHistory);

        return (
            <div className="dashboard-section">
                <div className="booking-header">
                    <h2>Booking History</h2>
                    <div className="booking-filters">
                        <button 
                            className={`filter-btn ${bookingFilter === 'all' ? 'active' : ''}`}
                            onClick={() => setBookingFilter('all')}
                        >
                            All
                        </button>
                        <button 
                            className={`filter-btn ${bookingFilter === 'upcoming' ? 'active' : ''}`}
                            onClick={() => setBookingFilter('upcoming')}
                        >
                            Upcoming
                        </button>
                        <button 
                            className={`filter-btn ${bookingFilter === 'completed' ? 'active' : ''}`}
                            onClick={() => setBookingFilter('completed')}
                        >
                            Completed
                        </button>
                    </div>
                </div>

                {filteredBookings.length === 0 ? (
                    <div className="no-bookings">
                        <p>No {bookingFilter} bookings found</p>
                        {bookingFilter !== 'completed' && (
                            <button 
                                className="book-now-btn"
                                onClick={() => setActiveTab('book')}
                            >
                                Book Now
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="booking-history-grid">
                        {filteredBookings.map((booking) => (
                            <div key={booking.booking_id} className="booking-card">
                                <div className={`booking-status ${isBookingCompleted(booking) ? 'completed' : 'upcoming'}`}>
                                    {isBookingCompleted(booking) ? 'Completed' : 'Upcoming'}
                                </div>
                                <div className="booking-details">
                                    <p><strong>Date:</strong> {booking.booked_date}</p>
                                    <p><strong>Time:</strong> {booking.actual_arrival_time} - {booking.actual_departed_time}</p>
                                    <p><strong>Location:</strong> {booking.parking_lot_name}</p>
                                    <p><strong>Slot:</strong> {booking.slot_number}</p>
                                </div>
                                {!isBookingCompleted(booking) && (
                                    <button 
                                        className="extend-button"
                                        onClick={() => handleExtend(booking)}
                                    >
                                        Extend Booking
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Extension Modal */}
                {showExtendModal && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3>Extend Booking</h3>
                            <p>Current End Time: {selectedBooking?.actual_departed_time}</p>
                            <div className="form-group">
                                <label>New End Time:</label>
                                <input
                                    type="time"
                                    value={extensionTime}
                                    onChange={(e) => setExtensionTime(e.target.value)}
                                    min={selectedBooking?.actual_departed_time}
                                    required
                                />
                            </div>
                            <div className="modal-actions">
                                <button 
                                    className="cancel-btn"
                                    onClick={() => {
                                        setShowExtendModal(false);
                                        setSelectedBooking(null);
                                        setExtensionTime('');
                                    }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    className="confirm-btn"
                                    onClick={handleExtendSubmit}
                                    disabled={extendLoading}
                                >
                                    {extendLoading ? 'Processing...' : 'Confirm Extension'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

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
                {Array.isArray(locations.parkingLots) && locations.parkingLots.length > 0 && (
                    <div className="form-group">
                        <label>Parking Lot</label>
                        <select 
                            name="parking_lot_id"
                            value={formData.parking_lot_id}
                            onChange={(e) => setFormData(prev => ({ 
                                ...prev, 
                                parking_lot_id: e.target.value 
                            }))}
                            required
                            disabled={!formData.area}
                            className="parking-lot-select"
                        >
                            <option value="">Select Parking Lot</option>
                            {locations.parkingLots.map((lot) => (
                                <option key={lot.id} value={lot.id}>
                                    {lot.name} - ₹{lot.price_per_hour}/hr
                                    {distances[lot.id] && ` (${distances[lot.id].distance} km away)`}
                                </option>
                            ))}
                        </select>

                        {/* Show selected parking lot details */}
                        {formData.parking_lot_id && locations.parkingLots && (
                            <div className="parking-lot-details">
                                <h3>Parking Lot Details</h3>
                                {locations.parkingLots
                                    .filter(lot => lot.id.toString() === formData.parking_lot_id)
                                    .map(lot => (
                                        <div key={lot.id} className="lot-info">
                                            <p><strong>Name:</strong> {lot.name}</p>
                                            <p><strong>Address:</strong> {lot.address}</p>
                                            <p><strong>Timings:</strong> {lot.opening_time} - {lot.closing_time}</p>
                                            <p><strong>Price:</strong> ₹{lot.price_per_hour} per hour</p>
                                            <p><strong>Total Slots:</strong> {lot.total_slots}</p>
                                            <p>
                                                <strong>Distance: </strong>
                                                {!userLocation ? 'Getting your location...' :
                                                 !lot.latitude || !lot.longitude ? 'Location coordinates not available' :
                                                 !distances[lot.id] ? 'Calculating...' :
                                                 distances[lot.id].distance}
                                            </p>
                                            <p>
                                                <a 
                                                    href={lot.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="location-link"
                                                >
                                                    View on Google Maps
                                                </a>
                                            </p>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                )}

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
                        onChange={handleInputChange}
                        required
                    />
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

                {/* Add Check Availability Button */}
                {/* <button 
                    type="button" 
                    className="check-availability-btn"
                    onClick={checkAvailability}
                    disabled={!formData.parking_lot_id || !formData.date || 
                             !formData.arrival_time || !formData.departure_time ||
                             isCheckingAvailability}
                >
                    {isCheckingAvailability ? 'Checking...' : 'Check Availability'}
                </button> */}

                {/* Display availability information */}
                {availableSlots !== null && (
                    <div className={`availability-info ${availableSlots > 0 ? 'available' : 'unavailable'}`}>
                        {availableSlots > 0 
                            ? `${availableSlots} slots available!` 
                            : 'No slots available for selected time'}
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

            const response = await fetch(`https://exsel-backend-1.onrender.com/api/booking-history/${userDetails.id}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch booking history');
            }

            setBookingHistory(data);
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
                `https://exsel-backend-1.onrender.com/api/available-slots/${parkingLotId}/${date}/${time}`
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
            await fetch('https://exsel-backend-1.onrender.com/api/update-completed-bookings', {
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
            const response = await fetch('https://exsel-backend-1.onrender.com/api/check-slot-availability', {
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
    const handleExtend = (booking) => {
        setSelectedBooking(booking);
        setExtensionTime(booking.actual_departed_time);
        setShowExtendModal(true);
    };

    // Handle extend submit
    const handleExtendSubmit = async () => {
        if (!extensionTime || !selectedBooking) {
            alert('Please select a new end time');
            return;
        }

        // Validate that new time is after current end time
        const currentEndMinutes = convertTimeToMinutes(selectedBooking.actual_departed_time);
        const newEndMinutes = convertTimeToMinutes(extensionTime);
        
        if (newEndMinutes <= currentEndMinutes) {
            alert('New end time must be after current end time');
            return;
        }

        setExtendLoading(true);
        try {
            const response = await fetch('https://exsel-backend-1.onrender.com/api/extend-booking', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    booking_id: selectedBooking.booking_id,
                    new_end_time: extensionTime
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to extend booking');
            }

            const data = await response.json();
            
            // Update the booking in state
            setBookingHistory(prevHistory => 
                prevHistory.map(booking => 
                    booking.booking_id === selectedBooking.booking_id
                        ? { ...booking, actual_departed_time: extensionTime }
                        : booking
                )
            );
            
            alert('Booking extended successfully!');
            
        } catch (error) {
            console.error('Error extending booking:', error);
            alert('Failed to extend booking: ' + error.message);
        } finally {
            setExtendLoading(false);
            setShowExtendModal(false);
            setSelectedBooking(null);
            setExtensionTime('');
        }
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
                    >
                        Profile
                    </button>
                    <button 
                        className={`sidebar-btn ${activeTab === 'history' ? 'active' : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        Booking History
                    </button>
                    <button 
                        className={`sidebar-btn ${activeTab === 'book' ? 'active' : ''}`}
                        onClick={() => setActiveTab('book')}
                    >
                        Book Slot
                    </button>
                    <button 
                        className={`sidebar-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
                        onClick={() => setActiveTab('upcoming')}
                    >
                        Upcoming Bookings
                    </button>
                </div>
                
                <div className="dashboard-content">
                    {activeTab === 'profile' && renderProfile()}
                    {activeTab === 'history' && renderBookingHistory()}
                    {activeTab === 'book' && renderBookAppointment()}
                    {activeTab === 'upcoming' && renderUpcomingAppointments()}
                </div>
            </div>
        </div>
    );
};

export default Home; 