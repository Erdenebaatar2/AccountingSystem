import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useTransaction, Transaction, TransactionInput } from '@/contexts/transactionContext';
import type { Category } from '@/contexts/transactionContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';

const transactionSchema = z.object({
  type: z.enum(['income', 'expense'], { required_error: "Please select a transaction type" }),
  amount: z.number().positive({ message: "Amount must be positive" }),
  date: z.string().min(1, { message: "Date is required" }),
  category_id: z.string().min(1, { message: "Please select a category" }),
  account: z.string().trim().max(100).optional(),
  document_no: z.string().trim().max(50).optional(),
  description: z.string().trim().max(500).optional(),
});

const EditTransaction = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const { transactions, updateTransaction, Categories } = useTransaction();

  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState<TransactionInput>({
    user_id: '',
    type: 'expense',
    amount: 0,
    date: '',
    category_id: null,
    account: null,
    document_no: null,
    description: null,
  });

  useEffect(() => {
    if (!user || !id) return;

    const tx = transactions.find(t => t.id === id);
    if (tx) {
      setFormData({
        user_id: tx.user_id,
        type: tx.type,
        amount: Number(tx.amount),
        date: tx.date,
        category_id: tx.category_id,
        account: tx.account,
        document_no: tx.document_no,
        description: tx.description,
      });
      setFetchingData(false);
    } else {

      toast({
        title: 'Error',
        description: 'Transaction not found. Redirecting...',
        variant: 'destructive',
      });
      navigate('/transactions');
    }
  }, [user, id, transactions, navigate, toast]);

  /* ================= FETCH CATEGORIES ================= */
  useEffect(() => {
    if (!user || !formData.type) return;

    const fetchCategories = async () => {
      try {
        const cats = await Categories(formData.type);
        setCategories(cats);
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast({
          title: 'Error',
          description: 'Failed to load categories',
          variant: 'destructive',
        });
      }
    };

    fetchCategories();
  }, [user, formData.type, Categories, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = transactionSchema.parse({
        type: formData.type,
        amount: Number(formData.amount),
        date: formData.date,
        category_id: formData.category_id || '',
        account: formData.account,
        document_no: formData.document_no,
        description: formData.description || '',
      });


      const existingTx = transactions.find(t => t.id === id);
      if (!existingTx) {
        throw new Error('Transaction not found');
      }


      const transactionToUpdate: Transaction = {
        id: id!,
        user_id: formData.user_id,
        type: validatedData.type,
        amount: validatedData.amount,
        date: validatedData.date,
        category_id: validatedData.category_id,
        account: validatedData.account || null,
        document_no: validatedData.document_no || null,
        description: validatedData.description || null,
        created_at: existingTx.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        categories: existingTx.categories || null
      };

      await updateTransaction(transactionToUpdate);

      toast({
        title: 'Success',
        description: 'Transaction updated successfully!',
      });
      navigate('/transactions');
    } catch (error: any) {
      console.error('Update error:', error);
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast({
          title: 'Validation Error',
          description: firstError.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: error.message || 'Failed to update transaction. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof TransactionInput, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAmountChange = (value: string) => {
    const numValue = parseFloat(value);
    handleInputChange('amount', isNaN(numValue) ? 0 : numValue);
  };

  const handleTypeChange = (value: 'income' | 'expense') => {
    setFormData(prev => ({
      ...prev,
      type: value,
      category_id: null 
    }));
  };

  if (fetchingData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Loading transaction data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  /* ================= UI ================= */
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6 p-4 md:p-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Edit Transaction</h2>
          <p className="text-muted-foreground">Update transaction details</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transaction Details</CardTitle>
            <CardDescription>Modify the details of your transaction</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Transaction Type */}
                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={handleTypeChange}
                  >
                    <SelectTrigger id="type" className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.amount || ''}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    required
                    className="w-full"
                  />
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    required
                    className="w-full"
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category_id || ''}
                    onValueChange={(value) => handleInputChange('category_id', value)}
                    disabled={categories.length === 0}
                  >
                    <SelectTrigger id="category" className="w-full">
                      <SelectValue placeholder={
                        categories.length === 0 
                          ? "Loading categories..." 
                          : "Select category"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: cat.color }}
                            />
                            <span>{cat.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {categories.length === 0 && (
                    <p className="text-sm text-muted-foreground">No categories available for this type</p>
                  )}
                </div>

                {/* Account */}
                <div className="space-y-2">
                  <Label htmlFor="account">Account</Label>
                  <Input
                    id="account"
                    type="text"
                    placeholder="e.g., Cash, Bank"
                    value={formData.account || ''}
                    onChange={(e) => handleInputChange('account', e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* Document No. */}
                <div className="space-y-2">
                  <Label htmlFor="document_no">Document No.</Label>
                  <Input
                    id="document_no"
                    type="text"
                    placeholder="e.g., INV-001"
                    value={formData.document_no || ''}
                    onChange={(e) => handleInputChange('document_no', e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Add any notes..."
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className="w-full resize-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="sm:flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Transaction'
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/transactions')} 
                  disabled={loading}
                  className="sm:flex-1"
                >
                  Cancel
                </Button>
              </div>

              {/* Validation Info */}
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  <span className="text-destructive">*</span> Required fields
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default EditTransaction;