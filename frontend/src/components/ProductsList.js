import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productApi } from '../services/api';

const ProductsList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await productApi.getAll();
      setProducts(response.data);
    } catch (err) {
      setError('Ошибка при загрузке товаров');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Вы уверены, что хотите удалить этот товар?')) {
      try {
        await productApi.delete(id);
        setProducts(products.filter(p => p.id !== id));
      } catch (err) {
        setError('Ошибка при удалении товара');
      }
    }
  };

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div>
      <h2>Товары</h2>
      {products.length === 0 ? (
        <p>Товаров пока нет</p>
      ) : (
        <div className="products-grid">
          {products.map(product => (
            <div key={product.id} className="product-card">
              <h3>{product.title}</h3>
              <p><strong>Категория:</strong> {product.category}</p>
              <p><strong>Цена:</strong> {product.price} ₽</p>
              <p><strong>Описание:</strong> {product.description.substring(0, 100)}...</p>
              <div className="product-actions">
                <Link to={`/products/${product.id}`} className="btn">Просмотр</Link>
                <Link to={`/products/${product.id}/edit`} className="btn btn-success">Редактировать</Link>
                <button onClick={() => handleDelete(product.id)} className="btn btn-danger">Удалить</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductsList;