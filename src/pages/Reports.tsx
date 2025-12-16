import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTransaction } from '@/contexts/transactionContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  profit: number;
}

const Reports = () => {
  const { user } = useAuth();
  const { transactions } = useTransaction();
  
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportType, setReportType] = useState<'monthly' | 'category'>('monthly');
  
  const [incomeByCategory, setIncomeByCategory] = useState<CategoryData[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<CategoryData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [netBalance, setNetBalance] = useState(0);

  useEffect(() => {
    if (user && transactions.length > 0) {
      generateReportData();
    }
  }, [user, transactions, startDate, endDate]);

  const generateReportData = () => {
    setLoading(true);
    try {
      // Filter transactions by date range
      const filteredTransactions = transactions.filter(t => {
        const txDate = new Date(t.date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return txDate >= start && txDate <= end;
      });

      // Calculate totals
      const income = filteredTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const expenses = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      setTotalIncome(income);
      setTotalExpenses(expenses);
      setNetBalance(income - expenses);

      // Group by category for pie charts
      const incomeMap = new Map<string, { value: number; color: string }>();
      const expensesMap = new Map<string, { value: number; color: string }>();

      filteredTransactions.forEach(t => {
        if (t.categories) {
          const map = t.type === 'income' ? incomeMap : expensesMap;
          const existing = map.get(t.categories.name);
          map.set(t.categories.name, {
            value: (existing?.value || 0) + Number(t.amount),
            color: t.categories.color || '#8884d8'
          });
        } else if (t.category_id) {
          // Handle transactions without category details
          const categoryName = t.type === 'income' ? 'Uncategorized Income' : 'Uncategorized Expense';
          const map = t.type === 'income' ? incomeMap : expensesMap;
          const existing = map.get(categoryName);
          map.set(categoryName, {
            value: (existing?.value || 0) + Number(t.amount),
            color: t.type === 'income' ? '#10b981' : '#ef4444'
          });
        }
      });

      setIncomeByCategory(
        Array.from(incomeMap.entries()).map(([name, data]) => ({
          name,
          value: data.value,
          color: data.color
        }))
      );

      setExpensesByCategory(
        Array.from(expensesMap.entries()).map(([name, data]) => ({
          name,
          value: data.value,
          color: data.color
        }))
      );

      // Monthly trend data
      const monthlyMap = new Map<string, { income: number; expenses: number; profit: number }>();
      
      filteredTransactions.forEach(t => {
        const month = new Date(t.date).toLocaleDateString('en-US', { 
          month: 'short', 
          year: 'numeric' 
        });
        const existing = monthlyMap.get(month) || { income: 0, expenses: 0, profit: 0 };
        
        if (t.type === 'income') {
          existing.income += Number(t.amount);
        } else {
          existing.expenses += Number(t.amount);
        }
        
        existing.profit = existing.income - existing.expenses;
        monthlyMap.set(month, existing);
      });

      const sortedMonthlyData = Array.from(monthlyMap.entries())
        .map(([month, data]) => ({ 
          month, 
          income: data.income,
          expenses: data.expenses,
          profit: data.profit
        }))
        .sort((a, b) => {
          const dateA = new Date(a.month);
          const dateB = new Date(b.month);
          return dateA.getTime() - dateB.getTime();
        });

      setMonthlyData(sortedMonthlyData);
    } catch (error) {
      console.error('Error generating report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    // CSV export
    const headers = ['Month', 'Income', 'Expenses', 'Profit/Loss'];
    const csvData = monthlyData.map(row => [
      row.month,
      row.income.toFixed(2),
      row.expenses.toFixed(2),
      row.profit.toFixed(2)
    ]);
    
    const csv = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${startDate}-${endDate}.csv`;
    a.click();
  };

  const handleRefresh = () => {
    generateReportData();
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}₮
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Generating reports...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Санхүүгийн тайлан</h2>
            <p className="text-muted-foreground">Орлого, зарлагын шинжилгээ</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleRefresh} variant="outline">
              Шинэчлэх
            </Button>
            <Button onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              CSV файл татах
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
            <CardHeader>
            <CardTitle>Шүүлтүүр</CardTitle>
            <CardDescription>Огноо болон тайлангийн төрлийг сонгоно уу</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Эхлэх огноо</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">Дуусах огноо</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="report-type">Тайлангийн төрөл</Label>
                <Select 
                  value={reportType} 
                  onValueChange={(value: 'monthly' | 'category') => setReportType(value)}
                >
                  <SelectTrigger id="report-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="monthly">Сарын тренд</SelectItem>
                    <SelectItem value="category">Ангиллаар</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="invisible">Apply</Label>
                <Button 
                  onClick={generateReportData} 
                  className="w-full"
                  variant="secondary"
                >
                  Шүүлтүүрийг хэрэгжүүлэх
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium">Нийт орлого</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}₮
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Нийт {transactions.filter(t => t.type === 'income').length} орлогын гүйлгээнээс
              </p>
            </CardContent>
          </Card>
          
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium">Нийт зарлага</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}₮
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Нийт {transactions.filter(t => t.type === 'expense').length} зарлагын гүйлгээнээс
              </p>
            </CardContent>
          </Card>
          
          <Card>
              <CardHeader className="flex flex-row items-center justify_between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium">Цэвэр үлдэгдэл</CardTitle>
              <DollarSign className={`h-4 w-4 ${netBalance >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}₮
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Сонгосон хугацаанд {netBalance >= 0 ? 'ашигтай' : 'алдагдалтай'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts based on report type */}
        {reportType === 'monthly' ? (
          <Card>
              <CardHeader>
              <CardTitle>Сарын санхүүгийн тренд</CardTitle>
              <CardDescription>Цаг хугацааны явцад орлого, зарлагын харьцуулалт</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="month" 
                      stroke="#6b7280"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="#6b7280"
                      fontSize={12}
                      tickFormatter={(value) => `${value.toLocaleString()}₮`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar 
                      dataKey="income" 
                      fill="#10b981" 
                      name="Income" 
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="expenses" 
                      fill="#ef4444" 
                      name="Expenses" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Category Breakdown Charts */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                  <CardHeader>
                  <CardTitle>Ангиллаар орлого</CardTitle>
                  <CardDescription>Орлого аль ангиллаас бүрдэж байна</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {incomeByCategory.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={incomeByCategory}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry) => `${entry.name}: ${entry.value.toFixed(0)}₮`}
                            outerRadius={80}
                            innerRadius={40}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {incomeByCategory.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-muted-foreground">Сонгосон хугацаанд орлого байхгүй</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                <CardTitle>Ангиллаар зарлага</CardTitle>
                <CardDescription>Мөнгө аль зардлын ангилалд зарцуулагдсан</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {expensesByCategory.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={expensesByCategory}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry) => `${entry.name}: ${entry.value.toFixed(0)}₮`}
                            outerRadius={80}
                            innerRadius={40}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {expensesByCategory.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-muted-foreground">Сонгосон хугацаанд зарлага байхгүй</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Category Tables */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                  <CardHeader>
                  <CardTitle className="text-sm">Орлогын ангиллууд</CardTitle>
                </CardHeader>
                <CardContent>
                  {incomeByCategory.length > 0 ? (
                    <div className="space-y-2">
                      {incomeByCategory.map((category, index) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: category.color }}
                            />
                            <span className="font-medium">{category.name}</span>
                          </div>
                          <div className="font-semibold text-green-600">
                            {category.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}₮
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">Орлогын ангилал байхгүй</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                <CardTitle className="text-sm">Зарлагын ангиллууд</CardTitle>
                </CardHeader>
                <CardContent>
                  {expensesByCategory.length > 0 ? (
                    <div className="space-y-2">
                      {expensesByCategory.map((category, index) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: category.color }}
                            />
                            <span className="font-medium">{category.name}</span>
                          </div>
                          <div className="font-semibold text-red-600">
                            {category.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}₮
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">Зарлагын ангилал байхгүй</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Reports;