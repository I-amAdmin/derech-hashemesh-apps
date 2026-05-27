import { useParams } from "wouter";
import { useGetPublicQuote, useApprovePublicQuote, getGetPublicQuoteQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Phone, Mail, CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
import { useState } from "react";

const ORDER_PHONE = "054-8070533";

const STATUS_LABELS: Record<string, string> = {
  pending: "ממתינה לאישור",
  approved: "אושרה",
  cancelled: "בוטלה",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  approved: "bg-green-100 text-green-800 border-green-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-4 h-4" />,
  approved: <CheckCircle2 className="w-4 h-4" />,
  cancelled: <XCircle className="w-4 h-4" />,
};

export default function QuotePublic() {
  const params = useParams();
  const token = params.token || "";
  const queryClient = useQueryClient();
  const [approveSuccess, setApproveSuccess] = useState(false);

  const { data: quote, isLoading, isError } = useGetPublicQuote(token, {
    query: { enabled: !!token, queryKey: getGetPublicQuoteQueryKey(token) },
  });

  const approveQuote = useApprovePublicQuote();

  const handleApprove = () => {
    approveQuote.mutate(
      { token },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetPublicQuoteQueryKey(token) });
          setApproveSuccess(true);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p>טוען הצעת מחיר...</p>
        </div>
      </div>
    );
  }

  if (isError || !quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">הקישור אינו תקף</h1>
          <p className="text-gray-500">הצעת המחיר לא נמצאה או שהקישור פג תוקפו.</p>
        </div>
      </div>
    );
  }

  const status = quote.status ?? "pending";

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* Customer approval banner */}
        {status === "pending" && !approveSuccess && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-5 flex flex-col sm:flex-row items-center gap-4 justify-between shadow-sm">
            <div>
              <h2 className="text-base font-semibold text-blue-900">לאישור הצעת המחיר</h2>
              <p className="text-sm text-blue-700 mt-0.5">לחץ על "אני מאשר" כדי לאשר את הצעת המחיר ולעדכן את הסטטוס.</p>
            </div>
            <Button
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white gap-2 whitespace-nowrap shadow-sm"
              onClick={handleApprove}
              disabled={approveQuote.isPending}
              data-testid="button-approve-quote"
            >
              {approveQuote.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              אני מאשר
            </Button>
          </div>
        )}

        {(status === "approved" || approveSuccess) && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-5 flex items-center gap-3 shadow-sm">
            <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-green-900">הצעת המחיר אושרה!</h2>
              <p className="text-sm text-green-700 mt-0.5">קיבלנו את אישורך. ניצור איתך קשר בהמשך.</p>
            </div>
          </div>
        )}

        {status === "cancelled" && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-5 flex items-center gap-3 shadow-sm">
            <XCircle className="w-6 h-6 text-red-500 shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-red-900">הצעת המחיר בוטלה</h2>
              <p className="text-sm text-red-700 mt-0.5">לפרטים נוספים צרו קשר עמנו.</p>
            </div>
          </div>
        )}

        {/* Quote document */}
        <div className="bg-white text-black p-8 rounded-xl shadow-sm border border-gray-200">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 pb-6 mb-8" style={{ borderColor: "#8B7040" }}>
            <div className="flex flex-col gap-1">
              <img src="/logo.png" alt="דרך השמש" className="h-20 w-auto object-contain" />
              <p className="text-sm text-gray-500 mt-1">סיטונאות מזון וחקלאות</p>
            </div>
            <div className="text-left bg-gray-50 p-4 rounded-md min-w-[180px]">
              <h2 className="text-2xl font-bold mb-2" style={{ color: "#8B7040" }}>הצעת מחיר</h2>
              <p className="text-gray-500 font-mono text-sm">#{quote.id}</p>
              <p className="text-gray-600 mt-1">{formatDate(quote.date)}</p>
              <div className={`inline-flex items-center gap-1 mt-2 text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[status]}`}>
                {STATUS_ICONS[status]}
                {STATUS_LABELS[status]}
              </div>
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
                <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /><span dir="ltr">{quote.customerPhone}</span></div>
              )}
              {quote.email && (
                <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /><span dir="ltr">{quote.email}</span></div>
              )}
            </div>
          </div>

          {/* Items table */}
          <div className="mb-8">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="hover:bg-transparent" style={{ backgroundColor: "#f5f0e8" }}>
                  {["ברקוד", "תיאור פריט", 'סה"כ משקל (ק"ג)', 'מחיר לק"ג', "כמות להזמנה", 'סה"כ מחיר'].map((h) => (
                    <TableHead key={h} className="text-right font-semibold py-3 border-b border-gray-200" style={{ color: "#5a4a2a" }}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {quote.items.map((item, idx) => {
                  const totalWeight = item.weightKg * item.quantity;
                  return (
                    <TableRow key={item.id} className="border-gray-100 hover:bg-transparent" style={{ backgroundColor: idx % 2 === 0 ? "white" : "#faf8f4" }}>
                      <TableCell className="font-mono text-gray-500 py-3 text-sm">{item.barcode}</TableCell>
                      <TableCell className="font-medium py-3">{item.description}</TableCell>
                      <TableCell className="py-3">{formatNumber(totalWeight)}</TableCell>
                      <TableCell className="py-3">{formatCurrency(item.pricePerKg)}</TableCell>
                      <TableCell className="py-3 font-semibold">{item.quantity}</TableCell>
                      <TableCell className="font-bold py-3" style={{ color: "#8B7040" }}>
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
                <span className="font-medium">{quote.items.reduce((acc, item) => acc + item.quantity, 0)}</span>
              </div>
              <div className="h-px w-full my-3" style={{ backgroundColor: "#c8b890" }} />
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">סה"כ לתשלום</span>
                <span className="text-2xl font-bold" style={{ color: "#8B7040" }}>
                  {formatCurrency(quote.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-gray-200 flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-2 text-base font-semibold px-6 py-3 rounded-lg" style={{ backgroundColor: "#f5f0e8", color: "#5a4a2a" }}>
              <Phone className="w-4 h-4" />
              <span>טלפון להזמנות: <span dir="ltr">{ORDER_PHONE}</span></span>
            </div>
            <p className="text-gray-400 text-sm mt-2">תודה שבחרת בדרך השמש!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
