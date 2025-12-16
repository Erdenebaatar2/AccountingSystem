import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Calculator, Trash2, Download, Users } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface SalaryResult {
  employeeName: string;
  baseSalary: number;
  actualSalary: number;
  bonus: number;
  grossSalary: number;
  socialInsurance: number;
  healthInsurance: number;
  personalIncomeTax: number;
  totalDeductions: number;
  netSalary: number;
  employerSocialInsurance: number;
  totalEmployerCost: number;
}

const Salary = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [salaryResults, setSalaryResults] = useState<SalaryResult[]>([]);
  
  const [formData, setFormData] = useState({
    employeeName: '',
    baseSalary: '',
    workDays: '22',
    totalWorkDays: '22',
    bonus: '0',
    deductions: '0',
  });

  const handleCalculate = async () => {
    if (!formData.employeeName || !formData.baseSalary) {
      toast({
        title: t('salary.validationError'),
        description: t('salary.requiredFields'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const baseSalary = parseFloat(formData.baseSalary);
      const workDays = parseInt(formData.workDays);
      const totalWorkDays = parseInt(formData.totalWorkDays);
      const bonus = parseFloat(formData.bonus) || 0;
      const deductions = parseFloat(formData.deductions) || 0;

      // Actual worked salary based on days
      const actualSalary = (baseSalary / totalWorkDays) * workDays;
      const grossSalary = actualSalary + bonus;

      // Employee deductions
      const socialInsurance = grossSalary * 0.115; // 11.5%
      const healthInsurance = grossSalary * 0.02;  // 2%
      const taxableIncome = grossSalary - socialInsurance - healthInsurance - deductions;
      const personalIncomeTax = taxableIncome > 0 ? taxableIncome * 0.1 : 0; // 10%

      const totalDeductions = socialInsurance + healthInsurance + personalIncomeTax + deductions;
      const netSalary = grossSalary - totalDeductions;

      // Employer contributions
      const employerSocialInsurance = grossSalary * 0.125; // 12.5%
      const employerHealthInsurance = grossSalary * 0.02;  // 2%
      const totalEmployerCost = grossSalary + employerSocialInsurance + employerHealthInsurance;

      const result: SalaryResult = {
        employeeName: formData.employeeName,
        baseSalary,
        actualSalary,
        bonus,
        grossSalary,
        socialInsurance,
        healthInsurance,
        personalIncomeTax,
        totalDeductions,
        netSalary,
        employerSocialInsurance,
        totalEmployerCost,
      };

      setSalaryResults(prev => [...prev, result]);
      setFormData({
        employeeName: '',
        baseSalary: '',
        workDays: '22',
        totalWorkDays: '22',
        bonus: '0',
        deductions: '0',
      });

      toast({
        title: t('common.success'),
        description: t('salary.calculateSuccess'),
      });
    } catch (error: any) {
      console.error('Salary calculation error:', error);
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (index: number) => {
    setSalaryResults(prev => prev.filter((_, i) => i !== index));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('mn-MN', {
      style: 'decimal',
      minimumFractionDigits: 0,
    }).format(amount) + '₮';
  };

  const totalNetSalary = salaryResults.reduce((sum, r) => sum + r.netSalary, 0);
  const totalEmployerCost = salaryResults.reduce((sum, r) => sum + r.totalEmployerCost, 0);

  const exportToCSV = () => {
    if (salaryResults.length === 0) return;
    
    const headers = [
      'Ажилтны нэр',
      'Үндсэн цалин',
      'Бодогдсон цалин',
      'Урамшуулал',
      'Нийт цалин',
      'НДШ (11.5%)',
      'ЭМД (2%)',
      'ХХОАТ (10%)',
      'Нийт суутгал',
      'Гарт олгох',
      'Ажил олгогчийн НДШ',
      'Нийт зардал',
    ];
    
    const rows = salaryResults.map(r => [
      r.employeeName,
      r.baseSalary,
      r.actualSalary,
      r.bonus,
      r.grossSalary,
      r.socialInsurance,
      r.healthInsurance,
      r.personalIncomeTax,
      r.totalDeductions,
      r.netSalary,
      r.employerSocialInsurance,
      r.totalEmployerCost,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `salary_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('salary.title')}</h1>
            <p className="text-muted-foreground">{t('salary.description')}</p>
          </div>
          {salaryResults.length > 0 && (
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              {t('salary.export')}
            </Button>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Calculator Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                {t('salary.calculator')}
              </CardTitle>
              <CardDescription>{t('salary.calculatorDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="employeeName">{t('salary.employeeName')} *</Label>
                <Input
                  id="employeeName"
                  value={formData.employeeName}
                  onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                  placeholder={t('salary.employeeNamePlaceholder')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="baseSalary">{t('salary.baseSalary')} *</Label>
                  <Input
                    id="baseSalary"
                    type="number"
                    value={formData.baseSalary}
                    onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                    placeholder="1,000,000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bonus">{t('salary.bonus')}</Label>
                  <Input
                    id="bonus"
                    type="number"
                    value={formData.bonus}
                    onChange={(e) => setFormData({ ...formData, bonus: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="workDays">{t('salary.workDays')}</Label>
                  <Input
                    id="workDays"
                    type="number"
                    value={formData.workDays}
                    onChange={(e) => setFormData({ ...formData, workDays: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalWorkDays">{t('salary.totalWorkDays')}</Label>
                  <Input
                    id="totalWorkDays"
                    type="number"
                    value={formData.totalWorkDays}
                    onChange={(e) => setFormData({ ...formData, totalWorkDays: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deductions">{t('salary.otherDeductions')}</Label>
                <Input
                  id="deductions"
                  type="number"
                  value={formData.deductions}
                  onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
                  placeholder="0"
                />
              </div>

              <Button onClick={handleCalculate} className="w-full" disabled={loading}>
                <Calculator className="h-4 w-4 mr-2" />
                {loading ? t('common.loading') : t('salary.calculate')}
              </Button>
            </CardContent>
          </Card>

          {/* Tax Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t('salary.taxInfo')}</CardTitle>
              <CardDescription>{t('salary.taxInfoDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('salary.socialInsurance')}</span>
                  <span className="font-medium">11.5%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('salary.healthInsurance')}</span>
                  <span className="font-medium">2%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('salary.incomeTax')}</span>
                  <span className="font-medium">10%</span>
                </div>
                <hr className="border-border" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('salary.employerSI')}</span>
                  <span className="font-medium">12.5%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('salary.employerHI')}</span>
                  <span className="font-medium">2%</span>
                </div>
              </div>

              {salaryResults.length > 0 && (
                <div className="rounded-lg bg-primary/10 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <Users className="h-5 w-5" />
                    {t('salary.summary')}
                  </div>
                  <div className="flex justify-between">
                    <span>{t('salary.employeeCount')}</span>
                    <span className="font-medium">{salaryResults.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('salary.totalNetSalary')}</span>
                    <span className="font-medium text-primary">{formatCurrency(totalNetSalary)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('salary.totalCost')}</span>
                    <span className="font-medium">{formatCurrency(totalEmployerCost)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Results Table */}
        {salaryResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('salary.results')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('salary.employeeName')}</TableHead>
                      <TableHead className="text-right">{t('salary.grossSalary')}</TableHead>
                      <TableHead className="text-right">{t('salary.socialInsurance')}</TableHead>
                      <TableHead className="text-right">{t('salary.healthInsurance')}</TableHead>
                      <TableHead className="text-right">{t('salary.incomeTax')}</TableHead>
                      <TableHead className="text-right">{t('salary.netSalary')}</TableHead>
                      <TableHead className="text-right">{t('salary.employerCost')}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salaryResults.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{result.employeeName}</TableCell>
                        <TableCell className="text-right">{formatCurrency(result.grossSalary)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(result.socialInsurance)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(result.healthInsurance)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(result.personalIncomeTax)}</TableCell>
                        <TableCell className="text-right font-medium text-primary">
                          {formatCurrency(result.netSalary)}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(result.totalEmployerCost)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemove(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Salary;
