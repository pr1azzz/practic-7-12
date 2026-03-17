import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Импорт компонентов аутентификации
import Login from './components/Login';
import Register from './components/Register';

// Импорт компонентов для товаров
import ProductsList from './components/ProductsList';
import ProductDetail from './components/ProductDetail';
import ProductForm from './components/ProductForm';

// Импорт компонентов для пользователей
import UsersList from './components/UsersList';
import UserDetail from './components/UserDetail';
import UserForm from './components/UserForm';

// Импорт общих компонентов
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import RoleRoute from './components/RoleRoute';

// Импорт стилей
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <div className="container">
          <Routes>
            {/* Публичные маршруты (доступны всем, включая гостей) */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Защищенные маршруты для всех авторизованных пользователей */}
            <Route 
              path="/products" 
              element={
                <PrivateRoute>
                  <ProductsList />
                </PrivateRoute>
              } 
            />
            
            <Route 
              path="/products/:id" 
              element={
                <PrivateRoute>
                  <ProductDetail />
                </PrivateRoute>
              } 
            />
            
            {/* Маршруты для продавцов и администраторов (создание и редактирование товаров) */}
            <Route 
              path="/products/new" 
              element={
                <RoleRoute allowedRoles={['seller', 'admin']}>
                  <ProductForm />
                </RoleRoute>
              } 
            />
            
            <Route 
              path="/products/:id/edit" 
              element={
                <RoleRoute allowedRoles={['seller', 'admin']}>
                  <ProductForm />
                </RoleRoute>
              } 
            />
            
            {/* Маршруты только для администраторов (управление пользователями) */}
            <Route 
              path="/users" 
              element={
                <RoleRoute allowedRoles={['admin']}>
                  <UsersList />
                </RoleRoute>
              } 
            />
            
            <Route 
              path="/users/:id" 
              element={
                <RoleRoute allowedRoles={['admin']}>
                  <UserDetail />
                </RoleRoute>
              } 
            />
            
            <Route 
              path="/users/:id/edit" 
              element={
                <RoleRoute allowedRoles={['admin']}>
                  <UserForm />
                </RoleRoute>
              } 
            />
            
            {/* Редирект на главную страницу товаров */}
            <Route path="/" element={<Navigate to="/products" />} />
            
            {/* Обработка несуществующих маршрутов */}
            <Route path="*" element={<Navigate to="/products" />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;