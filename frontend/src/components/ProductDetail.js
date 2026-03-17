import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { productApi } from '../services/api';
import { AuthService } from '../services/auth';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const user = AuthService.getUser();

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await productApi.getById(id);
      setProduct(response.data);
    } catch (err) {
      setError('Ошибка при загрузке товара');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Вы уверены, что хотите удалить этот товар?')) {
      try {
        await productApi.delete(id);
        navigate('/products');
      } catch (err) {
        setError('Ошибка при удалении товара');
      }
    }
  };

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!product) return <div>Товар не найден</div>;

  return (
    <div>
      <h2>{product.title}</h2>
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px' }}>
        <p><strong>ID:</strong> {product.id}</p>
        <p><strong>Категория:</strong> {product.category}</p>
        <p><strong>Цена:</strong> {product.price} ₽</p>
        <p><strong>Описание:</strong> {product.description}</p>
        <p><strong>Дата создания:</strong> {new Date(product.createdAt).toLocaleString()}</p>
        <div style={{ marginTop: '20px' }}>
          <Link to="/products" className="btn">Назад к списку</Link>
          
          {/* Продавцы и админы могут редактировать */}
          {(user?.role === 'seller' || user?.role === 'admin') && (
            <Link to={`/products/${id}/edit`} className="btn btn-success">
              Редактировать
            </Link>
          )}
          
          {/* Только админы могут удалять */}
          {user?.role === 'admin' && (
            <button onClick={handleDelete} className="btn btn-danger">
              Удалить
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;