import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Plus, TrendingDown, TrendingUp, Minus, Scale, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BottomNavigation } from '@/components/BottomNavigation';
import { AddProgressDialog } from '@/components/AddProgressDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { format } from 'date-fns';
import { da, enUS } from 'date-fns/locale';
import { useTranslation as useI18n } from 'react-i18next';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ProgressEntry {
  id: string;
  recorded_at: string;
  weight_kg: number | null;
  body_fat_percentage: number | null;
  muscle_mass_kg: number | null;
  waist_cm: number | null;
  notes: string | null;
  created_at: string;
}

export default function Progress() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { i18n } = useI18n();
  const { user } = useAuthStore();
  const [progressData, setProgressData] = useState<ProgressEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const fetchProgress = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: true });

      if (error) throw error;
      setProgressData(data || []);
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, [user]);

  const locale = i18n.language === 'da' ? da : enUS;

  // Calculate weight change
  const getWeightTrend = () => {
    const weights = progressData.filter(p => p.weight_kg !== null);
    if (weights.length < 2) return null;

    const first = weights[0].weight_kg!;
    const last = weights[weights.length - 1].weight_kg!;
    const change = last - first;

    return {
      change: Math.abs(change).toFixed(1),
      direction: change < 0 ? 'down' : change > 0 ? 'up' : 'same',
    };
  };

  const weightTrend = getWeightTrend();
  const latestEntry = progressData[progressData.length - 1];

  // Prepare chart data
  const chartData = progressData
    .filter(p => p.weight_kg !== null)
    .map(p => ({
      date: format(new Date(p.recorded_at), 'dd/MM', { locale }),
      weight: p.weight_kg,
    }));

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">{t('progress.title')}</h1>
          <div className="flex-1" />
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            {t('progress.add')}
          </Button>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Scale className="w-4 h-4" />
                <span className="text-sm">{t('progress.currentWeight')}</span>
              </div>
              <p className="text-2xl font-bold">
                {latestEntry?.weight_kg ? `${latestEntry.weight_kg} kg` : '-'}
              </p>
              {weightTrend && (
                <div className={`flex items-center gap-1 text-sm mt-1 ${
                  weightTrend.direction === 'down' ? 'text-green-500' : 
                  weightTrend.direction === 'up' ? 'text-orange-500' : 'text-muted-foreground'
                }`}>
                  {weightTrend.direction === 'down' && <TrendingDown className="w-4 h-4" />}
                  {weightTrend.direction === 'up' && <TrendingUp className="w-4 h-4" />}
                  {weightTrend.direction === 'same' && <Minus className="w-4 h-4" />}
                  <span>{weightTrend.change} kg</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Ruler className="w-4 h-4" />
                <span className="text-sm">{t('progress.waist')}</span>
              </div>
              <p className="text-2xl font-bold">
                {latestEntry?.waist_cm ? `${latestEntry.waist_cm} cm` : '-'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Weight chart */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('progress.weightOverTime')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs" 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      domain={['dataMin - 2', 'dataMax + 2']}
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="weight" 
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress history */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('progress.history')}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
            ) : progressData.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">{t('progress.noData')}</p>
                <Button variant="outline" onClick={() => setAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('progress.addFirst')}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {[...progressData].reverse().map((entry) => (
                  <div 
                    key={entry.id} 
                    className="flex items-center justify-between py-3 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="font-medium">
                        {format(new Date(entry.recorded_at), 'PPP', { locale })}
                      </p>
                      {entry.notes && (
                        <p className="text-sm text-muted-foreground">{entry.notes}</p>
                      )}
                    </div>
                    <div className="text-right space-y-1">
                      {entry.weight_kg && (
                        <p className="text-sm"><span className="font-medium">{entry.weight_kg}</span> kg</p>
                      )}
                      {entry.body_fat_percentage && (
                        <p className="text-sm text-muted-foreground">{entry.body_fat_percentage}% {t('progress.bodyFat').toLowerCase()}</p>
                      )}
                      {entry.waist_cm && (
                        <p className="text-sm text-muted-foreground">{entry.waist_cm} cm</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <BottomNavigation />

      <AddProgressDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={fetchProgress}
      />
    </div>
  );
}
