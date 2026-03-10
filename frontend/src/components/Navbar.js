import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthService } from '../services/auth';

const Navbar = () => {
  const navigate = useNavigate();
  const isAuthenticated = AuthService.isAuthenticated();
  const user = AuthService.getUser();

  const handleLogout = async () => {
    await AuthService.logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div>
        <Link to="/products">Главная</Link>
        {isAuthenticated && (
          <>
            <Link to="/products/new">Добавить товар</Link>
          </>
        )}
      </div>
      <div>
        {isAuthenticated ? (
          <>
            <span style={{ marginRight: '1rem' }}>
              {user?.first_name} {user?.last_name}
            </span>
            <button onClick={handleLogout}>Выйти</button>
          </>
        ) : (
          <>
            <Link to="/login">Вход</Link>
            <Link to="/register">Регистрация</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;