import { useState, useMemo, useEffect } from "react";
import { Layout } from "@/components/layout";
import {
  useListProducts,
  useCreateQuote,
  useListCustomers,
  getListQuotesQueryKey,
  getGetQuotesSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { formatCurrency, formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Trash2, Plus, ArrowRight, Search, Check, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const quoteItemSchema = z.object({
  productId: z.number(),
  quantity: z.coerce.number().min(1, "כמות חייבת להיות לפחות 1"),
  customPricePerKg: z.coerce.number().min(0, "מחיר לא יכול להיות שלילי"),
});

const quoteSchema = z.object({
  customerName: z.string().min(1, "שדה חובה"),
  contactName: z.string().optional(),
  customerPhone: z.string().optional(),
  email: z.string().email("כתובת מייל לא תקינה").optional().or(z.literal("")),
  date: z.string().min(1, "שדה חובה"),
  notes: z.string().optional(),
  items: z.array(quoteItemSchema).min(1, "יש להוסיף לפחות פריט אחד"),
});

type QuoteFormValues = z.infer<typeof quoteSchema>;

export default function QuoteNew() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: products, isLoading: isLoadingProducts } = useListProducts();
  const { data: customers } = useListCustomers();
  const createQuote = useCreateQuote();

  const [productSearch, setProductSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<Set<number>>(new Set());
  const [selectorPage, setSelectorPage] = useState(0);
  const PAGE_SIZE = 50;

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      customerName: "",
      contactName: "",
      customerPhone: "",
      email: "",
      date: format(new Date(), "yyyy-MM-dd"),
      notes: "",
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const items = form.watch("items");

  useEffect(() => {
    if (!products || products.length === 0) return;
    const stored = sessionStorage.getItem("preselected_products");
    if (!stored) return;
    sessionStorage.removeItem("preselected_products");
    try {
      const ids: number[] = JSON.parse(stored);
      if (!Array.isArray(ids) || ids.length === 0) return;
      ids.forEach((id) => {
        const product = products.find((p) => p.id === id);
        if (product) {
          append({ productId: product.id, quantity: 1, customPricePerKg: product.pricePerKg });
        }
      });
    } catch {
      // ignore malformed data
    }
  }, [products]);

  const fillFromCustomer = (customerId: number) => {
    const c = customers?.find((c) => c.id === customerId);
    if (!c) return;
    form.setValue("customerName", c.businessName);
    form.setValue("contactName", c.contactName ?? "");
    form.setValue("customerPhone", c.phone ?? "");
    form.setValue("email", c.email ?? "");
  };

  const departments = useMemo(() => {
    return [...new Set((products ?? []).map((p) => p.department || "כללי"))].sort((a, b) =>
      a.localeCompare(b, "he")
    );
  }, [products]);

  const filteredProducts = useMemo(() => {
    return (products ?? []).filter((p) => {
      const matchesSearch =
        p.description.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.barcode.includes(productSearch);
      const matchesDept = !selectedDept || (p.department || "כללי") === selectedDept;
      return matchesSearch && matchesDept;
    });
  }, [products, productSearch, selectedDept]);

  useEffect(() => { setSelectorPage(0); }, [productSearch, selectedDept]);

  const pagedProducts = useMemo(
    () => filteredProducts.slice(selectorPage * PAGE_SIZE, (selectorPage + 1) * PAGE_SIZE),
    [filteredProducts, selectorPage]
  );

  const togglePending = (id: number) => {
    setPendingSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const confirmAddProducts = () => {
    const toAdd = (products ?? []).filter(
      (p) => pendingSelection.has(p.id) && !items.some((item) => item.productId === p.id)
    );
    toAdd.forEach((p) => append({ productId: p.id, quantity: 1, customPricePerKg: p.pricePerKg }));
    setPendingSelection(new Set());
    setIsProductSelectorOpen(false);
    setProductSearch("");
    setSelectedDept(null);
  };

  const closeSelectorDialog = () => {
    setPendingSelection(new Set());
    setProductSearch("");
    setSelectedDept(null);
    setIsProductSelectorOpen(false);
  };

  const getProductDetails = (productId: number) => products?.find((p) => p.id === productId);

  const calculateItemTotal = (index: number) => {
    const item = items[index];
    const product = getProductDetails(item?.productId);
    if (!product || !item) return 0;
    const price = item.customPricePerKg ?? product.pricePerKg;
    return price * product.weightKg * (item.quantity || 0);
  };

  const calculateTotal = () =>
    items.reduce((total, _, idx) => total + calculateItemTotal(idx), 0);

  const onSubmit = (data: QuoteFormValues) => {
    createQuote.mutate(
      {
        data: {
          customerName: data.customerName,
          contactName: data.contactName || undefined,
          customerPhone: data.customerPhone || undefined,
          email: data.email || undefined,
          date: data.date,
          notes: data.notes || undefined,
          items: data.items.map((item) => {
            const product = getProductDetails(item.productId);
            const catalogPrice = product?.pricePerKg ?? 0;
            const isCustom = Math.abs(item.customPricePerKg - catalogPrice) > 0.001;
            return {
              productId: item.productId,
              quantity: item.quantity,
              customPricePerKg: isCustom ? item.customPricePerKg : undefined,
            };
          }),
        },
      },
      {
        onSuccess: (newQuote) => {
          queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetQuotesSummaryQueryKey() });
          toast({ title: "הצעת המחיר נוצרה בהצלחה!" });
          setLocation(`/quotes/${newQuote.id}`);
        },
        onError: () => toast({ title: "שגיאה ביצירת הצעת מחיר", variant: "destructive" }),
      }
    );
  };

  return (
    <Layout>
      <div className="flex items-center mb-8 gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation("/quotes")} data-testid="button-back">
          <ArrowRight className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">הצעת מחיר חדשה</h1>
          <p className="text-muted-foreground mt-1">מלא את פרטי הלקוח והוסף מוצרים</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle>פרטי הלקוח</CardTitle>
              {customers && customers.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" type="button" className="gap-2" data-testid="button-pick-customer">
                      בחר מלקוח קיים
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto min-w-[220px]">
                    {customers.map((c) => (
                      <DropdownMenuItem key={c.id} onSelect={() => fillFromCustomer(c.id)} data-testid={`menu-item-customer-${c.id}`}>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{c.businessName}</span>
                          {c.contactName && <span className="text-xs text-muted-foreground">לידי: {c.contactName}</span>}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="customerName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>לכבוד — שם העסק *</FormLabel>
                    <FormControl><Input {...field} placeholder="שם החברה / העסק" data-testid="input-customer-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="contactName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>לידי — שם איש הקשר</FormLabel>
                    <FormControl><Input {...field} placeholder="שם מלא (אופציונלי)" data-testid="input-contact-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="customerPhone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>טלפון</FormLabel>
                    <FormControl><Input {...field} dir="ltr" className="text-left" placeholder="05X-XXXXXXX" data-testid="input-customer-phone" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>אימייל (אופציונלי)</FormLabel>
                    <FormControl><Input {...field} dir="ltr" className="text-left" placeholder="name@example.com" data-testid="input-email" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>תאריך</FormLabel>
                    <FormControl><Input type="date" {...field} data-testid="input-date" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>פריטים להזמנה</CardTitle>
              <Button variant="outline" size="sm" type="button" onClick={() => setIsProductSelectorOpen(true)} data-testid="button-add-item">
                <Plus className="w-4 h-4 ml-2" />
                הוסף פריט
              </Button>
            </CardHeader>
            <CardContent>
              {fields.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-md">
                  לא נבחרו פריטים. לחץ על "הוסף פריט" כדי להתחיל.
                </div>
              ) : (
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="text-right">ברקוד</TableHead>
                        <TableHead className="text-right">תיאור פריט</TableHead>
                        <TableHead className="text-right">משקל יח' (ק"ג)</TableHead>
                        <TableHead className="text-right w-[130px]">מחיר לק"ג</TableHead>
                        <TableHead className="text-right w-[110px]">כמות</TableHead>
                        <TableHead className="text-right">סה"כ</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => {
                        const product = getProductDetails(items[index]?.productId);
                        if (!product) return null;
                        const itemTotal = calculateItemTotal(index);
                        const catalogPrice = product.pricePerKg;
                        const currentPrice = items[index]?.customPricePerKg ?? catalogPrice;
                        const isModified = Math.abs(currentPrice - catalogPrice) > 0.001;

                        return (
                          <TableRow key={field.id} data-testid={`row-item-${index}`}>
                            <TableCell className="font-mono text-sm">{product.barcode}</TableCell>
                            <TableCell className="font-medium">{product.description}</TableCell>
                            <TableCell>{formatNumber(product.weightKg)} ק"ג</TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`items.${index}.customPricePerKg`}
                                render={({ field: pField }) => (
                                  <FormItem className="mb-0">
                                    <FormControl>
                                      <div className="relative">
                                        <Input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          className={`h-8 text-center pr-1 ${isModified ? "border-orange-400 bg-orange-50 font-semibold" : ""}`}
                                          {...pField}
                                          data-testid={`input-price-${index}`}
                                        />
                                        {isModified && (
                                          <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-orange-400" title={`מחיר קטלוג: ${formatCurrency(catalogPrice)}`} />
                                        )}
                                      </div>
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              {isModified && (
                                <div className="text-xs text-orange-500 mt-0.5">קטלוג: {formatCurrency(catalogPrice)}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`items.${index}.quantity`}
                                render={({ field: qField }) => (
                                  <FormItem className="mb-0">
                                    <FormControl>
                                      <Input type="number" min="1" className="h-8 text-center" {...qField} data-testid={`input-quantity-${index}`} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell className="font-bold text-primary">{formatCurrency(itemTotal)}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="text-destructive h-8 w-8 hover:bg-destructive/10" type="button" onClick={() => remove(index)} data-testid={`button-remove-item-${index}`}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {form.formState.errors.items && (
                <p className="text-sm font-medium text-destructive mt-2">{form.formState.errors.items.message}</p>
              )}

              <div className="flex justify-end mt-6">
                <div className="bg-primary/10 p-4 rounded-lg flex items-center gap-6 min-w-[300px] justify-between">
                  <span className="text-lg font-medium">סה"כ לתשלום:</span>
                  <span className="text-2xl font-bold text-primary" data-testid="text-total">
                    {formatCurrency(calculateTotal())}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>הערות נוספות</FormLabel>
                  <FormControl><Input {...field} data-testid="input-notes" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" type="button" onClick={() => setLocation("/quotes")}>ביטול</Button>
            <Button type="submit" size="lg" className="px-8 shadow-md" disabled={createQuote.isPending} data-testid="button-save-quote">
              {createQuote.isPending ? "שומר..." : "שמור הצעת מחיר"}
              <Check className="w-4 h-4 mr-2" />
            </Button>
          </div>
        </form>
      </Form>

      <Dialog open={isProductSelectorOpen} onOpenChange={(open) => { if (!open) closeSelectorDialog(); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle className="flex items-center justify-between">
              <span>בחר מוצרים מהקטלוג</span>
              {pendingSelection.size > 0 && (
                <Badge className="bg-primary text-white text-sm px-3 py-1">
                  {pendingSelection.size} נבחרו
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 flex-1 min-h-0 px-6 pb-3">
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="חיפוש לפי תיאור או ברקוד..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="pr-10" data-testid="input-product-search" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant={selectedDept === null ? "default" : "outline"} size="sm" type="button" onClick={() => setSelectedDept(null)}>כל המחלקות</Button>
              {departments.map((dept) => (
                <Button key={dept} variant={selectedDept === dept ? "default" : "outline"} size="sm" type="button" onClick={() => setSelectedDept(dept)}>
                  {dept}
                  <Badge variant="secondary" className="mr-1 text-xs px-1">{(products ?? []).filter((p) => (p.department || "כללי") === dept).length}</Badge>
                </Button>
              ))}
            </div>
            <div className="overflow-y-auto flex-1 rounded-md border min-h-0">
              {isLoadingProducts ? (
                <div className="p-4 text-center">טוען מוצרים...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">לא נמצאו מוצרים</div>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-[48px] pr-4">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded accent-[#8B7040] cursor-pointer"
                          checked={filteredProducts.filter(p => !items.some(i => i.productId === p.id)).every(p => pendingSelection.has(p.id)) && filteredProducts.some(p => !items.some(i => i.productId === p.id))}
                          ref={(el) => {
                            if (el) {
                              const available = filteredProducts.filter(p => !items.some(i => i.productId === p.id));
                              const selectedCount = available.filter(p => pendingSelection.has(p.id)).length;
                              el.indeterminate = selectedCount > 0 && selectedCount < available.length;
                            }
                          }}
                          onChange={(e) => {
                            const available = filteredProducts.filter(p => !items.some(i => i.productId === p.id));
                            setPendingSelection(prev => {
                              const next = new Set(prev);
                              if (e.target.checked) available.forEach(p => next.add(p.id));
                              else available.forEach(p => next.delete(p.id));
                              return next;
                            });
                          }}
                          aria-label="בחר הכל"
                        />
                      </TableHead>
                      <TableHead className="text-right">תיאור פריט</TableHead>
                      <TableHead className="text-right">מחלקה</TableHead>
                      <TableHead className="text-right text-center">קטן</TableHead>
                      <TableHead className="text-right text-center">בינוני</TableHead>
                      <TableHead className="text-right text-center">גדול</TableHead>
                      <TableHead className="text-right">משקל/כמות</TableHead>
                      <TableHead className="text-right">מחיר לק"ג</TableHead>
                      <TableHead className="text-right">מחיר ליח'</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedProducts.map((p) => {
                      const alreadyAdded = items.some((item) => item.productId === p.id);
                      const isChecked = pendingSelection.has(p.id);
                      return (
                        <TableRow
                          key={p.id}
                          className={alreadyAdded ? "opacity-40 bg-muted/20" : isChecked ? "bg-primary/5 cursor-pointer" : "hover:bg-muted/50 cursor-pointer"}
                          onClick={() => !alreadyAdded && togglePending(p.id)}
                          data-testid={`row-select-product-${p.id}`}
                        >
                          <TableCell className="pr-4">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded accent-[#8B7040] cursor-pointer disabled:cursor-not-allowed"
                              checked={alreadyAdded || isChecked}
                              disabled={alreadyAdded}
                              onChange={() => !alreadyAdded && togglePending(p.id)}
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`checkbox-product-${p.id}`}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{p.description}</div>
                            <div className="text-xs text-muted-foreground font-mono">{p.barcode}</div>
                            {alreadyAdded && <div className="text-xs text-green-600 font-medium">✓ כבר בהצעה</div>}
                          </TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{p.department}</Badge></TableCell>
                          <TableCell className="text-sm text-center">{p.sizeSmall || "—"}</TableCell>
                          <TableCell className="text-sm text-center">{p.sizeMedium || "—"}</TableCell>
                          <TableCell className="text-sm text-center">{p.sizeLarge || "—"}</TableCell>
                          <TableCell className="text-sm">{p.weightOrAmount || "—"}</TableCell>
                          <TableCell className="text-primary font-semibold">{formatCurrency(p.pricePerKg)}</TableCell>
                          <TableCell>{formatCurrency(p.pricePerKg * p.weightKg)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          <div className="border-t px-6 py-3 flex items-center justify-between gap-3 bg-muted/30 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {filteredProducts.length > 0
                  ? `${selectorPage * PAGE_SIZE + 1}–${Math.min((selectorPage + 1) * PAGE_SIZE, filteredProducts.length)} מתוך ${filteredProducts.length}`
                  : "0 מוצרים"}
              </span>
              {filteredProducts.length > PAGE_SIZE && (
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" type="button" disabled={selectorPage === 0} onClick={() => setSelectorPage((p) => p - 1)}>→</Button>
                  <Button variant="outline" size="sm" type="button" disabled={(selectorPage + 1) * PAGE_SIZE >= filteredProducts.length} onClick={() => setSelectorPage((p) => p + 1)}>←</Button>
                </div>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-sm text-muted-foreground">{pendingSelection.size > 0 ? `${pendingSelection.size} נבחרו` : ""}</span>
              <Button variant="outline" type="button" onClick={closeSelectorDialog}>ביטול</Button>
              <Button
                type="button"
                disabled={pendingSelection.size === 0}
                onClick={confirmAddProducts}
                data-testid="button-confirm-add-products"
              >
                <Plus className="w-4 h-4 ml-2" />
                הוסף {pendingSelection.size > 0 ? `${pendingSelection.size} ` : ""}מוצרים
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
