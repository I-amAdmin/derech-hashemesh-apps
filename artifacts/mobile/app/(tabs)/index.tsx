import { useGetQuotesSummary } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { Quote } from "@workspace/api-client-react";

function StatusBadge({ status }: { status: string }) {
  const colors = useColors();
  const badgeColors: Record<string, { bg: string; text: string }> = {
    pending: { bg: colors.pendingBg, text: colors.pending },
    approved: { bg: colors.approvedBg, text: colors.approved },
    cancelled: { bg: colors.cancelledBg, text: colors.cancelled },
  };
  const style = badgeColors[status] ?? { bg: colors.muted, text: colors.mutedForeground };
  const labels: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    cancelled: "Cancelled",
  };
  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.badgeText, { color: style.text }]}>
        {labels[status] ?? status}
      </Text>
    </View>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      {sub ? <Text style={[styles.statSub, { color: colors.mutedForeground }]}>{sub}</Text> : null}
    </View>
  );
}

function QuoteRow({ quote, onPress }: { quote: Quote; onPress: () => void }) {
  const colors = useColors();
  const date = new Date(quote.date).toLocaleDateString("en-IL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return (
    <Pressable
      style={({ pressed }) => [
        styles.quoteRow,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
      ]}
      onPress={onPress}
      testID={`quote-row-${quote.id}`}
    >
      <View style={styles.quoteRowLeft}>
        <Text style={[styles.quoteCustomer, { color: colors.foreground }]} numberOfLines={1}>
          {quote.customerName}
        </Text>
        <Text style={[styles.quoteDate, { color: colors.mutedForeground }]}>{date}</Text>
      </View>
      <View style={styles.quoteRowRight}>
        <Text style={[styles.quoteAmount, { color: colors.primary }]}>
          ₪{Number(quote.totalAmount).toLocaleString("en-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
        <StatusBadge status={quote.status} />
      </View>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 60;

  const { data, isLoading, isError, refetch, isRefetching } = useGetQuotesSummary();

  const totalRevenue = data?.totalRevenue ?? 0;
  const totalQuotes = data?.totalQuotes ?? 0;
  const recentQuotes = data?.recentQuotes ?? [];

  const approvedCount = recentQuotes.filter((q) => q.status === "approved").length;
  const pendingCount = recentQuotes.filter((q) => q.status === "pending").length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={recentQuotes}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad, paddingHorizontal: 16 }}
        scrollEnabled={!!recentQuotes.length}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            progressViewOffset={topPad}
          />
        }
        ListHeaderComponent={
          <>
            <Text style={[styles.screenTitle, { color: colors.foreground }]}>Dashboard</Text>
            <Text style={[styles.screenSubtitle, { color: colors.mutedForeground }]}>דרך השמש</Text>

            {isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            ) : isError ? (
              <Pressable onPress={() => refetch()} style={[styles.errorBox, { backgroundColor: colors.accent, borderColor: colors.border }]}>
                <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
                  Could not load data. Tap to retry.
                </Text>
              </Pressable>
            ) : (
              <>
                <View style={styles.statsRow}>
                  <StatCard
                    label="Total Quotes"
                    value={String(totalQuotes)}
                  />
                  <StatCard
                    label="Total Revenue"
                    value={`₪${Math.round(totalRevenue).toLocaleString("en-IL")}`}
                  />
                </View>
                <View style={styles.statsRow}>
                  <StatCard label="Pending" value={String(pendingCount)} />
                  <StatCard label="Approved" value={String(approvedCount)} />
                </View>
              </>
            )}

            {!isLoading && !isError && recentQuotes.length > 0 && (
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Recent Quotes
              </Text>
            )}
          </>
        }
        renderItem={({ item }) => (
          <QuoteRow quote={item} onPress={() => router.push(`/quote/${item.id}`)} />
        )}
        ListEmptyComponent={
          !isLoading && !isError ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No quotes yet
              </Text>
            </View>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screenTitle: { fontSize: 28, fontWeight: "700", marginBottom: 2 },
  screenSubtitle: { fontSize: 14, marginBottom: 20 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  statLabel: { fontSize: 12, fontWeight: "500", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  statValue: { fontSize: 26, fontWeight: "700" },
  statSub: { fontSize: 12, marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: "600", marginTop: 24, marginBottom: 12 },
  quoteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  quoteRowLeft: { flex: 1, marginRight: 12 },
  quoteCustomer: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  quoteDate: { fontSize: 13 },
  quoteRowRight: { alignItems: "flex-end", gap: 6 },
  quoteAmount: { fontSize: 15, fontWeight: "700" },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
  emptyState: { marginTop: 40, alignItems: "center" },
  emptyText: { fontSize: 16 },
  errorBox: { borderRadius: 12, borderWidth: 1, padding: 16, marginTop: 20, alignItems: "center" },
  errorText: { fontSize: 14 },
});
