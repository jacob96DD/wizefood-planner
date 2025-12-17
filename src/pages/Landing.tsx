import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChefHat, Sparkles, TrendingDown, Clock, Leaf, MapPin, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/stores/authStore';

export default function Landing() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isOnboarded } = useAuthStore();

  const features = [
    {
      icon: Sparkles,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      title: t('landing.features.aiPlans.title'),
      description: t('landing.features.aiPlans.description'),
    },
    {
      icon: TrendingDown,
      iconBg: 'bg-accent/10',
      iconColor: 'text-accent',
      title: t('landing.features.saveMoney.title'),
      description: t('landing.features.saveMoney.description'),
    },
    {
      icon: Clock,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      title: t('landing.features.saveTime.title'),
      description: t('landing.features.saveTime.description'),
    },
    {
      icon: Leaf,
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-600',
      title: t('landing.features.reduceFoodWaste.title'),
      description: t('landing.features.reduceFoodWaste.description'),
    },
    {
      icon: MapPin,
      iconBg: 'bg-orange-500/10',
      iconColor: 'text-orange-600',
      title: t('landing.features.localStores.title'),
      description: t('landing.features.localStores.description'),
    },
  ];

  const handleGetStarted = () => {
    if (user && isOnboarded) {
      navigate('/home');
    } else if (user) {
      navigate('/onboarding');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative px-4 pt-16 pb-20 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo */}
          <div className="flex justify-center mb-8 animate-float">
            <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
              <ChefHat className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-6xl font-bold text-gradient mb-6 animate-slide-up">
            {t('common.appName')}
          </h1>

          {/* Subtitle */}
          <p 
            className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-10 animate-slide-up"
            style={{ animationDelay: '0.1s' }}
          >
            {t('landing.subtitle')}
          </p>

          {/* CTA Button */}
          <div 
            className="animate-slide-up"
            style={{ animationDelay: '0.2s' }}
          >
            <Button
              variant="hero"
              size="xl"
              onClick={handleGetStarted}
              className="group"
            >
              <span>{t('landing.getStarted')}</span>
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={feature.title}
                className="border-0 shadow-card hover:shadow-elevated transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${0.3 + index * 0.1}s` }}
              >
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl ${feature.iconBg} flex items-center justify-center mb-4`}>
                    <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 border-t border-border">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            {t('landing.footer')}
          </p>
        </div>
      </footer>
    </div>
  );
}
