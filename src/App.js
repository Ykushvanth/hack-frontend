import { BrowserRouter, Route, Routes } from 'react-router-dom';
import SignUp from './components/Signup';
import Login from './components/Login';
import Home from './components/Home';
import PaymentStatus from './components/PaymentStatus';
import './App.css';

function App() {
  return (
    <div className="app-container">
      <BrowserRouter>
        <Routes>
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Home />} />
          <Route path="/payment-status" element={<PaymentStatus />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
