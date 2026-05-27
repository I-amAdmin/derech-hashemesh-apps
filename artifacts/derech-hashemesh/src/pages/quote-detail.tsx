import { Layout } from "@/components/layout";
import { useParams, Link } from "wouter";
import { useGetQuote } from "@workspace/api-client-react";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, Printer, Phone } from "lucide-react";

export default function QuoteDetail() {
  const params = useParams();
  const quoteId = parseInt(params.id || "0", 10);
  
  const { data: quote, isLoading } = useGetQuote(quoteId, { 
    query: { enabled: !!quoteId } 
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-12 text-center text-muted-foreground">טוען הצעת מחיר...</div>
      </Layout>
    );
  }

  if (!quote) {
    return (
      <Layout>
        <div className="p-12 text-center">הצעת המחיר לא נמצאה</div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Non-printable action bar */}
      <div className="flex justify-between items-center mb-8 print:hidden">
        <Button variant="outline" size="sm" asChild>
          <Link href="/quotes">
            <ArrowRight className="w-4 h-4 ml-2" />
            חזור להצעות מחיר
          </Link>
        </Button>
        <Button onClick={handlePrint} className="shadow-sm">
          <Printer className="w-4 h-4 ml-2" />
          הדפס הצעת מחיר
        </Button>
      </div>

      {/* Printable Area */}
      <div className="bg-white text-black p-8 rounded-lg shadow-sm border border-gray-200 print:shadow-none print:border-none print:p-0 max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-primary pb-6 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-1">דרך השמש</h1>
            <p className="text-lg text-gray-600">סיטונאות מזון וחקלאות</p>
          </div>
          <div className="text-left bg-gray-50 p-4 rounded-md">
            <h2 className="text-2xl font-bold mb-2">הצעת מחיר</h2>
            <p className="text-gray-600 font-mono">#{quote.id}</p>
            <p className="text-gray-600">{formatDate(quote.date)}</p>
          </div>
        </div>

        {/* Customer Info */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">לכבוד</h3>
          <div className="text-xl font-bold">{quote.customerName}</div>
          {quote.customerPhone && (
            <div className="flex items-center text-gray-600 mt-1">
              <Phone className="w-4 h-4 ml-2" />
              <span dir="ltr">{quote.customerPhone}</span>
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <Table className="w-full">
            <TableHeader className="bg-gray-100/50">
              <TableRow className="border-gray-200 hover:bg-transparent">
                <TableHead className="text-right text-gray-600 font-semibold py-3 border-b">ברקוד</TableHead>
                <TableHead className="text-right text-gray-600 font-semibold py-3 border-b">תיאור פריט</TableHead>
                <TableHead className="text-right text-gray-600 font-semibold py-3 border-b">סה"כ משקל (ק"ג)</TableHead>
                <TableHead className="text-right text-gray-600 font-semibold py-3 border-b">מחיר לק"ג</TableHead>
                <TableHead className="text-right text-gray-600 font-semibold py-3 border-b">כמות להזמנה</TableHead>
                <TableHead className="text-right text-gray-600 font-semibold py-3 border-b">סה"כ מחיר</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quote.items.map((item) => {
                const totalWeight = item.weightKg * item.quantity;
                return (
                  <TableRow key={item.id} className="border-gray-100 hover:bg-transparent">
                    <TableCell className="font-mono text-gray-500 py-3">{item.barcode}</TableCell>
                    <TableCell className="font-medium py-3">{item.description}</TableCell>
                    <TableCell className="py-3">{formatNumber(totalWeight)}</TableCell>
                    <TableCell className="py-3">{formatCurrency(item.pricePerKg)}</TableCell>
                    <TableCell className="py-3">{item.quantity}</TableCell>
                    <TableCell className="font-bold py-3">{formatCurrency(item.totalPrice)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Footer & Totals */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 pt-6 border-t border-gray-200">
          <div className="flex-1">
            {quote.notes && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-2">הערות</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
              </div>
            )}
          </div>
          
          <div className="bg-primary/5 p-6 rounded-lg min-w-[300px]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">סה״כ פריטים</span>
              <span className="font-medium">{quote.items.reduce((acc, item) => acc + item.quantity, 0)}</span>
            </div>
            <div className="h-px w-full bg-primary/20 my-4"></div>
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">סה״כ לתשלום</span>
              <span className="text-2xl font-bold text-primary">{formatCurrency(quote.totalAmount)}</span>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center text-gray-400 text-sm print:mt-auto pt-8 border-t border-gray-100">
          <p>תודה שבחרת בדרך השמש!</p>
        </div>
      </div>
    </Layout>
  );
}
