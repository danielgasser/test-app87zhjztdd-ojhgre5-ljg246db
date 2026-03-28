import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAppDispatch, useAppSelector } from "src/store/hooks";
import {
  updateUserProfile,
  fetchUserProfile,
  fetchUserVoteStats,
} from "src/store/userSlice";
import { supabase } from "src/services/supabase";
import { theme } from "src/styles/theme";
import { router, useLocalSearchParams } from "expo-router";
import { decode } from "base64-arraybuffer";
import { notify } from "@/utils/notificationService";
import { logger } from "@/utils/logger";
import SearchRadiusSelector from "@/components/SearchRadiusSelector";
import { useAuth } from "@/providers/AuthProvider";
import {
  fetchUserRouteHistory,
  deleteRouteFromHistory,
  setNavigationIntent,
  RouteHistoryItem,
  fetchSavedLocations,
  SavedLocation,
  unsaveLocation,
  fetchRecentlyViewed,
  RecentlyViewedLocation,
} from "@/store/locationsSlice";
import { useSubscriptionTier } from "@/hooks/useFeatureAccess";
import { PremiumGate } from "@/components/PremiumGate";
import { commonStyles } from "@/styles/common";
import { useTranslation } from "react-i18next";

export default function ProfileScreen() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { user, signOut } = useAuth();
  const { profile, voteStats } = useAppSelector((state) => state.user);
  const {
    routeHistory,
    routeHistoryLoading,
    routeHistoryHasMore,
    routeHistoryPage,
  } = useAppSelector((state) => state.locations);

  const [uploading, setUploading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    activity: false,
    routeHistory: false,
    savedLocations: false,
    recentlyViewed: false,
    demographics: false,
    mapSettings: false,
    settings: false,
    account: false,
  });

  const scrollViewRef = useRef<ScrollView>(null);
  const sectionPositions = useRef<Record<string, number>>({});

  const subscriptionTier = useSubscriptionTier();

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchUserVoteStats(user.id));
    }
  }, [user?.id, dispatch]);

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchSavedLocations(user.id));
    }
  }, [user?.id, dispatch]);

  useEffect(() => {
    if (expandedSections.routeHistory && user?.id) {
      dispatch(fetchUserRouteHistory({ userId: user.id, page: 0 }));
    }
  }, [expandedSections.routeHistory, user?.id]);

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchRecentlyViewed({ userId: user.id }));
    }
  }, [user?.id, dispatch]);

  const { section } = useLocalSearchParams<{ section?: string }>();

  useEffect(() => {
    if (section && section in expandedSections) {
      // Small delay to let the screen finish rendering
      setTimeout(() => {
        toggleSection(section as keyof typeof expandedSections);
      }, 400);
    }
  }, [section]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    const isOpening = !expandedSections[section];
    setExpandedSections((prev) => ({
      activity: false,
      routeHistory: false,
      savedLocations: false,
      recentlyViewed: false,
      demographics: false,
      mapSettings: false,
      settings: false,
      account: false,
      [section]: !prev[section],
    }));

    if (isOpening) {
      setTimeout(() => {
        const y = sectionPositions.current[section];
        if (y !== undefined) {
          scrollViewRef.current?.scrollTo({ y: y - 16, animated: true });
        }
      }, 300);
    }
  };

  const isLoggedIn = !!user;
  const hasCompletedOnboarding = useAppSelector(
    (state) => state.user.onboardingComplete,
  );
  const savedLocations = useAppSelector(
    (state) => state.locations.savedLocations,
  );
  const savedLocationsLoading = useAppSelector(
    (state) => state.locations.savedLocationsLoading,
  );
  const recentlyViewed = useAppSelector(
    (state) => state.locations.recentlyViewed,
  );
  const recentlyViewedLoading = useAppSelector(
    (state) => state.locations.recentlyViewedLoading,
  );

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace("/(auth)/login");
    } catch (error) {
      notify.error(t("profile.failed_to_sign_out"));
    }
  };

  const pickImage = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      notify.confirm(
        "We need camera roll access to upload profile pictures. Would you like to open settings?",
        t("common.permission_denied"),
        [
          { text: t("common.cancel"), style: "cancel", onPress: () => {} },
          {
            text: t("common.open_settings"),
            style: "default",
            onPress: () => Linking.openSettings(),
          },
        ],
        "warning",
      );
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      setUploading(true);

      // Create file name
      const fileName = `${user?.id}-${Date.now()}.jpg`;
      const filePath = `avatars/${fileName}`;

      // Fetch the image and convert to base64
      const response = await fetch(uri);
      const blob = await response.blob();

      // Create a FileReader to convert blob to base64
      const fileReaderInstance = new FileReader();
      fileReaderInstance.readAsDataURL(blob);

      const base64data = await new Promise((resolve) => {
        fileReaderInstance.onload = () => {
          const base64String = fileReaderInstance.result as string;
          const base64 = base64String.split(",")[1];
          resolve(base64);
        };
      });

      // Decode base64 string
      const { error: uploadError } = await supabase.storage
        .from("user-avatars")
        .upload(filePath, decode(base64data as string), {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("user-avatars").getPublicUrl(filePath);

      await dispatch(
        updateUserProfile({
          userId: user!.id,
          profileData: { avatar_url: publicUrl },
        }),
      ).unwrap();

      // Refresh the profile to ensure we have the latest data
      await dispatch(fetchUserProfile(user!.id));
      notify.success(t("profile.profile_picture_updated"), t("common.success"));
    } catch (error: any) {
      logger.error("Upload error:", error);
      notify.error(t("profile.failed_to_upload_image"), t("common.error"));
    } finally {
      setUploading(false);
    }
  };

  const removeProfilePicture = async () => {
    try {
      setUploading(true);

      // Update profile to remove avatar_url
      await dispatch(
        updateUserProfile({
          userId: user!.id,
          profileData: { avatar_url: null }, // Changed from undefined to null
        }),
      ).unwrap();

      // Refresh profile to get updated data
      await dispatch(fetchUserProfile(user!.id));

      notify.success(t("profile.profile_picture_removed"));
    } catch (error) {
      logger.error("Remove avatar error:", error);
      notify.error(t("profile.failed_to_remove_profile_picture"));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveProfilePicture = () => {
    notify.confirm(
      t("profile.remove_profile_picture_question"),
      t("profile.remove_profile_picture"),
      [
        { text: t("common.cancel"), style: "cancel", onPress: () => {} },
        {
          text: t("profile.remove"),
          style: "destructive",
          onPress: removeProfilePicture,
        },
      ],
      "warning",
    );
  };

  const handleLoadMoreRoutes = () => {
    if (!routeHistoryLoading && routeHistoryHasMore && user?.id) {
      dispatch(
        fetchUserRouteHistory({ userId: user.id, page: routeHistoryPage + 1 }),
      );
    }
  };

  const handleDeleteRoute = (routeId: string) => {
    notify.confirm(
      t("profile.remove_route_history_question"),
      "",
      [
        { text: t("common.cancel"), style: "cancel", onPress: () => {} },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            dispatch(deleteRouteFromHistory(routeId));
            if (user?.id && routeHistory.length <= 1) {
              dispatch(fetchUserRouteHistory({ userId: user.id, page: 0 }));
            }
          },
        },
      ],
      "warning",
    );
  };

  const handleNavigateToRoute = (route: RouteHistoryItem) => {
    dispatch(
      setNavigationIntent({
        targetTab: "map",
        action: "view_location",
        data: { route },
      }),
    );
    router.push("/(tabs)");
  };

  const renderDemographics = () => {
    if (!profile) return null;

    const demographics = [];

    if (profile.race_ethnicity && profile.race_ethnicity.length > 0) {
      demographics.push(...profile.race_ethnicity);
    }
    if (profile.gender) {
      demographics.push(profile.gender);
    }
    if (profile.lgbtq_status) {
      demographics.push("LGBTQ+");
    }
    if (profile.disability_status && profile.disability_status.length > 0) {
      demographics.push(
        ...profile.disability_status.map((d) => `Disability: ${d}`),
      );
    }
    if (profile.religion) {
      demographics.push(profile.religion);
    }
    if (profile.age_range) {
      demographics.push(profile.age_range);
    }

    if (demographics.length === 0) {
      return (
        <Text style={styles.noDemographicsText}>
          {t("profile.no_demographics_added_yet")}
        </Text>
      );
    }

    return (
      <View style={styles.demographicsChipContainer}>
        {demographics.map((demo, index) => (
          <View key={index} style={styles.demographicChip}>
            <Text style={styles.demographicChipText}>{demo}</Text>
          </View>
        ))}
      </View>
    );
  };

  const handleDeleteSavedLocation = async (savedLocationId: string) => {
    try {
      await dispatch(unsaveLocation({ savedLocationId })).unwrap();
      notify.success(t("profile.location_removed"));
    } catch (error) {
      notify.error(t("profile.failed_to_remove_location"));
    }
  };

  const handleNavigateToSavedLocation = (location: SavedLocation) => {
    router.push({
      pathname: "/(tabs)",
      params: {
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
        locationName: location.name,
      },
    });
  };

  const handleNavigateToRecentlyViewed = (location: RecentlyViewedLocation) => {
    router.push({
      pathname: "/(tabs)",
      params: {
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
        locationName: location.name,
      },
    });
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      {!isLoggedIn ? (
        <View style={styles.notLoggedInContainer}>
          <Text style={styles.notLoggedInText}>
            {t("profile.please_sign_in_to_view_your_profile")}
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.signInButtonText}>{t("common.sign_in")}</Text>
          </TouchableOpacity>
        </View>
      ) : !hasCompletedOnboarding ? (
        <View style={styles.onboardingContainer}>
          <Ionicons
            name="information-circle"
            size={64}
            color={theme.colors.primary}
          />
          <Text style={styles.onboardingTitle}>
            {t("profile.complete_your_profile")}
          </Text>
          <Text style={styles.onboardingText}>
            {t("profile.add_your_demographic_information_to_get")}
          </Text>
          <TouchableOpacity
            style={styles.completeProfileButton}
            onPress={() => router.push("/onboarding")}
          >
            <Text style={styles.completeProfileButtonText}>
              {t("profile.complete_profile")}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.profileContainer}>
          {/* Upgrade Banner - only show for free users */}
          {subscriptionTier === "free" && (
            <TouchableOpacity
              style={styles.upgradeBanner}
              onPress={() => {
                router.push("/subscription");
              }}
            >
              <View style={styles.upgradeBannerContent}>
                <Ionicons
                  name="star"
                  size={24}
                  color={theme.colors.mixedYellow}
                />
                <View style={styles.upgradeBannerText}>
                  <Text style={styles.upgradeBannerTitle}>
                    {t("common.upgrade_to_premium")}
                  </Text>
                  <Text style={styles.upgradeBannerSubtitle}>
                    {t("profile.unlock_all_features_go_adfree")}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          {/* Fixed Header */}
          <View style={commonStyles.subHeader}>
            <TouchableOpacity
              onPress={pickImage}
              style={styles.avatarContainer}
            >
              {uploading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} />
              ) : profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons
                    name="person"
                    size={40}
                    color={theme.colors.textSecondary}
                  />
                </View>
              )}
              <View style={styles.avatarBadge}>
                <Ionicons
                  name="camera"
                  size={16}
                  color={theme.colors.textOnPrimary}
                />
              </View>
            </TouchableOpacity>
            <Text style={styles.userName}>
              {profile?.full_name || "TruGuide User"}
            </Text>
            <Text style={styles.memberSince}>
              {t("profile.member_since")}{" "}
              {new Date(profile?.created_at || Date.now()).toLocaleDateString()}
            </Text>
          </View>

          {/* Collapsible Sections */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.sectionsContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Activity Section */}
            <CollapsibleSection
              title={t("profile.my_activity")}
              icon="stats-chart"
              isExpanded={expandedSections.activity}
              onToggle={() => toggleSection("activity")}
              onLayout={(y) => {
                sectionPositions.current["activity"] = y;
              }}
            >
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>
                    {profile?.total_reviews || 0}
                  </Text>
                  <Text style={styles.statLabel}>
                    {t("settings.reviews_posted_total")}
                  </Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>
                    {voteStats?.helpful_votes_given || 0}
                  </Text>
                  <Text style={styles.statLabel}>
                    {t("profile.helpful_votes")}
                  </Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>
                    {voteStats?.unhelpful_votes_given || 0}
                  </Text>
                  <Text style={styles.statLabel}>
                    {t("profile.unhelpful_votes")}
                  </Text>
                </View>
              </View>
            </CollapsibleSection>
            {/* Route History Section */}
            <CollapsibleSection
              title={t("profile.route_history")}
              icon="navigate"
              isExpanded={expandedSections.routeHistory}
              onToggle={() => toggleSection("routeHistory")}
              onLayout={(y) => {
                sectionPositions.current["routeHistory"] = y;
              }}
            >
              <PremiumGate
                feature="routeHistory"
                fallback="blur"
                minHeight={110}
              >
                {routeHistoryLoading && routeHistory.length === 0 ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.primary}
                  />
                ) : routeHistory.length === 0 ? (
                  <Text style={styles.noRoutesText}>
                    {t("profile.no_routes")}
                  </Text>
                ) : (
                  <>
                    {routeHistory.map((route) => (
                      <View key={route.id} style={styles.routeHistoryItem}>
                        <TouchableOpacity
                          style={styles.routeHistoryContent}
                          onPress={() => handleNavigateToRoute(route)}
                        >
                          <View style={styles.routeHistoryHeader}>
                            <Ionicons
                              name="location"
                              size={16}
                              color={theme.colors.primary}
                            />
                            <Text
                              style={styles.routeHistoryOrigin}
                              numberOfLines={1}
                            >
                              {route.origin_name}
                            </Text>
                          </View>
                          <View style={styles.routeHistoryHeader}>
                            <Ionicons
                              name="flag"
                              size={16}
                              color={theme.colors.error}
                            />
                            <Text
                              style={styles.routeHistoryDestination}
                              numberOfLines={1}
                            >
                              {route.destination_name}
                            </Text>
                          </View>
                          <View style={styles.routeHistoryMeta}>
                            <Text style={styles.routeHistoryMetaText}>
                              {route.distance_km.toFixed(1)} {t("map.km")}
                            </Text>
                            <Text style={styles.routeHistoryMetaText}>
                              {t("common.unknown")}
                            </Text>
                            <Text style={styles.routeHistoryMetaText}>
                              {route.duration_minutes} {t("map.minutes")}
                            </Text>
                            <Text style={styles.routeHistoryMetaText}>
                              {t("common.unknown")}
                            </Text>
                            <Text style={styles.routeHistoryMetaText}>
                              {t("navigation.safety")}:{" "}
                              {route.safety_score?.toFixed(1) || "N/A"}
                            </Text>
                          </View>
                          <Text style={styles.routeHistoryDate}>
                            {new Date(route.created_at).toLocaleDateString()}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.routeHistoryDelete}
                          onPress={() => handleDeleteRoute(route.id)}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={20}
                            color={theme.colors.error}
                          />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {routeHistoryHasMore && (
                      <TouchableOpacity
                        style={styles.loadMoreButton}
                        onPress={handleLoadMoreRoutes}
                        disabled={routeHistoryLoading}
                      >
                        {routeHistoryLoading ? (
                          <ActivityIndicator
                            size="small"
                            color={theme.colors.primary}
                          />
                        ) : (
                          <Text style={styles.loadMoreText}>
                            {t("profile.load_more")}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </PremiumGate>
            </CollapsibleSection>
            {/* Saved Locations Section */}
            <CollapsibleSection
              title={t("profile.saved_locations")}
              icon="bookmark"
              isExpanded={expandedSections.savedLocations}
              onToggle={() => toggleSection("savedLocations")}
              onLayout={(y) => {
                sectionPositions.current["savedLocations"] = y;
              }}
            >
              <PremiumGate feature="saveLocations" fallback="blur">
                {savedLocationsLoading && savedLocations.length === 0 ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.primary}
                  />
                ) : savedLocations.length === 0 ? (
                  <Text style={styles.noRoutesText}>
                    {t("profile.no_saved_locations")}
                  </Text>
                ) : (
                  <>
                    {savedLocations.map((location) => (
                      <View key={location.id} style={styles.savedLocationItem}>
                        <TouchableOpacity
                          style={styles.savedLocationContent}
                          onPress={() =>
                            handleNavigateToSavedLocation(location)
                          }
                        >
                          <View style={styles.savedLocationHeader}>
                            <Ionicons
                              name="bookmark"
                              size={16}
                              color={theme.colors.primary}
                            />
                            <Text
                              style={styles.savedLocationName}
                              numberOfLines={1}
                            >
                              {location.nickname || location.name}
                            </Text>
                          </View>
                          <Text
                            style={styles.savedLocationAddress}
                            numberOfLines={1}
                          >
                            {location.address || t("location.no_address")}
                          </Text>
                          <Text style={styles.savedLocationDate}>
                            {t("navigation.saved")}{" "}
                            {new Date(location.created_at).toLocaleDateString()}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.savedLocationDelete}
                          onPress={() => handleDeleteSavedLocation(location.id)}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={20}
                            color={theme.colors.error}
                          />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </>
                )}
              </PremiumGate>
            </CollapsibleSection>
            {/* Recently Viewed Section */}
            <CollapsibleSection
              title={t("profile.recently_viewed")}
              icon="eye"
              isExpanded={expandedSections.recentlyViewed}
              onToggle={() => toggleSection("recentlyViewed")}
              onLayout={(y) => {
                sectionPositions.current["recentlyViewed"] = y;
              }}
            >
              <PremiumGate feature="recentlyViewed" fallback="blur">
                {recentlyViewedLoading && recentlyViewed.length === 0 ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.primary}
                  />
                ) : recentlyViewed.length === 0 ? (
                  <Text style={styles.noRoutesText}>
                    {t("profile.no_recently_viewed_locations")}
                  </Text>
                ) : (
                  <>
                    {recentlyViewed.slice(0, 10).map((location) => (
                      <TouchableOpacity
                        key={location.id}
                        style={styles.savedLocationItem}
                        onPress={() => handleNavigateToRecentlyViewed(location)}
                      >
                        <View style={styles.savedLocationContent}>
                          <View style={styles.savedLocationHeader}>
                            <Ionicons
                              name="eye"
                              size={16}
                              color={theme.colors.primary}
                            />
                            <Text
                              style={styles.savedLocationName}
                              numberOfLines={1}
                            >
                              {location.name}
                            </Text>
                          </View>
                          <Text
                            style={styles.savedLocationAddress}
                            numberOfLines={1}
                          >
                            {location.address || t("location.no_address")}
                          </Text>
                          <Text style={styles.savedLocationDate}>
                            {t("location.viewed")}{" "}
                            {new Date(location.viewed_at).toLocaleDateString()}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </PremiumGate>
            </CollapsibleSection>
            {/* Demographics Section */}
            <CollapsibleSection
              title={t("profile.demographics")}
              icon="people"
              isExpanded={expandedSections.demographics}
              onToggle={() => toggleSection("demographics")}
              onLayout={(y) => {
                sectionPositions.current["demographics"] = y;
              }}
            >
              {renderDemographics()}
              {/* Edit Demographics Button */}
              <TouchableOpacity
                style={styles.editDemographicsButton}
                onPress={() => router.push("/onboarding")}
              >
                <Ionicons
                  name="create"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={styles.editDemographicsText}>
                  {t("profile.edit_demographics")}
                </Text>
              </TouchableOpacity>
            </CollapsibleSection>
            {/* Map Settings Section */}
            <CollapsibleSection
              title={t("profile.map_settings")}
              icon="map"
              isExpanded={expandedSections.mapSettings}
              onToggle={() => toggleSection("mapSettings")}
              onLayout={(y) => {
                sectionPositions.current["mapSettings"] = y;
              }}
            >
              <SearchRadiusSelector />
            </CollapsibleSection>
            {/* Settings Section */}
            <CollapsibleSection
              title={t("profile.alerts_privacy_settings")}
              icon="notifications"
              isExpanded={expandedSections.settings}
              onToggle={() => toggleSection("settings")}
              onLayout={(y) => {
                sectionPositions.current["settings"] = y;
              }}
            >
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => router.push("/privacy-settings")}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={24}
                  color={theme.colors.primary}
                />
                <Text style={styles.settingText}>
                  {t("common.privacy_settings")}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => router.push("/notification-settings")}
              >
                <Ionicons
                  name="notifications"
                  size={24}
                  color={theme.colors.primary}
                />
                <Text style={styles.settingText}>
                  {t("common.notifications")}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => router.push("/display-settings")}
              >
                <Ionicons
                  name="color-palette"
                  size={24}
                  color={theme.colors.primary}
                />
                <Text style={styles.settingText}>
                  {t("common.display_preferences")}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </CollapsibleSection>
            {/* Account Section */}
            <CollapsibleSection
              title={t("profile.account")}
              icon="person-circle"
              isExpanded={expandedSections.account}
              onToggle={() => toggleSection("account")}
              onLayout={(y) => {
                sectionPositions.current["account"] = y;
              }}
            >
              <TouchableOpacity
                style={styles.accountItem}
                onPress={() => router.push("/edit-profile")}
              >
                <Ionicons
                  name="create"
                  size={24}
                  color={theme.colors.primary}
                />
                <Text style={styles.accountText}>
                  {t("common.edit_profile")}
                </Text>
              </TouchableOpacity>

              {profile?.avatar_url && (
                <TouchableOpacity
                  style={styles.accountItem}
                  onPress={handleRemoveProfilePicture}
                >
                  <Ionicons name="image" size={24} color={theme.colors.error} />
                  <Text
                    style={[styles.accountText, { color: theme.colors.error }]}
                  >
                    {t("profile.remove_profile_picture")}
                  </Text>
                </TouchableOpacity>
              )}
              {profile?.role === "admin" && (
                <TouchableOpacity
                  style={styles.accountItem}
                  onPress={() => router.push("/admin")}
                >
                  <Ionicons
                    name="shield-checkmark"
                    size={24}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.accountText}>
                    {t("common.admin_panel")}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.accountItem}
                onPress={handleLogout}
              >
                <Ionicons
                  name="log-out"
                  size={24}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.accountText}>{t("common.sign_out")}</Text>
              </TouchableOpacity>
            </CollapsibleSection>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

// Collapsible Section Component
function CollapsibleSection({
  title,
  icon,
  isExpanded,
  onToggle,
  children,
  onLayout,
}: {
  title: string;
  icon: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  onLayout?: (y: number) => void;
}) {
  return (
    <View
      style={styles.section}
      onLayout={(e) => onLayout?.(e.nativeEvent.layout.y)}
    >
      <TouchableOpacity style={styles.sectionHeader} onPress={onToggle}>
        <View style={styles.sectionHeaderLeft}>
          <Ionicons name={icon as any} size={24} color={theme.colors.primary} />
          <Text style={commonStyles.collapsibleTitle}>{title}</Text>
        </View>
        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={24}
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>
      {isExpanded && <View style={styles.sectionContent}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  upgradeBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginTop: -40,
    borderRadius: theme.borderRadius.md,
  },
  upgradeBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  upgradeBannerText: {
    flex: 1,
  },
  upgradeBannerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.textOnPrimary,
  },
  upgradeBannerSubtitle: {
    fontSize: 12,
    color: theme.colors.textOnPrimary,
    opacity: 0.9,
  },
  notLoggedInContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  notLoggedInText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
  },
  signInButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  signInButtonText: {
    color: theme.colors.textOnPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  onboardingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  onboardingTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  onboardingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.xl,
  },
  completeProfileButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  completeProfileButtonText: {
    color: theme.colors.textOnPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  profileContainer: {
    flex: 1,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: theme.colors.backgroundSecondary,
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  memberSince: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  sectionsContainer: {
    flex: 1,
  },
  section: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.separator,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionContent: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  statsGrid: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "700",
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  demographicsChipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  demographicChip: {
    backgroundColor: theme.colors.primary + "20",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  demographicChipText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: "500",
  },
  noDemographicsText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
  },
  editDemographicsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    gap: theme.spacing.sm,
  },
  editDemographicsText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: "500",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.md,
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  accountItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  accountText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  noRoutesText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
    textAlign: "center",
    padding: theme.spacing.md,
  },
  routeHistoryItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    overflow: "hidden",
  },
  routeHistoryContent: {
    flex: 1,
    padding: theme.spacing.md,
  },
  routeHistoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  routeHistoryOrigin: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    flex: 1,
  },
  routeHistoryDestination: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    flex: 1,
  },
  routeHistoryMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  routeHistoryMetaText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  routeHistoryDate: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  routeHistoryDelete: {
    padding: theme.spacing.md,
    justifyContent: "center",
    alignItems: "center",
  },
  savedLocationItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    overflow: "hidden",
  },
  savedLocationContent: {
    flex: 1,
    padding: theme.spacing.md,
  },
  savedLocationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  savedLocationName: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    flex: 1,
  },
  savedLocationAddress: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 24,
  },
  savedLocationDate: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    marginLeft: 24,
  },
  savedLocationDelete: {
    padding: theme.spacing.md,
    justifyContent: "center",
    alignItems: "center",
  },
  loadMoreButton: {
    padding: theme.spacing.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
  },
  loadMoreText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: "500",
  },
});
