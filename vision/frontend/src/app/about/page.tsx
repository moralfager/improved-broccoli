export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--color-accent-green)] to-[var(--color-accent-blue)] text-4xl mb-6 shadow-lg">
          🌿
        </div>
        <h1 className="text-3xl font-bold mb-4 gradient-text">
          Система экологического мониторинга
        </h1>
        <p className="text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto">
          Интеллектуальная платформа для удаленного мониторинга качества воздуха 
          с использованием IoT-датчиков и машинного обучения
        </p>
      </div>

      {/* Goals Section */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
          <span className="text-2xl">🎯</span>
          Цели проекта
        </h2>
        <div className="card p-6">
          <ul className="space-y-4 text-[var(--color-text-secondary)]">
            <li className="flex items-start gap-3">
              <span className="text-[var(--color-accent-green)]">✓</span>
              <span>Сбор данных о состоянии воздуха в режиме реального времени с физических станций</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[var(--color-accent-green)]">✓</span>
              <span>Визуализация экологической обстановки на интерактивной карте</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[var(--color-accent-green)]">✓</span>
              <span>Автоматическая классификация состояния воздуха и типов загрязнений</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[var(--color-accent-green)]">✓</span>
              <span>Применение ML-моделей для интеллектуального анализа данных</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Architecture Section */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
          <span className="text-2xl">🏗️</span>
          Архитектура системы
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          <ArchitectureCard
            icon="📡"
            title="Физический уровень"
            description="Raspberry Pi + датчики MH-Z19C, MQ-135, MQ-5, Sharp GP2Y1010AU0F, BME280, GPS NEO-6M"
          />
          <ArchitectureCard
            icon="🗄️"
            title="Инфраструктура данных"
            description="Node-RED для сбора данных, InfluxDB для хранения временных рядов, Grafana для отладки"
          />
          <ArchitectureCard
            icon="🌐"
            title="Веб-платформа"
            description="FastAPI backend, Next.js frontend, ML-сервис на Python для классификации"
          />
        </div>
      </section>

      {/* Sensors Section */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
          <span className="text-2xl">📊</span>
          Датчики и измерения
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <SensorCard
            name="MH-Z19C"
            parameter="CO₂"
            unit="ppm"
            description="Инфракрасный датчик углекислого газа с высокой точностью"
          />
          <SensorCard
            name="MQ-135"
            parameter="VOC / Вредные газы"
            unit="raw ADC"
            description="Датчик качества воздуха для обнаружения аммиака, бензола и других вредных газов"
          />
          <SensorCard
            name="MQ-5"
            parameter="Горючие газы"
            unit="raw ADC"
            description="Датчик для обнаружения утечек природного газа, пропана, бутана"
          />
          <SensorCard
            name="Sharp GP2Y1010AU0F"
            parameter="Пыль / PM"
            unit="мг/м³"
            description="Оптический датчик пыли и дыма с аналоговым выходом"
          />
          <SensorCard
            name="BME280"
            parameter="T / H / P"
            unit="°C, %, гПа"
            description="Комбинированный датчик температуры, влажности и атмосферного давления"
          />
          <SensorCard
            name="Ublox NEO-6M"
            parameter="GPS"
            unit="координаты"
            description="GPS-модуль для определения местоположения и точного времени"
          />
        </div>
      </section>

      {/* ML Section */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
          <span className="text-2xl">🤖</span>
          Машинное обучение
        </h2>
        <div className="card p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3 text-[var(--color-accent-blue)]">
                Задачи классификации
              </h3>
              <ul className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-accent-green)]" />
                  Классификация состояния воздуха (clean/moderate/polluted/danger)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-accent-yellow)]" />
                  Определение типа загрязнения (пыль/дым/VOC/утечка газа)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-accent-blue)]" />
                  Геокластеризация станций (KMeans)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-accent-red)]" />
                  Детекция аномалий (IsolationForest)
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-[var(--color-accent-blue)]">
                Используемые алгоритмы
              </h3>
              <ul className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                <li>• RandomForestClassifier — классификация с вероятностями</li>
                <li>• KMeans — кластеризация по геолокации</li>
                <li>• IsolationForest — обнаружение аномалий</li>
                <li>• Правила экспертной системы — базовая логика</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Eco Index Section */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
          <span className="text-2xl">📈</span>
          Экологический индекс
        </h2>
        <div className="card p-6">
          <p className="text-[var(--color-text-secondary)] mb-4">
            Интегральный показатель качества воздуха от 0 до 100, где меньшие значения означают лучшее качество.
          </p>
          
          <div className="grid grid-cols-4 gap-2 mb-6">
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
              <p className="text-lg font-bold text-[#22c55e]">0-25</p>
              <p className="text-xs text-[var(--color-text-muted)]">Чистый</p>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)' }}>
              <p className="text-lg font-bold text-[#eab308]">25-50</p>
              <p className="text-xs text-[var(--color-text-muted)]">Умеренный</p>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)' }}>
              <p className="text-lg font-bold text-[#f97316]">50-75</p>
              <p className="text-xs text-[var(--color-text-muted)]">Загрязнённый</p>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
              <p className="text-lg font-bold text-[#ef4444]">75-100</p>
              <p className="text-xs text-[var(--color-text-muted)]">Опасный</p>
            </div>
          </div>

          <div className="bg-[var(--color-bg-primary)] rounded-lg p-4 font-mono text-sm">
            <p className="text-[var(--color-text-muted)] mb-2">// Формула расчёта:</p>
            <p className="text-[var(--color-accent-green)]">
              eco_index = (0.4×CO₂_norm + 0.3×dust_norm + 0.2×MQ135_norm + 0.1×MQ5_norm) × 100
            </p>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
          <span className="text-2xl">⚙️</span>
          Технологический стек
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <TechBadge name="Python" icon="🐍" />
          <TechBadge name="FastAPI" icon="⚡" />
          <TechBadge name="Next.js" icon="▲" />
          <TechBadge name="TypeScript" icon="📘" />
          <TechBadge name="TailwindCSS" icon="🎨" />
          <TechBadge name="Leaflet" icon="🗺️" />
          <TechBadge name="Recharts" icon="📊" />
          <TechBadge name="scikit-learn" icon="🤖" />
          <TechBadge name="Docker" icon="🐳" />
          <TechBadge name="InfluxDB" icon="📈" />
          <TechBadge name="Node-RED" icon="🔴" />
          <TechBadge name="Raspberry Pi" icon="🍓" />
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center text-sm text-[var(--color-text-muted)] pt-8 border-t border-[var(--border-color)]">
        <p>Разработано в рамках дипломного проекта</p>
        <p className="mt-1">«Разработка системы удаленного мониторинга экологической обстановки местности»</p>
        <p className="mt-4 text-[var(--color-accent-green)]">© 2025</p>
      </footer>
    </div>
  );
}

function ArchitectureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="card p-5 text-center">
      <span className="text-3xl mb-3 block">{icon}</span>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-[var(--color-text-muted)]">{description}</p>
    </div>
  );
}

function SensorCard({ name, parameter, unit, description }: { 
  name: string; 
  parameter: string; 
  unit: string;
  description: string;
}) {
  return (
    <div className="card p-4 flex gap-4">
      <div className="w-12 h-12 rounded-lg bg-[var(--color-accent-blue)]/10 flex items-center justify-center text-xl shrink-0">
        📟
      </div>
      <div>
        <h3 className="font-semibold text-[var(--color-accent-blue)]">{name}</h3>
        <p className="text-sm">
          {parameter} <span className="text-[var(--color-text-muted)]">({unit})</span>
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">{description}</p>
      </div>
    </div>
  );
}

function TechBadge({ name, icon }: { name: string; icon: string }) {
  return (
    <div className="card p-3 flex items-center gap-2 text-sm">
      <span>{icon}</span>
      <span>{name}</span>
    </div>
  );
}

