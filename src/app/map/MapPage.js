"use client";

import React from "react";
import { GoogleMap, HeatmapLayer, LoadScript } from "@react-google-maps/api";
import Link from "next/link";

const MapPage = ({ apiKey }) => {
  const [isLoading, setIsLoading] = React.useState(true);

  // Generate 500 random locations around Nigeria
  const locations = React.useMemo(
    () =>
      Array.from({ length: 500 }, () => ({
        lat: (Math.random() * 10 + 4).toFixed(6),
        lng: (Math.random() * 12 + 3).toFixed(6),
      })),
    []
  );

  // Convert locations to heatmap data
  const heatmapData = React.useMemo(() => {
    if (isLoading) return [];
    return locations.map((location) => ({
      location: new google.maps.LatLng(
        parseFloat(location.lat),
        parseFloat(location.lng)
      ),
      weight: 1,
    }));
  }, [locations, isLoading]);

  return (
    <div className="flex relative">
      {/* Sidebar */}
      <div className="w-[400px] h-[100dvh] flex flex-col gap-5 px-5 overflow-y-auto">
        <div className="flex justify-between text-black py-10">
          <Link href="/" className="underline">
            Back
          </Link>
          <h5>Total of {heatmapData.length} locations</h5>
        </div>
        <p className="text-[10px] text-red-500">
          Note: These data are generated by hand (dummy data)
        </p>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        )}
        {heatmapData.map((item, index) => {
          return (
            <div
              key={index}
              className="border-gray-400 border-2 rounded-[8px] px-2 py-5 bg-blue-400/10 flex justify-between"
            >
              <div>
                <p className="text-[10px] text-gray-500">Latitude</p>
                <h4 className="text-black uppercase">{item.location.lat()}</h4>
              </div>
              <div>
                <p className="text-[10px] text-gray-500">Longitude</p>
                <h4 className="text-black uppercase">{item.location.lng()}</h4>
              </div>
            </div>
          );
        })}
      </div>
      <LoadScript
        googleMapsApiKey={apiKey}
        libraries={["visualization"]}
        onLoad={() => setIsLoading(false)}
      >
        <GoogleMap
          mapContainerStyle={{
            height: "100dvh",
            width: "calc(100dvw - 400px)",
          }}
          center={{ lat: 9.082, lng: 8.6753 }}
          zoom={6}
          mapTypeId="hybrid"
        >
          {!isLoading && <HeatmapLayer data={heatmapData} />}
        </GoogleMap>
      </LoadScript>
    </div>
  );
};

export default MapPage;
