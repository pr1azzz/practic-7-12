const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { nanoid } = require('nanoid');
const cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = 5000;

// Конфигурация JWT
const JWT_ACCESS_SECRET = 'access_secret_key_change_in_production';
const JWT_REFRESH_SECRET = 'refresh_secret_key_change_in_production';
const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';

// Middleware
app.use(express.json());
app.use(cors({
    origin: ['http://localhost:5000', 'http://localhost:5001', 'http://localhost:3000', 'http://localhost:3001'],
    credentials: true
}));

// Базы данных (в памяти для примера)
let users = [];
let products = [];
let refreshTokens = new Set();

// Предопределенные роли
const ROLES = {
    GUEST: 'guest',
    USER: 'user',
    SELLER: 'seller',
    ADMIN: 'admin'
};

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
            last_name: user.last_name,
            role: user.role
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
            email: user.email,
            role: user.role
        },
        JWT_REFRESH_SECRET,
        { expiresIn: REFRESH_EXPIRES_IN }
    );
}

// ============= MIDDLEWARE =============

// Middleware для проверки access-токена
function authMiddleware(req, res, next) {
    const header = req.headers.authorization || '';

    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ 
            error: 'Missing or invalid Authorization header. Format: Bearer <token>' 
        });
    }

    try {
        const payload = jwt.verify(token, JWT_ACCESS_SECRET);
        req.user = payload;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Access token expired' });
        }
        return res.status(401).json({ error: 'Invalid access token' });
    }
}

// Middleware для проверки ролей
function roleMiddleware(allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const userRole = req.user.role;
        
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ 
                error: 'Access denied. Insufficient permissions.',
                requiredRoles: allowedRoles,
                yourRole: userRole
            });
        }

        next();
    };
}

// ============= SWAGGER КОНФИГУРАЦИЯ =============

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API с управлением доступом на основе ролей (RBAC)',
            version: '4.0.0',
            description: 'Полное API с ролями: Гость, Пользователь, Продавец, Администратор',
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
            },
            schemas: {
                User: {
                    type: 'object',
                    required: ['email', 'first_name', 'last_name', 'password', 'role'],
                    properties: {
                        id: {
                            type: 'string',
                            description: 'Автоматически генерируемый ID'
                        },
                        email: {
                            type: 'string',
                            description: 'Email пользователя (логин)'
                        },
                        first_name: {
                            type: 'string',
                            description: 'Имя'
                        },
                        last_name: {
                            type: 'string',
                            description: 'Фамилия'
                        },
                        role: {
                            type: 'string',
                            enum: ['user', 'seller', 'admin'],
                            description: 'Роль пользователя'
                        },
                        isBlocked: {
                            type: 'boolean',
                            description: 'Заблокирован ли пользователь'
                        }
                    }
                },
                Product: {
                    type: 'object',
                    required: ['title', 'category', 'description', 'price'],
                    properties: {
                        id: {
                            type: 'string',
                            description: 'Автоматически генерируемый ID'
                        },
                        title: {
                            type: 'string',
                            description: 'Название товара'
                        },
                        category: {
                            type: 'string',
                            description: 'Категория товара'
                        },
                        description: {
                            type: 'string',
                            description: 'Описание товара'
                        },
                        price: {
                            type: 'number',
                            description: 'Цена товара'
                        },
                        createdBy: {
                            type: 'string',
                            description: 'ID пользователя, создавшего товар'
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Дата создания'
                        }
                    }
                },
                TokenResponse: {
                    type: 'object',
                    properties: {
                        accessToken: {
                            type: 'string',
                            description: 'JWT токен доступа (живет 15 минут)'
                        },
                        refreshToken: {
                            type: 'string',
                            description: 'JWT токен обновления (живет 7 дней)'
                        }
                    }
                }
            }
        },
    },
    apis: ['./server.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ============= МАРШРУТЫ АУТЕНТИФИКАЦИИ (ДОСТУПНЫ ГОСТЯМ) =============

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Регистрация нового пользователя (доступно гостям)
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
 *         description: Пользователь успешно создан (с ролью user)
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
        password: hashedPassword,
        role: ROLES.USER, // По умолчанию новый пользователь получает роль USER
        isBlocked: false,
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Вход в систему (доступно гостям)
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
 *       401:
 *         description: Неверные учетные данные или пользователь заблокирован
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

    if (user.isBlocked) {
        return res.status(403).json({ error: 'Ваш аккаунт заблокирован. Обратитесь к администратору.' });
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
        return res.status(401).json({ error: 'Неверные учетные данные' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    refreshTokens.add(refreshToken);

    res.status(200).json({ 
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role
        }
    });
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Обновление пары токенов (доступно гостям)
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
 *     responses:
 *       200:
 *         description: Новая пара токенов
 *       401:
 *         description: Недействительный или истекший refresh token
 */
app.post('/api/auth/refresh', (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ error: 'refreshToken is required' });
    }

    if (!refreshTokens.has(refreshToken)) {
        return res.status(401).json({ error: 'Invalid refresh token' });
    }

    try {
        const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
        
        const user = findUserById(payload.sub);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        if (user.isBlocked) {
            refreshTokens.delete(refreshToken);
            return res.status(403).json({ error: 'User is blocked' });
        }

        refreshTokens.delete(refreshToken);
        
        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);
        
        refreshTokens.add(newRefreshToken);

        res.json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        });

    } catch (err) {
        refreshTokens.delete(refreshToken);
        
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Refresh token expired' });
        }
        return res.status(401).json({ error: 'Invalid refresh token' });
    }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Выход из системы (доступно аутентифицированным пользователям)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
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
 *     responses:
 *       200:
 *         description: Успешный выход
 */
app.post('/api/auth/logout', authMiddleware, (req, res) => {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
        refreshTokens.delete(refreshToken);
    }
    
    res.status(200).json({ message: 'Successfully logged out' });
});

// ============= МАРШРУТЫ ДЛЯ ПОЛЬЗОВАТЕЛЕЙ (доступны всем аутентифицированным) =============

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Получить информацию о текущем пользователе (доступно пользователям)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Информация о пользователе
 *       401:
 *         description: Не авторизован
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

// ============= МАРШРУТЫ ДЛЯ ТОВАРОВ =============

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Получить список всех товаров (доступно пользователям)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список товаров
 */
app.get('/api/products', authMiddleware, (req, res) => {
    res.status(200).json(products);
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Получить товар по ID (доступно пользователям)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Товар найден
 *       404:
 *         description: Товар не найден
 */
app.get('/api/products/:id', authMiddleware, (req, res) => {
    const product = products.find(p => p.id === req.params.id);
    
    if (!product) {
        return res.status(404).json({ error: 'Товар не найден' });
    }
    
    res.status(200).json(product);
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создать новый товар (доступно продавцам и администраторам)
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
 *       403:
 *         description: Недостаточно прав
 */
app.post('/api/products', 
    authMiddleware, 
    roleMiddleware([ROLES.SELLER, ROLES.ADMIN]), 
    (req, res) => {
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
    }
);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Обновить товар (доступно продавцам и администраторам)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       200:
 *         description: Товар обновлен
 *       403:
 *         description: Недостаточно прав
 *       404:
 *         description: Товар не найден
 */
app.put('/api/products/:id', 
    authMiddleware, 
    roleMiddleware([ROLES.SELLER, ROLES.ADMIN]), 
    (req, res) => {
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
    }
);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удалить товар (доступно только администраторам)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Товар удален
 *       403:
 *         description: Недостаточно прав
 *       404:
 *         description: Товар не найден
 */
app.delete('/api/products/:id', 
    authMiddleware, 
    roleMiddleware([ROLES.ADMIN]), 
    (req, res) => {
        const productIndex = products.findIndex(p => p.id === req.params.id);
        
        if (productIndex === -1) {
            return res.status(404).json({ error: 'Товар не найден' });
        }
        
        products.splice(productIndex, 1);
        res.status(200).json({ message: 'Товар успешно удален' });
    }
);

// ============= МАРШРУТЫ ДЛЯ УПРАВЛЕНИЯ ПОЛЬЗОВАТЕЛЯМИ (только для администраторов) =============

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Получить список всех пользователей (только для администраторов)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список пользователей
 *       403:
 *         description: Недостаточно прав
 */
app.get('/api/users', 
    authMiddleware, 
    roleMiddleware([ROLES.ADMIN]), 
    (req, res) => {
        const usersWithoutPasswords = users.map(({ password, ...user }) => user);
        res.status(200).json(usersWithoutPasswords);
    }
);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Получить пользователя по ID (только для администраторов)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Информация о пользователе
 *       403:
 *         description: Недостаточно прав
 *       404:
 *         description: Пользователь не найден
 */
app.get('/api/users/:id', 
    authMiddleware, 
    roleMiddleware([ROLES.ADMIN]), 
    (req, res) => {
        const user = users.find(u => u.id === req.params.id);
        
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
    }
);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Обновить информацию пользователя (только для администраторов)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [user, seller, admin]
 *               isBlocked:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Пользователь обновлен
 *       403:
 *         description: Недостаточно прав
 *       404:
 *         description: Пользователь не найден
 */
app.put('/api/users/:id', 
    authMiddleware, 
    roleMiddleware([ROLES.ADMIN]), 
    (req, res) => {
        const { first_name, last_name, role, isBlocked } = req.body;
        const userIndex = users.findIndex(u => u.id === req.params.id);

        if (userIndex === -1) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        // Нельзя заблокировать самого себя
        if (req.params.id === req.user.sub && isBlocked === true) {
            return res.status(400).json({ error: 'Вы не можете заблокировать самого себя' });
        }

        const updatedUser = {
            ...users[userIndex],
            first_name: first_name || users[userIndex].first_name,
            last_name: last_name || users[userIndex].last_name,
            role: role || users[userIndex].role,
            isBlocked: isBlocked !== undefined ? isBlocked : users[userIndex].isBlocked,
            updatedAt: new Date().toISOString()
        };

        users[userIndex] = updatedUser;

        // Если пользователя заблокировали, удаляем его refresh токены
        if (isBlocked === true) {
            // В реальном приложении нужно удалить все refresh токены этого пользователя
            // Для простоты оставим как есть
        }

        const { password, ...userWithoutPassword } = updatedUser;
        res.status(200).json(userWithoutPassword);
    }
);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Заблокировать пользователя (только для администраторов)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Пользователь заблокирован
 *       403:
 *         description: Недостаточно прав
 *       404:
 *         description: Пользователь не найден
 */
app.delete('/api/users/:id', 
    authMiddleware, 
    roleMiddleware([ROLES.ADMIN]), 
    (req, res) => {
        const userIndex = users.findIndex(u => u.id === req.params.id);
        
        if (userIndex === -1) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        // Нельзя удалить самого себя
        if (req.params.id === req.user.sub) {
            return res.status(400).json({ error: 'Вы не можете удалить самого себя' });
        }

        // Вместо полного удаления, помечаем как заблокированного
        users[userIndex].isBlocked = true;
        users[userIndex].blockedAt = new Date().toISOString();
        
        res.status(200).json({ message: 'Пользователь успешно заблокирован' });
    }
);

// ============= СОЗДАНИЕ ТЕСТОВЫХ ПОЛЬЗОВАТЕЛЕЙ =============

async function createTestUsers() {
    // Проверяем, есть ли уже пользователи
    if (users.length === 0) {
        console.log('Создание тестовых пользователей...');
        
        // Создаем администратора
        const adminPassword = await hashPassword('admin123');
        users.push({
            id: nanoid(),
            email: 'admin@shop.com',
            first_name: 'Admin',
            last_name: 'Adminov',
            password: adminPassword,
            role: ROLES.ADMIN,
            isBlocked: false,
            createdAt: new Date().toISOString()
        });

        // Создаем продавца
        const sellerPassword = await hashPassword('seller123');
        users.push({
            id: nanoid(),
            email: 'seller@shop.com',
            first_name: 'Seller',
            last_name: 'Sellervich',
            password: sellerPassword,
            role: ROLES.SELLER,
            isBlocked: false,
            createdAt: new Date().toISOString()
        });

        // Создаем обычного пользователя
        const userPassword = await hashPassword('user123');
        users.push({
            id: nanoid(),
            email: 'user@shop.com',
            first_name: 'User',
            last_name: 'Userovich',
            password: userPassword,
            role: ROLES.USER,
            isBlocked: false,
            createdAt: new Date().toISOString()
        });

        console.log('Тестовые пользователи созданы:');
        console.log('- Администратор: admin@shop.com / admin123');
        console.log('- Продавец: seller@shop.com / seller123');
        console.log('- Пользователь: user@shop.com / user123');
    }
}

// Создаем тестовых пользователей при запуске
createTestUsers();

// ============= ЗАПУСК СЕРВЕРА =============

app.listen(port, () => {
    console.log(`Бэкенд запущен на http://localhost:${port}`);
    console.log(`Swagger UI доступен по адресу http://localhost:${port}/api-docs`);
    console.log(`Access token expires in: ${ACCESS_EXPIRES_IN}`);
    console.log(`Refresh token expires in: ${REFRESH_EXPIRES_IN}`);
});