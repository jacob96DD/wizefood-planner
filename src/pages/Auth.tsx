import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Eye, EyeOff, Loader2, ChefHat, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';

export default function Auth() {
  const { t } = useTranslation();
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
          title: t('auth.welcomeBack'),
          description: t('auth.loggedIn'),
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
          title: t('auth.accountCreated'),
          description: t('auth.checkEmail'),
        });
      }
    } catch (error: any) {
      let errorMessage = t('auth.errorOccurred');
      
      // Handle specific error messages
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = t('auth.wrongCredentials');
      } else if (error.message.includes('User already registered')) {
        errorMessage = t('auth.alreadyRegistered');
      } else if (error.message.includes('Password should be at least')) {
        errorMessage = t('auth.passwordTooShort');
      } else if (error.message.includes('Invalid email')) {
        errorMessage = t('auth.invalidEmail');
      }

      toast({
        title: t('common.error'),
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
        {t('common.back')}
      </Button>

      {/* Logo */}
      <div className="mb-8 text-center animate-slide-down">
        <div className="inline-flex items-center gap-2 mb-2">
          <div className="w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
            <ChefHat className="w-7 h-7 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gradient">{t('common.appName')}</h1>
        <p className="text-muted-foreground mt-1">{t('auth.saveOnFood')}</p>
      </div>

      <Card className="w-full max-w-sm animate-slide-up">
        <CardHeader className="text-center">
          <CardTitle>{isLogin ? t('auth.login') : t('auth.signup')}</CardTitle>
          <CardDescription>
            {isLogin
              ? t('auth.loginToContinue')
              : t('auth.createFreeAccount')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder={t('auth.email')}
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
                placeholder={t('auth.password')}
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
                  <span>{t('common.pleaseWait')}</span>
                </>
              ) : isLogin ? (
                t('auth.login')
              ) : (
                t('auth.signup')
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
                ? t('auth.noAccount')
                : t('auth.hasAccount')}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Info notice */}
      <p className="mt-6 text-xs text-muted-foreground text-center max-w-xs">
        {t('auth.termsNotice')}
      </p>
    </div>
  );
}
