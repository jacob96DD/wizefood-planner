import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2, ChefHat, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isOnboarded } = useAuthStore();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (isOnboarded) {
        navigate('/home');
      } else {
        navigate('/onboarding');
      }
    }
  }, [user, isOnboarded, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        // Sign in
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        toast({
          title: 'Velkommen tilbage!',
          description: 'Du er nu logget ind.',
        });
      } else {
        // Sign up
        const redirectUrl = `${window.location.origin}/`;
        
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
          },
        });

        if (error) {
          throw error;
        }

        toast({
          title: 'Konto oprettet!',
          description: 'Tjek din email for at bekræfte din konto, eller fortsæt direkte.',
        });
      }
    } catch (error: any) {
      let errorMessage = 'Der opstod en fejl. Prøv igen.';
      
      // Handle specific error messages
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Forkert email eller adgangskode.';
      } else if (error.message.includes('User already registered')) {
        errorMessage = 'Denne email er allerede registreret. Prøv at logge ind.';
      } else if (error.message.includes('Password should be at least')) {
        errorMessage = 'Adgangskoden skal være mindst 6 tegn.';
      } else if (error.message.includes('Invalid email')) {
        errorMessage = 'Ugyldig email adresse.';
      }

      toast({
        title: 'Fejl',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-4 left-4"
        onClick={() => navigate('/')}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Tilbage
      </Button>

      {/* Logo */}
      <div className="mb-8 text-center animate-slide-down">
        <div className="inline-flex items-center gap-2 mb-2">
          <div className="w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
            <ChefHat className="w-7 h-7 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gradient">WizeFood</h1>
        <p className="text-muted-foreground mt-1">Spar penge på mad</p>
      </div>

      <Card className="w-full max-w-sm animate-slide-up">
        <CardHeader className="text-center">
          <CardTitle>{isLogin ? 'Log ind' : 'Opret konto'}</CardTitle>
          <CardDescription>
            {isLogin
              ? 'Log ind for at fortsætte'
              : 'Opret en gratis konto for at komme i gang'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-12"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Adgangskode"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-12 pr-12"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Vent venligst...</span>
                </>
              ) : isLogin ? (
                'Log ind'
              ) : (
                'Opret konto'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin
                ? 'Har du ikke en konto? Opret en gratis'
                : 'Har du allerede en konto? Log ind'}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Info notice */}
      <p className="mt-6 text-xs text-muted-foreground text-center max-w-xs">
        Ved at oprette en konto accepterer du vores vilkår og betingelser
      </p>
    </div>
  );
}
