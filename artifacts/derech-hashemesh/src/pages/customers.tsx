import { useState } from "react";
import { Layout } from "@/components/layout";
import {
  useListCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  getListCustomersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Pencil, Trash2, Users, Phone, Mail, Building2, Search, MapPin, Hash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const customerSchema = z.object({
  businessName: z.string().min(1, "שדה חובה"),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("כתובת מייל לא תקינה").optional().or(z.literal("")),
  companyId: z.string().optional(),
  deliveryAddress: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

type CustomerRow = {
  id: number;
  businessName: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  companyId?: string | null;
  deliveryAddress?: string | null;
};

export default function Customers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: customers, isLoading } = useListCustomers();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRow | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: { businessName: "", contactName: "", phone: "", email: "", companyId: "", deliveryAddress: "" },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });

  const openCreate = () => {
    setEditingCustomer(null);
    form.reset({ businessName: "", contactName: "", phone: "", email: "", companyId: "", deliveryAddress: "" });
    setDialogOpen(true);
  };

  const openEdit = (c: CustomerRow) => {
    setEditingCustomer(c);
    form.reset({
      businessName: c.businessName,
      contactName: c.contactName ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      companyId: c.companyId ?? "",
      deliveryAddress: c.deliveryAddress ?? "",
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: CustomerFormValues) => {
    const payload = {
      businessName: data.businessName,
      contactName: data.contactName || undefined,
      phone: data.phone || undefined,
      email: data.email || undefined,
      companyId: data.companyId || undefined,
      deliveryAddress: data.deliveryAddress || undefined,
    };

    if (editingCustomer) {
      updateCustomer.mutate(
        { id: editingCustomer.id, data: payload },
        {
          onSuccess: () => {
            invalidate();
            setDialogOpen(false);
            toast({ title: "הלקוח עודכן בהצלחה" });
          },
          onError: () => toast({ title: "שגיאה בעדכון הלקוח", variant: "destructive" }),
        }
      );
    } else {
      createCustomer.mutate(
        { data: payload },
        {
          onSuccess: () => {
            invalidate();
            setDialogOpen(false);
            toast({ title: "הלקוח נוסף בהצלחה" });
          },
          onError: () => toast({ title: "שגיאה בהוספת הלקוח", variant: "destructive" }),
        }
      );
    }
  };

  const confirmDelete = () => {
    if (!deletingId) return;
    deleteCustomer.mutate(
      { id: deletingId },
      {
        onSuccess: () => {
          invalidate();
          setDeletingId(null);
          toast({ title: "הלקוח נמחק" });
        },
        onError: () => toast({ title: "שגיאה במחיקת הלקוח", variant: "destructive" }),
      }
    );
  };

  const filtered = (customers ?? []).filter((c) => {
    const q = search.toLowerCase();
    return (
      c.businessName.toLowerCase().includes(q) ||
      (c.contactName ?? "").toLowerCase().includes(q) ||
      (c.phone ?? "").includes(q) ||
      (c.email ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <Layout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ניהול לקוחות</h1>
          <p className="text-muted-foreground mt-1">{customers?.length ?? 0} לקוחות במערכת</p>
        </div>
        <Button onClick={openCreate} className="shadow-sm gap-2" data-testid="button-add-customer">
          <Plus className="w-4 h-4" />
          לקוח חדש
        </Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="חיפוש לפי שם עסק, איש קשר, טלפון או מייל..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
          data-testid="input-customer-search"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">טוען לקוחות...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Users className="w-12 h-12 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground text-lg">
              {search ? "לא נמצאו לקוחות מתאימים" : "אין לקוחות עדיין"}
            </p>
            {!search && (
              <Button onClick={openCreate} variant="outline">
                הוסף את הלקוח הראשון
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow" data-testid={`card-customer-${c.id}`}>
              <CardContent className="pt-5 pb-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-bold truncate text-lg">{c.businessName}</span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(c)}
                      data-testid={`button-edit-customer-${c.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => setDeletingId(c.id)}
                      data-testid={`button-delete-customer-${c.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm text-muted-foreground">
                  {c.contactName && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">לידי:</span>
                      <span>{c.contactName}</span>
                    </div>
                  )}
                  {c.companyId && (
                    <div className="flex items-center gap-2">
                      <Hash className="w-3.5 h-3.5" />
                      <span>ח.פ {c.companyId}</span>
                    </div>
                  )}
                  {c.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5" />
                      <span dir="ltr">{c.phone}</span>
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5" />
                      <span dir="ltr" className="truncate">{c.email}</span>
                    </div>
                  )}
                  {c.deliveryAddress && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span className="break-words">{c.deliveryAddress}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? "עריכת לקוח" : "לקוח חדש"}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>לכבוד — שם העסק *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="שם החברה / העסק" data-testid="input-business-name" />
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
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>טלפון</FormLabel>
                    <FormControl>
                      <Input {...field} dir="ltr" className="text-left" placeholder="05X-XXXXXXX" data-testid="input-phone" />
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
                name="companyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>מס' ח.פ (אופציונלי)</FormLabel>
                    <FormControl>
                      <Input {...field} dir="ltr" className="text-left" placeholder="מספר חברה / עוסק מורשה" data-testid="input-company-id" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deliveryAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>כתובת אספקה (אופציונלי)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="רחוב, עיר" data-testid="input-delivery-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-2">
                <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>
                  ביטול
                </Button>
                <Button
                  type="submit"
                  disabled={createCustomer.isPending || updateCustomer.isPending}
                  data-testid="button-save-customer"
                >
                  {createCustomer.isPending || updateCustomer.isPending ? "שומר..." : "שמור"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת לקוח</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את הלקוח? פעולה זו אינה הפיכה.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
