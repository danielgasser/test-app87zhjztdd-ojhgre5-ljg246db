import React from "react";
import { useLocalSearchParams, router } from "expo-router";
import RoutePlanningModal from "@/components/RoutePlanningModal";

export default function RoutePlanningScreen() {
  const params = useLocalSearchParams<{
    destinationId?: string;
    destinationName?: string;
    destinationAddress?: string;
    destinationLat?: string;
    destinationLng?: string;
    destinationSource?: string;
  }>();

  const initialDestination = params.destinationId
    ? {
        id: params.destinationId,
        name: params.destinationName || "",
        address: params.destinationAddress || "",
        latitude: parseFloat(params.destinationLat || "0"),
        longitude: parseFloat(params.destinationLng || "0"),
        source: (params.destinationSource || "mapbox") as "database" | "mapbox",
      }
    : null;

  return (
    <RoutePlanningModal
      visible={true}
      onClose={() => router.back()}
      initialDestination={initialDestination}
    />
  );
}
