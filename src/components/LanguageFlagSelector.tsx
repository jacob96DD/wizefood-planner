import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import dkFlag from '@/assets/flags/dk.png';
import gbFlag from '@/assets/flags/gb.png';

interface LanguageFlagSelectorProps {
  compact?: boolean;
}

const languages = [
  { code: 'en', flag: gbFlag, label: 'GB' },
  { code: 'da', flag: dkFlag, label: 'DK' },
];

export function LanguageFlagSelector({ compact = false }: LanguageFlagSelectorProps) {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = languages.find((l) => l.code === i18n.language) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code: string) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1 rounded-lg transition-all',
          compact ? 'text-lg p-1' : 'text-xl p-2 hover:bg-secondary/50'
        )}
        aria-label="Select language"
      >
        <img src={currentLang.flag} alt={currentLang.label} className={cn('rounded-sm', compact ? 'w-5 h-auto' : 'w-6 h-auto')} />
        <span className={cn('font-medium', compact ? 'text-xs' : 'text-sm')}>{currentLang.label}</span>
        <ChevronDown className={cn('transition-transform', isOpen && 'rotate-180', compact ? 'w-3 h-3' : 'w-4 h-4')} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 min-w-[80px]">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-secondary/50 transition-colors first:rounded-t-lg last:rounded-b-lg',
                i18n.language === lang.code && 'bg-secondary'
              )}
            >
              <img src={lang.flag} alt={lang.label} className={cn('rounded-sm', compact ? 'w-5 h-auto' : 'w-6 h-auto')} />
              <span className={cn('font-medium', compact ? 'text-xs' : 'text-sm')}>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
