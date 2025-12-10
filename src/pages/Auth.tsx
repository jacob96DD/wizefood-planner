import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/authStore';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setUser, setIsOnboarded, isOnboarded } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Demo mode - simulate auth
    setTimeout(() => {
      setIsLoading(false);
      
      // Create mock user
      const mockUser = {
        id: 'demo-user-id',
        email,
        created_at: new Date().toISOString(),
      } as any;
      
      setUser(mockUser);
      
      toast({
        title: isLogin ? 'Velkommen tilbage!' : 'Konto oprettet!',
        description: isLogin 
          ? 'Du er nu logget ind.'
          : 'Din konto er oprettet. Lad os sætte din profil op.',
      });

      // Navigate based on onboarding status
      if (!isLogin || !isOnboarded) {
        navigate('/onboarding');
      } else {
        navigate('/');
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      {/* Logo */}
      <div className="mb-8 text-center animate-slide-down">
        <div className="inline-flex items-center gap-2 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <span className="text-2xl">🥗</span>
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

      {/* Demo notice */}
      <p className="mt-6 text-xs text-muted-foreground text-center max-w-xs">
        Demo-tilstand: Forbind til ekstern Supabase for fuld funktionalitet
      </p>
    </div>
  );
}
