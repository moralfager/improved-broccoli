"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Home, 
  Calendar, 
  Clock, 
  Star, 
  Heart
} from "lucide-react";

const navItems = [
  { href: "/", icon: Home, label: "Главная" },
  { href: "/calendar", icon: Calendar, label: "Календарь" },
  { href: "/timeline", icon: Clock, label: "Лента" },
  { href: "/plans", icon: Star, label: "Планы" },
  { href: "/dates", icon: Heart, label: "Даты" },
];

export function Navigation() {
  const pathname = usePathname();

  // Don't show navigation on login page
  if (pathname === '/login') {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:top-0 md:bottom-auto md:left-0 md:right-auto md:h-screen md:w-20 bg-white/80 backdrop-blur-lg border-t md:border-t-0 md:border-r border-border">
      <div className="flex md:flex-col items-center justify-around md:justify-start md:py-8 h-16 md:h-full">
        {/* Logo/Brand - Desktop only */}
        <div className="hidden md:block mb-8">
          <div className="w-12 h-12 rounded-full bg-gradient-pink-purple flex items-center justify-center text-white font-bold text-xl">
            Z&A
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex md:flex-col items-center justify-around md:justify-start md:space-y-4 w-full md:flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative group flex flex-col md:flex-row items-center justify-center py-2 px-3 md:w-full"
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 bg-primary/10 rounded-xl"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <div className="relative z-10 flex flex-col md:flex-row items-center">
                  <Icon 
                    className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'} group-hover:text-primary transition-colors`} 
                  />
                  <span className="text-xs md:hidden mt-1 font-medium">
                    {item.label}
                  </span>
                </div>
                
                {/* Tooltip for desktop */}
                <div className="hidden md:block absolute left-full ml-4 px-3 py-2 bg-black text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  {item.label}
                </div>
              </Link>
            );
          })}
        </div>

      </div>
    </nav>
  );
}

