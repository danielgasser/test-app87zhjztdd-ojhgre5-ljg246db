import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { AppTextInput as TextInput } from "../../src/components/AppTextInput";
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
  BlockedWord,
  adminDeleteBlockedWord,
  adminAddBlockedWord,
  adminFetchBlockedWords,
  adminUpdateTestUserStatus,
  TestUser,
  adminDeleteTestUser,
  adminAddTestUser,
  adminFetchTestUsers,
  exportTestUsersCSV,
} from "@/services/adminService";
import { useAuth } from "@/providers/AuthProvider";
import { getBuiltInWords } from "../../src/utils/contentFilter";
import {
  AddTesterModal,
  TesterMetadata,
} from "@/components/admin/AddTesterModal";
import { adminStyles } from "@/styles/adminStyles";
import { TestUserCard } from "@/components/admin/TestUserCard";

type Tab = "users" | "locations" | "reviews" | "content";

// ─── Pill badge ───────────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[adminStyles.badge, { backgroundColor: color + "22" }]}>
      <Text style={[adminStyles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Users tab ────────────────────────────────────────────────────────────────

type UserListItem =
  | (AdminUser & { itemType: "user" })
  | (TestUser & { itemType: "tester" });

type UserFilter = "all" | "user" | "admin" | "tester";

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [testUsers, setTestUsers] = useState<TestUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<UserFilter>("all");
  const [showAddTester, setShowAddTester] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<
    "all" | "ios" | "android" | "both"
  >("all");
  const load = useCallback(async () => {
    try {
      const [userData, testerData] = await Promise.all([
        adminFetchUsers(),
        adminFetchTestUsers(),
      ]);
      setUsers(userData);
      setTestUsers(testerData);
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

  const allItems: UserListItem[] = [
    ...users.map((u) => ({ ...u, itemType: "user" as const })),
    ...testUsers.map((t) => ({ ...t, itemType: "tester" as const })),
  ];

  const filtered = allItems.filter((item) => {
    const q = search.toLowerCase();
    const matchesSearch =
      item.itemType === "tester"
        ? item.email.toLowerCase().includes(q) ||
          item.name?.toLowerCase().includes(q) ||
          false
        : item.username?.toLowerCase().includes(q) ||
          item.full_name?.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q);
    const matchesFilter =
      filter === "all"
        ? true
        : filter === "tester"
          ? item.itemType === "tester"
          : item.itemType === "user" && item.role === filter;
    const matchesPlatform =
      filter !== "tester" || platformFilter === "all"
        ? true
        : item.itemType === "tester" &&
          (item.metadata as TesterMetadata | null)?.platform === platformFilter;
    return matchesSearch && matchesFilter && matchesPlatform;
  });

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

  const handleDeleteUser = (user: AdminUser) => {
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
              setUsers((prev) => prev.filter((u) => u.id !== user.id));
              notify.success("User deleted");
            } catch (e: any) {
              notify.error(e.message || "Failed to delete user");
            }
          },
        },
      ],
      "warning",
    );
  };

  const handleDeleteTester = (tester: TestUser) => {
    notify.confirm(
      `Remove "${tester.email}"?`,
      "They will be removed from the tester list.",
      [
        { text: "Cancel", style: "cancel", onPress: () => {} },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await adminDeleteTestUser(tester.id);
              setTestUsers((prev) => prev.filter((t) => t.id !== tester.id));
              notify.success("Tester removed");
            } catch (e) {
              notify.error("Failed to remove tester");
            }
          },
        },
      ],
      "warning",
    );
  };

  const handleTesterStatusChange = async (tester: TestUser, status: string) => {
    try {
      await adminUpdateTestUserStatus(tester.id, status);
      setTestUsers((prev) =>
        prev.map((t) => (t.id === tester.id ? { ...t, status } : t)),
      );
    } catch (e) {
      notify.error("Failed to update status");
    }
  };

  if (loading) {
    return (
      <ActivityIndicator
        style={adminStyles.centered}
        color={theme.colors.primary}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={adminStyles.stickyHeader}>
        {/* Add tester row */}
        <View
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexDirection: "row",
          }}
        >
          <View style={{ flex: 1, height: 40 }}>
            <TouchableOpacity
              style={[adminStyles.actionBtn, adminStyles.actionBtnActive]}
              onPress={() => setShowAddTester(true)}
            >
              <Text
                style={{
                  ...adminStyles.actionBtnTextActive,
                  fontSize: 16,
                  paddingHorizontal: 0,
                  paddingBottom: 6,
                  paddingTop: 2,
                }}
              >
                <Ionicons
                  name="add"
                  size={22}
                  color={theme.colors.textOnPrimary}
                />
                Add Test User
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View
          style={{
            marginTop: 8,
          }}
        >
          <TextInput
            style={adminStyles.searchInput}
            placeholder="Search by username, name or email…"
            placeholderTextColor={theme.colors.textLight}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={adminStyles.chipRow}
        >
          {(["all", "user", "admin", "tester"] as UserFilter[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[adminStyles.chip, filter === f && adminStyles.chipActive]}
              onPress={() => {
                setFilter(f);
                setPlatformFilter("all");
              }}
            >
              <Text
                style={[
                  adminStyles.chipText,
                  filter === f && adminStyles.chipTextActive,
                ]}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
          {filter === "tester" &&
            (["all", "ios", "android", "both"] as const).map((p) => (
              <TouchableOpacity
                key={`platform-${p}`}
                style={[
                  adminStyles.chip,
                  platformFilter === p && adminStyles.chipActive,
                ]}
                onPress={() => setPlatformFilter(p)}
              >
                <Text
                  style={[
                    adminStyles.chipText,
                    platformFilter === p && adminStyles.chipTextActive,
                  ]}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          {filter === "tester" && (
            <TouchableOpacity
              style={[adminStyles.chip, adminStyles.chipActive]}
              onPress={() =>
                exportTestUsersCSV(testUsers).catch(() =>
                  notify.error("Export failed"),
                )
              }
            >
              <Ionicons
                name="download-outline"
                size={14}
                color={theme.colors.textOnPrimary}
              />
            </TouchableOpacity>
          )}
        </ScrollView>
        <Text style={adminStyles.countLabel}>{filtered.length} results</Text>
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
        contentContainerStyle={adminStyles.listContent}
      >
        {filtered.map((item) =>
          item.itemType === "tester" ? (
            <TestUserCard
              key={`tester-${item.id}`}
              item={item}
              onStatusChange={handleTesterStatusChange}
              onDelete={handleDeleteTester}
            />
          ) : (
            <View key={`user-${item.id}`} style={adminStyles.card}>
              <View style={adminStyles.cardHeader}>
                <View style={adminStyles.cardTitleRow}>
                  <Text style={adminStyles.cardTitle}>
                    {item.username || item.full_name || "—"}
                  </Text>
                  {item.role === "admin" && (
                    <Badge label="admin" color={theme.colors.primary} />
                  )}
                </View>
                <Text style={adminStyles.cardSubtitle} numberOfLines={1}>
                  {item.id}
                </Text>
                <Text style={adminStyles.cardMeta}>
                  Reviews: {item.total_reviews ?? 0} · Tier:{" "}
                  {item.subscription_tier ?? "free"}
                </Text>
                <Text style={adminStyles.cardMeta}>
                  {item.created_at
                    ? new Date(item.created_at).toLocaleDateString()
                    : "—"}
                </Text>
              </View>
              <View style={adminStyles.cardActions}>
                {!item.is_protected && (
                  <TouchableOpacity
                    style={[
                      adminStyles.actionBtn,
                      item.role === "admin"
                        ? adminStyles.actionBtnOutline
                        : adminStyles.actionBtnActive,
                    ]}
                    onPress={() => handleRoleToggle(item)}
                  >
                    <Text
                      style={[
                        adminStyles.actionBtnText,
                        item.role === "admin"
                          ? adminStyles.actionBtnTextOutline
                          : adminStyles.actionBtnTextActive,
                      ]}
                    >
                      {item.role === "admin" ? "Revoke Admin" : "Make Admin"}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[adminStyles.actionBtn, adminStyles.actionBtnOutline]}
                  onPress={() => handleSubscriptionToggle(item)}
                >
                  <Ionicons
                    name={
                      item.subscription_tier === "premium"
                        ? "star-outline"
                        : "star"
                    }
                    size={14}
                    color={theme.colors.primary}
                  />
                  <Text style={adminStyles.actionBtnTextOutline}>
                    {item.subscription_tier === "premium" ? "free" : "premium"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[adminStyles.actionBtn, adminStyles.actionBtnDanger]}
                  onPress={() => handleDeleteUser(item)}
                >
                  <Ionicons
                    name="trash"
                    size={14}
                    color={theme.colors.textOnPrimary}
                  />
                  <Text
                    style={[
                      adminStyles.actionBtnText,
                      adminStyles.actionBtnTextActive,
                    ]}
                  >
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ),
        )}
      </ScrollView>
      <AddTesterModal
        visible={showAddTester}
        onClose={() => setShowAddTester(false)}
        onAdd={async (params) => {
          const newTester = await adminAddTestUser(params);
          setTestUsers((prev) => [...prev, newTester]);
          notify.success("Tester added");
        }}
      />
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
      <ActivityIndicator
        style={adminStyles.centered}
        color={theme.colors.primary}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={adminStyles.stickyHeader}>
        <TextInput
          filtered={false}
          style={adminStyles.searchInput}
          placeholder="Search by name or city…"
          placeholderTextColor={theme.colors.textLight}
          value={search}
          onChangeText={setSearch}
        />
        <Text style={adminStyles.countLabel}>{filtered.length} locations</Text>
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
        contentContainerStyle={adminStyles.listContent}
      >
        {filtered.map((loc) => (
          <View key={loc.id} style={adminStyles.card}>
            <View style={adminStyles.cardHeader}>
              <View style={adminStyles.cardTitleRow}>
                <Text style={adminStyles.cardTitle} numberOfLines={1}>
                  {loc.name}
                </Text>
                <Badge
                  label={loc.active ? "active" : "inactive"}
                  color={loc.active ? theme.colors.success : theme.colors.error}
                />
              </View>
              <Text style={adminStyles.cardSubtitle}>
                {loc.city}, {loc.state_province} · {loc.place_type}
              </Text>
              <Text style={adminStyles.cardMeta}>
                Reviews: {loc.review_count ?? 0} · Score:{" "}
                {loc.avg_overall_score?.toFixed(1) ?? "—"}
              </Text>
            </View>

            <View style={adminStyles.cardActions}>
              <TouchableOpacity
                style={[
                  adminStyles.actionBtn,
                  loc.active
                    ? adminStyles.actionBtnOutline
                    : adminStyles.actionBtnActive,
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
                    adminStyles.actionBtnText,
                    loc.active
                      ? adminStyles.actionBtnTextOutline
                      : adminStyles.actionBtnTextActive,
                  ]}
                >
                  {loc.active ? "Deactivate" : "Activate"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[adminStyles.actionBtn, adminStyles.actionBtnDanger]}
                onPress={() => handleDelete(loc)}
              >
                <Ionicons
                  name="trash"
                  size={14}
                  color={theme.colors.textOnPrimary}
                />
                <Text
                  style={[
                    adminStyles.actionBtnText,
                    adminStyles.actionBtnTextActive,
                  ]}
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
      <ActivityIndicator
        style={adminStyles.centered}
        color={theme.colors.primary}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={adminStyles.stickyHeader}>
        <TextInput
          filtered={false}
          style={adminStyles.searchInput}
          placeholder="Search by location, user or comment…"
          placeholderTextColor={theme.colors.textLight}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <View style={adminStyles.stickyHeader}>
        {/* Status filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={adminStyles.chipRow}
        >
          {(["all", ...REVIEW_STATUSES] as const).map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                adminStyles.chip,
                filterStatus === s && adminStyles.chipActive,
              ]}
              onPress={() => setFilterStatus(s)}
            >
              <Text
                style={[
                  adminStyles.chipText,
                  filterStatus === s && adminStyles.chipTextActive,
                ]}
              >
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={adminStyles.countLabel}>{filtered.length} reviews</Text>
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
        contentContainerStyle={adminStyles.listContent}
      >
        {filtered.map((review) => (
          <View key={review.id} style={adminStyles.card}>
            <View style={adminStyles.cardHeader}>
              <View style={adminStyles.cardTitleRow}>
                <Text style={adminStyles.cardTitle} numberOfLines={1}>
                  {review.location_name ?? "Unknown location"}
                </Text>
                <Badge
                  label={review.status}
                  color={statusColor[review.status] ?? theme.colors.textLight}
                />
              </View>
              <Text style={adminStyles.cardSubtitle}>
                By: {review.username ?? review.user_id.slice(0, 8)}… · Rating:{" "}
                {review.overall_rating}/5
              </Text>
              {review.comment ? (
                <Text style={adminStyles.cardComment} numberOfLines={2}>
                  "{review.comment}"
                </Text>
              ) : null}
              <Text style={adminStyles.cardMeta}>
                {review.created_at
                  ? new Date(review.created_at).toLocaleDateString()
                  : "—"}
              </Text>
            </View>

            <View style={adminStyles.cardActions}>
              {/* Status cycle buttons */}
              {REVIEW_STATUSES.filter((s) => s !== review.status).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[adminStyles.actionBtn, adminStyles.actionBtnOutline]}
                  onPress={() => handleStatusChange(review, s)}
                >
                  <Text style={adminStyles.actionBtnTextOutline}>→ {s}</Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[adminStyles.actionBtn, adminStyles.actionBtnDanger]}
                onPress={() => handleDelete(review)}
              >
                <Ionicons
                  name="trash"
                  size={14}
                  color={theme.colors.textOnPrimary}
                />
                <Text
                  style={[
                    adminStyles.actionBtnText,
                    adminStyles.actionBtnTextActive,
                  ]}
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

// ─── Content tab ─────────────────────────────────────────────────────────────

function ContentTab() {
  const { user } = useAuth();
  const [words, setWords] = useState<BlockedWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWord, setNewWord] = useState("");
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [builtInWords] = useState<string[]>(() => getBuiltInWords());

  const load = useCallback(async () => {
    try {
      const data = await adminFetchBlockedWords();
      setWords(data);
    } catch (e) {
      logger.error("Admin: fetch blocked words", e);
      notify.error("Failed to load blocked words");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    const trimmed = newWord.trim().toLowerCase();
    if (!trimmed || !user?.id) return;
    if (words.some((w) => w.word === trimmed)) {
      notify.error(`"${trimmed}" is already in your custom list`);
      return;
    }
    if (builtInWords.includes(trimmed)) {
      notify.error(`"${trimmed}" is already covered by the built-in filter`);
      return;
    }
    setAdding(true);
    try {
      const added = await adminAddBlockedWord(trimmed, user.id);
      setWords((prev) => [added, ...prev]);
      setNewWord("");
      notify.success(`"${trimmed}" added`);
    } catch (e) {
      notify.error("Failed to add word");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = (word: BlockedWord) => {
    notify.confirm(
      `Remove "${word.word}"?`,
      "This word will no longer be filtered.",
      [
        { text: "Cancel", style: "cancel", onPress: () => {} },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await adminDeleteBlockedWord(word.id);
              setWords((prev) => prev.filter((w) => w.id !== word.id));
              notify.success(`"${word.word}" removed`);
            } catch (e) {
              notify.error("Failed to remove word");
            }
          },
        },
      ],
      "warning",
    );
  };

  const filteredCustom = search
    ? words.filter((w) => w.word.includes(search.toLowerCase()))
    : words;

  const filteredBuiltIn = search
    ? builtInWords.filter((w) => w.includes(search.toLowerCase()))
    : builtInWords;

  if (loading) {
    return (
      <ActivityIndicator
        style={adminStyles.centered}
        color={theme.colors.primary}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Search */}
      <View style={adminStyles.stickyHeader}>
        <TextInput
          filtered={false}
          style={adminStyles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search words..."
          placeholderTextColor={theme.colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
          <TextInput
            style={[adminStyles.searchInput, { flex: 1, marginBottom: 0 }]}
            value={newWord}
            onChangeText={setNewWord}
            placeholder="Add a word to block..."
            placeholderTextColor={theme.colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[
              adminStyles.actionBtn,
              adminStyles.actionBtnActive,
              { alignSelf: "center" },
            ]}
            onPress={handleAdd}
            disabled={adding || !newWord.trim()}
          >
            {adding ? (
              <ActivityIndicator
                size="small"
                color={theme.colors.textOnPrimary}
              />
            ) : (
              <Ionicons
                name="add"
                size={18}
                color={theme.colors.textOnPrimary}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={adminStyles.listContent}>
        {/* Custom words */}
        <Text style={adminStyles.countLabel}>
          Custom ({filteredCustom.length})
        </Text>
        {filteredCustom.map((word) => (
          <View key={word.id} style={adminStyles.card}>
            <View style={{ flex: 1 }}>
              <Text style={adminStyles.cardTitle}>{word.word}</Text>
              <Text style={adminStyles.cardMeta}>
                {word.created_at
                  ? new Date(word.created_at).toLocaleDateString()
                  : "—"}
              </Text>
            </View>
            <TouchableOpacity
              style={[adminStyles.actionBtn, adminStyles.actionBtnDanger]}
              onPress={() => handleDelete(word)}
            >
              <Ionicons
                name="trash"
                size={14}
                color={theme.colors.textOnPrimary}
              />
            </TouchableOpacity>
          </View>
        ))}

        {/* Built-in words */}
        <Text style={[adminStyles.countLabel, { marginTop: theme.spacing.md }]}>
          Built-in ({filteredBuiltIn.length})
        </Text>
        {filteredBuiltIn.map((word, i) => (
          <View key={i} style={[adminStyles.card, { opacity: 0.5 }]}>
            <Text style={adminStyles.cardTitle}>{word}</Text>
            <Badge label="built-in" color={theme.colors.textSecondary} />
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
          style={adminStyles.centered}
          color={theme.colors.primary}
        />
      </SafeAreaView>
    );
  }

  if (!isAdmin) return null; // guard already redirecting

  return (
    <SafeAreaView style={commonStyles.container}>
      {/* Header */}
      <View style={adminStyles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={adminStyles.backBtn}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.colors.textOnPrimary}
          />
        </TouchableOpacity>
        <Text style={adminStyles.headerTitle}>Admin Panel</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab bar */}
      <View style={adminStyles.tabBar}>
        {(["users", "locations", "reviews", "content"] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              adminStyles.tabItem,
              activeTab === tab && adminStyles.tabItemActive,
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                adminStyles.tabLabel,
                activeTab === tab && adminStyles.tabLabelActive,
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={adminStyles.content}>
        {activeTab === "users" && <UsersTab />}
        {activeTab === "locations" && <LocationsTab />}
        {activeTab === "reviews" && <ReviewsTab />}
        {activeTab === "content" && <ContentTab />}
      </View>
    </SafeAreaView>
  );
}
