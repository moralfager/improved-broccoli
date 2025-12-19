"""
Eco Monitoring API - Main Application Entry Point
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import api

app = FastAPI(
    title="Eco Monitoring API",
    description="API для системы удаленного мониторинга экологической обстановки",
    version="1.0.0",
)

# CORS middleware for frontend access
# Получаем разрешенные origins из переменной окружения
cors_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:3002")
cors_origins = [origin.strip() for origin in cors_origins_str.split(",")]

# В development разрешаем все origins, в production только указанные
if os.getenv("ENVIRONMENT") == "production":
    allow_origins = cors_origins
else:
    allow_origins = ["*"]  # Для development

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api.router, prefix="/api", tags=["monitoring"])


@app.get("/")
async def root():
    """Root endpoint with API info"""
    return {
        "name": "Eco Monitoring API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "latest": "/api/latest",
            "daily_profile": "/api/daily_profile",
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

