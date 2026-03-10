import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import ProductsList from './components/ProductsList';
import ProductDetail from './components/ProductDetail';
import ProductForm from './components/ProductForm';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <div className="container">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/products" element={
              <PrivateRoute>
                <ProductsList />
              </PrivateRoute>
            } />
            <Route path="/products/new" element={
              <PrivateRoute>
                <ProductForm />
              </PrivateRoute>
            } />
            <Route path="/products/:id" element={
              <PrivateRoute>
                <ProductDetail />
              </PrivateRoute>
            } />
            <Route path="/products/:id/edit" element={
              <PrivateRoute>
                <ProductForm />
              </PrivateRoute>
            } />
            <Route path="/" element={<Navigate to="/products" />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;