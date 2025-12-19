# Чеклист перед деплоем

## ✅ Выполнено

- [x] Удалены временные файлы (test-upload.html из backend, лишние MD файлы)
- [x] Обновлен .gitignore (добавлены все чувствительные файлы)
- [x] Обновлен docker-compose.yml для продакшена
- [x] Обновлен frontend/Dockerfile (поддержка build args)
- [x] Обновлен next.config.js (поддержка Google Drive изображений)
- [x] Создан .env.example
- [x] Создан DEPLOY.md с инструкциями
- [x] Обновлен README.md

## 📋 Перед коммитом в GitHub

### 1. Проверьте что чувствительные файлы не попадут в git:
```bash
# Эти файлы НЕ должны быть в git:
- backend/google-credentials.json
- backend/google-oauth-credentials.json
- backend/google-oauth-tokens.json
- backend/data/dev.db
- backend/uploads/
- Все .env файлы
```

### 2. Инициализируйте git (если еще не сделано):
```bash
git init
git add .
git status  # Проверьте что нет чувствительных файлов
```

### 3. Создайте первый коммит:
```bash
git commit -m "feat: initial commit - couple calendar app with Google Drive integration"
```

### 4. Добавьте remote и запушьте:
```bash
git remote add origin https://github.com/yourusername/your-repo.git
git branch -M main
git push -u origin main
```

## 🔧 Настройки для продакшена

### На сервере нужно будет:

1. **Создать .env файл** на основе .env.example
2. **Скопировать google-oauth-credentials.json** в backend/
3. **Настроить домены** в Google Cloud Console:
   - Добавить redirect URI: `https://api.yourdomain.com/api/storage/oauth/callback`
   - Добавить тестовых пользователей (если приложение в режиме тестирования)

## 📝 Изменения в коде

### Endpoints переименованы:
- `POST /api/storage/test-upload` → `POST /api/storage/upload`
- `GET /api/storage/test-connection` → `GET /api/storage/status`

### Файлы удалены:
- `backend/test-upload.html` (дубликат, есть в frontend/public)
- `backend/GOOGLE_OAUTH_FIX_403.md`
- `backend/GOOGLE_OAUTH_SETUP.md`
- `start.ps1`
- `DOCKER_GUIDE.md`
- `QUICKSTART.md`
- `SETUP_CHECKLIST.md`
- `TESTING_GUIDE.md`
- `PROJECT_STATUS.md`
- `IMPLEMENTATION_SUMMARY.md`

### Файлы созданы:
- `.env.example` - пример переменных окружения
- `DEPLOY.md` - инструкция по деплою
- `PRE_DEPLOY_CHECKLIST.md` - этот файл

## 🚀 Готово к деплою!

Проект оптимизирован и готов к коммиту в GitHub и деплою на VPS.

