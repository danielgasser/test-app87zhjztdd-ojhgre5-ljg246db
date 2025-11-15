import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  useColorScheme,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import logoImage from "assets/images/SafePathLogoTransparent1024x1024.png";
import { theme } from "@/styles/theme";

const { width, height } = Dimensions.get("window");

const WelcomeScreenNew = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Staggered animations for smooth entrance
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const handleGetStarted = () => {
    router.replace("/(auth)/register");
  };

  const handleSignIn = () => {
    router.replace("/(auth)/login");
  };

  const styles = getStyles(isDark);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      {/* Background Gradient */}
      <LinearGradient
        colors={
          isDark
            ? ["#1a1a2e", "#16213e", "#0f3460"]
            : [
                theme.colors.primary,
                theme.colors.primaryDark,
                theme.colors.secondary,
              ]
        }
        style={styles.gradient}
      />

      {/* Main Content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Logo/Brand Area */}
        <Animated.View
          style={[styles.logoContainer, { transform: [{ scale: scaleAnim }] }]}
        >
          {/* New image logo */}
          <Image
            source={logoImage}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Hero Text */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>
            Travel Safely.{"\n"}
            <Text style={styles.heroAccent}>Belong Everywhere.</Text>
          </Text>

          <Text style={styles.heroSubtitle}>
            The first GPS app that shows you how safe places are for people like
            you
          </Text>
        </View>

        {/* Feature Illustration */}
        <Animated.View
          style={[
            styles.illustrationContainer,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Map Mockup */}
          <View style={styles.mapMockup}>
            <View style={styles.mapPin1}>
              <View
                style={[
                  styles.pin,
                  { backgroundColor: theme.colors.secondary },
                ]}
              />
              <Text style={styles.pinLabel}>Safe</Text>
            </View>
            <View style={styles.mapPin2}>
              <View
                style={[
                  styles.pin,
                  { backgroundColor: theme.colors.mixedYellow },
                ]}
              />
              <Text style={styles.pinLabel}>Caution</Text>
            </View>
            <View style={styles.mapPin3}>
              <View
                style={[styles.pin, { backgroundColor: theme.colors.error }]}
              />
              <Text style={styles.pinLabel}>Avoid</Text>
            </View>
          </View>
        </Animated.View>

        {/* Key Benefits */}
        <View style={styles.benefitsContainer}>
          <View style={styles.benefit}>
            <Text style={styles.benefitIcon}>🎯</Text>
            <Text style={styles.benefitText}>
              Demographic-aware safety ratings
            </Text>
          </View>
          <View style={styles.benefit}>
            <Text style={styles.benefitIcon}>👥</Text>
            <Text style={styles.benefitText}>
              Community-powered recommendations
            </Text>
          </View>
          <View style={styles.benefit}>
            <Text style={styles.benefitIcon}>🤖</Text>
            <Text style={styles.benefitText}>AI-powered travel insights</Text>
          </View>
        </View>
      </Animated.View>

      {/* Bottom CTA Section */}
      <Animated.View
        style={[
          styles.ctaContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleGetStarted}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primaryDark]}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleSignIn}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryButtonText}>Sign In</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    logoImage: {
      width: 150,
      height: 150,
      marginBottom: 10,
    },
    container: {
      flex: 1,
      backgroundColor: isDark ? "#1a1a2e" : theme.colors.primary,
    },
    gradient: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      height: height,
    },
    content: {
      flex: 1,
      paddingHorizontal: 24,
      justifyContent: "center",
      alignItems: "center",
    },
    logoContainer: {
      marginBottom: 10,
      position: "relative",
      top: 20,
      left: 0,
    },
    logoPlaceholder: {
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: "rgba(255, 255, 255, 0.3)",
    },
    logoText: {
      fontSize: 28,
      fontWeight: "bold",
      color: theme.colors.background,
      textAlign: "center",
    },
    heroSection: {
      alignItems: "center",
      marginBottom: 20,
    },
    heroTitle: {
      fontSize: 33,
      fontWeight: "bold",
      color: theme.colors.background,
      textAlign: "center",
      lineHeight: 42,
      marginBottom: 16,
    },
    heroAccent: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.colors.mixedYellow,
    },
    heroSubtitle: {
      fontSize: 18,
      color: "rgba(255, 255, 255, 0.9)",
      textAlign: "center",
      lineHeight: 24,
      paddingHorizontal: 20,
    },
    illustrationContainer: {
      marginBottom: 30,
    },
    mapMockup: {
      width: 200,
      height: 120,
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      borderRadius: 16,
      position: "relative",
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.2)",
    },
    mapPin1: {
      position: "absolute",
      top: 20,
      left: 30,
      alignItems: "center",
    },
    mapPin2: {
      position: "absolute",
      top: 40,
      right: 40,
      alignItems: "center",
    },
    mapPin3: {
      position: "absolute",
      bottom: 20,
      left: 50,
      alignItems: "center",
    },
    pin: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginBottom: 4,
    },
    pinLabel: {
      fontSize: 15,
      color: theme.colors.background,
      fontWeight: "600",
    },
    benefitsContainer: {
      width: "100%",
    },
    benefit: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 4,
      paddingHorizontal: 20,
    },
    benefitIcon: {
      fontSize: 24,
      marginRight: 16,
    },
    benefitText: {
      fontSize: 16,
      color: "rgba(255, 255, 255, 0.95)",
      fontWeight: "500",
      flex: 1,
    },
    ctaContainer: {
      paddingHorizontal: 24,
      paddingBottom: 20,
      width: "100%",
    },
    primaryButton: {
      width: "100%",
      height: 56,
      borderRadius: 28,
      marginBottom: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    buttonGradient: {
      flex: 1,
      borderRadius: 28,
      justifyContent: "center",
      alignItems: "center",
    },
    primaryButtonText: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.background,
    },
    secondaryButton: {
      width: "100%",
      height: 56,
      borderRadius: 28,
      borderWidth: 2,
      borderColor: "rgba(255, 255, 255, 0.4)",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
      backgroundColor: "rgba(255, 255, 255, 0.1)",
    },
    secondaryButtonText: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.background,
    },
    demoButton: {
      width: "100%",
      height: 44,
      justifyContent: "center",
      alignItems: "center",
    },
    demoButtonText: {
      fontSize: 16,
      color: "rgba(255, 255, 255, 0.8)",
      textDecorationLine: "underline",
    },
  });

export default WelcomeScreenNew;
