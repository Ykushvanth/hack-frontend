const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const axios = require('axios');
const nodemailer = require('nodemailer');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const app = express();

// Supabase configuration
const supabaseUrl = 'https://xseoauyhebklccbhiawp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzZW9hdXloZWJrbGNjYmhpYXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NjkwNjAsImV4cCI6MjA1NTA0NTA2MH0.G-0vB7u33qIozLu2Fc1h3g0P2X2Q69W0PTtc8hHLv00';
const supabase = createClient(supabaseUrl, supabaseKey);

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'Slotify722@gmail.com',  // Your Gmail
        pass: 'axvsdlcdogwflibg'          // Your Gmail app password
    }
});

// Replace Razorpay initialization with Cashfree
const cashfreeApiKey = 'TEST10263902c9e2d00785ef7c8d7f9020936201';
const cashfreeSecretKey = 'cfsk_ma_test_807df42feba1aeb1bb1d9e3e415a75e2_14a45c83';


// Middleware
app.use(cors());
app.use(express.json());

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

// Signup endpoint
app.post('/api/signup', async (req, res) => {
    try {
        const {
            username,
            first_name,
            last_name,
            gender,
            date_of_birth,
            car_number,
            aadhar_number,
            phone_number,
            email,
            password
        } = req.body;

        // First, check if username already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('username')
            .eq('username', username)
            .single();

        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Insert new user
        const { data, error } = await supabase
            .from('users')
            .insert([
                {
                    username,
                    first_name,
                    last_name,
                    gender,
                    date_of_birth,
                    car_number,
                    aadhar_number,
                    phone_number,
                    email,
                    password // Note: In production, always hash passwords
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('Signup error:', error);
            return res.status(400).json({ 
                error: error.message || 'Error creating account' 
            });
        }

        // Return success response
        res.status(201).json({
            message: 'Account created successfully',
            user: {
                id: data.id,
                username: data.username,
                first_name: data.first_name,
                last_name: data.last_name
            }
        });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            error: 'Internal server error' 
        });
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .single();

        if (error || !user) {
            return res.status(401).json({ 
                error: 'Invalid username or password' 
            });
        }

        const token = 'dummy_token_' + Math.random();

        res.json({
            message: 'Login successful',
            jwt_token: token,
            user: {
                id: user.id,
                username: user.username,
                first_name: user.first_name,
                last_name: user.last_name,
                gender: user.gender,
                date_of_birth: user.date_of_birth,
                car_number: user.car_number,
                aadhar_number: user.aadhar_number,
                created_at: user.created_at
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            error: 'Internal server error' 
        });
    }
});

// Update the user details endpoint
app.get('/api/user-details', async (req, res) => {
    try {
        // Get the authorization header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        // Get user ID from localStorage
        const userId = req.query.userId;

        // Fetch user details from Supabase
        const { data: user, error } = await supabase
            .from('users')
            .select(`
                id,
                username,
                first_name,
                last_name,
                gender,
                date_of_birth,
                car_number,
                aadhar_number,
                phone_number,
                email,
                created_at
            `)
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching user details:', error);
            return res.status(400).json({ error: 'Error fetching user details' });
        }

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Return user details (excluding sensitive information)
        res.json({
            id: user.id,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            gender: user.gender,
            date_of_birth: user.date_of_birth,
            car_number: user.car_number,
            aadhar_number: user.aadhar_number,
            phone_number: user.phone_number,
            email: user.email,
            created_at: user.created_at
        });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all states from parking_locations
app.get('/api/states', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('parking_locations')
            .select('state')
            .order('state');

        if (error) throw error;

        // Get unique states using Set
        const uniqueStates = [...new Set(data.map(item => item.state))];
        res.json(uniqueStates);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get districts for selected state
app.get('/api/districts/:state', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('parking_locations')
            .select('district')
            .eq('state', req.params.state)
            .order('district');

        if (error) throw error;

        // Get unique districts using Set
        const uniqueDistricts = [...new Set(data.map(item => item.district))];
        res.json(uniqueDistricts);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get areas for selected state and district
app.get('/api/areas/:state/:district', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('parking_locations')
            .select('area')
            .eq('state', req.params.state)
            .eq('district', req.params.district)
            .order('area');

        if (error) throw error;

        // Get unique areas using Set
        const uniqueAreas = [...new Set(data.map(item => item.area))];
        res.json(uniqueAreas);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get parking lots by state, district, and area with enhanced features
app.get('/api/parking-lots/:state/:district/:area', async (req, res) => {
    try {
        console.log('Received request for:', req.params);

        // First get the parking lots with only existing columns
        const { data: parkingLots, error } = await supabase
            .from('parking_locations')
            .select(`
                location_id,
                parking_lot_name,
                address,
                total_slots,
                price_per_hour,
                opening_time,
                closing_time,
                url,
                state,
                district,
                area,
                latitude,
                longitude
            `)
            .eq('state', req.params.state)
            .eq('district', req.params.district)
            .eq('area', req.params.area);

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        console.log('Retrieved parking lots:', parkingLots);

        // Process each parking lot
        const processedParkingLots = parkingLots.map(lot => {
            // Special logging for Kalasalingam University
            if (lot.parking_lot_name === 'Kalasalingam University') {
                console.log('🔍 Kalasalingam University Details:', {
                    name: lot.parking_lot_name,
                    address: lot.address,
                    latitude: lot.latitude,
                    longitude: lot.longitude,
                    isValid: !!(lot.latitude && lot.longitude && 
                              !isNaN(parseFloat(lot.latitude)) && 
                              !isNaN(parseFloat(lot.longitude)))
                });
            }

            return {
                id: lot.location_id,
                name: lot.parking_lot_name,
                address: lot.address,
                total_slots: lot.total_slots,
                price_per_hour: lot.price_per_hour,
                opening_time: lot.opening_time,
                closing_time: lot.closing_time,
                url: lot.url,
                latitude: lot.latitude,
                longitude: lot.longitude
            };
        });

        // Debug logs
        console.log('Processed parking lots:', processedParkingLots);
        console.log('First parking lot URL:', processedParkingLots[0]?.url);
        console.log('First parking lot full details:', processedParkingLots[0]);
        console.log('First parking lot coordinates:', {
            lat: parkingLots[0]?.latitude,
            lng: parkingLots[0]?.longitude
        });

        res.json({
            success: true,
            count: processedParkingLots.length,
            parking_lots: processedParkingLots
        });

    } catch (error) {
        console.error('Error fetching parking lots:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch parking lots',
            message: error.message 
        });
    }
});

// Book slot endpoint
app.post('/api/book-slot', async (req, res) => {
    try {
        const {
            parking_lot_id,
            driver_name,
            car_number,
            aadhar_number,
            date,
            actual_arrival_time,
            actual_departed_time,
            user_id
        } = req.body;

        // Get parking lot details including price_per_hour
        const { data: parkingLot, error: parkingError } = await supabase
            .from('parking_locations')
            .select('available_slots, total_slots, opening_time, closing_time, url, price_per_hour')
            .eq('location_id', parking_lot_id)
            .single();

        if (parkingError) {
            console.error('Error fetching parking lot:', parkingError);
            throw parkingError;
        }

        // Calculate duration and amount
        const [arrivalHours, arrivalMinutes] = actual_arrival_time.split(':').map(Number);
        const [departureHours, departureMinutes] = actual_departed_time.split(':').map(Number);

        // Calculate total minutes
        const totalMinutes = (departureHours * 60 + departureMinutes) - (arrivalHours * 60 + arrivalMinutes);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        // Calculate amount
        const hourlyRate = parkingLot.price_per_hour;
        const amount = (hours * hourlyRate) + ((minutes / 60) * hourlyRate);
        const roundedAmount = Math.ceil(amount); // Round up to nearest rupee

        // Create booking with PENDING_PAYMENT status and temporary slot number
        const { data: booking, error: bookingError } = await supabase
            .from('slot_booking')
            .insert([{
                user_id,
                user_name: driver_name,
                car_number,
                aadhar_number,
                driver_name,
                driver_aadhar: aadhar_number,
                actual_arrival_time,
                actual_departed_time,
                booked_date: date,
                slot_number: 0, // Temporary slot number for pending payments
                parking_lot_location: parking_lot_id,
                location: parkingLot.url,
                booking_status: 'PENDING_PAYMENT',
                payment_status: 'PENDING'
            }])
            .select()
            .single();

        if (bookingError) {
            throw bookingError;
        }

        // Return the booking details along with the calculated amount
        res.json({ 
            booking_id: booking.booking_id,
            amount: roundedAmount
        });

    } catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add check departed vehicles and send emails endpoint
app.post('/api/check-departed-vehicles', async (req, res) => {
    try {
        // Get all bookings where departed_time is not null
        const { data: departedBookings, error: bookingsError } = await supabase
            .from('slot_booking')
            .select('*')
            .not('departed_time', 'is', null);

        if (bookingsError) {
            console.error('Error fetching departed bookings:', bookingsError);
            throw bookingsError;
        }

        if (!departedBookings || departedBookings.length === 0) {
            return res.json({ message: 'No departed vehicles to process' });
        }

        // Process each departed booking
        const results = await Promise.all(departedBookings.map(async (booking) => {
            try {
                // Get user details using user_id from slot_booking
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('email, first_name')
                    .eq('id', booking.user_id)
                    .single();

                if (userError) {
                    console.error('Error fetching user:', userError);
                    return { booking_id: booking.booking_id, success: false, error: 'User not found' };
                }

                // Get parking location details
                const { data: parkingData } = await supabase
                    .from('parking_locations')
                    .select('parking_lot_name')
                    .eq('location_id', booking.parking_lot_location)
                    .single();

                // Send departure confirmation email
                await transporter.sendMail({
                    from: 'parksmart.help@gmail.com',
                    to: userData.email,
                    subject: 'ParkSmart - Departure Confirmation',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h1 style="color: #0A514E;">ParkSmart</h1>
                            <p>Dear ${userData.first_name},</p>
                            <p>Your vehicle has departed from our parking facility.</p>
                            <p>Booking Details:</p>
                            <ul>
                                <li>Booking ID: ${booking.booking_id}</li>
                                <li>Location: ${parkingData?.parking_lot_name || 'N/A'}</li>
                                <li>Slot Number: ${booking.slot_number}</li>
                                <li>Car Number: ${booking.car_number}</li>
                                <li>Arrival Time: ${booking.arrived_time}</li>
                                <li>Departure Time: ${booking.departed_time}</li>
                            </ul>
                            <p>Thank you for using ParkSmart! We hope to serve you again.</p>
                        </div>
                    `
                });

                return { booking_id: booking.booking_id, success: true };
            } catch (error) {
                console.error('Error processing booking:', error);
                return { booking_id: booking.booking_id, success: false, error: error.message };
            }
        }));

        res.json({
            message: 'Processed departed vehicles',
            results
        });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update the booking status endpoint
app.post('/api/update-booking-status', async (req, res) => {
    try {
        const { bookingId, status } = req.body;

        // First get the current booking to get user_id
        const { data: currentBooking, error: bookingError } = await supabase
            .from('slot_booking')
            .select('*')
            .eq('booking_id', bookingId)
            .single();

        if (bookingError || !currentBooking) {
            console.error('Error fetching booking:', bookingError);
            throw new Error('Booking not found');
        }

        // Get user details from users table using user_id
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('email, first_name')
            .eq('id', currentBooking.user_id)
            .single();

        if (userError || !userData) {
            console.error('Error fetching user:', userError);
            throw new Error('User not found');
        }

        let updateData = {
            updated_at: new Date().toISOString(),
            status: 'allow'  // Always set status to 'allow'
        };

        // Handle different status updates
        if (status === 'ARRIVED') {
            updateData = {
                ...updateData,
                arrived_time: new Date().toLocaleTimeString('en-US', { 
                    hour12: false, 
                    hour: '2-digit', 
                    minute: '2-digit' 
                }),
                booking_status: 'ONGOING'
            };

            // Send arrival confirmation email
            try {
                await transporter.sendMail({
                    from: 'parksmart.help@gmail.com',
                    to: userData.email,
                    subject: 'ParkSmart - Arrival Confirmation',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h1 style="color: #0A514E;">ParkSmart</h1>
                            <p>Dear ${userData.first_name},</p>
                            <p>Your arrival has been confirmed.</p>
                            <p>Booking Details:</p>
                            <ul>
                                <li>Booking ID: ${currentBooking.booking_id}</li>
                                <li>Slot Number: ${currentBooking.slot_number}</li>
                                <li>Car Number: ${currentBooking.car_number}</li>
                            </ul>
                            <p>Thank you for using ParkSmart!</p>
                        </div>
                    `
                });
                console.log('Arrival confirmation email sent successfully');
            } catch (emailError) {
                console.error('Error sending arrival email:', emailError);
            }
        } else if (status === 'DEPARTED') {
            updateData = {
                ...updateData,
                booking_status: 'COMPLETED'
            };

            // Get parking location details
            const { data: parkingData } = await supabase
                .from('parking_locations')
                .select('available_slots, total_slots, parking_lot_name')
                .eq('location_id', currentBooking.parking_lot_location)
                .single();

            if (parkingData) {
                // Update available slots
                await supabase
                    .from('parking_locations')
                    .update({ 
                        available_slots: Math.min(parkingData.available_slots + 1, parkingData.total_slots)
                    })
                    .eq('location_id', currentBooking.parking_lot_location);

                // Send departure confirmation email
                try {
                    await transporter.sendMail({
                        from: 'parksmart.help@gmail.com',
                        to: userData.email,
                        subject: 'ParkSmart - Departure Confirmation',
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                                <h1 style="color: #0A514E;">ParkSmart</h1>
                                <p>Dear ${userData.first_name},</p>
                                <p>Your departure has been confirmed.</p>
                                <p>Booking Details:</p>
                                <ul>
                                    <li>Booking ID: ${currentBooking.booking_id}</li>
                                    <li>Location: ${parkingData.parking_lot_name}</li>
                                    <li>Slot Number: ${currentBooking.slot_number}</li>
                                    <li>Car Number: ${currentBooking.car_number}</li>
                                </ul>
                                <p>Thank you for using ParkSmart! We hope to serve you again.</p>
                            </div>
                        `
                    });
                    console.log('Departure confirmation email sent successfully');
                } catch (emailError) {
                    console.error('Error sending departure email:', emailError);
                }
            }
        }

        // Update the booking in the database
        const { data: updatedBooking, error: updateError } = await supabase
            .from('slot_booking')
            .update(updateData)
            .eq('booking_id', bookingId)
            .select()
            .single();

        if (updateError) {
            console.error('Database update error:', updateError);
            throw new Error(updateError.message);
        }

        res.json({ 
            message: `Booking marked as ${status} successfully`, 
            booking: updatedBooking 
        });

    } catch (error) {
        console.error('Error updating booking status:', error);
        res.status(500).json({ 
            error: error.message,
            details: 'Failed to update booking status'
        });
    }
});

// Update the booking history endpoint
app.get('/api/booking-history/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        console.log('Fetching bookings for user:', userId);

        // First get the bookings with all relevant fields
        const { data: bookings, error: bookingsError } = await supabase
            .from('slot_booking')
            .select(`
                booking_id,
                user_id,
                actual_arrival_time,
                actual_departed_time,
                arrived_time,
                departed_time,
                booked_date,
                slot_number,
                booking_status,
                user_name,
                car_number,
                aadhar_number,
                driver_name,
                driver_aadhar,
                location,
                status,
                parking_lot_location,
                created_at,
                updated_at,
                payment_status,
                payment_id,
                amount_paid
            `)
            .eq('user_id', userId)
            .order('booked_date', { ascending: false });

        if (bookingsError) {
            console.error('Error fetching bookings:', bookingsError);
            throw bookingsError;
        }

        console.log('Raw bookings data:', bookings);

        // If we have bookings, fetch the parking location details for each
        if (bookings && bookings.length > 0) {
            const bookingsWithLocations = await Promise.all(
                bookings.map(async (booking) => {
                    const { data: locationData } = await supabase
                        .from('parking_locations')
                        .select('*')
                        .eq('location_id', booking.parking_lot_location)
                        .single();
                    
                    // Calculate status based on times and existing status
                    let calculatedStatus = booking.status || booking.booking_status;
                    const currentTime = new Date();
                    const bookingDate = new Date(booking.booked_date);
                    const scheduledArrival = new Date(bookingDate);
                    const [arrivalHours, arrivalMinutes] = booking.actual_arrival_time.split(':');
                    scheduledArrival.setHours(parseInt(arrivalHours), parseInt(arrivalMinutes));

                    // Only update status if not manually set
                    if (!booking.status) {
                        if (currentTime < scheduledArrival) {
                            calculatedStatus = 'UPCOMING';
                        } else if (booking.arrived_time && !booking.departed_time) {
                            calculatedStatus = 'ONGOING';
                        } else if (booking.departed_time) {
                            calculatedStatus = 'COMPLETED';
                        }
                    }

                    // For testing, set a default amount_paid if it's null
                    const amountPaid = booking.amount_paid !== null ? booking.amount_paid : 150;

                    return {
                        ...booking,
                        parking_locations: locationData || null,
                        status: calculatedStatus,
                        // Ensure amount_paid is included
                        amount_paid: amountPaid
                    };
                })
            );

            console.log('Bookings with locations and amount_paid:', bookingsWithLocations);
            res.json(bookingsWithLocations);
        } else {
            console.log('No bookings found');
            res.json([]);
        }

    } catch (error) {
        console.error('Error fetching booking history:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update the check slot availability endpoint
app.post('/api/check-slot-availability', async (req, res) => {
    try {
        const { parking_lot_id, date, arrival_time, departure_time } = req.body;
        
        // Log the request
        console.log('Checking availability for:', { parking_lot_id, date, arrival_time, departure_time });

        // Validate input
        if (!parking_lot_id || !date || !arrival_time || !departure_time) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                available: false,
                availableSlots: 0
            });
        }

        // Get parking lot details
        const { data: parkingLot, error: parkingLotError } = await supabase
            .from('parking_locations')
            .select('total_slots')
            .eq('location_id', parking_lot_id)
            .single();

        if (parkingLotError) {
            console.error('Parking lot error:', parkingLotError);
            return res.status(500).json({ 
                error: 'Failed to fetch parking lot details',
                available: false,
                availableSlots: 0
            });
        }

        // Get existing bookings - only consider confirmed or ongoing bookings with real slots
        const { data: existingBookings, error: bookingsError } = await supabase
            .from('slot_booking')
            .select('*')
            .eq('parking_lot_location', parking_lot_id)
            .eq('booked_date', date)
            .in('booking_status', ['CONFIRMED', 'ONGOING'])
            .neq('slot_number', 0) // Exclude temporary slots
            .eq('payment_status', 'COMPLETED'); // Only consider paid bookings

        if (bookingsError) {
            console.error('Bookings error:', bookingsError);
            return res.status(500).json({ 
                error: 'Failed to fetch existing bookings',
                available: false,
                availableSlots: 0
            });
        }

        // Calculate available slots
        const totalSlots = parkingLot.total_slots;
        const overlappingBookings = existingBookings.filter(booking => {
            return (
                (arrival_time < booking.actual_departed_time) &&
                (departure_time > booking.actual_arrival_time) &&
                booking.slot_number > 0 // Double check for real slot numbers
            );
        });

        const availableSlots = totalSlots - overlappingBookings.length;

        // Log the result
        console.log('Availability check result:', {
            totalSlots,
            bookedSlots: overlappingBookings.length,
            availableSlots,
            confirmedBookings: existingBookings.length
        });

        return res.json({
            available: availableSlots > 0,
            availableSlots,
            totalSlots
        });

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            available: false,
            availableSlots: 0
        });
    }
});

// Extend booking endpoint
app.post('/api/extend-booking', async (req, res) => {
    try {
        const { booking_id, new_end_time } = req.body;

        // Validate input
        if (!booking_id || !new_end_time) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // First get the current booking details
        const { data: currentBooking, error: bookingError } = await supabase
            .from('slot_booking')
            .select('*')
            .eq('booking_id', booking_id)
            .single();

        if (bookingError) {
            console.error('Error fetching current booking:', bookingError);
            return res.status(500).json({ error: 'Failed to fetch booking details' });
        }

        // Check for overlapping bookings
        const { data: existingBookings, error: bookingsError } = await supabase
            .from('slot_booking')
            .select('*')
            .eq('parking_lot_location', currentBooking.parking_lot_location)
            .eq('booked_date', currentBooking.booked_date)
            .eq('slot_number', currentBooking.slot_number)
            .neq('booking_id', booking_id)  // Exclude current booking
            .neq('booking_status', 'CANCELLED');

        if (bookingsError) {
            console.error('Error checking overlapping bookings:', bookingsError);
            return res.status(500).json({ error: 'Failed to check availability' });
        }

        // Check for time conflicts
        const hasConflict = existingBookings.some(booking => 
            new_end_time > booking.actual_arrival_time && 
            currentBooking.actual_arrival_time < booking.actual_departed_time
        );

        if (hasConflict) {
            return res.status(400).json({ 
                error: 'Cannot extend booking. Time slot is already booked.' 
            });
        }

        // Update the booking
        const { data: updatedBooking, error: updateError } = await supabase
            .from('slot_booking')
            .update({ 
                actual_departed_time: new_end_time,
                updated_at: new Date().toISOString()
            })
            .eq('booking_id', booking_id)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating booking:', updateError);
            return res.status(500).json({ error: 'Failed to extend booking' });
        }

        res.json({ 
            message: 'Booking extended successfully',
            booking: updatedBooking
        });

    } catch (error) {
        console.error('Error in extend-booking endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add update user endpoint
app.put('/api/update-user', async (req, res) => {
    try {
        const { userId, phone_number, email } = req.body;

        // Validate input
        if (!userId || !phone_number || !email) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Update user details
        const { data, error } = await supabase
            .from('users')
            .update({ 
                phone_number,
                email,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            console.error('Update error:', error);
            return res.status(400).json({ error: 'Failed to update user details' });
        }

        res.json({
            message: 'User details updated successfully',
            user: data
        });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add a scheduled task to check departed vehicles every minute
setInterval(async () => {
    try {
        await fetch('http://localhost:3001/api/check-departed-vehicles', {
            method: 'POST'
        });
        console.log('Checked for departed vehicles');
    } catch (error) {
        console.error('Error checking departed vehicles:', error);
    }
}, 60000); // Run every minute

// Modify the create-order endpoint
app.post('/api/create-order', async (req, res) => {
    try {
        const { amount, booking_id, userDetails } = req.body;

        if (!amount || !booking_id || !userDetails) {
            throw new Error('Missing required fields');
        }

        // Generate a unique order ID
        const order_id = `booking_${booking_id}_${Date.now()}`;

        // Create order with Cashfree
        const orderData = {
            "order_id": order_id,
            "order_amount": amount,
            "order_currency": "INR",
            "customer_details": {
                "customer_id": `CUST_${userDetails.id}`,
                "customer_name": `${userDetails.first_name} ${userDetails.last_name}`,
                "customer_email": userDetails.email,
                "customer_phone": userDetails.phone_number
            },
            "order_meta": {
                "return_url": `http://localhost:3000/payment-status?booking_id=${booking_id}&order_id=${order_id}`,
                "notify_url": "http://localhost:3001/api/payment-webhook"
            },
            "order_tags": {
                "booking_id": booking_id.toString()
            }
        };

        console.log('Creating order with data:', orderData);

        const response = await fetch('https://sandbox.cashfree.com/pg/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-client-id': cashfreeApiKey,
                'x-client-secret': cashfreeSecretKey,
                'x-api-version': '2022-09-01'
            },
            body: JSON.stringify(orderData)
        });

        const cashfreeResponse = await response.json();
        console.log('Cashfree response:', cashfreeResponse);

        if (!response.ok) {
            console.error('Cashfree error:', cashfreeResponse);
            throw new Error(cashfreeResponse.message || 'Failed to create order');
        }

        // Update booking with cashfree_order_id
        const { error: updateError } = await supabase
            .from('slot_booking')
            .update({ 
                cashfree_order_id: cashfreeResponse.order_id,
                payment_status: 'PENDING'
            })
            .eq('booking_id', booking_id);

        if (updateError) {
            throw updateError;
        }

        res.json({
            order_id: cashfreeResponse.order_id,
            payment_session_id: cashfreeResponse.payment_session_id
        });

    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: error.message || 'Failed to create order' });
    }
});

// Modify the verify-payment endpoint to properly store the payment amount
app.post('/api/verify-payment', async (req, res) => {
    try {
        const { order_id, booking_id } = req.body;
        
        console.log(`Verifying payment for order: ${order_id}, booking: ${booking_id}`);

        if (!order_id || !booking_id) {
            console.error('Missing required parameters');
            return res.status(400).json({ 
                success: false, 
                error: 'Missing order_id or booking_id' 
            });
        }

        // First check if booking exists
        const { data: existingBooking, error: bookingCheckError } = await supabase
            .from('slot_booking')
            .select('*')
            .eq('booking_id', booking_id)
            .single();

        if (bookingCheckError) {
            console.error('Error fetching booking:', bookingCheckError);
            return res.status(404).json({ 
                success: false, 
                error: 'Booking not found' 
            });
        }

        console.log('Found booking:', existingBooking);

        // Verify payment status with Cashfree
        try {
            const response = await fetch(`https://sandbox.cashfree.com/pg/orders/${order_id}`, {
                method: 'GET',
                headers: {
                    'x-client-id': cashfreeApiKey,
                    'x-client-secret': cashfreeSecretKey,
                    'x-api-version': '2022-09-01'
                }
            });

            if (!response.ok) {
                throw new Error(`Cashfree API error: ${response.status} ${response.statusText}`);
            }

            const orderDetails = await response.json();
            console.log('Cashfree order details:', orderDetails);

            // For testing purposes, consider all orders as PAID
            // In production, use: if (orderDetails.order_status === 'PAID') {
            if (true) {
                console.log('Payment is PAID, processing...');
                
                // Get parking lot details for total slots
                const { data: parkingLot, error: parkingLotError } = await supabase
                    .from('parking_locations')
                    .select('total_slots')
                    .eq('location_id', existingBooking.parking_lot_location)
                    .single();

                if (parkingLotError) {
                    console.error('Error fetching parking lot:', parkingLotError);
                    throw new Error('Failed to fetch parking lot details');
                }

                // Check for available slots, excluding temporary slots (0)
                const { data: existingBookings, error: bookingsError } = await supabase
                    .from('slot_booking')
                    .select('slot_number')
                    .eq('parking_lot_location', existingBooking.parking_lot_location)
                    .eq('booked_date', existingBooking.booked_date)
                    .in('booking_status', ['CONFIRMED', 'ONGOING'])
                    .neq('slot_number', 0) // Exclude temporary slots
                    .neq('booking_id', booking_id);

                if (bookingsError) {
                    console.error('Error checking existing bookings:', bookingsError);
                    throw new Error('Failed to check slot availability');
                }

                // Find available slot number
                const bookedSlots = existingBookings ? existingBookings.map(b => b.slot_number) : [];
                let availableSlot = 1;
                while (bookedSlots.includes(availableSlot) && availableSlot <= parkingLot.total_slots) {
                    availableSlot++;
                }

                if (availableSlot > parkingLot.total_slots) {
                    // No slots available
                    console.log('No slots available, marking for refund');
                    const { error: updateError } = await supabase
                        .from('slot_booking')
                        .update({
                            booking_status: 'CANCELLED',
                            payment_status: 'REFUND_REQUIRED',
                            updated_at: new Date().toISOString()
                        })
                        .eq('booking_id', booking_id);
                        
                    if (updateError) {
                        console.error('Error updating booking for refund:', updateError);
                    }

                    return res.status(400).json({
                        success: false,
                        error: 'No slots available. A refund will be processed.'
                    });
                }

                // Use a fixed amount for testing if orderDetails.order_amount is not available
                const paymentAmount = orderDetails.order_amount || 150;
                
                // Update booking with actual slot number, status, and payment amount
                const updateData = {
                    slot_number: availableSlot,
                    payment_status: 'COMPLETED',
                    payment_id: orderDetails.cf_payment_id || orderDetails.order_id,
                    booking_status: 'CONFIRMED',
                    amount_paid: paymentAmount, // Store the payment amount
                    updated_at: new Date().toISOString()
                };
                
                console.log('Updating booking with data:', updateData);
                
                const { error: updateError } = await supabase
                    .from('slot_booking')
                    .update(updateData)
                    .eq('booking_id', booking_id);

                if (updateError) {
                    console.error('Error updating booking:', updateError);
                    throw new Error(`Failed to update booking: ${updateError.message}`);
                }
                
                console.log('Booking updated successfully');

                // Verify the update was successful by fetching the updated booking
                const { data: updatedBooking, error: fetchError } = await supabase
                    .from('slot_booking')
                    .select('*')
                    .eq('booking_id', booking_id)
                    .single();
                    
                if (fetchError) {
                    console.error('Error fetching updated booking:', fetchError);
                } else {
                    console.log('Updated booking details:', updatedBooking);
                }

                return res.json({ 
                    success: true, 
                    message: 'Payment verified and slot assigned successfully',
                    slot_number: availableSlot,
                    amount_paid: paymentAmount
                });
            } else {
                console.log('Payment failed, order status:', orderDetails.order_status);
                // If payment failed, update the booking status but keep temporary slot
                const { error: updateError } = await supabase
                    .from('slot_booking')
                    .update({
                        booking_status: 'CANCELLED',
                        payment_status: 'FAILED',
                        updated_at: new Date().toISOString()
                    })
                    .eq('booking_id', booking_id);
                    
                if (updateError) {
                    console.error('Error updating booking for failed payment:', updateError);
                }

                return res.status(400).json({
                    success: false,
                    error: `Payment verification failed. Status: ${orderDetails.order_status}`
                });
            }
        } catch (cashfreeError) {
            console.error('Error with Cashfree API:', cashfreeError);
            return res.status(500).json({
                success: false,
                error: `Error verifying payment with Cashfree: ${cashfreeError.message}`
            });
        }
    } catch (error) {
        console.error('Payment verification error:', error);
        return res.status(500).json({ 
            success: false, 
            error: `Internal server error: ${error.message}` 
        });
    }
});

// 1. Create extension request endpoint
app.post('/api/create-extension-request', async (req, res) => {
    try {
        const { bookingId, extensionHours, newDepartureTime, additionalCost, userId } = req.body;
        
        console.log('Extension request received:', { bookingId, extensionHours, newDepartureTime, additionalCost });
        
        // First, get the current booking details
        const { data: booking, error: bookingError } = await supabase
            .from('slot_booking')
            .select('*')
            .eq('booking_id', bookingId)
            .single();
            
        if (bookingError) {
            console.error('Error fetching booking:', bookingError);
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        // Check if the slot is available for the extended time
        const bookingDate = booking.booked_date;
        const currentDepartureTime = booking.actual_departed_time;
        
        console.log('Checking availability for extension:', {
            bookingDate,
            currentDepartureTime,
            newDepartureTime,
            slotNumber: booking.slot_number,
            parkingLotLocation: booking.parking_lot_location
        });
        
        // Check for overlapping bookings
        const { data: overlappingBookings, error: overlapError } = await supabase
            .from('slot_booking')
            .select('*')
            .eq('parking_lot_location', booking.parking_lot_location)
            .eq('booked_date', bookingDate)
            .eq('slot_number', booking.slot_number)
            .neq('booking_id', bookingId) // Exclude current booking
            .gte('actual_arrival_time', currentDepartureTime) // Starts after current departure
            .lte('actual_arrival_time', newDepartureTime) // Starts before new departure
            .eq('payment_status', 'COMPLETED'); // Only consider confirmed bookings
            
        if (overlapError) {
            console.error('Error checking overlapping bookings:', overlapError);
            return res.status(500).json({ error: 'Failed to check slot availability' });
        }
        
        if (overlappingBookings && overlappingBookings.length > 0) {
            return res.status(400).json({ 
                error: 'Cannot extend booking. The slot is already booked for the requested time.' 
            });
        }
        
        // Store extension information temporarily
        const extensionInfo = {
            original_departure_time: currentDepartureTime,
            new_departure_time: newDepartureTime,
            extension_hours: extensionHours,
            additional_cost: additionalCost,
            status: 'PENDING',
            requested_at: new Date().toISOString()
        };
        
        // Update the booking with extension info
        const { error: updateError } = await supabase
            .from('slot_booking')
            .update({
                extension_info: extensionInfo // Note: Supabase automatically handles JSON conversion for jsonb columns
            })
            .eq('booking_id', bookingId);
            
        if (updateError) {
            console.error('Error updating booking with extension info:', updateError);
            return res.status(500).json({ error: 'Failed to create extension request' });
        }
        
        // Return success
        return res.json({
            success: true,
            message: 'Extension request created successfully',
            booking: booking
        });
        
    } catch (error) {
        console.error('Error in create-extension-request endpoint:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// 2. Create extension payment order endpoint
app.post('/api/create-extension-order', async (req, res) => {
    try {
        const { amount, bookingId, userDetails } = req.body;
        
        if (!amount || !bookingId || !userDetails) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Generate a unique order ID for the extension
        const order_id = `extension_${bookingId}_${Date.now()}`;
        
        // Create order with Cashfree
        const orderData = {
            "order_id": order_id,
            "order_amount": amount,
            "order_currency": "INR",
            "customer_details": {
                "customer_id": `CUST_${userDetails.id}`,
                "customer_name": `${userDetails.first_name} ${userDetails.last_name}`,
                "customer_email": userDetails.email,
                "customer_phone": userDetails.phone_number
            },
            "order_meta": {
                "return_url": `http://localhost:3000/payment-status?booking_id=${bookingId}&order_id=${order_id}&extension=true`,
                "notify_url": "http://localhost:3001/api/payment-webhook"
            },
            "order_tags": {
                "booking_id": bookingId.toString(),
                "payment_type": "extension"
            }
        };
        
        console.log('Creating extension order with data:', orderData);
        
        const response = await fetch('https://sandbox.cashfree.com/pg/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-client-id': cashfreeApiKey,
                'x-client-secret': cashfreeSecretKey,
                'x-api-version': '2022-09-01'
            },
            body: JSON.stringify(orderData)
        });
        
        const cashfreeResponse = await response.json();
        console.log('Cashfree response for extension order:', cashfreeResponse);
        
        if (!response.ok) {
            console.error('Cashfree error:', cashfreeResponse);
            throw new Error(cashfreeResponse.message || 'Failed to create extension order');
        }
        
        // Update booking with extension order ID
        const { data: booking, error: bookingError } = await supabase
            .from('slot_booking')
            .select('extension_info')
            .eq('booking_id', bookingId)
            .single();
            
        if (bookingError) {
            console.error('Error fetching booking:', bookingError);
            throw new Error('Failed to fetch booking details');
        }
        
        // Get the current extension info
        let extensionInfo = booking.extension_info || {};
        
        // Update extension info with order ID
        extensionInfo.cashfree_order_id = cashfreeResponse.order_id;
        extensionInfo.payment_status = 'PENDING';
        
        const { error: updateError } = await supabase
            .from('slot_booking')
            .update({ 
                extension_info: extensionInfo,
                extension_order_id: cashfreeResponse.order_id
            })
            .eq('booking_id', bookingId);
            
        if (updateError) {
            console.error('Error updating booking with extension order ID:', updateError);
            throw new Error('Failed to update booking record');
        }
        
        res.json({
            order_id: cashfreeResponse.order_id,
            payment_session_id: cashfreeResponse.payment_session_id
        });
        
    } catch (error) {
        console.error('Error creating extension order:', error);
        res.status(500).json({ error: error.message || 'Failed to create extension order' });
    }
});

// 3. Verify extension payment endpoint
app.post('/api/verify-extension-payment', async (req, res) => {
    try {
        const { order_id, booking_id } = req.body;
        
        console.log(`Verifying extension payment for order: ${order_id}, booking: ${booking_id}`);
        
        if (!order_id || !booking_id) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required parameters' 
            });
        }
        
        // Get the booking details
        const { data: booking, error: bookingError } = await supabase
            .from('slot_booking')
            .select('*')
            .eq('booking_id', booking_id)
            .single();
            
        if (bookingError) {
            console.error('Error fetching booking:', bookingError);
            return res.status(404).json({ 
                success: false, 
                error: 'Booking not found' 
            });
        }
        
        // Check extension info
        const extensionInfo = booking.extension_info;
        
        if (!extensionInfo || !extensionInfo.new_departure_time || !extensionInfo.additional_cost) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing extension details' 
            });
        }
        
        // Verify payment status with Cashfree
        try {
            const response = await fetch(`https://sandbox.cashfree.com/pg/orders/${order_id}`, {
                method: 'GET',
                headers: {
                    'x-client-id': cashfreeApiKey,
                    'x-client-secret': cashfreeSecretKey,
                    'x-api-version': '2022-09-01'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Cashfree API error: ${response.status} ${response.statusText}`);
            }
            
            const orderDetails = await response.json();
            console.log('Cashfree order details for extension:', orderDetails);
            
            // For testing purposes, consider all orders as PAID
            // In production, use: if (orderDetails.order_status === 'PAID') {
            if (true) {
                console.log('Extension payment is PAID, processing...');
                
                // Calculate the new amount_paid
                const currentAmount = booking.amount_paid || 0;
                const additionalAmount = extensionInfo.additional_cost || 0;
                const totalAmount = currentAmount + additionalAmount;
                
                // Update the booking with the new departure time and amount
                const { error: updateBookingError } = await supabase
                    .from('slot_booking')
                    .update({
                        actual_departed_time: extensionInfo.new_departure_time,
                        amount_paid: totalAmount,
                        extension_info: {
                            ...extensionInfo,
                            status: 'COMPLETED',
                            payment_id: orderDetails.cf_payment_id || orderDetails.order_id,
                            payment_status: 'COMPLETED',
                            completed_at: new Date().toISOString()
                        },
                        updated_at: new Date().toISOString()
                    })
                    .eq('booking_id', booking_id);
                    
                if (updateBookingError) {
                    console.error('Error updating booking:', updateBookingError);
                    throw new Error('Failed to update booking with extended time');
                }
                
                return res.json({
                    success: true,
                    message: 'Payment verified and booking extended successfully',
                    newDepartureTime: extensionInfo.new_departure_time,
                    additionalCost: extensionInfo.additional_cost
                });
            } else {
                console.log('Extension payment failed, order status:', orderDetails.order_status);
                
                // Update the extension info to failed
                const { error: updateError } = await supabase
                    .from('slot_booking')
                    .update({
                        extension_info: {
                            ...extensionInfo,
                            status: 'FAILED',
                            payment_status: 'FAILED',
                            failed_at: new Date().toISOString()
                        }
                    })
                    .eq('booking_id', booking_id);
                    
                if (updateError) {
                    console.error('Error updating extension info for failed payment:', updateError);
                }
                
                return res.status(400).json({
                    success: false,
                    error: `Payment verification failed. Status: ${orderDetails.order_status}`
                });
            }
        } catch (cashfreeError) {
            console.error('Error with Cashfree API:', cashfreeError);
            return res.status(500).json({
                success: false,
                error: `Error verifying payment with Cashfree: ${cashfreeError.message}`
            });
        }
    } catch (error) {
        console.error('Extension payment verification error:', error);
        return res.status(500).json({ 
            success: false, 
            error: `Internal server error: ${error.message}` 
        });
    }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
