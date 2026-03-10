const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { nanoid } = require('nanoid');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = 5000;

// Конфигурация JWT
const JWT_ACCESS_SECRET = 'access_secret_key_change_in_production';
const JWT_REFRESH_SECRET = 'refresh_secret_key_change_in_production';
const ACCESS_EXPIRES_IN = '15m'; // 15 минут
const REFRESH_EXPIRES_IN = '7d';  // 7 дней

// Middleware
app.use(express.json());

// Базы данных (в памяти для примера)
let users = [];
let products = [];

// Хранилище активных refresh-токенов (в реальном проекте использовать БД)
let refreshTokens = new Set();

// ============= ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =============

// Хеширование пароля
async function hashPassword(password) {
    const rounds = 10;
    return bcrypt.hash(password, rounds);
}

// Проверка пароля
async function verifyPassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
}

// Поиск пользователя по email
function findUserByEmail(email) {
    return users.find(user => user.email === email);
}

// Поиск пользователя по ID
function findUserById(id) {
    return users.find(user => user.id === id);
}

// Генерация access-токена
function generateAccessToken(user) {
    return jwt.sign(
        { 
            sub: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name
        },
        JWT_ACCESS_SECRET,
        { expiresIn: ACCESS_EXPIRES_IN }
    );
}

// Генерация refresh-токена
function generateRefreshToken(user) {
    return jwt.sign(
        { 
            sub: user.id,
            email: user.email
        },
        JWT_REFRESH_SECRET,
        { expiresIn: REFRESH_EXPIRES_IN }
    );
}

// ============= MIDDLEWARE =============

// Middleware для проверки access-токена
function authMiddleware(req, res, next) {
    const header = req.headers.authorization || '';

    // Ожидаем формат: Bearer <token>
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ 
            error: 'Missing or invalid Authorization header. Format: Bearer <token>' 
        });
    }

    try {
        // Проверяем токен
        const payload = jwt.verify(token, JWT_ACCESS_SECRET);
        
        // Сохраняем данные пользователя из токена в запрос
        req.user = payload;
        
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Access token expired' });
        }
        return res.status(401).json({ error: 'Invalid access token' });
    }
}

// ============= SWAGGER КОНФИГУРАЦИЯ =============

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API с refresh-токенами',
            version: '3.0.0',
            description: 'API с access и refresh токенами',
        },
        servers: [
            {
                url: `http://localhost:${port}`,
                description: 'Локальный сервер',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                }
            }
        },
    },
    apis: ['./server.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - first_name
 *         - last_name
 *         - password
 *       properties:
 *         id:
 *           type: string
 *         email:
 *           type: string
 *         first_name:
 *           type: string
 *         last_name:
 *           type: string
 *     Product:
 *       type: object
 *       required:
 *         - title
 *         - category
 *         - description
 *         - price
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         category:
 *           type: string
 *         description:
 *           type: string
 *         price:
 *           type: number
 *     TokenResponse:
 *       type: object
 *       properties:
 *         accessToken:
 *           type: string
 *           description: JWT токен доступа (живет 15 минут)
 *         refreshToken:
 *           type: string
 *           description: JWT токен обновления (живет 7 дней)
 */

// ============= МАРШРУТЫ АУТЕНТИФИКАЦИИ =============

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Регистрация нового пользователя
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - first_name
 *               - last_name
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: ivan@mail.com
 *               first_name:
 *                 type: string
 *                 example: Иван
 *               last_name:
 *                 type: string
 *                 example: Иванов
 *               password:
 *                 type: string
 *                 example: qwerty123
 *     responses:
 *       201:
 *         description: Пользователь успешно создан
 *       400:
 *         description: Не все обязательные поля заполнены или email уже существует
 */
app.post('/api/auth/register', async (req, res) => {
    const { email, first_name, last_name, password } = req.body;

    if (!email || !first_name || !last_name || !password) {
        return res.status(400).json({ 
            error: 'Все поля (email, first_name, last_name, password) обязательны' 
        });
    }

    if (findUserByEmail(email)) {
        return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    const hashedPassword = await hashPassword(password);
    const newUser = {
        id: nanoid(),
        email,
        first_name,
        last_name,
        password: hashedPassword
    };

    users.push(newUser);
    
    // Не возвращаем пароль в ответе
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Вход в систему
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: ivan@mail.com
 *               password:
 *                 type: string
 *                 example: qwerty123
 *     responses:
 *       200:
 *         description: Успешный вход, возвращает пару токенов
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenResponse'
 *       400:
 *         description: Не все поля заполнены
 *       401:
 *         description: Неверные учетные данные
 */
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const user = findUserByEmail(email);
    if (!user) {
        return res.status(401).json({ error: 'Неверные учетные данные' });
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
        return res.status(401).json({ error: 'Неверные учетные данные' });
    }

    // Генерируем пару токенов
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // Сохраняем refresh-токен в хранилище
    refreshTokens.add(refreshToken);

    res.status(200).json({ 
        accessToken,
        refreshToken
    });
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Обновление пары токенов
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Действительный refresh-токен
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Новая пара токенов
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenResponse'
 *       400:
 *         description: Refresh token не предоставлен
 *       401:
 *         description: Недействительный или истекший refresh token
 */
app.post('/api/auth/refresh', (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ error: 'refreshToken is required' });
    }

    // Проверяем, есть ли токен в хранилище
    if (!refreshTokens.has(refreshToken)) {
        return res.status(401).json({ error: 'Invalid refresh token' });
    }

    try {
        // Проверяем валидность refresh-токена
        const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
        
        const user = findUserById(payload.sub);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Ротация refresh-токена:
        // 1. Удаляем старый refresh-токен
        refreshTokens.delete(refreshToken);
        
        // 2. Генерируем новую пару токенов
        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);
        
        // 3. Сохраняем новый refresh-токен
        refreshTokens.add(newRefreshToken);

        res.json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        });

    } catch (err) {
        // Если токен недействителен или истек, удаляем его из хранилища
        refreshTokens.delete(refreshToken);
        
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Refresh token expired' });
        }
        return res.status(401).json({ error: 'Invalid refresh token' });
    }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Получить информацию о текущем пользователе
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Информация о пользователе
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Не авторизован
 *       404:
 *         description: Пользователь не найден
 */
app.get('/api/auth/me', authMiddleware, (req, res) => {
    const userId = req.user.sub;
    const user = findUserById(userId);
    
    if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.status(200).json(userWithoutPassword);
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Выход из системы (инвалидация refresh-токена)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh-токен для удаления
 *     responses:
 *       200:
 *         description: Успешный выход
 *       400:
 *         description: Refresh token не предоставлен
 */
app.post('/api/auth/logout', (req, res) => {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
        refreshTokens.delete(refreshToken);
    }
    
    res.status(200).json({ message: 'Successfully logged out' });
});

// ============= МАРШРУТЫ ДЛЯ ТОВАРОВ =============

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создать новый товар
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       201:
 *         description: Товар успешно создан
 *       400:
 *         description: Не все обязательные поля заполнены
 *       401:
 *         description: Не авторизован
 */
app.post('/api/products', authMiddleware, (req, res) => {
    const { title, category, description, price } = req.body;

    if (!title || !category || !description || price === undefined) {
        return res.status(400).json({ 
            error: 'Все поля (title, category, description, price) обязательны' 
        });
    }

    if (typeof price !== 'number' || price <= 0) {
        return res.status(400).json({ error: 'Цена должна быть положительным числом' });
    }

    const newProduct = {
        id: nanoid(),
        title,
        category,
        description,
        price,
        createdBy: req.user.sub,
        createdAt: new Date().toISOString()
    };

    products.push(newProduct);
    res.status(201).json(newProduct);
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Получить список всех товаров
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Список товаров
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */
app.get('/api/products', (req, res) => {
    res.status(200).json(products);
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Получить товар по ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID товара
 *     responses:
 *       200:
 *         description: Товар найден
 *       404:
 *         description: Товар не найден
 */
app.get('/api/products/:id', (req, res) => {
    const product = products.find(p => p.id === req.params.id);
    
    if (!product) {
        return res.status(404).json({ error: 'Товар не найден' });
    }
    
    res.status(200).json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Обновить товар по ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID товара
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       200:
 *         description: Товар обновлен
 *       400:
 *         description: Не все поля заполнены или некорректные данные
 *       401:
 *         description: Не авторизован
 *       404:
 *         description: Товар не найден
 */
app.put('/api/products/:id', authMiddleware, (req, res) => {
    const { title, category, description, price } = req.body;
    const productIndex = products.findIndex(p => p.id === req.params.id);

    if (productIndex === -1) {
        return res.status(404).json({ error: 'Товар не найден' });
    }

    if (!title || !category || !description || price === undefined) {
        return res.status(400).json({ 
            error: 'Все поля (title, category, description, price) обязательны' 
        });
    }

    if (typeof price !== 'number' || price <= 0) {
        return res.status(400).json({ error: 'Цена должна быть положительным числом' });
    }

    const updatedProduct = {
        ...products[productIndex],
        title,
        category,
        description,
        price,
        updatedBy: req.user.sub,
        updatedAt: new Date().toISOString()
    };

    products[productIndex] = updatedProduct;
    res.status(200).json(updatedProduct);
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удалить товар по ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID товара
 *     responses:
 *       200:
 *         description: Товар удален
 *       401:
 *         description: Не авторизован
 *       404:
 *         description: Товар не найден
 */
app.delete('/api/products/:id', authMiddleware, (req, res) => {
    const productIndex = products.findIndex(p => p.id === req.params.id);
    
    if (productIndex === -1) {
        return res.status(404).json({ error: 'Товар не найден' });
    }
    
    products.splice(productIndex, 1);
    res.status(200).json({ message: 'Товар успешно удален' });
});

// ============= ЗАПУСК СЕРВЕРА =============

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
    console.log(`Swagger UI доступен по адресу http://localhost:${port}/api-docs`);
    console.log(`Access token expires in: ${ACCESS_EXPIRES_IN}`);
    console.log(`Refresh token expires in: ${REFRESH_EXPIRES_IN}`);
});