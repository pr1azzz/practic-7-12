export const AuthService = {
  // Сохранение токенов после входа
  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  },

  // Получение токенов
  getAccessToken: () => localStorage.getItem('accessToken'),
  getRefreshToken: () => localStorage.getItem('refreshToken'),

  // Удаление токенов при выходе
  clearTokens: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  // Проверка, авторизован ли пользователь
  isAuthenticated: () => {
    return !!localStorage.getItem('accessToken');
  },

  // Получение текущего пользователя из localStorage (если сохраняли)
  getUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Сохранение данных пользователя
  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
  },

  // Выход
  logout: async () => {
    const refreshToken = AuthService.getRefreshToken();
    if (refreshToken) {
      try {
        await fetch('http://localhost:5001/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    AuthService.clearTokens();
    localStorage.removeItem('user');
  }
};