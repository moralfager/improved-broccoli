# Инструкция по деплою Eco Monitoring System

## Требования
- VPS с Ubuntu 20.04+ или Debian 11+
- Docker и Docker Compose установлены
- Домен настроен (опционально, для HTTPS)

## Шаги деплоя

### 1. Подключитесь к серверу
```bash
ssh user@your-server-ip
```

### 2. Клонируйте или скопируйте проект
```bash
cd /opt/apps
# Если проект в git:
git clone https://github.com/yourusername/eco-monitoring.git
cd eco-monitoring

# Или скопируйте файлы проекта в /opt/apps/eco-monitoring
```

### 3. Создайте .env файл
```bash
cp .env.example .env
nano .env
```

Заполните переменные:
```env
NEXT_PUBLIC_API_URL=https://eco-api.yourdomain.com
CORS_ORIGINS=https://eco.yourdomain.com,https://eco-api.yourdomain.com
ENVIRONMENT=production
LOG_LEVEL=info
```

### 4. Запустите проект
```bash
docker-compose up -d --build
```

### 5. Проверьте логи
```bash
docker-compose logs -f
```

### 6. Настройте Nginx

Создайте конфигурацию:
```bash
sudo nano /etc/nginx/sites-available/eco-monitoring
```

```nginx
# Frontend - Eco Monitoring
server {
    listen 80;
    server_name eco.yourdomain.com;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend - Eco Monitoring API
server {
    listen 80;
    server_name eco-api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Активируйте:
```bash
sudo ln -s /etc/nginx/sites-available/eco-monitoring /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. Настройте SSL
```bash
sudo certbot --nginx -d eco.yourdomain.com -d eco-api.yourdomain.com
```

### 8. Обновите .env с HTTPS URLs
```bash
nano .env
```

Измените:
```env
NEXT_PUBLIC_API_URL=https://eco-api.yourdomain.com
CORS_ORIGINS=https://eco.yourdomain.com,https://eco-api.yourdomain.com
```

Перезапустите:
```bash
docker-compose down
docker-compose up -d --build
```

## Обновление приложения

```bash
cd /opt/apps/eco-monitoring
git pull  # или обновите файлы вручную
docker-compose down
docker-compose up -d --build
```

## Проверка работы

```bash
# Проверьте статус контейнеров
docker-compose ps

# Проверьте логи
docker-compose logs -f backend
docker-compose logs -f frontend

# Проверьте health endpoint
curl http://localhost:8000/health
```

## Важно

- Frontend работает на порту **3002** (чтобы не конфликтовать с Couple Calendar на 3000)
- Backend работает на порту **8000**
- Убедитесь что порты 3002 и 8000 свободны перед запуском

