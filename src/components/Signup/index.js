import { Component } from "react";
import "./index.css"
import { Link, useNavigate } from "react-router-dom"

class SignUp extends Component {
    state = {
        username: "",
        first_name: "",
        last_name: "",
        gender: "",
        date_of_birth: "",
        car_number: "",
        aadhar_number: "",
        phone_number: "",
        email: "",
        password: "",
        confirmPassword: "",
        errorMsg: "",
        showError: false
    }

    onChangeUsername = event => this.setState({ username: event.target.value })
    onChangeFirstName = event => this.setState({ first_name: event.target.value })
    onChangeLastName = event => this.setState({ last_name: event.target.value })
    onChangeGender = event => this.setState({ gender: event.target.value })
    onChangeDateOfBirth = event => this.setState({ date_of_birth: event.target.value })
    onChangeCarNumber = event => this.setState({ car_number: event.target.value })
    onChangeAadharNumber = event => this.setState({ aadhar_number: event.target.value })
    onChangePhoneNumber = event => this.setState({ phone_number: event.target.value })
    onChangeEmail = event => this.setState({ email: event.target.value })
    onChangePassword = event => this.setState({ password: event.target.value })
    onChangeConfirmPassword = event => this.setState({ confirmPassword: event.target.value })

    onSubmitForm = async (event) => {
        event.preventDefault();
        const { password, confirmPassword } = this.state;

        if (password !== confirmPassword) {
            this.setState({
                showError: true,
                errorMsg: "Passwords do not match"
            });
            return;
        }

        try {
            // Remove confirmPassword from the data being sent to backend
            const signupData = { ...this.state };
            delete signupData.confirmPassword;
            delete signupData.showError;
            delete signupData.errorMsg;

            const response = await fetch("https://exsel-backend-3.onrender.com/api/signup", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(signupData),
            });

            const data = await response.json();

            if (response.ok) {
                alert('Account created successfully! Please login.');
                this.props.navigate('/login');
            } else {
                this.setState({
                    showError: true,
                    errorMsg: data.error || 'Registration failed. Please try again.'
                });
            }
        } catch (error) {
            console.error('Signup error:', error);
            this.setState({
                showError: true,
                errorMsg: 'Connection error. Please try again.'
            });
        }
    };

    render() {
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
            password,
            confirmPassword,
            showError,
            errorMsg
        } = this.state

        return (
            <div className="main-bg-container-for-login">
                <img
                    className="login-image"
                    src="https://res.cloudinary.com/dcgmeefn2/image/upload/v1740811794/car_moving_iqyr65.jpg"
                    alt="logo"
                />
                <div className="login-container">
                    <h1 className="sign-in-heading">Sign Up</h1>
                    <form className="form-container" onSubmit={this.onSubmitForm}>
                        <div className="container">
                            <label className="label" htmlFor="username">Username</label>
                            <input
                                value={username}
                                onChange={this.onChangeUsername}
                                placeholder="Enter username"
                                id="username"
                                type="text"
                                className="input-text"
                                required
                            />
                        </div>

                        <div className="container">
                            <label className="label" htmlFor="first_name">First Name</label>
                            <input
                                value={first_name}
                                onChange={this.onChangeFirstName}
                                placeholder="Enter first name"
                                id="first_name"
                                type="text"
                                className="input-text"
                                required
                            />
                        </div>

                        <div className="container">
                            <label className="label" htmlFor="last_name">Last Name</label>
                            <input
                                value={last_name}
                                onChange={this.onChangeLastName}
                                placeholder="Enter last name"
                                id="last_name"
                                type="text"
                                className="input-text"
                                required
                            />
                        </div>

                        <div className="container">
                            <label className="label" htmlFor="gender">Gender</label>
                            <select
                                value={gender}
                                onChange={this.onChangeGender}
                                id="gender"
                                className="input-text"
                                required
                            >
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div className="container">
                            <label className="label" htmlFor="date_of_birth">Date of Birth</label>
                            <input
                                value={date_of_birth}
                                onChange={this.onChangeDateOfBirth}
                                id="date_of_birth"
                                type="date"
                                className="input-text"
                                required
                            />
                        </div>

                        <div className="container">
                            <label className="label" htmlFor="car_number">Car Number</label>
                            <input
                                value={car_number}
                                onChange={this.onChangeCarNumber}
                                placeholder="Enter car number"
                                id="car_number"
                                type="text"
                                className="input-text"
                                required
                            />
                        </div>

                        <div className="container">
                            <label className="label" htmlFor="aadhar_number">Aadhar Number</label>
                            <input
                                value={aadhar_number}
                                onChange={this.onChangeAadharNumber}
                                placeholder="Enter 12-digit Aadhar number"
                                id="aadhar_number"
                                type="text"
                                pattern="[0-9]{12}"
                                maxLength="12"
                                className="input-text"
                                required
                            />
                        </div>

                        <div className="container">
                            <label className="label" htmlFor="phone_number">Phone Number</label>
                            <input
                                value={phone_number}
                                onChange={this.onChangePhoneNumber}
                                placeholder="Enter 10-digit phone number"
                                id="phone_number"
                                type="tel"
                                pattern="[0-9]{10}"
                                maxLength="10"
                                className="input-text"
                                required
                            />
                        </div>

                        <div className="container">
                            <label className="label" htmlFor="email">Email</label>
                            <input
                                value={email}
                                onChange={this.onChangeEmail}
                                placeholder="Enter email address"
                                id="email"
                                type="email"
                                className="input-text"
                                required
                            />
                        </div>

                        <div className="container">
                            <label className="label" htmlFor="password">Password</label>
                            <input
                                value={password}
                                onChange={this.onChangePassword}
                                placeholder="Enter password"
                                id="password"
                                type="password"
                                className="input-text"
                                required
                            />
                        </div>

                        <div className="container">
                            <label className="label" htmlFor="confirmPassword">Confirm Password</label>
                            <input
                                value={confirmPassword}
                                onChange={this.onChangeConfirmPassword}
                                placeholder="Confirm password"
                                id="confirmPassword"
                                type="password"
                                className="input-text"
                                required
                            />
                        </div>

                        {showError && <p className="error-message">{errorMsg}</p>}

                        <div className="button-container">
                            <Link to="/login" className="link">
                                <p className="sign-up-heading">Already have an account? Sign In</p>
                            </Link>
                            <button className="button-otp" type="submit">Sign Up</button>
                        </div>
                    </form>
                </div>
            </div>
        )
    }
}

function SignUpWithNavigate(props) {
    const navigate = useNavigate();
    return <SignUp {...props} navigate={navigate} />;
}

export default SignUpWithNavigate;
