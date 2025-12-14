import React, { useContext, createContext, useState, ReactNode } from 'react';

interface Category {
    id: string;
    type: string;
    name: string;
    color: string;
}

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  account: string | null;
  document_no: string | null;
  description: string | null;
  category_id: string | null;
  categories: {
    id: string;
    name: string;
    color: string;
  } | null;
}
// API-д илгээх өгөгдлийн төрөл
interface TransactionInput {
  user_id: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  account: string | null;
  document_no: string | null;
  description: string | null;
  category_id: string | null;
}

interface TransactionContextType {
    transactions: Transaction[];
    addTransaction: (transaction: TransactionInput) => Promise<Transaction>;
    fetchTransactions: (user_id: string) => Promise<void>;
    updateTransaction: (transaction: Transaction) => void;
    deleteTransaction: (id: string) => void;
    Categories: (categoryType: string) => Promise<Category[]>;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export const TransactionProvider = ({ children }: { children: ReactNode }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

const Categories = async (categoryType: string): Promise<Category[]> => {
  try {
    const apiUrl = `http://localhost:5000/api/categories?type=${categoryType}`;
   
    const res = await fetch(apiUrl, {
      method: "GET",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch categories: HTTP ${res.status} - ${errorText}`);
    }
    
    const data = await res.json();

    return data;
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
};

const addTransaction = async (transactionData: TransactionInput): Promise<Transaction> => {
  try {

    const apiUrl = "http://localhost:5000/api/transactions";
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(transactionData),
    });


    if (!res.ok) {
      const responseText = await res.text();
     
      try {
        const errorData = JSON.parse(responseText);
        throw new Error(errorData.message || `HTTP ${res.status}: Failed to add transaction`);
      } catch (parseError) {
        throw new Error(`HTTP ${res.status}: ${responseText.substring(0, 100)}`);
      }
    }

    const newTransaction = await res.json();
    setTransactions(prev => [...prev, newTransaction]);
    
    return newTransaction;
  } catch (error) {
    throw error;
  }
};

const fetchTransactions = async (user_id: string) =>  {
  try {
    const res = await fetch(`http://localhost:5000/api/transactions?user_id=${user_id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log('Fetch transactions response frontend:', res);
    if (!res.ok) {
      throw new Error(`Failed to fetch transactions: ${res.status}`);
    }
    const data = await res.json();
    setTransactions(data);
  } catch (error) {
    console.error("Error fetching transactions:", error);
  }
};

  const updateTransaction = (transaction: Transaction) => {
    setTransactions(transactions.map(t => t.id === transaction.id ? transaction : t));
  };

  const deleteTransaction = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  return (
    <TransactionContext.Provider value={{ 
      transactions, 
      addTransaction, 
      fetchTransactions,
      updateTransaction, 
      deleteTransaction, 
      Categories 
    }}>
      {children}
    </TransactionContext.Provider>
  );
};

export const useTransaction = (): TransactionContextType => {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransaction must be used within a TransactionProvider');
  }   
  return context;
};

export type { Transaction, Category, TransactionInput };