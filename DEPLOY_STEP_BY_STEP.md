# Пошаговая инструкция по деплою на VPS

## 🎯 Что нужно сделать на сервере

### Шаг 1: Подключитесь к серверу

```bash
ssh root@85.202.192.68
# или
ssh ваш-пользователь@85.202.192.68
```

### Шаг 2: Установите Docker и Docker Compose

```bash
# Обновите систему
apt update && apt upgrade -y

# Установите Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Добавьте текущего пользователя в группу docker
usermod -aG docker $USER

# Установите Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Проверьте установку
docker --version
docker-compose --version

# Оптимизация Docker для работы с ограниченной памятью
# Увеличьте лимит памяти Docker (если нужно)
echo '{
  "default-ulimits": {
    "memlock": {
      "hard": -1,
      "name": "memlock",
      "soft": -1
    }
  }
}' > /etc/docker/daemon.json

systemctl restart docker

# Проверьте доступную память
free -h

# Если памяти меньше 2GB, создайте swap-файл (рекомендуется)
if [ $(free -m | awk '/^Mem:/{print $2}') -lt 2048 ]; then
    echo "Создаю swap-файл 4GB..."
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "Swap-файл создан"
fi

free -h

# Выйдите и войдите снова для применения изменений группы
exit
# Затем снова подключитесь: ssh root@85.202.192.68
```

### Шаг 3: Установите Nginx

```bash
apt install nginx -y
systemctl enable nginx
systemctl start nginx
```

### Шаг 4: Клонируйте репозиторий Couple Calendar

```bash
# Создайте директорию для приложений
mkdir -p /opt/apps
cd /opt/apps

# Клонируйте репозиторий (замените URL на ваш)
git clone https://github.com/ваш-username/ваш-репозиторий.git zha-app
cd zha-app
```

### Шаг 5: Создайте .env файл для Couple Calendar

```bash
# Создайте .env файл
nano .env
```

Вставьте следующее содержимое (замените `yourdomain.com` на `heartofzha.ru`):

```env
# Database
DATABASE_URL=file:/app/data/dev.db

# JWT
JWT_SECRET=сгенерируйте-случайную-строку-минимум-32-символа
JWT_EXPIRES_IN=7d

# Ports
PORT=3001
NODE_ENV=production

# URLs (пока используем HTTP, после настройки SSL изменим на HTTPS)
NEXT_PUBLIC_API_URL=http://api.heartofzha.ru/api
FRONTEND_URL=http://heartofzha.ru
BACKEND_URL=http://api.heartofzha.ru

# Google Drive
GOOGLE_DRIVE_FOLDER_ID=1rGNf3YTubyXde9m26SA8UwGJnRU7M3XC
```

**Важно:** Для генерации `JWT_SECRET` выполните:
```bash
openssl rand -base64 32
```

Сохраните файл: `Ctrl+O`, `Enter`, `Ctrl+X`

### Шаг 6: Скопируйте Google OAuth credentials

```bash
# Создайте файл
nano backend/google-oauth-credentials.json
```

Вставьте содержимое вашего `google-oauth-credentials.json`:

```json
{
  "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
  "client_secret": "YOUR_CLIENT_SECRET",
  "redirect_uris": ["http://api.heartofzha.ru/api/storage/oauth/callback"]
}
```

**Важно:** Замените `YOUR_CLIENT_ID` и `YOUR_CLIENT_SECRET` на реальные значения из Google Cloud Console.

**Важно:** После настройки SSL измените `redirect_uris` на `https://api.heartofzha.ru/api/storage/oauth/callback`

Сохраните: `Ctrl+O`, `Enter`, `Ctrl+X`

### Шаг 7: Создайте необходимые директории

```bash
mkdir -p backend/data backend/uploads
chmod 755 backend/data backend/uploads
```

### Шаг 8: Запустите Couple Calendar

```bash
cd /opt/apps/zha-app
docker-compose up -d --build
```

Проверьте логи:
```bash
docker-compose logs -f
```

Если все хорошо, остановите просмотр логов: `Ctrl+C`

### Шаг 9: Настройте Nginx для Couple Calendar

#### Frontend (heartofzha.ru)

```bash
nano /etc/nginx/sites-available/zha-frontend
```

Вставьте:

```nginx
server {
    listen 80;
    server_name heartofzha.ru www.heartofzha.ru;

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

#### Backend (api.heartofzha.ru)

```bash
nano /etc/nginx/sites-available/zha-backend
```

Вставьте:

```nginx
server {
    listen 80;
    server_name api.heartofzha.ru;

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
ln -s /etc/nginx/sites-available/zha-frontend /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/zha-backend /etc/nginx/sites-enabled/

# Проверьте конфигурацию
nginx -t

# Перезагрузите Nginx
systemctl reload nginx
```

### Шаг 10: Настройте Eco Monitoring (если нужно)

```bash
cd /opt/apps
git clone https://github.com/ваш-username/eco-monitoring.git eco-monitoring
cd eco-monitoring
```

Создайте `.env` файл:

```bash
nano .env
```

```env
NEXT_PUBLIC_API_URL=http://eco-api.heartofzha.ru
CORS_ORIGINS=http://eco.heartofzha.ru,http://eco-api.heartofzha.ru
ENVIRONMENT=production
LOG_LEVEL=info
```

Запустите:

```bash
docker-compose up -d --build
```

Настройте Nginx для Eco Monitoring:

```bash
# Frontend
nano /etc/nginx/sites-available/eco-frontend
```

```nginx
server {
    listen 80;
    server_name eco.heartofzha.ru;

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
```

```bash
# Backend
nano /etc/nginx/sites-available/eco-backend
```

```nginx
server {
    listen 80;
    server_name eco-api.heartofzha.ru;

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
ln -s /etc/nginx/sites-available/eco-frontend /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/eco-backend /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### Шаг 11: Настройте SSL (HTTPS)

**Важно:** Сначала убедитесь, что DNS записи добавлены и работают (проверьте через `nslookup`)

```bash
# Установите Certbot
apt install certbot python3-certbot-nginx -y

# Получите сертификаты для всех доменов
certbot --nginx -d heartofzha.ru -d www.heartofzha.ru -d api.heartofzha.ru -d eco.heartofzha.ru -d eco-api.heartofzha.ru
```

Certbot автоматически обновит конфигурации Nginx для HTTPS.

### Шаг 12: Обновите .env файлы с HTTPS

#### Couple Calendar

```bash
cd /opt/apps/zha-app
nano .env
```

Измените URLs на HTTPS:

```env
NEXT_PUBLIC_API_URL=https://api.heartofzha.ru/api
FRONTEND_URL=https://heartofzha.ru
BACKEND_URL=https://api.heartofzha.ru
```

Перезапустите:

```bash
docker-compose down
docker-compose up -d --build
```

#### Eco Monitoring (если используется)

```bash
cd /opt/apps/eco-monitoring
nano .env
```

```env
NEXT_PUBLIC_API_URL=https://eco-api.heartofzha.ru
CORS_ORIGINS=https://eco.heartofzha.ru,https://eco-api.heartofzha.ru
```

Перезапустите:

```bash
docker-compose down
docker-compose up -d --build
```

### Шаг 13: Обновите Google OAuth redirect URI

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Откройте ваш проект
3. Перейдите в "APIs & Services" > "Credentials"
4. Найдите ваш OAuth 2.0 Client ID
5. Добавьте в "Authorized redirect URIs":
   - `https://api.heartofzha.ru/api/storage/oauth/callback`

### Шаг 14: Обновите google-oauth-credentials.json

```bash
cd /opt/apps/zha-app
nano backend/google-oauth-credentials.json
```

Измените `redirect_uris`:

```json
{
  "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
  "client_secret": "YOUR_CLIENT_SECRET",
  "redirect_uris": ["https://api.heartofzha.ru/api/storage/oauth/callback"]
}
```

**Важно:** Замените `YOUR_CLIENT_ID` и `YOUR_CLIENT_SECRET` на реальные значения из Google Cloud Console.

Перезапустите backend:

```bash
docker-compose restart backend
```

## ✅ Проверка работы

1. Откройте в браузере: `https://heartofzha.ru`
2. Проверьте API: `https://api.heartofzha.ru/api/health`
3. Проверьте Eco Monitoring: `https://eco.heartofzha.ru` (если настроен)

## 🔧 Полезные команды

```bash
# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down

# Запуск
docker-compose up -d

# Пересборка
docker-compose up -d --build

# Проверка статуса контейнеров
docker-compose ps

# Использование ресурсов
docker stats
```

## 🚨 Устранение проблем

### Контейнеры не запускаются
```bash
docker-compose logs
docker-compose down
docker-compose up -d --build
```

### Проблемы с базой данных
```bash
docker exec -it zha-backend sh
npx prisma migrate deploy
npx prisma generate
```

### Проблемы с Nginx
```bash
nginx -t
systemctl status nginx
systemctl reload nginx
```

### Проверка DNS
```bash
nslookup api.heartofzha.ru
nslookup eco.heartofzha.ru
```

