import { useState, useMemo } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const quoteItemSchema = z.object({
  productId: z.number(),
  quantity: z.coerce.number().min(1, "כמות חייבת להיות לפחות 1"),
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

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const items = form.watch("items");

  const fillFromCustomer = (customerId: number) => {
    const c = customers?.find((c) => c.id === customerId);
    if (!c) return;
    form.setValue("customerName", c.businessName);
    form.setValue("contactName", c.contactName ?? "");
    form.setValue("customerPhone", c.phone ?? "");
    form.setValue("email", c.email ?? "");
  };

  const departments = useMemo(() => {
    const depts = [...new Set((products ?? []).map((p) => p.department || "כללי"))].sort((a, b) =>
      a.localeCompare(b, "he")
    );
    return depts;
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

  const addProduct = (product: { id: number }) => {
    const exists = items.some((item) => item.productId === product.id);
    if (exists) {
      toast({ title: "המוצר כבר קיים בהצעת המחיר", variant: "destructive" });
      return;
    }
    append({ productId: product.id, quantity: 1 });
    setIsProductSelectorOpen(false);
    setProductSearch("");
  };

  const getProductDetails = (productId: number) => products?.find((p) => p.id === productId);

  const calculateTotal = () =>
    items.reduce((total, item) => {
      const product = getProductDetails(item.productId);
      if (!product) return total;
      return total + product.pricePerKg * product.weightKg * item.quantity;
    }, 0);

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
          items: data.items,
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
                      <DropdownMenuItem
                        key={c.id}
                        onSelect={() => fillFromCustomer(c.id)}
                        data-testid={`menu-item-customer-${c.id}`}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{c.businessName}</span>
                          {c.contactName && (
                            <span className="text-xs text-muted-foreground">לידי: {c.contactName}</span>
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>לכבוד — שם העסק *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="שם החברה / העסק" data-testid="input-customer-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>לידי — שם איש הקשר</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="שם מלא (אופציונלי)" data-testid="input-contact-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>טלפון</FormLabel>
                      <FormControl>
                        <Input {...field} dir="ltr" className="text-left" placeholder="05X-XXXXXXX" data-testid="input-customer-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>אימייל (אופציונלי)</FormLabel>
                      <FormControl>
                        <Input {...field} dir="ltr" className="text-left" placeholder="name@example.com" data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>תאריך</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>פריטים להזמנה</CardTitle>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setIsProductSelectorOpen(true)}
                data-testid="button-add-item"
              >
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
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="text-right">ברקוד</TableHead>
                        <TableHead className="text-right">תיאור פריט</TableHead>
                        <TableHead className="text-right">סה"כ משקל (ק"ג)</TableHead>
                        <TableHead className="text-right">מחיר לק"ג</TableHead>
                        <TableHead className="text-right w-[150px]">כמות להזמנה</TableHead>
                        <TableHead className="text-right">סה"כ מחיר</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => {
                        const product = getProductDetails(items[index].productId);
                        if (!product) return null;
                        const quantity = items[index].quantity || 0;
                        const totalWeight = product.weightKg * quantity;
                        const itemTotal = product.pricePerKg * product.weightKg * quantity;

                        return (
                          <TableRow key={field.id} data-testid={`row-item-${index}`}>
                            <TableCell className="font-mono text-sm">{product.barcode}</TableCell>
                            <TableCell className="font-medium">{product.description}</TableCell>
                            <TableCell>{formatNumber(totalWeight)} ק"ג</TableCell>
                            <TableCell className="font-semibold text-primary">
                              {formatCurrency(product.pricePerKg)}
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`items.${index}.quantity`}
                                render={({ field: qField }) => (
                                  <FormItem className="mb-0">
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="1"
                                        className="h-8 text-center"
                                        {...qField}
                                        data-testid={`input-quantity-${index}`}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell className="font-bold text-primary">
                              {formatCurrency(itemTotal)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive h-8 w-8 hover:bg-destructive/10"
                                type="button"
                                onClick={() => remove(index)}
                                data-testid={`button-remove-item-${index}`}
                              >
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
                <p className="text-sm font-medium text-destructive mt-2">
                  {form.formState.errors.items.message}
                </p>
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
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>הערות נוספות להצעת המחיר</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" type="button" onClick={() => setLocation("/quotes")}>
              ביטול
            </Button>
            <Button
              type="submit"
              size="lg"
              className="px-8 shadow-md"
              disabled={createQuote.isPending}
              data-testid="button-save-quote"
            >
              {createQuote.isPending ? "שומר..." : "שמור הצעת מחיר"}
              <Check className="w-4 h-4 mr-2" />
            </Button>
          </div>
        </form>
      </Form>

      <Dialog
        open={isProductSelectorOpen}
        onOpenChange={(open) => {
          setIsProductSelectorOpen(open);
          if (!open) {
            setProductSearch("");
            setSelectedDept(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>בחר מוצר מהקטלוג</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 flex-1 min-h-0">
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="חיפוש לפי תיאור או ברקוד..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pr-10"
                data-testid="input-product-search"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedDept === null ? "default" : "outline"}
                size="sm"
                type="button"
                onClick={() => setSelectedDept(null)}
                data-testid="button-dept-all"
              >
                כל המחלקות
              </Button>
              {departments.map((dept) => (
                <Button
                  key={dept}
                  variant={selectedDept === dept ? "default" : "outline"}
                  size="sm"
                  type="button"
                  onClick={() => setSelectedDept(dept)}
                  data-testid={`button-dept-filter-${dept}`}
                >
                  {dept}
                  <Badge variant="secondary" className="mr-1 text-xs px-1">
                    {(products ?? []).filter((p) => (p.department || "כללי") === dept).length}
                  </Badge>
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
                      <TableHead className="text-right">ברקוד</TableHead>
                      <TableHead className="text-right">תיאור פריט</TableHead>
                      <TableHead className="text-right">מחלקה</TableHead>
                      <TableHead className="text-right">משקל (ק"ג)</TableHead>
                      <TableHead className="text-right">מחיר לק"ג</TableHead>
                      <TableHead className="text-right">מחיר ליחידה</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((p) => {
                      const alreadyAdded = items.some((item) => item.productId === p.id);
                      return (
                        <TableRow
                          key={p.id}
                          className={alreadyAdded ? "opacity-50" : "hover:bg-muted/50 cursor-pointer"}
                          onClick={() => !alreadyAdded && addProduct(p)}
                          data-testid={`row-select-product-${p.id}`}
                        >
                          <TableCell className="font-mono text-xs">{p.barcode}</TableCell>
                          <TableCell className="font-medium">{p.description}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{p.department}</Badge>
                          </TableCell>
                          <TableCell>{formatNumber(p.weightKg)}</TableCell>
                          <TableCell className="text-primary font-semibold">{formatCurrency(p.pricePerKg)}</TableCell>
                          <TableCell>{formatCurrency(p.pricePerKg * p.weightKg)}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              type="button"
                              disabled={alreadyAdded}
                              onClick={(e) => {
                                e.stopPropagation();
                                addProduct(p);
                              }}
                              data-testid={`button-select-product-${p.id}`}
                            >
                              {alreadyAdded ? "נוסף" : "בחר"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
