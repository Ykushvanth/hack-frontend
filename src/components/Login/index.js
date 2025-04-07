import { Component } from "react"
import Cookies from "js-cookie"
import { Navigate, Link, useNavigate } from "react-router-dom"
import "./index.css"

class Login extends Component {
  state = {
    username: "",
    password: "",
    errorMsg: "",
    showError: false
  }

  onSubmitSuccess = (data) => {
    Cookies.set('jwt_token', data.jwt_token, {
      expires: 30,
    })
    
    localStorage.setItem('userDetails', JSON.stringify(data.user))
    localStorage.setItem('userData', JSON.stringify(data.user.id))
    this.props.navigate("/")
  }

  
  submitForm = async event => {
    event.preventDefault()
    const { username, password } = this.state
    
    const userDetails = { username, password }
    const url = 'https://exsel-backend-5.onrender.com/api/login'
                
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userDetails),
      })
     
      const data = await response.json()
      
      if (response.ok) {
        this.onSubmitSuccess(data)
      } else {
        this.setState({
          showError: true,
          errorMsg: data.error || 'Invalid credentials'
        })
      }
    } catch (error) {
      console.error('Login error:', error)
      this.setState({
        showError: true,
        errorMsg: 'Connection error. Please try again.'
      })
    }
  }

  onChangeUsername = event => {
    this.setState({ username: event.target.value })
  }

  onChangePassword = event => {
    this.setState({ password: event.target.value })
  }

  render() {
    const { username, password, showError, errorMsg } = this.state
    const jwtToken = Cookies.get('jwt_token')
    
    if (jwtToken !== undefined) {
      return <Navigate to="/" replace />
    }
    
    return (
      <div className="main-bg-container-for-login">
        <img 
          alt="website login" 
          className="login-image" 
          src="https://res.cloudinary.com/dcgmeefn2/image/upload/v1740811794/car_moving_iqyr65.jpg" 
        />
        <div className="login-container">
          <img 
            alt="website logo" 
            className="image" 
            src="https://res.cloudinary.com/dcgmeefn2/image/upload/v1740811794/car_moving_iqyr65.jpg" 
          />
          <h1 className="sign-in-heading">Sign In</h1>
          <form className="form-container" onSubmit={this.submitForm}>
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

            {showError && <p className="error-message">{errorMsg}</p>}
            
            <button className="button" type="submit">Sign In</button>
            <Link to="/signup" className="link">
              <p className="sign-up-heading">Don't have an account? Sign Up</p>
            </Link>
          </form>
        </div>
      </div>
    )
  }
}

function LoginWithNavigate(props) {
  const navigate = useNavigate();
  return <Login {...props} navigate={navigate} />;
}

export default LoginWithNavigate;
