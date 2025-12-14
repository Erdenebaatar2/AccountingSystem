import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTransaction } from '@/contexts/transactionContext';
import type { Transaction } from '@/contexts/transactionContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Edit, Trash2, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Transactions = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const { transactions, fetchTransactions, deleteTransaction } = useTransaction();

  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

  /* ================= FETCH ================= */

  useEffect(() => {
    if (user?.id) {
      fetchTransactions(user.id).finally(() => setLoading(false));
    }
  }, [user?.id]);

  /* ================= FILTER ================= */

  useEffect(() => {
    let filtered = [...transactions];

    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.type === typeFilter);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.description?.toLowerCase().includes(search) ||
        t.account?.toLowerCase().includes(search) ||
        t.document_no?.toLowerCase().includes(search) ||
        t.categories?.name.toLowerCase().includes(search)
      );
    }

    setFilteredTransactions(filtered);
  }, [transactions, searchTerm, typeFilter]);

  /* ================= DELETE ================= */

const handleDelete = async () => {
  if (!transactionToDelete) return;

  try {
    await deleteTransaction(transactionToDelete);

    toast({
      title: t('common.success'),
      description: t('transaction.deleted'),
    });
  } catch (error) {
    console.error(error);
    toast({
      title: t('common.error'),
      description: t('transaction.deleteFailed'),
      variant: 'destructive',
    });
  } finally {
    setDeleteDialogOpen(false);
    setTransactionToDelete(null);
  }
};

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  /* ================= UI ================= */

  return (
    <DashboardLayout>
      <div className="space-y-6">

        <div>
          <h2 className="text-3xl font-bold">{t('transaction.allTransactions')}</h2>
          <p className="text-muted-foreground">{t('transaction.viewAndManage')}</p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>{t('transaction.filters')}</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4 flex-col sm:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('transaction.search')}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('transaction.allTypes')}</SelectItem>
                <SelectItem value="income">{t('transaction.income')}</SelectItem>
                <SelectItem value="expense">{t('transaction.expense')}</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {t('transaction.allTransactions')} ({filteredTransactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('transaction.date')}</TableHead>
                    <TableHead>{t('transaction.type')}</TableHead>
                    <TableHead>{t('transaction.category')}</TableHead>
                    <TableHead>{t('transaction.account')}</TableHead>
                    <TableHead>{t('transaction.description')}</TableHead>
                    <TableHead className="text-right">{t('transaction.amount')}</TableHead>
                    <TableHead className="text-right">{t('transaction.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {t('transaction.noTransactions')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map(tx => (
                      <TableRow key={tx.id}>
                        <TableCell>{new Date(tx.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            tx.type === 'income'
                              ? 'bg-success/10 text-success'
                              : 'bg-destructive/10 text-destructive'
                          }`}>
                            {tx.type}
                          </span>
                        </TableCell>
                        <TableCell>
                          {tx.categories ? (
                            <span className="flex items-center gap-2">
                              <span
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: tx.categories.color }}
                              />
                              {tx.categories.name}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{tx.account || '-'}</TableCell>
                        <TableCell className="truncate max-w-xs">{tx.description || '-'}</TableCell>
                        <TableCell className={`text-right font-semibold ${
                          tx.type === 'income' ? 'text-success' : 'text-destructive'
                        }`}>
                          {tx.type === 'income' ? '+' : '-'}$
                          {Number(tx.amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/transactions/edit/${tx.id}`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setTransactionToDelete(tx.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('transaction.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('transaction.deleteConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('transaction.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              {t('transaction.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </DashboardLayout>
  );
};

export default Transactions;
