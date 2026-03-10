import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productApi } from '../services/api';

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    price: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditing) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await productApi.getById(id);
      const product = response.data;
      setFormData({
        title: product.title,
        category: product.category,
        description: product.description,
        price: product.price
      });
    } catch (err) {
      setError('Ошибка при загрузке товара');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const productData = {
      ...formData,
      price: parseFloat(formData.price)
    };

    try {
      if (isEditing) {
        await productApi.update(id, productData);
      } else {
        await productApi.create(productData);
      }
      navigate('/products');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при сохранении товара');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>{isEditing ? 'Редактировать товар' : 'Создать товар'}</h2>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Название:</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Категория:</label>
          <input
            type="text"
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Описание:</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows="4"
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        <div className="form-group">
          <label>Цена (₽):</label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            required
            min="0.01"
            step="0.01"
          />
        </div>
        <button type="submit" className="btn" disabled={loading}>
          {loading ? 'Сохранение...' : (isEditing ? 'Обновить' : 'Создать')}
        </button>
        <button type="button" className="btn btn-danger" onClick={() => navigate('/products')}>
          Отмена
        </button>
      </form>
    </div>
  );
};

export default ProductForm;