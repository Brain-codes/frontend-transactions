import React from "react";
import MapPage from "./MapPage";

export default function Page() {
  return <MapPage apiKey={process.env.GOOGLE_MAPS_API_KEY} />;
}
