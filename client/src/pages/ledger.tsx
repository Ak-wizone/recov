import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Mail, MessageCircle, FileText, Check, ChevronsUpDown } from "lucide-react";
import { format, parse, isValid } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import html2pdf from "html2pdf.js";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

const formatLedgerDate = (dateString: string): string => {
  if (!dateString || dateString.trim() === '') {
    return '—';
  }
  
  try {
    let date: Date;
    
    if (dateString.includes('/')) {
      date = parse(dateString, 'dd/MM/yyyy', new Date());
    } else {
      date = new Date(dateString);
    }
    
    if (!isValid(date)) {
      return '—';
    }
    
    return format(date, 'dd-MMM-yy');
  } catch (error) {
    return '—';
  }
};

interface LedgerTransaction {
  date: string;
  particulars: string;
  refNo: string;
  voucherType: string;
  voucherNo: string;
  debit: number;
  credit: number;
  balance: number;
  balanceType: 'Dr' | 'Cr';
}

interface LedgerData {
  customer: {
    name: string;
    gstin?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    mobile?: string;
    email?: string;
  };
  transactions: LedgerTransaction[];
  summary: {
    openingBalance: number;
    totalDebits: number;
    totalCredits: number;
    closingBalance: number;
    closingBalanceType: 'Dr' | 'Cr';
  };
}

interface CompanyProfile {
  id: string;
  legalName: string;
  logo?: string;
  gstin?: string;
  regAddressLine1?: string;
  regCity?: string;
  regState?: string;
  regPincode?: string;
}

// Pastel color scheme for voucher types
const voucherColors = {
  'Opening': 'bg-gray-100 text-gray-700 border-gray-200',
  'Sales': 'bg-blue-50 text-blue-700 border-blue-200',
  'Invoice': 'bg-blue-50 text-blue-700 border-blue-200',
  'Receipt': 'bg-green-50 text-green-700 border-green-200',
  'Payment': 'bg-green-50 text-green-700 border-green-200',
  'Journal': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'Credit Note': 'bg-pink-50 text-pink-700 border-pink-200',
  'Debit Note': 'bg-purple-50 text-purple-700 border-purple-200',
};

// Calculate financial year dates (April 1 to March 31)
const getFinancialYearDates = () => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed (0 = January, 3 = April)
  
  // If we're in Jan-March, FY started last year's April
  // If we're in Apr-Dec, FY started this year's April
  const fyStartYear = currentMonth < 3 ? currentYear - 1 : currentYear;
  
  const fromDate = `${fyStartYear}-04-01`;
  const toDate = format(today, 'yyyy-MM-dd');
  
  return { fromDate, toDate };
};

export default function Ledger() {
  const [location] = useLocation();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { fromDate: defaultFromDate, toDate: defaultToDate } = getFinancialYearDates();
  const [fromDate, setFromDate] = useState(defaultFromDate);
  const [toDate, setToDate] = useState(defaultToDate);
  const { toast } = useToast();

  // Parse URL parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const customerIdParam = params.get('customerId');
    if (customerIdParam) {
      setSelectedCustomerId(customerIdParam);
    }
  }, [location]);

  // Fetch customers for dropdown
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery<any[]>({
    queryKey: ["/api/masters/customers"],
  });

  // Fetch company profile for PDF branding
  const { data: companyProfile } = useQuery<CompanyProfile>({
    queryKey: ["/api/company-profile"],
  });


  // Fetch ledger data
  const { data: ledgerData, isLoading } = useQuery<LedgerData>({
    queryKey: ["/api/ledgers", selectedCustomerId, fromDate, toDate],
    enabled: !!selectedCustomerId,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);
      
      const response = await fetch(`/api/ledgers/${selectedCustomerId}?${params}`);
      if (!response.ok) throw new Error('Failed to fetch ledger');
      return response.json();
    }
  });

  const getVoucherColor = (voucherType: string) => {
    return voucherColors[voucherType as keyof typeof voucherColors] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const generatePDF = () => {
    if (!ledgerData) return;

    const element = document.getElementById('ledger-print-content');
    if (!element) return;

    // Temporarily make visible for PDF generation
    element.style.position = 'static';
    element.style.visibility = 'visible';

    const opt = {
      margin: [5, 5, 5, 5] as [number, number, number, number], // 0.5 cm (5mm) margins on all sides
      filename: `Ledger_${ledgerData.customer.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, logging: false, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf()
      .set(opt)
      .from(element)
      .save()
      .then(() => {
        // Hide again after PDF generation
        element.style.position = 'absolute';
        element.style.visibility = 'hidden';
        toast({
          title: "PDF Generated",
          description: "Ledger PDF has been downloaded successfully.",
        });
      });
  };

  const handleEmail = async () => {
    if (!ledgerData || !ledgerData.customer.email) {
      toast({
        title: "Error",
        description: "Customer email not found.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Email Feature",
      description: "Email functionality will be integrated with your email configuration.",
    });
  };

  const handleWhatsApp = () => {
    if (!ledgerData || !ledgerData.customer.mobile) {
      toast({
        title: "Error",
        description: "Customer mobile number not found.",
        variant: "destructive",
      });
      return;
    }

    const { customer, summary } = ledgerData;
    const message = `Ledger Statement - ${customer.name}\n\nOpening Balance: ₹${summary.openingBalance.toLocaleString()} ${summary.openingBalance >= 0 ? 'Dr' : 'Cr'}\nTotal Debits: ₹${summary.totalDebits.toLocaleString()}\nTotal Credits: ₹${summary.totalCredits.toLocaleString()}\nClosing Balance: ₹${summary.closingBalance.toLocaleString()} ${summary.closingBalanceType}\n\nThank you for your business!`;
    
    let phoneNumber = (customer.mobile || "").replace(/\D/g, "");
    if (!phoneNumber.startsWith("91") && phoneNumber.length === 10) {
      phoneNumber = "91" + phoneNumber;
    }

    const whatsappLink = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappLink, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="w-full px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div>
              <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">
                <FileText className="inline-block w-8 h-8 mr-2 mb-1" />
                Ledger Account
              </h1>
              <p className="text-sm text-gray-500 mt-1">View detailed transaction history and running balance</p>
            </div>
            {ledgerData && (
              <div className="flex gap-2">
                <Button
                  onClick={generatePDF}
                  variant="outline"
                  size="sm"
                  data-testid="button-download-pdf"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                <Button
                  onClick={handleEmail}
                  variant="outline"
                  size="sm"
                  data-testid="button-email"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </Button>
                <Button
                  onClick={handleWhatsApp}
                  variant="outline"
                  size="sm"
                  className="bg-green-50 hover:bg-green-100"
                  data-testid="button-whatsapp"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="w-full px-6 lg:px-8 py-8">
        {/* Filters Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="customer-select">Select Customer</Label>
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className="w-full justify-between"
                      data-testid="select-customer"
                    >
                      {selectedCustomerId
                        ? customers.find((customer) => customer.id === selectedCustomerId)?.clientName
                        : "Search and select customer..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command shouldFilter={false}>
                      <CommandInput 
                        placeholder="Search customers by name..." 
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                      />
                      <CommandList>
                        {isLoadingCustomers ? (
                          <div className="p-4 text-sm text-center text-gray-500">Loading customers...</div>
                        ) : customers.length === 0 ? (
                          <div className="p-4 text-sm text-center text-gray-500">No customers found. Please add customers first.</div>
                        ) : (
                          <>
                            <CommandEmpty>No customer found matching your search.</CommandEmpty>
                            <CommandGroup>
                              {customers
                                .filter((customer) => 
                                  customer?.clientName && 
                                  customer.clientName.toLowerCase().includes(searchQuery.toLowerCase())
                                )
                                .sort((a, b) => (a.clientName || '').localeCompare(b.clientName || ''))
                                .map((customer) => (
                                  <CommandItem
                                    key={customer.id}
                                    value={customer.id}
                                    onSelect={() => {
                                      setSelectedCustomerId(customer.id);
                                      setOpen(false);
                                      setSearchQuery("");
                                    }}
                                    data-testid={`customer-option-${customer.id}`}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedCustomerId === customer.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {customer.clientName}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="from-date">From Date</Label>
                <Input
                  id="from-date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  data-testid="input-from-date"
                />
              </div>
              <div>
                <Label htmlFor="to-date">To Date</Label>
                <Input
                  id="to-date"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  data-testid="input-to-date"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => {
                    setFromDate("");
                    setToDate("");
                  }}
                  variant="outline"
                  className="w-full"
                  data-testid="button-clear-dates"
                >
                  Clear Dates
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ledger Content */}
        {isLoading && selectedCustomerId && (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading ledger data...</p>
          </div>
        )}

        {!selectedCustomerId && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">Select a customer to view their ledger</p>
          </div>
        )}

        {ledgerData && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="pt-6">
                  <div className="text-sm text-blue-600 font-medium">Opening Balance</div>
                  <div className="text-2xl font-bold text-blue-900">
                    ₹{ledgerData.summary.openingBalance.toLocaleString()}
                    <span className="text-sm ml-1">{ledgerData.summary.openingBalance >= 0 ? 'Dr' : 'Cr'}</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                <CardContent className="pt-6">
                  <div className="text-sm text-red-600 font-medium">Total Debits</div>
                  <div className="text-2xl font-bold text-red-900">
                    ₹{ledgerData.summary.totalDebits.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="pt-6">
                  <div className="text-sm text-green-600 font-medium">Total Credits</div>
                  <div className="text-2xl font-bold text-green-900">
                    ₹{ledgerData.summary.totalCredits.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="pt-6">
                  <div className="text-sm text-purple-600 font-medium">Closing Balance</div>
                  <div className="text-2xl font-bold text-purple-900">
                    ₹{ledgerData.summary.closingBalance.toLocaleString()}
                    <span className="text-sm ml-1">{ledgerData.summary.closingBalanceType}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Ledger Table - Visible on screen */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50">
                <CardTitle className="text-lg">
                  {ledgerData.customer.name} - Ledger Account
                </CardTitle>
                {ledgerData.customer.gstin && (
                  <p className="text-sm text-gray-600">GSTIN: {ledgerData.customer.gstin}</p>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-bold">Date</TableHead>
                        <TableHead className="font-bold">Particulars</TableHead>
                        <TableHead className="font-bold">Ref No</TableHead>
                        <TableHead className="font-bold">Vch Type</TableHead>
                        <TableHead className="font-bold">Vch No.</TableHead>
                        <TableHead className="font-bold text-right">Debit</TableHead>
                        <TableHead className="font-bold text-right">Credit</TableHead>
                        <TableHead className="font-bold text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledgerData.transactions.map((transaction, index) => (
                        <TableRow 
                          key={index}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <TableCell className="font-medium">
                            {formatLedgerDate(transaction.date)}
                          </TableCell>
                          <TableCell>{transaction.particulars}</TableCell>
                          <TableCell className="text-sm text-gray-600">{transaction.refNo}</TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={`${getVoucherColor(transaction.voucherType)} border`}
                            >
                              {transaction.voucherType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{transaction.voucherNo}</TableCell>
                          <TableCell className="text-right font-medium text-red-700">
                            {transaction.debit > 0 ? `₹${transaction.debit.toLocaleString()}` : ''}
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-700">
                            {transaction.credit > 0 ? `₹${transaction.credit.toLocaleString()}` : ''}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            ₹{transaction.balance.toLocaleString()}
                            <span className={`ml-1 text-xs ${transaction.balanceType === 'Dr' ? 'text-red-600' : 'text-green-600'}`}>
                              {transaction.balanceType}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Hidden PDF Content */}
            <div 
              id="ledger-print-content" 
              style={{ 
                position: 'absolute', 
                left: '-9999px', 
                visibility: 'hidden',
                width: '200mm',
                backgroundColor: '#ffffff'
              }}
            >
              <div style={{ 
                padding: '8mm', 
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '13px',
                lineHeight: '1.5',
                color: '#333',
                maxWidth: '100%'
              }}>
                {/* Header Section */}
                <div style={{ 
                  marginBottom: '20px', 
                  borderBottom: '3px solid #2563eb',
                  paddingBottom: '20px',
                  textAlign: 'center'
                }}>
                  {companyProfile?.logo && (
                    <div style={{ marginBottom: '12px' }}>
                      <img 
                        src={companyProfile.logo} 
                        alt="Company Logo" 
                        style={{ 
                          height: '70px', 
                          width: 'auto',
                          maxWidth: '150px',
                          objectFit: 'contain',
                          margin: '0 auto'
                        }} 
                      />
                    </div>
                  )}
                  <h1 style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: '32px', 
                    fontWeight: 'bold',
                    color: '#1e40af',
                    letterSpacing: '-0.5px',
                    textTransform: 'uppercase'
                  }}>
                    {companyProfile?.legalName || 'Company Name'}
                  </h1>
                  {companyProfile?.gstin && (
                    <p style={{ 
                      margin: '0 0 15px 0', 
                      fontSize: '13px', 
                      color: '#64748b',
                      fontWeight: '500'
                    }}>
                      GSTIN: {companyProfile.gstin}
                    </p>
                  )}
                  <div style={{ 
                    backgroundColor: '#dbeafe', 
                    padding: '12px 24px',
                    borderRadius: '6px',
                    border: '1px solid #93c5fd',
                    display: 'inline-block',
                    marginTop: '10px'
                  }}>
                    <p style={{ 
                      margin: '0 0 5px 0', 
                      fontSize: '14px', 
                      color: '#1e40af',
                      fontWeight: '700',
                      letterSpacing: '1px'
                    }}>
                      LEDGER STATEMENT
                    </p>
                    <p style={{ 
                      margin: '0', 
                      fontSize: '12px', 
                      color: '#475569'
                    }}>
                      {fromDate && toDate 
                        ? `${format(new Date(fromDate), 'dd MMM yyyy')} - ${format(new Date(toDate), 'dd MMM yyyy')}`
                        : 'All Transactions'
                      }
                    </p>
                  </div>
                </div>

                {/* Customer Information Section */}
                <div style={{ 
                  marginBottom: '20px',
                  backgroundColor: '#f8fafc',
                  padding: '18px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  <h2 style={{ 
                    margin: '0 0 14px 0', 
                    fontSize: '18px', 
                    fontWeight: 'bold',
                    color: '#1e293b',
                    borderBottom: '2px solid #cbd5e1',
                    paddingBottom: '8px'
                  }}>
                    Customer Details
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <p style={{ margin: '0 0 8px 0', fontSize: '13px' }}>
                        <span style={{ fontWeight: '700', color: '#475569' }}>Name:</span>{' '}
                        <span style={{ color: '#1e293b' }}>{ledgerData.customer.name}</span>
                      </p>
                      {ledgerData.customer.mobile && (
                        <p style={{ margin: '0 0 8px 0', fontSize: '13px' }}>
                          <span style={{ fontWeight: '700', color: '#475569' }}>Mobile:</span>{' '}
                          <span style={{ color: '#1e293b' }}>{ledgerData.customer.mobile}</span>
                        </p>
                      )}
                      {ledgerData.customer.email && (
                        <p style={{ margin: '0 0 8px 0', fontSize: '13px' }}>
                          <span style={{ fontWeight: '700', color: '#475569' }}>Email:</span>{' '}
                          <span style={{ color: '#1e293b' }}>{ledgerData.customer.email}</span>
                        </p>
                      )}
                    </div>
                    <div>
                      {ledgerData.customer.address && (
                        <p style={{ margin: '0 0 8px 0', fontSize: '13px' }}>
                          <span style={{ fontWeight: '700', color: '#475569' }}>Address:</span>{' '}
                          <span style={{ color: '#1e293b' }}>{ledgerData.customer.address}</span>
                        </p>
                      )}
                      {ledgerData.customer.city && (
                        <p style={{ margin: '0 0 8px 0', fontSize: '13px' }}>
                          <span style={{ fontWeight: '700', color: '#475569' }}>City:</span>{' '}
                          <span style={{ color: '#1e293b' }}>
                            {ledgerData.customer.city}{ledgerData.customer.state ? `, ${ledgerData.customer.state}` : ''}{ledgerData.customer.pincode ? ` - ${ledgerData.customer.pincode}` : ''}
                          </span>
                        </p>
                      )}
                      {ledgerData.customer.gstin && (
                        <p style={{ margin: '0', fontSize: '13px' }}>
                          <span style={{ fontWeight: '700', color: '#475569' }}>GSTIN:</span>{' '}
                          <span style={{ color: '#1e293b' }}>{ledgerData.customer.gstin}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Transaction Table */}
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse', 
                  fontSize: '12px',
                  marginBottom: '20px',
                  border: '1px solid #cbd5e1'
                }}>
                  <thead>
                    <tr style={{ 
                      backgroundColor: '#1e40af', 
                      color: '#ffffff'
                    }}>
                      <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: '700', fontSize: '12px' }}>Date</th>
                      <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: '700', fontSize: '12px' }}>Particulars</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: '700', fontSize: '12px' }}>Ref No</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: '700', fontSize: '12px' }}>Vch Type</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: '700', fontSize: '12px' }}>Vch No.</th>
                      <th style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '700', fontSize: '12px' }}>Debit (₹)</th>
                      <th style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '700', fontSize: '12px' }}>Credit (₹)</th>
                      <th style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '700', fontSize: '12px' }}>Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerData.transactions.map((transaction, index) => (
                      <tr key={index} style={{ 
                        backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc',
                        borderBottom: '1px solid #e2e8f0',
                        pageBreakInside: 'avoid'
                      }}>
                        <td style={{ padding: '10px', color: '#475569', fontSize: '12px', verticalAlign: 'middle' }}>
                          {formatLedgerDate(transaction.date)}
                        </td>
                        <td style={{ padding: '10px', color: '#1e293b', fontSize: '12px', fontWeight: '500', verticalAlign: 'middle' }}>
                          {transaction.particulars}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', color: '#64748b', fontSize: '11px', verticalAlign: 'middle' }}>
                          {transaction.refNo}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', fontSize: '11px', verticalAlign: 'middle' }}>
                          <span style={{ 
                            display: 'inline-block',
                            padding: '5px 12px', 
                            borderRadius: '5px',
                            backgroundColor: 
                              transaction.voucherType === 'Sales' || transaction.voucherType === 'Invoice' ? '#dbeafe' :
                              transaction.voucherType === 'Receipt' || transaction.voucherType === 'Payment' ? '#dcfce7' :
                              transaction.voucherType === 'Journal' ? '#fef3c7' :
                              transaction.voucherType === 'Credit Note' ? '#fce7f3' :
                              '#f1f5f9',
                            color:
                              transaction.voucherType === 'Sales' || transaction.voucherType === 'Invoice' ? '#1e40af' :
                              transaction.voucherType === 'Receipt' || transaction.voucherType === 'Payment' ? '#15803d' :
                              transaction.voucherType === 'Journal' ? '#a16207' :
                              transaction.voucherType === 'Credit Note' ? '#9f1239' :
                              '#475569',
                            fontWeight: '700',
                            fontSize: '10px',
                            lineHeight: '1',
                            whiteSpace: 'nowrap'
                          }}>
                            {transaction.voucherType}
                          </span>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', color: '#64748b', fontSize: '11px', verticalAlign: 'middle' }}>
                          {transaction.voucherNo}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', color: '#dc2626', fontWeight: '700', fontSize: '12px', verticalAlign: 'middle' }}>
                          {transaction.debit > 0 ? transaction.debit.toLocaleString() : '-'}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', color: '#16a34a', fontWeight: '700', fontSize: '12px', verticalAlign: 'middle' }}>
                          {transaction.credit > 0 ? transaction.credit.toLocaleString() : '-'}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', fontSize: '12px', color: '#1e293b', verticalAlign: 'middle' }}>
                          {transaction.balance.toLocaleString()} 
                          <span style={{ 
                            fontSize: '10px', 
                            marginLeft: '4px',
                            color: transaction.balanceType === 'Dr' ? '#dc2626' : '#16a34a',
                            fontWeight: '700'
                          }}>
                            {transaction.balanceType}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ 
                      backgroundColor: '#1e40af', 
                      color: '#ffffff',
                      fontWeight: 'bold'
                    }}>
                      <td colSpan={5} style={{ padding: '14px 10px', fontSize: '14px', fontWeight: '700' }}>
                        TOTAL
                      </td>
                      <td style={{ padding: '14px 10px', textAlign: 'right', fontSize: '14px', fontWeight: '700' }}>
                        {ledgerData.summary.totalDebits.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 10px', textAlign: 'right', fontSize: '14px', fontWeight: '700' }}>
                        {ledgerData.summary.totalCredits.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 10px', textAlign: 'right', fontSize: '14px', fontWeight: '700' }}>
                        {ledgerData.summary.closingBalance.toLocaleString()} {ledgerData.summary.closingBalanceType}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Summary Section */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr 1fr 1fr', 
                  gap: '15px',
                  marginBottom: '25px'
                }}>
                  <div style={{ 
                    backgroundColor: '#fef3c7', 
                    padding: '18px', 
                    borderRadius: '8px',
                    border: '2px solid #fbbf24'
                  }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#92400e', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Opening Balance
                    </p>
                    <p style={{ margin: '0', fontSize: '20px', fontWeight: 'bold', color: '#a16207' }}>
                      ₹{Math.abs(ledgerData.summary.openingBalance).toLocaleString()} 
                      <span style={{ fontSize: '14px', marginLeft: '6px' }}>
                        {ledgerData.summary.openingBalance >= 0 ? 'Dr' : 'Cr'}
                      </span>
                    </p>
                  </div>
                  <div style={{ 
                    backgroundColor: '#fee2e2', 
                    padding: '18px', 
                    borderRadius: '8px',
                    border: '2px solid #fecaca'
                  }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#991b1b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Total Debits
                    </p>
                    <p style={{ margin: '0', fontSize: '20px', fontWeight: 'bold', color: '#dc2626' }}>
                      ₹{ledgerData.summary.totalDebits.toLocaleString()}
                    </p>
                  </div>
                  <div style={{ 
                    backgroundColor: '#dcfce7', 
                    padding: '18px', 
                    borderRadius: '8px',
                    border: '2px solid #bbf7d0'
                  }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#14532d', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Total Credits
                    </p>
                    <p style={{ margin: '0', fontSize: '20px', fontWeight: 'bold', color: '#16a34a' }}>
                      ₹{ledgerData.summary.totalCredits.toLocaleString()}
                    </p>
                  </div>
                  <div style={{ 
                    backgroundColor: '#dbeafe', 
                    padding: '18px', 
                    borderRadius: '8px',
                    border: '2px solid #93c5fd'
                  }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#1e3a8a', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Closing Balance
                    </p>
                    <p style={{ margin: '0', fontSize: '20px', fontWeight: 'bold', color: '#1e40af' }}>
                      ₹{ledgerData.summary.closingBalance.toLocaleString()} 
                      <span style={{ fontSize: '14px', marginLeft: '6px' }}>
                        {ledgerData.summary.closingBalanceType}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ 
                  marginTop: '30px',
                  paddingTop: '15px',
                  borderTop: '2px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <p style={{ margin: '0', fontSize: '11px', color: '#64748b' }}>
                      Generated on {format(new Date(), 'dd MMM yyyy, hh:mm a')}
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#94a3b8' }}>
                      This is a computer-generated document and does not require a signature
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: '0', fontSize: '13px', fontWeight: '700', color: '#1e40af' }}>
                      {companyProfile?.legalName || 'Company Name'}
                    </p>
                    {companyProfile?.regCity && companyProfile?.regState && (
                      <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#64748b' }}>
                        {companyProfile.regCity}, {companyProfile.regState}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
