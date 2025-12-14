import { useTranslation } from 'react-i18next';
import { Home, CalendarDays, ShoppingCart, User } from 'lucide-react';
import { NavLink } from '@/components/NavLink';

export function BottomNavigation() {
  const { t } = useTranslation();

  const navItems = [
    { to: '/home', icon: Home, labelKey: 'nav.discover' },
    { to: '/meal-plan', icon: CalendarDays, labelKey: 'nav.mealPlan' },
    { to: '/shopping-list', icon: ShoppingCart, labelKey: 'nav.shopping' },
    { to: '/profile', icon: User, labelKey: 'nav.profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-4">
        {navItems.map(({ to, icon: Icon, labelKey }) => (
          <NavLink
            key={to}
            to={to}
            className="flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 text-muted-foreground hover:text-primary"
            activeClassName="text-primary bg-secondary"
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs font-medium">{t(labelKey)}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
