import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransaction, TransactionInput } from '@/contexts/transactionContext';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const transactionSchema = z.object({
  type: z.enum(['income', 'expense'], { required_error: "Please select a transaction type" }),
  amount: z.number().positive({ message: "Amount must be positive" }),
  date: z.string().min(1, { message: "Date is required" }),
  category_id: z.string().min(1, { message: "Please select a category" }),
  account: z.string().trim().max(100).optional(),
  document_no: z.string().trim().max(50).optional(),
  description: z.string().trim().max(500).optional(),
});

const AddTransaction = () => {  
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<{id: string, name: string, color: string}[]>([]);
  const { Categories, addTransaction } = useTransaction();
  
  const [formData, setFormData] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category_id: '',
    account: '',
    document_no: '',
    description: '',
  });

  // Fetch categories when type changes
  useEffect(() => {
    if (!user) return;

    const loadCategories = async () => {
      const data = await Categories(formData.type);
      setCategories(data.map(cat => ({ 
        id: cat.id,
        name: cat.name, 
        color: cat.color 
      })));
    };

    loadCategories();
  }, [formData.type, user, Categories]);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    const validatedData = transactionSchema.parse({
      ...formData,
      amount: parseFloat(formData.amount),
    });
    
    if (!user) throw new Error("User not logged in");
    const userId = user.id || user.email;
    
    if (!userId) {
      throw new Error("User ID or email not found in user object");
    }
    const transactionData: TransactionInput = {
      user_id: userId,
      type: validatedData.type,
      amount: validatedData.amount,
      date: validatedData.date,
      category_id: validatedData.category_id || null,
      account: validatedData.account || null,
      document_no: validatedData.document_no || null,
      description: validatedData.description || null,
    };
    
    await addTransaction(transactionData);

    toast({
      title: "Success",
      description: "Transaction added successfully!",
    });

    setFormData({
      type: 'expense',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      category_id: '',
      account: '',
      document_no: '',
      description: '',
    });

    navigate('/transactions');
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      toast({
        title: "Validation Error",
        description: error.errors[0].message,
        variant: "destructive",
      });
    } else {
      console.error("Submit error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add transaction",
        variant: "destructive",
      });
    }
  } finally {
    setLoading(false);
  }
};
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('transaction.addTransaction')}</h2>
          <p className="text-muted-foreground">{t('transaction.recordTransaction')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('transaction.transactionDetails')}</CardTitle>
            <CardDescription>{t('transaction.enterDetails')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Type */}
                <div className="space-y-2">
                  <Label htmlFor="type">{t('transaction.type')}</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: 'income' | 'expense') => 
                      setFormData({ ...formData, type: value, category_id: '' })
                    }
                  >
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">{t('transaction.income')}</SelectItem>
                      <SelectItem value="expense">{t('transaction.expense')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount">{t('transaction.amount')}</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <Label htmlFor="date">{t('transaction.date')}</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">{t('transaction.category')}</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Account */}
                <div className="space-y-2">
                  <Label htmlFor="account">{t('transaction.account')}</Label>
                  <Input
                    id="account"
                    type="text"
                    placeholder="e.g., Cash, Bank"
                    value={formData.account}
                    onChange={(e) => setFormData({ ...formData, account: e.target.value })}
                  />
                </div>

                {/* Document No */}
                <div className="space-y-2">
                  <Label htmlFor="document_no">{t('transaction.documentNo')}</Label>
                  <Input
                    id="document_no"
                    type="text"
                    placeholder="e.g., INV-001"
                    value={formData.document_no}
                    onChange={(e) => setFormData({ ...formData, document_no: e.target.value })}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">{t('transaction.description')}</Label>
                <Textarea
                  id="description"
                  placeholder={t('transaction.addNotes')}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    t('transaction.addTransaction')
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/transactions')}
                  disabled={loading}
                >
                  {t('transaction.cancel')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AddTransaction;
