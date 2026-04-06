import React from "react";
import { TestUser } from "@/services/adminService";
import { TesterMetadata } from "./AddTesterModal";
import { View, TouchableOpacity } from "react-native";
import { AppText as Text } from "@/components/AppText";
import { commonStyles } from "@/styles/common";
import { theme } from "@/styles/theme";
import { adminStyles } from "@/styles/adminStyles";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

interface TesterCardProps {
  item: TestUser & { itemType: "tester" };
  onStatusChange: (item: TestUser, status: string) => void;
  onDelete: (item: TestUser) => void;
}
function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[adminStyles.badge, { backgroundColor: color + "22" }]}>
      <Text style={[adminStyles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}
export function TestUserCard({
  item,
  onStatusChange,
  onDelete,
}: TesterCardProps) {
  const { t } = useTranslation();

  const meta = item.metadata as TesterMetadata | null;
  return (
    <View style={commonStyles.card}>
      <View style={adminStyles.cardHeader}>
        <View style={adminStyles.cardTitleRow}>
          <Text style={adminStyles.cardTitle}>{item.name || item.email}</Text>
          <Badge label="Tester" color={theme.colors.warning} />
          <Badge
            label={item.status.replace(/_/g, " ")}
            color={
              item.status === "signed_up"
                ? theme.colors.success
                : theme.colors.textSecondary
            }
          />
        </View>
        <Text style={adminStyles.cardSubtitle}>{item.email}</Text>
        {meta && (
          <Text style={adminStyles.cardMeta}>
            {meta.platform && `Platform: ${meta.platform}`}
            {meta.source && ` · Source: ${meta.source}`}
            {meta.notes && ` · ${meta.notes}`}
          </Text>
        )}
        <Text style={adminStyles.cardMeta}>
          {item.created_at
            ? new Date(item.created_at).toLocaleDateString()
            : "—"}
        </Text>
      </View>
      <View style={adminStyles.cardActions}>
        {item.status === "invited" && (
          <TouchableOpacity
            style={[adminStyles.actionBtn, adminStyles.actionBtnOutline]}
            onPress={() => onStatusChange(item, "signed_up")}
          >
            <Text style={adminStyles.actionBtnTextOutline}>
              {t("admin.sign_user_up")}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[adminStyles.actionBtn, adminStyles.actionBtnDanger]}
          onPress={() => onDelete(item)}
        >
          <Ionicons name="trash" size={14} color={theme.colors.textOnPrimary} />
          <Text
            style={[adminStyles.actionBtnText, adminStyles.actionBtnTextActive]}
          >
            {t("common.remove")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
