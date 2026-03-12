import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { commonStyles } from "@/styles/common";
import { theme } from "@/styles/theme";
import { adminStyles } from "@/styles/adminStyles";
export type TesterMetadata = {
  platform?: "ios" | "android" | "both";
  source?: string;
  notes?: string;
};

interface AddTesterModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (params: {
    email: string;
    name?: string;
    metadata?: TesterMetadata;
  }) => Promise<void>;
}

const PLATFORMS: { label: string; value: "ios" | "android" | "both" }[] = [
  { label: "iOS", value: "ios" },
  { label: "Android", value: "android" },
  { label: "Both", value: "both" },
];

export function AddTesterModal({
  visible,
  onClose,
  onAdd,
}: AddTesterModalProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<"ios" | "android" | "both" | "">("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setEmail("");
    setName("");
    setPlatform("");
    setSource("");
    setNotes("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const metadata: TesterMetadata = {};
      if (platform) metadata.platform = platform;
      if (source.trim()) metadata.source = source.trim();
      if (notes.trim()) metadata.notes = notes.trim();
      await onAdd({
        email: email.trim(),
        name: name.trim() || undefined,
        metadata: Object.keys(metadata).length ? metadata : undefined,
      });
      reset();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ ...commonStyles.modalOverlay }}>
            <View style={{ ...commonStyles.modalContent }}>
              <View style={commonStyles.modalHeader}>
                <Text style={commonStyles.modalTitle}>Add Tester</Text>
                <TouchableOpacity onPress={handleClose}>
                  <Ionicons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView keyboardShouldPersistTaps="handled">
                <View style={{ ...commonStyles.formField, paddingRight: 20 }}>
                  <Text style={commonStyles.formLabel}>Email *</Text>
                  <TextInput
                    style={commonStyles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="tester@example.com"
                    placeholderTextColor={theme.colors.textLight}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <View style={commonStyles.formField}>
                  <Text style={commonStyles.formLabel}>Name</Text>
                  <TextInput
                    style={commonStyles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Optional"
                    placeholderTextColor={theme.colors.textLight}
                  />
                </View>

                <View style={commonStyles.formField}>
                  <Text style={commonStyles.formLabel}>Platform</Text>
                  <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
                    {PLATFORMS.map((p) => (
                      <TouchableOpacity
                        key={p.value}
                        style={[
                          adminStyles.chip,
                          platform === p.value && adminStyles.chipActive,
                        ]}
                        onPress={() =>
                          setPlatform(platform === p.value ? "" : p.value)
                        }
                      >
                        <Text
                          style={[
                            adminStyles.chipText,
                            platform === p.value && adminStyles.chipTextActive,
                          ]}
                        >
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={commonStyles.formField}>
                  <Text style={commonStyles.formLabel}>Source</Text>
                  <TextInput
                    style={commonStyles.input}
                    value={source}
                    onChangeText={setSource}
                    placeholder="e.g. linkedin, reddit, personal"
                    placeholderTextColor={theme.colors.textLight}
                  />
                </View>

                <View style={commonStyles.formField}>
                  <Text style={commonStyles.formLabel}>Notes</Text>
                  <TextInput
                    style={[
                      commonStyles.input,
                      { height: 80, textAlignVertical: "top" },
                    ]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Optional"
                    placeholderTextColor={theme.colors.textLight}
                    multiline
                  />
                </View>
              </ScrollView>

              <View style={commonStyles.modalFooter}>
                <TouchableOpacity
                  style={[commonStyles.cancelButton, { flex: 1 }]}
                  onPress={handleClose}
                >
                  <Text style={commonStyles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    commonStyles.primaryButton,
                    { flex: 2 },
                    (!email.trim() || loading) && commonStyles.buttonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={!email.trim() || loading}
                >
                  {loading ? (
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.textOnPrimary}
                    />
                  ) : (
                    <Text style={commonStyles.primaryButtonText}>
                      Add Tester
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}
