import { Layout } from "@/components/layout";
import { useParams, Link } from "wouter";
import { useGetQuote, useUpdateQuoteStatus, useGenerateQuoteShareToken, getGetQuoteQueryKey, getListQuotesQueryKey, getGetQuotesSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, Printer, Phone, Download, MessageCircle, Mail, Pencil, FileSpreadsheet, CheckCircle2, XCircle, Clock, Share2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import * as XLSX from "xlsx";

const ORDER_PHONE = "054-8070533";

const STATUS_LABELS: Record<string, string> = {
  pending: "ממתינה",
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

export default function QuoteDetail() {
  const params = useParams();
  const quoteId = parseInt(params.id || "0", 10);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: quote, isLoading } = useGetQuote(quoteId, {
    query: { enabled: !!quoteId, queryKey: getGetQuoteQueryKey(quoteId) },
  });
  const updateStatus = useUpdateQuoteStatus();
  const generateShareToken = useGenerateQuoteShareToken();

  const handleShare = () => {
    generateShareToken.mutate(
      { id: quoteId },
      {
        onSuccess: (data) => {
          const url = `${window.location.origin}${import.meta.env.BASE_URL}q/${data.shareToken}`;
          setShareUrl(url);
        },
        onError: () => toast({ title: "שגיאה ביצירת קישור שיתוף", variant: "destructive" }),
      }
    );
  };

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      toast({ title: "הקישור הועתק ללוח" });
      setTimeout(() => setCopied(false), 2000);
    });
  };

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
      lines.push(`• ${item.description} | כמות: ${item.quantity} | סה"כ: ${formatCurrency(item.totalPrice)}`);
    });
    lines.push("");
    lines.push(`*סה"כ לתשלום: ${formatCurrency(quote.totalAmount)}*`);
    if (quote.notes) { lines.push(""); lines.push(`הערות: ${quote.notes}`); }
    lines.push(""); lines.push(`טלפון להזמנות: ${ORDER_PHONE}`);

    let phone = "";
    if (quote.customerPhone) {
      const digits = quote.customerPhone.replace(/\D/g, "");
      if (digits.startsWith("0")) {
        phone = "972" + digits.slice(1);
      } else {
        phone = digits;
      }
    }

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
  };

  const handleEmail = () => {
    if (!quote) return;
    const subject = `הצעת מחיר #${quote.id} — דרך השמש`;
    const bodyLines: string[] = [];
    bodyLines.push(`שלום ${quote.contactName || quote.customerName},`);
    bodyLines.push("");
    bodyLines.push(`מצ"ב הצעת מחיר מס' ${quote.id} מתאריך ${formatDate(quote.date)}.`);
    bodyLines.push("");
    bodyLines.push("פירוט הפריטים:");
    quote.items.forEach((item) => {
      bodyLines.push(`  • ${item.description} | כמות: ${item.quantity} | סה"כ: ${formatCurrency(item.totalPrice)}`);
    });
    bodyLines.push("");
    bodyLines.push(`סה"כ לתשלום: ${formatCurrency(quote.totalAmount)}`);
    if (quote.notes) { bodyLines.push(""); bodyLines.push(`הערות: ${quote.notes}`); }
    bodyLines.push("");
    bodyLines.push("לפרטים ולהזמנות:");
    bodyLines.push(`טלפון: ${ORDER_PHONE}`);
    bodyLines.push("");
    bodyLines.push("תודה שבחרת בדרך השמש!");

    const mailto = `mailto:${quote.email ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
    window.open(mailto, "_blank");
  };

  const handleExcelExport = () => {
    if (!quote) return;
    const wb = XLSX.utils.book_new();
    const headerRows = [
      ["הצעת מחיר", `#${quote.id}`],
      ["תאריך", quote.date],
      ["לכבוד", quote.customerName],
    ];
    if (quote.contactName) headerRows.push(["לידי", quote.contactName]);
    if (quote.customerPhone) headerRows.push(["טלפון", quote.customerPhone]);
    if (quote.email) headerRows.push(["אימייל", quote.email]);
    if (quote.notes) headerRows.push(["הערות", quote.notes]);
    headerRows.push([]);
    headerRows.push(["ברקוד", "תיאור פריט", "משקל יחידה (ק\"ג)", "מחיר לק\"ג", "כמות", "סה\"כ משקל (ק\"ג)", "סה\"כ מחיר (₪)"]);

    const itemRows = quote.items.map((item) => [
      item.barcode,
      item.description,
      item.weightKg,
      item.pricePerKg,
      item.quantity,
      item.weightKg * item.quantity,
      item.totalPrice,
    ]);

    const totalRow: (string | number)[] = [];
    totalRow.push("", "", "", "", "", "סה\"כ לתשלום:", quote.totalAmount);

    const allRows = [...headerRows, ...itemRows, [], totalRow];
    const ws = XLSX.utils.aoa_to_sheet(allRows);

    ws["!cols"] = [
      { wch: 14 }, { wch: 30 }, { wch: 18 }, { wch: 14 }, { wch: 8 }, { wch: 20 }, { wch: 18 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "הצעת מחיר");
    XLSX.writeFile(wb, `הצעת-מחיר-${quote.id}-${quote.customerName}.xlsx`);
    toast({ title: "קובץ האקסל הורד בהצלחה" });
  };

  const handleStatusChange = (status: "pending" | "approved" | "cancelled") => {
    updateStatus.mutate(
      { id: quoteId, data: { status } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetQuoteQueryKey(quoteId) });
          queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetQuotesSummaryQueryKey() });
          toast({ title: `סטטוס עודכן: ${STATUS_LABELS[status]}` });
        },
        onError: () => toast({ title: "שגיאה בעדכון סטטוס", variant: "destructive" }),
      }
    );
  };

  if (isLoading) {
    return <Layout><div className="p-12 text-center text-muted-foreground">טוען הצעת מחיר...</div></Layout>;
  }

  if (!quote) {
    return <Layout><div className="p-12 text-center">הצעת המחיר לא נמצאה</div></Layout>;
  }

  const status = quote.status ?? "pending";

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

        <div className="flex gap-2 flex-wrap items-center">
          {/* Status badge + quick actions */}
          <div className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border ${STATUS_COLORS[status]}`}>
            {STATUS_ICONS[status]}
            {STATUS_LABELS[status]}
          </div>

          {status !== "approved" && (
            <Button size="sm" variant="outline" className="gap-1.5 border-green-400 text-green-700 hover:bg-green-50" onClick={() => handleStatusChange("approved")} disabled={updateStatus.isPending}>
              <CheckCircle2 className="w-4 h-4" />
              אשר הצעה
            </Button>
          )}
          {status !== "cancelled" && (
            <Button size="sm" variant="outline" className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50" onClick={() => handleStatusChange("cancelled")} disabled={updateStatus.isPending}>
              <XCircle className="w-4 h-4" />
              בטל הצעה
            </Button>
          )}
          {status !== "pending" && (
            <Button size="sm" variant="outline" className="gap-1.5 border-yellow-300 text-yellow-700 hover:bg-yellow-50" onClick={() => handleStatusChange("pending")} disabled={updateStatus.isPending}>
              <Clock className="w-4 h-4" />
              החזר לממתינה
            </Button>
          )}

          <div className="w-px h-6 bg-border mx-1" />

          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            disabled={generateShareToken.isPending}
            className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50"
            data-testid="button-share"
          >
            <Share2 className="w-4 h-4" />
            שתף ללקוח
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          <Button variant="outline" size="sm" asChild>
            <Link href={`/quotes/${quoteId}/edit`}>
              <Pencil className="w-4 h-4 ml-2" />
              ערוך
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExcelExport} className="gap-2" data-testid="button-export-excel">
            <FileSpreadsheet className="w-4 h-4" />
            אקסל
          </Button>
          <Button variant="outline" size="sm" onClick={handleWhatsApp} className="gap-2" data-testid="button-whatsapp">
            <MessageCircle className="w-4 h-4" />
            וואטסאפ
          </Button>
          <Button variant="outline" size="sm" onClick={handleEmail} className="gap-2" data-testid="button-email" disabled={!quote?.email}>
            <Mail className="w-4 h-4" />
            מייל
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} className="gap-2" data-testid="button-download-pdf">
            <Download className="w-4 h-4" />
            PDF
          </Button>
          <Button size="sm" onClick={handlePrint} className="gap-2 shadow-sm" data-testid="button-print">
            <Printer className="w-4 h-4" />
            הדפס
          </Button>
        </div>
      </div>

      {/* Share link panel */}
      {shareUrl && (
        <div className="mb-6 print:hidden bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-blue-700 mb-1">קישור לשיתוף עם הלקוח</p>
            <p className="text-sm font-mono text-blue-900 break-all">{shareUrl}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyLink}
            className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-100 shrink-0"
            data-testid="button-copy-share-link"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "הועתק!" : "העתק קישור"}
          </Button>
        </div>
      )}

      {/* Printable area */}
      <div
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
            <h2 className="text-2xl font-bold mb-2" style={{ color: "#8B7040" }}>הצעת מחיר</h2>
            <p className="text-gray-500 font-mono text-sm">#{quote.id}</p>
            <p className="text-gray-600 mt-1">{formatDate(quote.date)}</p>
            <div className={`inline-flex items-center gap-1 mt-2 text-xs px-2 py-0.5 rounded-full border font-medium print:hidden ${STATUS_COLORS[status]}`}>
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
                  <TableRow key={item.id} className="border-gray-100 hover:bg-transparent" style={{ backgroundColor: idx % 2 === 0 ? "white" : "#faf8f4" }} data-testid={`row-quote-item-${item.id}`}>
                    <TableCell className="font-mono text-gray-500 py-3 text-sm">{item.barcode}</TableCell>
                    <TableCell className="font-medium py-3">{item.description}</TableCell>
                    <TableCell className="py-3">{formatNumber(totalWeight)}</TableCell>
                    <TableCell className="py-3">{formatCurrency(item.pricePerKg)}</TableCell>
                    <TableCell className="py-3 font-semibold">{item.quantity}</TableCell>
                    <TableCell className="font-bold py-3" style={{ color: "#8B7040" }} data-testid={`text-item-total-${item.id}`}>
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
              <span className="text-2xl font-bold" style={{ color: "#8B7040" }} data-testid="text-quote-total">
                {formatCurrency(quote.totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2 text-base font-semibold px-6 py-3 rounded-lg" style={{ backgroundColor: "#f5f0e8", color: "#5a4a2a" }} data-testid="text-order-phone">
            <Phone className="w-4 h-4" />
            <span>טלפון להזמנות: <span dir="ltr">{ORDER_PHONE}</span></span>
          </div>
          <p className="text-gray-400 text-sm mt-2">תודה שבחרת בדרך השמש!</p>
        </div>
      </div>
    </Layout>
  );
}
