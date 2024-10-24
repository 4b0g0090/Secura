import logo from './logo.svg';
import './App.css';
import { BrowserRouter as Router, Routes, Route , Navigate } from 'react-router-dom';
import Login_page from './components/Login_page';
import Home_page from './components/Home_page'
import { useState } from 'react';
function App() {


  const [Username , setUsername] = useState('')



  return (
  <Router>
    <Routes>
    <Route path="/" element={<Navigate to="/login_page" />} /> 
      <Route path = '/login_page' element={<Login_page setUsername={setUsername} Username={Username}></Login_page>}></Route>
      <Route path='/home_page' element={<Home_page Username={Username}></Home_page>}></Route>
    </Routes >
  </Router>

  );
}

export default App;
