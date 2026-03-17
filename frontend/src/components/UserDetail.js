import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { userApi } from '../services/api';

const UserDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUser();
  }, [id]);

  const fetchUser = async () => {
    try {
      const response = await userApi.getById(id);
      setUser(response.data);
    } catch (err) {
      setError('Ошибка при загрузке пользователя');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockToggle = async () => {
    if (window.confirm(`Вы уверены, что хотите ${user.isBlocked ? 'разблокировать' : 'заблокировать'} этого пользователя?`)) {
      try {
        await userApi.update(id, { isBlocked: !user.isBlocked });
        fetchUser(); // Перезагружаем данные
      } catch (err) {
        setError('Ошибка при обновлении пользователя');
      }
    }
  };

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!user) return <div>Пользователь не найден</div>;

  return (
    <div>
      <h2>Информация о пользователе</h2>
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px' }}>
        <p><strong>ID:</strong> {user.id}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Имя:</strong> {user.first_name}</p>
        <p><strong>Фамилия:</strong> {user.last_name}</p>
        <p><strong>Роль:</strong> 
          <span className={`role-badge role-${user.role}`}>
            {user.role}
          </span>
        </p>
        <p><strong>Статус:</strong> 
          {user.isBlocked ? (
            <span className="status-blocked">Заблокирован</span>
          ) : (
            <span className="status-active">Активен</span>
          )}
        </p>
        <p><strong>Дата регистрации:</strong> {new Date(user.createdAt).toLocaleString()}</p>
        
        <div style={{ marginTop: '20px' }}>
          <Link to="/users" className="btn">Назад к списку</Link>
          <Link to={`/users/${id}/edit`} className="btn btn-success">
            Редактировать
          </Link>
          <button 
            onClick={handleBlockToggle}
            className={`btn ${user.isBlocked ? 'btn-success' : 'btn-danger'}`}
          >
            {user.isBlocked ? 'Разблокировать' : 'Заблокировать'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserDetail;