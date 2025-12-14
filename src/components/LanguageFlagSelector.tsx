import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface LanguageFlagSelectorProps {
  compact?: boolean;
}

export function LanguageFlagSelector({ compact = false }: LanguageFlagSelectorProps) {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'da', flag: '🇩🇰' },
    { code: 'en', flag: '🇬🇧' },
  ];

  if (compact) {
    return (
      <div className="flex gap-1">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            className={cn(
              'text-xl p-1 rounded transition-all',
              i18n.language === lang.code 
                ? 'opacity-100 scale-110' 
                : 'opacity-50 hover:opacity-75'
            )}
            aria-label={`Switch to ${lang.code}`}
          >
            {lang.flag}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-1">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => i18n.changeLanguage(lang.code)}
          className={cn(
            'text-2xl p-2 rounded-lg transition-all',
            i18n.language === lang.code 
              ? 'bg-secondary ring-2 ring-primary' 
              : 'hover:bg-secondary/50'
          )}
          aria-label={`Switch to ${lang.code}`}
        >
          {lang.flag}
        </button>
      ))}
    </div>
  );
}
