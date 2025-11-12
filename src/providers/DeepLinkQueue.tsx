import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { Linking } from "react-native";
import { useRouter } from "expo-router";
import { logger } from "@/utils/logger";
import { useAuth } from "./AuthProvider";

interface QueuedDeepLink {
  id: string;
  url: string;
  action: () => void;
}

interface DeepLinkContextType {
  queueDeepLink: (url: string, action: () => void) => void;
  processQueuedLinks: () => void;
  clearQueue: () => void;
}

const DeepLinkContext = createContext<DeepLinkContextType | undefined>(
  undefined
);

export function DeepLinkProvider({ children }: { children: React.ReactNode }) {
  const [queuedLinks, setQueuedLinks] = useState<QueuedDeepLink[]>([]);
  const router = useRouter();

  const queueDeepLink = useCallback((url: string, action: () => void) => {
    const id = Date.now().toString();
    setQueuedLinks((prev) => [...prev, { id, url, action }]);
    logger.info("Deep link queued:", { url });
  }, []);

  const processQueuedLinks = useCallback(() => {
    queuedLinks.forEach(({ action }) => {
      try {
        action();
      } catch (error) {
        logger.error("Failed to process queued deep link:", error);
      }
    });
    setQueuedLinks([]);
    logger.info("Processed queued deep links:", { queuedLinks });
  }, [queuedLinks]);

  const clearQueue = useCallback(() => {
    setQueuedLinks([]);
  }, []);

  // Handle incoming deep links
  useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleDeepLink(url);
    });

    return () => subscription?.remove();
  }, []);

  const handleDeepLink = (url: string) => {
    logger.info("Deep link received:", { url });

    // Password reset links
    if (url.includes("#type=recovery")) {
      router.replace("/(auth)/reset-password");
      return;
    }

    // OAuth callbacks
    if (url.includes("#access_token=")) {
      // Let Supabase handle OAuth automatically
      return;
    }

    // Notification links (queue if not authenticated)
    if (url.includes("/location/") || url.includes("/review/")) {
      const { userToken } = useAuth();
      if (!userToken) {
        queueDeepLink(url, () => router.push(url));
      } else {
        router.push(url);
      }
      return;
    }
  };

  return (
    <DeepLinkContext.Provider
      value={{ queueDeepLink, processQueuedLinks, clearQueue }}
    >
      {children}
    </DeepLinkContext.Provider>
  );
}

export const useDeepLink = () => {
  const context = useContext(DeepLinkContext);
  if (!context) {
    throw new Error("useDeepLink must be used within DeepLinkProvider");
  }
  return context;
};
