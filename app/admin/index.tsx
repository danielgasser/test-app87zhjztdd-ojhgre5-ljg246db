import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { theme } from "@/styles/theme";
import { commonStyles } from "@/styles/common";
import { notify } from "@/utils/notificationService";
import { logger } from "@/utils/logger";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import {
  adminFetchUsers,
  adminFetchLocations,
  adminFetchReviews,
  adminUpdateUserRole,
  adminUpdateUserSubscription,
  adminToggleLocationActive,
  adminDeleteLocation,
  adminUpdateReviewStatus,
  adminDeleteReview,
  AdminUser,
  AdminLocation,
  AdminReview,
  adminDeleteUser,
} from "@/services/adminService";

type Tab = "users" | "locations" | "reviews";

// ─── Pill badge ───────────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + "22" }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Users tab ────────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await adminFetchUsers();
      setUsers(data);
    } catch (e) {
      logger.error("Admin: fetch users", e);
      notify.error("Failed to load users");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRoleToggle = (user: AdminUser) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    notify.confirm(
      `Set role to "${newRole}"?`,
      `${user.username || user.id}`,
      [
        { text: "Cancel", style: "cancel", onPress: () => {} },
        {
          text: "Confirm",
          style: "default",
          onPress: async () => {
            try {
              await adminUpdateUserRole(user.id, newRole as "admin" | "user");
              setUsers((prev) =>
                prev.map((u) =>
                  u.id === user.id ? { ...u, role: newRole } : u,
                ),
              );
              notify.success("Role updated");
            } catch (e) {
              notify.error("Failed to update role");
            }
          },
        },
      ],
      "warning",
    );
  };

  const handleSubscriptionToggle = (user: AdminUser) => {
    const newTier = user.subscription_tier === "premium" ? "free" : "premium";
    notify.confirm(
      `Set subscription to "${newTier}"?`,
      `${user.username || user.id}`,
      [
        { text: "Cancel", style: "cancel", onPress: () => {} },
        {
          text: "Confirm",
          style: "default",
          onPress: async () => {
            try {
              await adminUpdateUserSubscription(
                user.id,
                newTier as "free" | "premium" | "enterprise",
              );
              setUsers((prev) =>
                prev.map((u) =>
                  u.id === user.id ? { ...u, subscription_tier: newTier } : u,
                ),
              );
              notify.success("Subscription updated");
            } catch (e) {
              notify.error("Failed to update subscription");
            }
          },
        },
      ],
      "question",
    );
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.username?.toLowerCase().includes(q) ||
      u.full_name?.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <ActivityIndicator style={styles.centered} color={theme.colors.primary} />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.stickyHeader}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username or name…"
          placeholderTextColor={theme.colors.textLight}
          value={search}
          onChangeText={setSearch}
        />
        <Text style={styles.countLabel}>{filtered.length} users</Text>
      </View>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        contentContainerStyle={styles.listContent}
      >
        {filtered.map((user) => (
          <View key={user.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>
                  {user.username || user.full_name || "—"}
                </Text>
                {user.role === "admin" && (
                  <Badge label="admin" color={theme.colors.primary} />
                )}
              </View>
              <Text style={styles.cardSubtitle} numberOfLines={1}>
                {user.id}
              </Text>
              <Text style={styles.cardMeta}>
                Reviews: {user.total_reviews ?? 0} · Joined:{" "}
                {user.created_at
                  ? new Date(user.created_at).toLocaleDateString()
                  : "—"}
              </Text>
            </View>

            <View style={styles.cardActions}>
              {/* Subscription toggle */}
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  user.subscription_tier === "premium"
                    ? styles.actionBtnActive
                    : styles.actionBtnOutline,
                ]}
                onPress={() => handleSubscriptionToggle(user)}
              >
                <Ionicons
                  name="star"
                  size={14}
                  color={
                    user.subscription_tier === "premium"
                      ? theme.colors.textOnPrimary
                      : theme.colors.primary
                  }
                />
                <Text
                  style={[
                    styles.actionBtnText,
                    user.subscription_tier === "premium"
                      ? styles.actionBtnTextActive
                      : styles.actionBtnTextOutline,
                  ]}
                >
                  {user.subscription_tier === "premium" ? "Premium" : "Free"}
                </Text>
              </TouchableOpacity>

              {/* Role toggle */}
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  user.role === "admin"
                    ? styles.actionBtnDanger
                    : styles.actionBtnOutline,
                ]}
                onPress={() => handleRoleToggle(user)}
              >
                <Ionicons
                  name="shield"
                  size={14}
                  color={
                    user.role === "admin"
                      ? theme.colors.textOnPrimary
                      : theme.colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.actionBtnText,
                    user.role === "admin"
                      ? styles.actionBtnTextActive
                      : styles.actionBtnTextOutline,
                  ]}
                >
                  {user.role === "admin" ? "Revoke Admin" : "Make Admin"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnDanger]}
                onPress={() => {
                  notify.confirm(
                    `Delete user "${user.username || user.id.slice(0, 8)}"?`,
                    "Their reviews, votes and locations will be preserved.",
                    [
                      { text: "Cancel", style: "cancel", onPress: () => {} },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: async () => {
                          try {
                            await adminDeleteUser(user.id);
                            setUsers((prev) =>
                              prev.filter((u) => u.id !== user.id),
                            );
                            notify.success("User deleted");
                          } catch (e: any) {
                            notify.error(e.message || "Failed to delete user");
                          }
                        },
                      },
                    ],
                    "warning",
                  );
                }}
              >
                <Ionicons
                  name="trash"
                  size={14}
                  color={theme.colors.textOnPrimary}
                />
                <Text
                  style={[styles.actionBtnText, styles.actionBtnTextActive]}
                >
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Locations tab ────────────────────────────────────────────────────────────

function LocationsTab() {
  const [locations, setLocations] = useState<AdminLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await adminFetchLocations();
      setLocations(data);
    } catch (e) {
      logger.error("Admin: fetch locations", e);
      notify.error("Failed to load locations");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggleActive = async (loc: AdminLocation) => {
    try {
      await adminToggleLocationActive(loc.id, !loc.active);
      setLocations((prev) =>
        prev.map((l) => (l.id === loc.id ? { ...l, active: !loc.active } : l)),
      );
      notify.success(`Location ${!loc.active ? "activated" : "deactivated"}`);
    } catch (e) {
      notify.error("Failed to update location");
    }
  };

  const handleDelete = (loc: AdminLocation) => {
    notify.confirm(
      `Delete "${loc.name}"?`,
      "This will permanently remove the location and all its safety scores.",
      [
        { text: "Cancel", style: "cancel", onPress: () => {} },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await adminDeleteLocation(loc.id);
              setLocations((prev) => prev.filter((l) => l.id !== loc.id));
              notify.success("Location deleted");
            } catch (e) {
              notify.error("Failed to delete location");
            }
          },
        },
      ],
      "warning",
    );
  };

  const filtered = locations.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      l.city.toLowerCase().includes(q) ||
      l.state_province.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <ActivityIndicator style={styles.centered} color={theme.colors.primary} />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.stickyHeader}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or city…"
          placeholderTextColor={theme.colors.textLight}
          value={search}
          onChangeText={setSearch}
        />
        <Text style={styles.countLabel}>{filtered.length} locations</Text>
      </View>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        contentContainerStyle={styles.listContent}
      >
        {filtered.map((loc) => (
          <View key={loc.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {loc.name}
                </Text>
                <Badge
                  label={loc.active ? "active" : "inactive"}
                  color={loc.active ? theme.colors.success : theme.colors.error}
                />
              </View>
              <Text style={styles.cardSubtitle}>
                {loc.city}, {loc.state_province} · {loc.place_type}
              </Text>
              <Text style={styles.cardMeta}>
                Reviews: {loc.review_count ?? 0} · Score:{" "}
                {loc.avg_overall_score?.toFixed(1) ?? "—"}
              </Text>
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  loc.active ? styles.actionBtnOutline : styles.actionBtnActive,
                ]}
                onPress={() => handleToggleActive(loc)}
              >
                <Ionicons
                  name={loc.active ? "eye-off" : "eye"}
                  size={14}
                  color={
                    loc.active
                      ? theme.colors.primary
                      : theme.colors.textOnPrimary
                  }
                />
                <Text
                  style={[
                    styles.actionBtnText,
                    loc.active
                      ? styles.actionBtnTextOutline
                      : styles.actionBtnTextActive,
                  ]}
                >
                  {loc.active ? "Deactivate" : "Activate"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnDanger]}
                onPress={() => handleDelete(loc)}
              >
                <Ionicons
                  name="trash"
                  size={14}
                  color={theme.colors.textOnPrimary}
                />
                <Text
                  style={[styles.actionBtnText, styles.actionBtnTextActive]}
                >
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Reviews tab ─────────────────────────────────────────────────────────────

const REVIEW_STATUSES = ["active", "flagged", "hidden", "deleted"] as const;
type ReviewStatus = (typeof REVIEW_STATUSES)[number];

function ReviewsTab() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<ReviewStatus | "all">("all");

  const load = useCallback(async () => {
    try {
      const data = await adminFetchReviews();
      setReviews(data);
    } catch (e) {
      logger.error("Admin: fetch reviews", e);
      notify.error("Failed to load reviews");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = async (
    review: AdminReview,
    status: ReviewStatus,
  ) => {
    try {
      await adminUpdateReviewStatus(review.id, status);
      setReviews((prev) =>
        prev.map((r) => (r.id === review.id ? { ...r, status } : r)),
      );
      notify.success("Status updated");
    } catch (e) {
      notify.error("Failed to update review");
    }
  };

  const handleDelete = (review: AdminReview) => {
    notify.confirm(
      "Delete this review?",
      "This cannot be undone.",
      [
        { text: "Cancel", style: "cancel", onPress: () => {} },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await adminDeleteReview(review.id);
              setReviews((prev) => prev.filter((r) => r.id !== review.id));
              notify.success("Review deleted");
            } catch (e) {
              notify.error("Failed to delete review");
            }
          },
        },
      ],
      "warning",
    );
  };

  const statusColor: Record<string, string> = {
    active: theme.colors.success,
    inactive: theme.colors.textLight,
    flagged: theme.colors.error,
  };

  const filtered = reviews.filter((r) => {
    const matchesStatus = filterStatus === "all" || r.status === filterStatus;
    const q = search.toLowerCase();
    const matchesSearch =
      r.location_name?.toLowerCase().includes(q) ||
      r.username?.toLowerCase().includes(q) ||
      r.comment?.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <ActivityIndicator style={styles.centered} color={theme.colors.primary} />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.stickyHeader}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by location, user or comment…"
          placeholderTextColor={theme.colors.textLight}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <View style={styles.stickyHeader}>
        {/* Status filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipRow}
        >
          {(["all", ...REVIEW_STATUSES] as const).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, filterStatus === s && styles.chipActive]}
              onPress={() => setFilterStatus(s)}
            >
              <Text
                style={[
                  styles.chipText,
                  filterStatus === s && styles.chipTextActive,
                ]}
              >
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={styles.countLabel}>{filtered.length} reviews</Text>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        contentContainerStyle={styles.listContent}
      >
        {filtered.map((review) => (
          <View key={review.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {review.location_name ?? "Unknown location"}
                </Text>
                <Badge
                  label={review.status}
                  color={statusColor[review.status] ?? theme.colors.textLight}
                />
              </View>
              <Text style={styles.cardSubtitle}>
                By: {review.username ?? review.user_id.slice(0, 8)}… · Rating:{" "}
                {review.overall_rating}/5
              </Text>
              {review.comment ? (
                <Text style={styles.cardComment} numberOfLines={2}>
                  "{review.comment}"
                </Text>
              ) : null}
              <Text style={styles.cardMeta}>
                {review.created_at
                  ? new Date(review.created_at).toLocaleDateString()
                  : "—"}
              </Text>
            </View>

            <View style={styles.cardActions}>
              {/* Status cycle buttons */}
              {REVIEW_STATUSES.filter((s) => s !== review.status).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.actionBtn, styles.actionBtnOutline]}
                  onPress={() => handleStatusChange(review, s)}
                >
                  <Text style={styles.actionBtnTextOutline}>→ {s}</Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnDanger]}
                onPress={() => handleDelete(review)}
              >
                <Ionicons
                  name="trash"
                  size={14}
                  color={theme.colors.textOnPrimary}
                />
                <Text
                  style={[styles.actionBtnText, styles.actionBtnTextActive]}
                >
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AdminScreen() {
  const { isAdmin, loading } = useAdminGuard();
  const [activeTab, setActiveTab] = useState<Tab>("users");

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <ActivityIndicator
          style={styles.centered}
          color={theme.colors.primary}
        />
      </SafeAreaView>
    );
  }

  if (!isAdmin) return null; // guard already redirecting

  return (
    <SafeAreaView style={commonStyles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.colors.textOnPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(["users", "locations", "reviews"] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab && styles.tabLabelActive,
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === "users" && <UsersTab />}
        {activeTab === "locations" && <LocationsTab />}
        {activeTab === "reviews" && <ReviewsTab />}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  stickyHeader: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  listContentNoHeader: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignSelf: "center",
    marginTop: 60,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  backBtn: {
    padding: 4,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.textOnPrimary,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: theme.spacing.sm + 2,
    alignItems: "center",
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.textSecondary,
  },
  tabLabelActive: {
    color: theme.colors.primary,
    fontWeight: "700",
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  searchInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  countLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadows.sm,
  },
  cardHeader: {
    marginBottom: theme.spacing.sm,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    flex: 1,
  },
  cardSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  cardMeta: {
    fontSize: 11,
    color: theme.colors.textLight,
  },
  cardComment: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
    marginVertical: 4,
  },
  cardActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
  },
  actionBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  actionBtnOutline: {
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionBtnDanger: {
    backgroundColor: theme.colors.error,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "500",
  },
  actionBtnTextActive: {
    color: theme.colors.textOnPrimary,
  },
  actionBtnTextOutline: {
    color: theme.colors.textSecondary,
  },
  chipRow: {
    marginBottom: theme.spacing.sm,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.sm,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  chipTextActive: {
    color: theme.colors.textOnPrimary,
    fontWeight: "600",
  },
});
