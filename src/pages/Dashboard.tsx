import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTransaction } from '@/contexts/transactionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertCircle 
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import DashboardLayout from '@/components/DashboardLayout';

/* ===================== TYPES ===================== */

interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
}

interface DashboardStats {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  recentTransactions: Transaction[];
}

/* ===================== COMPONENT ===================== */

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { transactions, fetchTransactions } = useTransaction();

  const [stats, setStats] = useState<DashboardStats>({
    totalIncome: 0,
    totalExpenses: 0,
    netBalance: 0,
    recentTransactions: []
  });

  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /* ===================== FETCH TRANSACTIONS ===================== */

  useEffect(() => {
    if (user?.id) {
      fetchTransactions(user.id);
    }
  }, [user?.id]);

  /* ===================== CALCULATE DASHBOARD ===================== */

  useEffect(() => {
    if (!transactions) return;

    calculateStats(transactions);
    buildChartData(transactions);
    setLoading(false);
  }, [transactions]);

  /* ===================== FUNCTIONS ===================== */

  const calculateStats = (txs: Transaction[]) => {
    let income = 0;
    let expense = 0;

    txs.forEach(t => {
      if (t.type === 'income') income += Number(t.amount);
      else expense += Number(t.amount);
    });

    setStats({
      totalIncome: income,
      totalExpenses: expense,
      netBalance: income - expense,
      recentTransactions: txs.slice(0, 5)
    });
  };

  const buildChartData = (txs: Transaction[]) => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    const data = last7Days.map(date => {
      const dayTx = txs.filter(t => t.date.startsWith(date));

      const income = dayTx
        .filter(t => t.type === 'income')
        .reduce((s, t) => s + Number(t.amount), 0);

      const expenses = dayTx
        .filter(t => t.type === 'expense')
        .reduce((s, t) => s + Number(t.amount), 0);

      return {
        date: new Date(date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        }),
        income,
        expenses
      };
    });

    setChartData(data);
  };

  /* ===================== LOADING ===================== */

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  /* ===================== UI ===================== */

   return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('dashboard.title')}</h2>
          <p className="text-muted-foreground">{t('dashboard.overview')}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.totalIncome')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                ${stats.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.totalExpenses')}</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                ${stats.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.netBalance')}</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.netBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                ${stats.netBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.incomeVsExpenses')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="income" fill="hsl(var(--success))" name={t('dashboard.income')} />
                  <Bar dataKey="expenses" fill="hsl(var(--destructive))" name={t('dashboard.expense')} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.trendAnalysis')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="income" 
                    stroke="hsl(var(--success))" 
                    strokeWidth={2}
                    name={t('dashboard.income')}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="expenses" 
                    stroke="hsl(var(--destructive))" 
                    strokeWidth={2}
                    name={t('dashboard.expense')}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.recentTransactions')}</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t('dashboard.noTransactions')}</p>
                <p className="text-sm text-muted-foreground">{t('dashboard.addFirstTransaction')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${transaction.type === 'income' ? 'bg-success/10' : 'bg-destructive/10'}`}>
                        {transaction.type === 'income' ? (
                          <TrendingUp className="h-4 w-4 text-success" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium capitalize">{transaction.type}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <p className={`font-semibold ${transaction.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                      {transaction.type === 'income' ? '+' : '-'}$
                      {Number(transaction.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
