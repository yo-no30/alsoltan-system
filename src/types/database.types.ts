export type UserRole = 'admin' | 'cashier'
export type SalePaymentType = 'cash' | 'credit'
export type SaleStatus = 'completed' | 'synced_offline'
export type PurchasePaymentType = 'cash' | 'credit'

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          role: UserRole
          email: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          role: UserRole
          email?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          role?: UserRole
          email?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      categories: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          name: string
          price: number
          cost_price: number
          category_id: string | null
          stock_quantity: number
          min_stock_alert: number
          pieces_per_carton: number
          is_active: boolean
          image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          price: number
          cost_price: number
          category_id?: string | null
          stock_quantity?: number
          min_stock_alert?: number
          pieces_per_carton?: number
          is_active?: boolean
          image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          price?: number
          cost_price?: number
          category_id?: string | null
          stock_quantity?: number
          min_stock_alert?: number
          pieces_per_carton?: number
          is_active?: boolean
          image_url?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'products_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
        ]
      }
      suppliers: {
        Row: {
          id: string
          name: string
          phone: string | null
          balance_due: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          balance_due?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          balance_due?: number
          created_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          id: string
          name: string
          phone: string | null
          notes: string | null
          balance_due: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          notes?: string | null
          balance_due?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          notes?: string | null
          balance_due?: number
          created_at?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          id: string
          invoice_number: string
          cashier_id: string | null
          customer_id: string | null
          total_amount: number
          paid_amount: number
          payment_type: SalePaymentType
          status: SaleStatus
          created_at: string
        }
        Insert: {
          id?: string
          invoice_number: string
          cashier_id?: string | null
          customer_id?: string | null
          total_amount: number
          paid_amount?: number
          payment_type: SalePaymentType
          status?: SaleStatus
          created_at?: string
        }
        Update: {
          id?: string
          invoice_number?: string
          cashier_id?: string | null
          customer_id?: string | null
          total_amount?: number
          paid_amount?: number
          payment_type?: SalePaymentType
          status?: SaleStatus
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sales_cashier_id_fkey'
            columns: ['cashier_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sales_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
        ]
      }
      sale_items: {
        Row: {
          id: string
          sale_id: string
          product_id: string
          quantity: number
          unit_price: number
          total_price: number
        }
        Insert: {
          id?: string
          sale_id: string
          product_id: string
          quantity: number
          unit_price: number
          total_price: number
        }
        Update: {
          id?: string
          sale_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
          total_price?: number
        }
        Relationships: [
          {
            foreignKeyName: 'sale_items_sale_id_fkey'
            columns: ['sale_id']
            isOneToOne: false
            referencedRelation: 'sales'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sale_items_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      purchases: {
        Row: {
          id: string
          supplier_id: string
          invoice_number: string
          total_amount: number
          paid_amount: number
          payment_type: PurchasePaymentType
          created_at: string
        }
        Insert: {
          id?: string
          supplier_id: string
          invoice_number: string
          total_amount: number
          paid_amount?: number
          payment_type: PurchasePaymentType
          created_at?: string
        }
        Update: {
          id?: string
          supplier_id?: string
          invoice_number?: string
          total_amount?: number
          paid_amount?: number
          payment_type?: PurchasePaymentType
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'purchases_supplier_id_fkey'
            columns: ['supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
        ]
      }
      purchase_items: {
        Row: {
          id: string
          purchase_id: string
          product_id: string
          quantity: number
          cost_price: number
        }
        Insert: {
          id?: string
          purchase_id: string
          product_id: string
          quantity: number
          cost_price: number
        }
        Update: {
          id?: string
          purchase_id?: string
          product_id?: string
          quantity?: number
          cost_price?: number
        }
        Relationships: [
          {
            foreignKeyName: 'purchase_items_purchase_id_fkey'
            columns: ['purchase_id']
            isOneToOne: false
            referencedRelation: 'purchases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'purchase_items_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      account_types: {
        Row: {
          id: string
          name: string
          nature: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          nature: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          nature?: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      accounts: {
        Row: {
          id: string
          code: string
          name: string
          type_id: string
          is_postable: boolean
          is_active: boolean
          system_key: string | null
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          type_id: string
          is_postable?: boolean
          is_active?: boolean
          system_key?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          type_id?: string
          is_postable?: boolean
          is_active?: boolean
          system_key?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'accounts_type_id_fkey'
            columns: ['type_id']
            isOneToOne: false
            referencedRelation: 'account_types'
            referencedColumns: ['id']
          },
        ]
      }
      journal_entries: {
        Row: {
          id: string
          entry_date: string
          memo: string
          source_type:
            | 'sale'
            | 'purchase'
            | 'customer_payment'
            | 'supplier_payment'
            | 'expense'
            | 'payroll'
            | 'cash_transfer'
            | 'manual'
            | 'adjustment'
            | 'period_close'
          source_id: string | null
          created_by: string | null
          status: 'posted' | 'void'
          created_at: string
        }
        Insert: {
          id?: string
          entry_date?: string
          memo?: string
          source_type:
            | 'sale'
            | 'purchase'
            | 'customer_payment'
            | 'supplier_payment'
            | 'expense'
            | 'payroll'
            | 'cash_transfer'
            | 'manual'
            | 'adjustment'
            | 'period_close'
          source_id?: string | null
          created_by?: string | null
          status?: 'posted' | 'void'
          created_at?: string
        }
        Update: {
          id?: string
          entry_date?: string
          memo?: string
          source_type?:
            | 'sale'
            | 'purchase'
            | 'customer_payment'
            | 'supplier_payment'
            | 'expense'
            | 'payroll'
            | 'cash_transfer'
            | 'manual'
            | 'adjustment'
            | 'period_close'
          source_id?: string | null
          created_by?: string | null
          status?: 'posted' | 'void'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'journal_entries_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      journal_lines: {
        Row: {
          id: string
          entry_id: string
          account_id: string
          amount_alayh: number
          amount_lahu: number
          line_memo: string
        }
        Insert: {
          id?: string
          entry_id: string
          account_id: string
          amount_alayh?: number
          amount_lahu?: number
          line_memo?: string
        }
        Update: {
          id?: string
          entry_id?: string
          account_id?: string
          amount_alayh?: number
          amount_lahu?: number
          line_memo?: string
        }
        Relationships: [
          {
            foreignKeyName: 'journal_lines_entry_id_fkey'
            columns: ['entry_id']
            isOneToOne: false
            referencedRelation: 'journal_entries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'journal_lines_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
        ]
      }
      operating_expenses: {
        Row: {
          id: string
          expense_date: string
          account_id: string
          amount: number
          pay_from: 'cash' | 'bank'
          memo: string
          created_by: string | null
          journal_entry_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          expense_date?: string
          account_id: string
          amount: number
          pay_from: 'cash' | 'bank'
          memo?: string
          created_by?: string | null
          journal_entry_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          expense_date?: string
          account_id?: string
          amount?: number
          pay_from?: 'cash' | 'bank'
          memo?: string
          created_by?: string | null
          journal_entry_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'operating_expenses_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
        ]
      }
      accounting_periods: {
        Row: {
          id: string
          period_year: number
          period_month: number
          status: 'open' | 'closed'
          closed_by: string | null
          closed_at: string | null
          reopened_by: string | null
          reopened_at: string | null
          closing_entry_id: string | null
          close_memo: string
          reopen_memo: string
          created_at: string
        }
        Insert: {
          id?: string
          period_year: number
          period_month: number
          status?: 'open' | 'closed'
          closed_by?: string | null
          closed_at?: string | null
          reopened_by?: string | null
          reopened_at?: string | null
          closing_entry_id?: string | null
          close_memo?: string
          reopen_memo?: string
          created_at?: string
        }
        Update: {
          id?: string
          period_year?: number
          period_month?: number
          status?: 'open' | 'closed'
          closed_by?: string | null
          closed_at?: string | null
          reopened_by?: string | null
          reopened_at?: string | null
          closing_entry_id?: string | null
          close_memo?: string
          reopen_memo?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'accounting_periods_closing_entry_id_fkey'
            columns: ['closing_entry_id']
            isOneToOne: false
            referencedRelation: 'journal_entries'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      get_auth_role: {
        Args: Record<string, never>
        Returns: string
      }
      account_id_by_system_key: {
        Args: { p_key: string }
        Returns: string
      }
      post_journal_entry: {
        Args: {
          p_entry_date: string
          p_memo: string
          p_source_type: string
          p_source_id: string | null
          p_lines: Json
          p_created_by?: string | null
        }
        Returns: string
      }
      create_manual_journal_entry: {
        Args: {
          p_entry_date: string
          p_memo: string
          p_lines: Json
        }
        Returns: string
      }
      transfer_cash_to_bank: {
        Args: {
          p_amount: number
          p_memo?: string
        }
        Returns: string
      }
      record_operating_expense: {
        Args: {
          p_expense_date: string
          p_account_id: string
          p_amount: number
          p_pay_from: string
          p_memo?: string
        }
        Returns: Database['public']['Tables']['operating_expenses']['Row']
      }
      ensure_period_open: {
        Args: { p_date: string }
        Returns: string
      }
      close_accounting_period: {
        Args: {
          p_year: number
          p_month: number
          p_memo?: string
        }
        Returns: Database['public']['Tables']['accounting_periods']['Row']
      }
      reopen_accounting_period: {
        Args: {
          p_year: number
          p_month: number
          p_memo: string
        }
        Returns: Database['public']['Tables']['accounting_periods']['Row']
      }
      record_customer_payment: {
        Args: {
          p_customer_id: string
          p_amount: number
        }
        Returns: Database['public']['Tables']['customers']['Row']
      }
      record_supplier_payment: {
        Args: {
          p_supplier_id: string
          p_amount: number
        }
        Returns: Database['public']['Tables']['suppliers']['Row']
      }
      complete_sale: {
        Args: {
          p_invoice_number: string
          p_payment_type: string
          p_status: string
          p_cashier_id: string
          p_items: Json
          p_discount?: number
          p_customer_id?: string | null
        }
        Returns: Json
      }
      complete_purchase: {
        Args: {
          p_supplier_id: string
          p_invoice_number: string
          p_payment_type: string
          p_paid_amount: number
          p_items: Json
        }
        Returns: string
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Category = Database['public']['Tables']['categories']['Row']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']
export type CategoryUpdate = Database['public']['Tables']['categories']['Update']

export type Product = Database['public']['Tables']['products']['Row']
export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type ProductUpdate = Database['public']['Tables']['products']['Update']

export type Supplier = Database['public']['Tables']['suppliers']['Row']
export type SupplierInsert = Database['public']['Tables']['suppliers']['Insert']
export type SupplierUpdate = Database['public']['Tables']['suppliers']['Update']

export type Customer = Database['public']['Tables']['customers']['Row']
export type CustomerInsert = Database['public']['Tables']['customers']['Insert']
export type CustomerUpdate = Database['public']['Tables']['customers']['Update']

export type Sale = Database['public']['Tables']['sales']['Row']
export type SaleInsert = Database['public']['Tables']['sales']['Insert']
export type SaleUpdate = Database['public']['Tables']['sales']['Update']

export type SaleItem = Database['public']['Tables']['sale_items']['Row']
export type SaleItemInsert = Database['public']['Tables']['sale_items']['Insert']
export type SaleItemUpdate = Database['public']['Tables']['sale_items']['Update']

export type Purchase = Database['public']['Tables']['purchases']['Row']
export type PurchaseInsert = Database['public']['Tables']['purchases']['Insert']
export type PurchaseUpdate = Database['public']['Tables']['purchases']['Update']

export type PurchaseItem = Database['public']['Tables']['purchase_items']['Row']
export type PurchaseItemInsert = Database['public']['Tables']['purchase_items']['Insert']
export type PurchaseItemUpdate = Database['public']['Tables']['purchase_items']['Update']

export type AccountTypeRow = Database['public']['Tables']['account_types']['Row']
export type AccountTypeInsert =
  Database['public']['Tables']['account_types']['Insert']
export type AccountTypeUpdate =
  Database['public']['Tables']['account_types']['Update']

export type Account = Database['public']['Tables']['accounts']['Row']
export type AccountInsert = Database['public']['Tables']['accounts']['Insert']
export type AccountUpdate = Database['public']['Tables']['accounts']['Update']

export type JournalEntry = Database['public']['Tables']['journal_entries']['Row']
export type JournalEntryInsert = Database['public']['Tables']['journal_entries']['Insert']
export type JournalEntryUpdate = Database['public']['Tables']['journal_entries']['Update']

export type JournalLine = Database['public']['Tables']['journal_lines']['Row']
export type JournalLineInsert = Database['public']['Tables']['journal_lines']['Insert']
export type JournalLineUpdate = Database['public']['Tables']['journal_lines']['Update']

export type OperatingExpense =
  Database['public']['Tables']['operating_expenses']['Row']
export type OperatingExpenseInsert =
  Database['public']['Tables']['operating_expenses']['Insert']
export type OperatingExpenseUpdate =
  Database['public']['Tables']['operating_expenses']['Update']

export type AccountingPeriod = Database['public']['Tables']['accounting_periods']['Row']
export type AccountingPeriodInsert =
  Database['public']['Tables']['accounting_periods']['Insert']
export type AccountingPeriodUpdate =
  Database['public']['Tables']['accounting_periods']['Update']
