# Инструкция по деплою на VPS

## Требования
- VPS с Ubuntu 20.04+ или Debian 11+
- Docker и Docker Compose установлены
- Домен настроен (опционально, для HTTPS)

## Шаги деплоя

### 1. Подключитесь к серверу
```bash
ssh user@your-server-ip
```

### 2. Установите Docker и Docker Compose (если не установлены)
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
# Выйдите и войдите снова для применения изменений группы
exit
```

### 3. Клонируйте репозиторий
```bash
cd /opt
git clone https://github.com/yourusername/your-repo.git zha-app
cd zha-app
```

### 4. Создайте .env файл
```bash
cp .env.example .env
nano .env
```

Заполните переменные:
```env
JWT_SECRET=your-very-secure-random-secret-key-here
JWT_EXPIRES_IN=7d
DATABASE_URL=file:/app/data/dev.db

NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api

FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com

GOOGLE_DRIVE_FOLDER_ID=1rGNf3YTubyXde9m26SA8UwGJnRU7M3XC
```

### 5. Скопируйте Google OAuth credentials
```bash
# Создайте файл на сервере
nano backend/google-oauth-credentials.json
# Вставьте содержимое вашего google-oauth-credentials.json
```

### 6. Создайте необходимые директории
```bash
mkdir -p backend/data backend/uploads
chmod 755 backend/data backend/uploads
```

### 7. Запустите приложение
```bash
docker-compose up -d --build
```

### 8. Проверьте логи
```bash
docker-compose logs -f
```

### 9. Настройте Nginx (для HTTPS и проксирования)

Установите Nginx:
```bash
sudo apt update
sudo apt install nginx
```

Создайте конфигурацию для frontend:
```bash
sudo nano /etc/nginx/sites-available/zha-frontend
```

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
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

Создайте конфигурацию для backend:
```bash
sudo nano /etc/nginx/sites-available/zha-backend
```

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
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

Активируйте конфигурации:
```bash
sudo ln -s /etc/nginx/sites-available/zha-frontend /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/zha-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 10. Настройте SSL с Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
```

Certbot автоматически обновит конфигурацию Nginx для HTTPS.

### 11. Обновите OAuth redirect URI в Google Cloud Console
Добавьте в Authorized redirect URIs:
- `https://api.yourdomain.com/api/storage/oauth/callback`

### 12. Обновите .env файл с HTTPS URLs
```bash
nano .env
```

Измените:
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com
```

Перезапустите контейнеры:
```bash
docker-compose down
docker-compose up -d --build
```

## Обновление приложения

```bash
cd /opt/zha-app
git pull
docker-compose down
docker-compose up -d --build
```

## Резервное копирование

```bash
# Бэкап базы данных
cp backend/data/dev.db backend/data/dev.db.backup.$(date +%Y%m%d)

# Бэкап загруженных файлов
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz backend/uploads/

# Бэкап OAuth токенов
cp backend/google-oauth-tokens.json backend/google-oauth-tokens.json.backup.$(date +%Y%m%d)
```

## Мониторинг

```bash
# Просмотр логов
docker-compose logs -f

# Просмотр логов конкретного сервиса
docker-compose logs -f backend
docker-compose logs -f frontend

# Проверка статуса контейнеров
docker-compose ps

# Использование ресурсов
docker stats
```

## Устранение проблем

### Контейнеры не запускаются
```bash
docker-compose down
docker-compose up -d --build
docker-compose logs
```

### Проблемы с базой данных
```bash
# Войдите в контейнер backend
docker exec -it zha-backend sh

# Выполните миграции
npx prisma migrate deploy
npx prisma generate
```

### Проблемы с OAuth
- Проверьте что файл `google-oauth-credentials.json` существует
- Проверьте что redirect URI в Google Cloud Console совпадает с вашим доменом
- Проверьте логи: `docker-compose logs backend | grep -i oauth`

