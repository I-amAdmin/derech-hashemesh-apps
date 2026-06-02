import {
  useGetQuote,
  useUpdateQuoteStatus,
  useGenerateQuoteShareToken,
  useRevokeQuoteShareToken,
  getGetQuoteQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";

function StatusBadge({ status }: { status: string }) {
  const colors = useColors();
  const map: Record<string, { bg: string; text: string }> = {
    pending: { bg: colors.pendingBg, text: colors.pending },
    approved: { bg: colors.approvedBg, text: colors.approved },
    cancelled: { bg: colors.cancelledBg, text: colors.cancelled },
    changes_requested: { bg: colors.pendingBg, text: colors.pending },
  };
  const s = map[status] ?? { bg: colors.muted, text: colors.mutedForeground };
  const label: Record<string, string> = {
    pending: "ממתין",
    approved: "מאושר",
    cancelled: "בוטל",
    changes_requested: "בקשת שינויים",
  };
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.text }]}>{label[status] ?? status}</Text>
    </View>
  );
}

export default function QuoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const quoteId = Number(id);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);

  const { data: quote, isLoading, isError, refetch } = useGetQuote(quoteId);

  const { mutate: updateStatus } = useUpdateQuoteStatus();
  const { mutate: generateToken } = useGenerateQuoteShareToken();
  const { mutate: revokeToken } = useRevokeQuoteShareToken();

  const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "dshemesh.replit.app";
  const shareUrl = quote?.shareToken
    ? `https://${domain}/q/${quote.shareToken}`
    : null;

  function invalidateQuote() {
    queryClient.invalidateQueries({ queryKey: getGetQuoteQueryKey(quoteId) });
    queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
    queryClient.invalidateQueries({ queryKey: ["/api/quotes/summary"] });
  }

  function handleStatusChange(newStatus: "approved" | "cancelled" | "pending") {
    Alert.alert(
      "שינוי סטטוס",
      `לשנות את סטטוס ההצעה ל-${newStatus}?`,
      [
        { text: "ביטול", style: "cancel" },
        {
          text: "אישור",
          style: newStatus === "cancelled" ? "destructive" : "default",
          onPress: () => {
            setUpdatingStatus(newStatus);
            updateStatus(
              { id: quoteId, data: { status: newStatus } },
              {
                onSuccess: () => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  invalidateQuote();
                },
                onError: () => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                  Alert.alert("שגיאה", "לא ניתן היה לעדכן את הסטטוס.");
                },
                onSettled: () => setUpdatingStatus(null),
              }
            );
          },
        },
      ]
    );
  }

  function handleGenerateOrShowShare() {
    if (shareUrl) {
      setShowSharePanel((v) => !v);
      return;
    }
    setGenerating(true);
    generateToken(
      { id: quoteId },
      {
        onSuccess: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          invalidateQuote();
          setShowSharePanel(true);
        },
        onError: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert("שגיאה", "לא ניתן ליצור קישור שיתוף.");
        },
        onSettled: () => setGenerating(false),
      }
    );
  }

  async function handleCopy() {
    if (!shareUrl) return;
    await Clipboard.setStringAsync(shareUrl);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  }

  function handleNativeShare() {
    if (!shareUrl) return;
    Share.share({ message: `הצעת מחיר מדרך השמש: ${shareUrl}`, url: shareUrl });
  }

  function handleRevoke() {
    Alert.alert(
      "ביטול קישור שיתוף",
      "הקישור הנוכחי יפסיק לעבוד. לא ניתן לבטל פעולה זו.",
      [
        { text: "ביטול", style: "cancel" },
        {
          text: "בטל קישור",
          style: "destructive",
          onPress: () => {
            setRevoking(true);
            revokeToken(
              { id: quoteId },
              {
                onSuccess: () => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  invalidateQuote();
                  setShowSharePanel(false);
                },
                onError: () => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                  Alert.alert("שגיאה", "לא ניתן לבטל את הקישור.");
                },
                onSettled: () => setRevoking(false),
              }
            );
          },
        },
      ]
    );
  }

  if (isLoading || !quote) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>הצעה לא נמצאה</Text>
        <Pressable onPress={() => refetch()} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
          <Text style={{ color: colors.primaryForeground, fontWeight: "600" }}>נסה שוב</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: colors.mutedForeground }}>חזרה</Text>
        </Pressable>
      </View>
    );
  }

  const quoteDate = new Date(quote.date).toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: bottomPad + 24, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header row */}
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
            testID="back-btn"
          >
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerActions}>
            <Pressable
              style={({ pressed }) => [
                styles.iconBtn,
                {
                  opacity: pressed ? 0.6 : 1,
                  backgroundColor: showSharePanel ? colors.primary : colors.muted,
                },
              ]}
              onPress={handleGenerateOrShowShare}
              disabled={generating}
              testID="share-btn"
            >
              {generating ? (
                <ActivityIndicator size="small" color={showSharePanel ? colors.primaryForeground : colors.primary} />
              ) : (
                <Feather
                  name="share-2"
                  size={18}
                  color={showSharePanel ? colors.primaryForeground : colors.foreground}
                />
              )}
            </Pressable>
          </View>
        </View>

        {/* Hero card */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.heroTop}>
            <Text style={[styles.quoteNumber, { color: colors.mutedForeground }]}>הצעה #{quote.id}</Text>
            <StatusBadge status={quote.status} />
          </View>
          <Text style={[styles.customerName, { color: colors.foreground }]}>{quote.customerName}</Text>
          {quote.contactName ? (
            <Text style={[styles.contactName, { color: colors.mutedForeground }]}>{quote.contactName}</Text>
          ) : null}
          {quote.customerPhone ? (
            <Text style={[styles.contactName, { color: colors.mutedForeground }]}>{quote.customerPhone}</Text>
          ) : null}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.metaRow}>
            <View>
              <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>תאריך</Text>
              <Text style={[styles.metaValue, { color: colors.foreground }]}>{quoteDate}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>סה"כ</Text>
              <Text style={[styles.totalAmount, { color: colors.primary }]}>
                ₪{Number(quote.totalAmount).toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
          {quote.notes ? (
            <View style={[styles.notesBox, { backgroundColor: colors.accent }]}>
              <Text style={[styles.notesText, { color: colors.accentForeground }]}>{quote.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* Share link panel */}
        {showSharePanel && shareUrl ? (
          <View
            style={[styles.sharePanel, { backgroundColor: colors.card, borderColor: colors.primary }]}
            testID="share-panel"
          >
            <View style={styles.sharePanelHeader}>
              <Feather name="link" size={15} color={colors.primary} />
              <Text style={[styles.sharePanelTitle, { color: colors.primary }]}>קישור שיתוף ללקוח</Text>
            </View>

            {/* URL display */}
            <View style={[styles.urlBox, { backgroundColor: colors.muted }]}>
              <Text
                style={[styles.urlText, { color: colors.mutedForeground }]}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {shareUrl}
              </Text>
            </View>

            {/* Action buttons */}
            <View style={styles.sharePanelActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.shareActionBtn,
                  { backgroundColor: copyFeedback ? colors.approvedBg : colors.muted, opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={handleCopy}
                testID="copy-link-btn"
              >
                <Feather
                  name={copyFeedback ? "check" : "copy"}
                  size={15}
                  color={copyFeedback ? colors.approved : colors.foreground}
                />
                <Text style={[styles.shareActionText, { color: copyFeedback ? colors.approved : colors.foreground }]}>
                  {copyFeedback ? "הועתק!" : "העתק"}
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.shareActionBtn,
                  { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={handleNativeShare}
                testID="native-share-btn"
              >
                <Feather name="share" size={15} color={colors.foreground} />
                <Text style={[styles.shareActionText, { color: colors.foreground }]}>שתף</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.shareActionBtn,
                  { backgroundColor: colors.cancelledBg, opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={handleRevoke}
                disabled={revoking}
                testID="revoke-link-btn"
              >
                {revoking ? (
                  <ActivityIndicator size="small" color={colors.cancelled} />
                ) : (
                  <>
                    <Feather name="trash-2" size={15} color={colors.cancelled} />
                    <Text style={[styles.shareActionText, { color: colors.cancelled }]}>בטל קישור</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* "Generate share link" nudge when no token */}
        {!shareUrl && !showSharePanel ? (
          <Pressable
            style={({ pressed }) => [
              styles.generateShareBtn,
              { backgroundColor: colors.muted, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={handleGenerateOrShowShare}
            disabled={generating}
            testID="generate-share-btn"
          >
            {generating ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Feather name="link" size={16} color={colors.primary} />
            )}
            <Text style={[styles.generateShareText, { color: colors.primary }]}>
              {generating ? "יוצר קישור..." : "צור קישור שיתוף ללקוח"}
            </Text>
          </Pressable>
        ) : null}

        {/* Items */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          פריטים ({quote.items.length})
        </Text>

        {quote.items.map((item, idx) => (
          <View
            key={item.id}
            style={[
              styles.itemRow,
              { backgroundColor: colors.card, borderColor: colors.border },
              idx === 0 && styles.itemFirst,
              idx === quote.items.length - 1 && styles.itemLast,
            ]}
          >
            <View style={styles.itemLeft}>
              <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={2}>
                {item.description}
              </Text>
              <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
                {item.weightKg}ק"ג · ₪{item.pricePerKg}/ק"ג · כמות {item.quantity}
              </Text>
            </View>
            <Text style={[styles.itemTotal, { color: colors.primary }]}>
              ₪{Number(item.totalPrice).toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        ))}

        {/* Status actions */}
        {quote.status === "pending" && (
          <View style={styles.actionsSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>פעולות</Text>
            <View style={styles.actionsRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: colors.approvedBg, borderColor: colors.approved, opacity: pressed ? 0.8 : 1 },
                ]}
                onPress={() => handleStatusChange("approved")}
                disabled={!!updatingStatus}
                testID="approve-btn"
              >
                {updatingStatus === "approved" ? (
                  <ActivityIndicator size="small" color={colors.approved} />
                ) : (
                  <>
                    <Feather name="check-circle" size={18} color={colors.approved} />
                    <Text style={[styles.actionBtnText, { color: colors.approved }]}>אשר</Text>
                  </>
                )}
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: colors.cancelledBg, borderColor: colors.cancelled, opacity: pressed ? 0.8 : 1 },
                ]}
                onPress={() => handleStatusChange("cancelled")}
                disabled={!!updatingStatus}
                testID="cancel-btn"
              >
                {updatingStatus === "cancelled" ? (
                  <ActivityIndicator size="small" color={colors.cancelled} />
                ) : (
                  <>
                    <Feather name="x-circle" size={18} color={colors.cancelled} />
                    <Text style={[styles.actionBtnText, { color: colors.cancelled }]}>בטל</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {quote.status === "approved" && (
          <View style={styles.actionsSection}>
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                styles.actionBtnFull,
                { backgroundColor: colors.pendingBg, borderColor: colors.pending, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={() => handleStatusChange("pending")}
              disabled={!!updatingStatus}
            >
              <Feather name="clock" size={18} color={colors.pending} />
              <Text style={[styles.actionBtnText, { color: colors.pending }]}>החזר לממתין</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorTitle: { fontSize: 18, fontWeight: "600" },
  retryBtn: { borderRadius: 8, paddingVertical: 10, paddingHorizontal: 24, marginTop: 8 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  backBtn: { padding: 4 },
  headerActions: { flexDirection: "row", gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  heroCard: { borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 16 },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  quoteNumber: { fontSize: 13, fontWeight: "500" },
  customerName: { fontSize: 22, fontWeight: "800", marginBottom: 4 },
  contactName: { fontSize: 14, marginBottom: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 16 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  metaLabel: { fontSize: 12, fontWeight: "500", marginBottom: 2 },
  metaValue: { fontSize: 15, fontWeight: "600" },
  totalAmount: { fontSize: 24, fontWeight: "800" },
  notesBox: { borderRadius: 8, padding: 12, marginTop: 14 },
  notesText: { fontSize: 14 },
  sharePanel: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  sharePanelHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  sharePanelTitle: { fontSize: 14, fontWeight: "700" },
  urlBox: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  urlText: { fontSize: 12, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
  sharePanelActions: { flexDirection: "row", gap: 8 },
  shareActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: 8,
    paddingVertical: 9,
  },
  shareActionText: { fontSize: 12, fontWeight: "600" },
  generateShareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    paddingVertical: 14,
    marginBottom: 16,
  },
  generateShareText: { fontSize: 14, fontWeight: "600" },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    padding: 14,
    borderBottomWidth: 0,
  },
  itemFirst: { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  itemLast: { borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderBottomWidth: 1, marginBottom: 20 },
  itemLeft: { flex: 1, marginRight: 12 },
  itemName: { fontSize: 14, fontWeight: "600", marginBottom: 3 },
  itemMeta: { fontSize: 12 },
  itemTotal: { fontSize: 14, fontWeight: "700" },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  actionsSection: { marginBottom: 12 },
  actionsRow: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 13,
  },
  actionBtnFull: { flex: undefined },
  actionBtnText: { fontSize: 14, fontWeight: "700" },
});
