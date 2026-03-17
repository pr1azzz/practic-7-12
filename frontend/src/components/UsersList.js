import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { userApi } from '../services/api';

const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await userApi.getAll();
      setUsers(response.data);
    } catch (err) {
      setError('Ошибка при загрузке пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async (id, isBlocked) => {
    if (window.confirm(`Вы уверены, что хотите ${isBlocked ? 'разблокировать' : 'заблокировать'} этого пользователя?`)) {
      try {
        await userApi.update(id, { isBlocked: !isBlocked });
        fetchUsers(); // Перезагружаем список
      } catch (err) {
        setError('Ошибка при обновлении пользователя');
      }
    }
  };

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div>
      <h2>Управление пользователями</h2>
      <table className="users-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Email</th>
            <th>Имя</th>
            <th>Фамилия</th>
            <th>Роль</th>
            <th>Статус</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id} className={user.isBlocked ? 'blocked-user' : ''}>
              <td>{user.id.substring(0, 8)}...</td>
              <td>{user.email}</td>
              <td>{user.first_name}</td>
              <td>{user.last_name}</td>
              <td>
                <span className={`role-badge role-${user.role}`}>
                  {user.role}
                </span>
              </td>
              <td>
                {user.isBlocked ? (
                  <span className="status-blocked">Заблокирован</span>
                ) : (
                  <span className="status-active">Активен</span>
                )}
              </td>
              <td>
                <Link to={`/users/${user.id}`} className="btn-small">Просмотр</Link>
                <Link to={`/users/${user.id}/edit`} className="btn-small btn-success">
                  Редактировать
                </Link>
                <button 
                  onClick={() => handleBlockUser(user.id, user.isBlocked)}
                  className={`btn-small ${user.isBlocked ? 'btn-success' : 'btn-danger'}`}
                >
                  {user.isBlocked ? 'Разблокировать' : 'Заблокировать'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UsersList;