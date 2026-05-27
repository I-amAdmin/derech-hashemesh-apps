import { useRef } from "react";
import { Layout } from "@/components/layout";
import { useParams, Link } from "wouter";
import { useGetQuote, getGetQuoteQueryKey } from "@workspace/api-client-react";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, Printer, Phone, Download, MessageCircle, Mail } from "lucide-react";

const ORDER_PHONE = "054-8070533";

export default function QuoteDetail() {
  const params = useParams();
  const quoteId = parseInt(params.id || "0", 10);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: quote, isLoading } = useGetQuote(quoteId, {
    query: { enabled: !!quoteId, queryKey: getGetQuoteQueryKey(quoteId) },
  });

  const handlePrint = () => window.print();

  const handleDownloadPdf = () => {
    if (!quote) return;
    const prev = document.title;
    document.title = `הצעת-מחיר-${quote.id}-${quote.customerName}`;
    window.print();
    setTimeout(() => { document.title = prev; }, 2000);
  };

  const handleWhatsApp = () => {
    if (!quote) return;
    const lines: string[] = [];
    lines.push(`*הצעת מחיר #${quote.id} — דרך השמש*`);
    lines.push(`תאריך: ${formatDate(quote.date)}`);
    lines.push(`לכבוד: ${quote.customerName}`);
    if (quote.contactName) lines.push(`לידי: ${quote.contactName}`);
    if (quote.customerPhone) lines.push(`טלפון: ${quote.customerPhone}`);
    if (quote.email) lines.push(`מייל: ${quote.email}`);
    lines.push("");
    lines.push("*פריטים:*");
    quote.items.forEach((item) => {
      lines.push(
        `• ${item.description} | כמות: ${item.quantity} | סה"כ: ${formatCurrency(item.totalPrice)}`
      );
    });
    lines.push("");
    lines.push(`*סה"כ לתשלום: ${formatCurrency(quote.totalAmount)}*`);
    if (quote.notes) {
      lines.push("");
      lines.push(`הערות: ${quote.notes}`);
    }
    lines.push("");
    lines.push(`טלפון להזמנות: ${ORDER_PHONE}`);
    const text = encodeURIComponent(lines.join("\n"));
    window.open(`https://wa.me/?text=${text}`, "_blank");
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
      {/* Action bar — hidden on print */}
      <div className="flex flex-wrap justify-between items-center mb-8 gap-3 print:hidden">
        <Button variant="outline" size="sm" asChild>
          <Link href="/quotes">
            <ArrowRight className="w-4 h-4 ml-2" />
            חזור
          </Link>
        </Button>

        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleWhatsApp} className="gap-2" data-testid="button-whatsapp">
            <MessageCircle className="w-4 h-4" />
            שלח בוואטסאפ
          </Button>
          <Button variant="outline" onClick={handleDownloadPdf} className="gap-2" data-testid="button-download-pdf">
            <Download className="w-4 h-4" />
            הורד PDF
          </Button>
          <Button onClick={handlePrint} className="gap-2 shadow-sm" data-testid="button-print">
            <Printer className="w-4 h-4" />
            הדפס
          </Button>
        </div>
      </div>

      {/* Printable area */}
      <div
        ref={printRef}
        className="bg-white text-black p-8 rounded-lg shadow-sm border border-gray-200 print:shadow-none print:border-none print:p-0 max-w-4xl mx-auto"
        data-testid="quote-printable"
      >
        {/* Header with logo */}
        <div className="flex justify-between items-start border-b-2 pb-6 mb-8" style={{ borderColor: "#8B7040" }}>
          <div className="flex flex-col gap-1">
            <img src="/logo.png" alt="דרך השמש" className="h-20 w-auto object-contain" />
            <p className="text-sm text-gray-500 mt-1">סיטונאות מזון וחקלאות</p>
          </div>
          <div className="text-left bg-gray-50 p-4 rounded-md min-w-[180px]">
            <h2 className="text-2xl font-bold mb-2" style={{ color: "#8B7040" }}>
              הצעת מחיר
            </h2>
            <p className="text-gray-500 font-mono text-sm">#{quote.id}</p>
            <p className="text-gray-600 mt-1">{formatDate(quote.date)}</p>
          </div>
        </div>

        {/* Customer info */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">לכבוד</span>
              <div className="text-xl font-bold mt-0.5">{quote.customerName}</div>
            </div>
            {quote.contactName && (
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">לידי</span>
                <div className="text-base mt-0.5">{quote.contactName}</div>
              </div>
            )}
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            {quote.customerPhone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span dir="ltr">{quote.customerPhone}</span>
              </div>
            )}
            {quote.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span dir="ltr">{quote.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Items table */}
        <div className="mb-8">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="hover:bg-transparent" style={{ backgroundColor: "#f5f0e8" }}>
                {["ברקוד", "תיאור פריט", 'סה"כ משקל (ק"ג)', 'מחיר לק"ג', "כמות להזמנה", 'סה"כ מחיר'].map(
                  (h) => (
                    <TableHead
                      key={h}
                      className="text-right font-semibold py-3 border-b border-gray-200"
                      style={{ color: "#5a4a2a" }}
                    >
                      {h}
                    </TableHead>
                  )
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {quote.items.map((item, idx) => {
                const totalWeight = item.weightKg * item.quantity;
                return (
                  <TableRow
                    key={item.id}
                    className="border-gray-100 hover:bg-transparent"
                    style={{ backgroundColor: idx % 2 === 0 ? "white" : "#faf8f4" }}
                    data-testid={`row-quote-item-${item.id}`}
                  >
                    <TableCell className="font-mono text-gray-500 py-3 text-sm">{item.barcode}</TableCell>
                    <TableCell className="font-medium py-3">{item.description}</TableCell>
                    <TableCell className="py-3">{formatNumber(totalWeight)}</TableCell>
                    <TableCell className="py-3">{formatCurrency(item.pricePerKg)}</TableCell>
                    <TableCell className="py-3 font-semibold">{item.quantity}</TableCell>
                    <TableCell
                      className="font-bold py-3"
                      style={{ color: "#8B7040" }}
                      data-testid={`text-item-total-${item.id}`}
                    >
                      {formatCurrency(item.totalPrice)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Totals + notes */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 pt-6 border-t border-gray-200">
          <div className="flex-1">
            {quote.notes && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">הערות</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
              </div>
            )}
          </div>
          <div className="p-6 rounded-lg min-w-[280px]" style={{ backgroundColor: "#f5f0e8" }}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">סה"כ פריטים</span>
              <span className="font-medium">
                {quote.items.reduce((acc, item) => acc + item.quantity, 0)}
              </span>
            </div>
            <div className="h-px w-full my-3" style={{ backgroundColor: "#c8b890" }} />
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">סה"כ לתשלום</span>
              <span className="text-2xl font-bold" style={{ color: "#8B7040" }} data-testid="text-quote-total">
                {formatCurrency(quote.totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 flex flex-col items-center gap-2 text-center">
          <div
            className="flex items-center gap-2 text-base font-semibold px-6 py-3 rounded-lg"
            style={{ backgroundColor: "#f5f0e8", color: "#5a4a2a" }}
            data-testid="text-order-phone"
          >
            <Phone className="w-4 h-4" />
            <span>טלפון להזמנות: <span dir="ltr">{ORDER_PHONE}</span></span>
          </div>
          <p className="text-gray-400 text-sm mt-2">תודה שבחרת בדרך השמש!</p>
        </div>
      </div>
    </Layout>
  );
}
