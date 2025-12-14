import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function LanguageSelector() {
  const { i18n, t } = useTranslation();

  const languages = [
    { code: 'da', label: t('language.danish'), flag: '🇩🇰' },
    { code: 'en', label: t('language.english'), flag: '🇬🇧' },
  ];

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t('language.select')}</p>
      <div className="flex gap-2">
        {languages.map((lang) => (
          <Button
            key={lang.code}
            variant={i18n.language === lang.code ? 'default' : 'outline'}
            size="sm"
            onClick={() => i18n.changeLanguage(lang.code)}
            className={cn(
              'flex items-center gap-2',
              i18n.language === lang.code && 'ring-2 ring-primary ring-offset-2'
            )}
          >
            <span className="text-lg">{lang.flag}</span>
            <span>{lang.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
