'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Карта', icon: '🗺️' },
  { href: '/dashboard', label: 'Панель', icon: '📊' },
  { href: '/analysis', label: 'Аналитика', icon: '🔬' },
  { href: '/about', label: 'О проекте', icon: '📖' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-accent-green)] to-[var(--color-accent-blue)] flex items-center justify-center text-xl shadow-lg group-hover:scale-110 transition-transform">
              🌿
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold gradient-text">EcoMonitor</h1>
              <p className="text-xs text-[var(--color-text-muted)]">Мониторинг воздуха</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    flex items-center gap-2
                    ${isActive 
                      ? 'bg-[var(--color-bg-hover)] text-[var(--color-accent-green)]' 
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card)]'
                    }
                  `}
                >
                  <span className="hidden sm:inline">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Status Indicator */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-bg-card)] border border-[var(--border-color)]">
            <span className="w-2 h-2 rounded-full bg-[var(--color-accent-green)] animate-pulse" />
            <span className="text-xs text-[var(--color-text-muted)]">Live</span>
          </div>
        </div>
      </div>
    </nav>
  );
}

