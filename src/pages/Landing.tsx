import { useNavigate } from 'react-router-dom';
import { ChefHat, Sparkles, TrendingDown, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/stores/authStore';

const features = [
  {
    icon: Sparkles,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    title: 'AI-genererede madplaner',
    description: 'Få personlige madplaner tilpasset dine præferencer, allergier og budget.',
  },
  {
    icon: TrendingDown,
    iconBg: 'bg-accent/10',
    iconColor: 'text-accent',
    title: 'Spar penge',
    description: 'Optimer dit madbudget med smarte tilbudsforslag og budgetvenlige opskrifter.',
  },
  {
    icon: Clock,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    title: 'Spar tid',
    description: 'Automatisk indkøbsliste og nem madplanlægning. Brug mindre tid i køkkenet.',
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const { user, isOnboarded } = useAuthStore();

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
            WizeFood
          </h1>

          {/* Subtitle */}
          <p 
            className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-10 animate-slide-up"
            style={{ animationDelay: '0.1s' }}
          >
            Din personlige AI-drevne madplanlægger. Spar tid, penge og spis sundere.
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
              <span>Kom i gang gratis</span>
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
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
            © 2024 WizeFood. Alle rettigheder forbeholdes.
          </p>
        </div>
      </footer>
    </div>
  );
}
