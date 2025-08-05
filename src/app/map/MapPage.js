"use client";

import React from "react";
import {
  GoogleMap,
  HeatmapLayer,
  Marker,
  LoadScript,
} from "@react-google-maps/api";

const MapPage = ({
  apiKey,
  locations = [],
  isFullscreen = false,
  mapType = "heatmap",
  intensity = "medium",
}) => {
  const [isLoading, setIsLoading] = React.useState(true);

  // Convert locations to heatmap data
  const heatmapData = React.useMemo(() => {
    if (isLoading || !locations.length) return [];
    return locations.map((location) => ({
      location: new google.maps.LatLng(
        parseFloat(location.lat),
        parseFloat(location.lng)
      ),
      // Weight heatmap by sales amount (normalized to reasonable scale)
      weight:
        mapType === "heatmap" ? Math.max(1, (location.amount || 0) / 50000) : 1,
    }));
  }, [locations, isLoading, mapType]);

  // Enhanced map styling options
  const mapContainerStyle = {
    height: isFullscreen ? "100vh" : "100%",
    width: "100%",
  };

  const intensitySettings = {
    low: { radius: 15, opacity: 0.5 },
    medium: { radius: 25, opacity: 0.7 },
    high: { radius: 35, opacity: 0.9 },
  };

  const currentIntensity =
    intensitySettings[intensity] || intensitySettings.medium;

  // Custom map styles for better visualization
  const mapStyles = [
    {
      featureType: "all",
      elementType: "geometry",
      stylers: [{ color: "#f5f5f5" }],
    },
    {
      featureType: "administrative",
      elementType: "labels.text.fill",
      stylers: [{ color: "#444444" }],
    },
    {
      featureType: "landscape",
      elementType: "all",
      stylers: [{ color: "#f2f2f2" }],
    },
    {
      featureType: "poi",
      elementType: "all",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "road",
      elementType: "all",
      stylers: [{ saturation: -100 }, { lightness: 45 }],
    },
    {
      featureType: "water",
      elementType: "all",
      stylers: [{ color: "#46bcec" }, { visibility: "on" }],
    },
  ];

  return (
    <LoadScript
      googleMapsApiKey={apiKey}
      libraries={["visualization"]}
      onLoad={() => setIsLoading(false)}
    >
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={{ lat: 9.082, lng: 8.6753 }}
        zoom={isFullscreen ? 6 : 6}
        mapTypeId="roadmap"
        options={{
          disableDefaultUI: !isFullscreen,
          zoomControl: true,
          mapTypeControl: isFullscreen,
          scaleControl: true,
          streetViewControl: isFullscreen,
          rotateControl: false,
          fullscreenControl: isFullscreen,
          styles: mapStyles,
          gestureHandling: "greedy",
        }}
      >
        {!isLoading && mapType === "heatmap" && heatmapData.length > 0 && (
          <HeatmapLayer
            data={heatmapData}
            options={{
              radius: currentIntensity.radius,
              opacity: currentIntensity.opacity,
              gradient: [
                "rgba(0, 255, 255, 0)",
                "rgba(0, 255, 255, 0.2)",
                "rgba(0, 191, 255, 0.4)",
                "rgba(0, 127, 255, 0.6)",
                "rgba(0, 63, 255, 0.8)",
                "rgba(0, 0, 255, 1)",
                "rgba(0, 0, 223, 1)",
                "rgba(0, 0, 191, 1)",
                "rgba(0, 0, 159, 1)",
                "rgba(0, 0, 127, 1)",
                "rgba(63, 0, 91, 1)",
                "rgba(127, 0, 63, 1)",
                "rgba(191, 0, 31, 1)",
                "rgba(255, 0, 0, 1)",
              ],
            }}
          />
        )}

        {!isLoading &&
          mapType === "markers" &&
          locations.slice(0, 200).map((location) => (
            <Marker
              key={location.id}
              position={{
                lat: parseFloat(location.lat),
                lng: parseFloat(location.lng),
              }}
              title={`${location.customerName} - ${location.city}, ${
                location.state
              }\nAmount: ₦${location.amount?.toLocaleString()}\nProduct: ${
                location.productCategory
              }`}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: Math.min(
                  Math.max(5, (location.amount || 0) / 25000),
                  20
                ), // Scale based on amount
                fillColor:
                  location.customerType === "Enterprise"
                    ? "#8B5CF6"
                    : location.customerType === "Premium"
                    ? "#3B82F6"
                    : location.customerType === "Standard"
                    ? "#10B981"
                    : "#F59E0B",
                fillOpacity: 0.8,
                strokeColor: "#ffffff",
                strokeWeight: 2,
              }}
            />
          ))}
      </GoogleMap>
    </LoadScript>
  );
};

export default MapPage;
