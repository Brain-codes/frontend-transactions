"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, X } from "lucide-react";

const GooglePlacesInput = ({
  value,
  onChange,
  placeholder = "Search for address...",
  disabled = false,
  className = "",
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(value?.fullAddress || "");
  const inputRef = useRef(null);
  const autocompleteService = useRef(null);
  const placesService = useRef(null);

  // Load Google Places API
  useEffect(() => {
    const loadGoogleMaps = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        initializeServices();
        return;
      }

      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        // Script already exists, wait for it to load
        const checkGoogle = setInterval(() => {
          if (
            window.google &&
            window.google.maps &&
            window.google.maps.places
          ) {
            clearInterval(checkGoogle);
            initializeServices();
          }
        }, 100);
        return;
      }

      // Load the script
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initializeServices;
      document.head.appendChild(script);
    };

    const initializeServices = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        autocompleteService.current =
          new window.google.maps.places.AutocompleteService();
        placesService.current = new window.google.maps.places.PlacesService(
          document.createElement("div")
        );
        setIsLoaded(true);
      }
    };

    loadGoogleMaps();
  }, []);

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value?.fullAddress || "");
  }, [value]);

  const handleInputChange = (e) => {
    const searchValue = e.target.value;
    setInputValue(searchValue);

    if (!searchValue.trim() || !isLoaded || !autocompleteService.current) {
      setPredictions([]);
      setShowSuggestions(false);
      return;
    }

    // Get predictions from Google Places API
    autocompleteService.current.getPlacePredictions(
      {
        input: searchValue,
        componentRestrictions: { country: "ng" }, // Restrict to Nigeria
        types: ["establishment", "geocode"], // Include both places and addresses
      },
      (predictions, status) => {
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          predictions
        ) {
          setPredictions(predictions);
          setShowSuggestions(true);
        } else {
          setPredictions([]);
          setShowSuggestions(false);
        }
      }
    );
  };

  const handlePlaceSelect = (prediction) => {
    if (!placesService.current) return;

    // Get detailed place information
    placesService.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ["formatted_address", "geometry", "address_components", "name"],
      },
      (place, status) => {
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          place
        ) {
          // Extract address components
          const addressComponents = place.address_components || [];
          let street = "";
          let city = "";
          let state = "";
          let country = "";

          addressComponents.forEach((component) => {
            const types = component.types;
            if (types.includes("street_number") || types.includes("route")) {
              street += component.long_name + " ";
            } else if (
              types.includes("locality") ||
              types.includes("sublocality")
            ) {
              city = component.long_name;
            } else if (types.includes("administrative_area_level_1")) {
              state = component.long_name;
            } else if (types.includes("country")) {
              country = component.long_name;
            }
          });

          const addressData = {
            fullAddress: place.formatted_address,
            street: street.trim() || place.name,
            city: city,
            state: state,
            country: country,
            latitude: place.geometry?.location?.lat() || null,
            longitude: place.geometry?.location?.lng() || null,
          };

          setInputValue(place.formatted_address);
          setShowSuggestions(false);
          setPredictions([]);

          if (onChange) {
            onChange(addressData);
          }
        }
      }
    );
  };

  const clearAddress = () => {
    setInputValue("");
    setPredictions([]);
    setShowSuggestions(false);
    if (onChange) {
      onChange({
        fullAddress: "",
        street: "",
        city: "",
        state: "",
        country: "Nigeria",
        latitude: null,
        longitude: null,
      });
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled || !isLoaded}
          className={`pl-10 pr-10 ${className}`}
          onFocus={() => {
            if (predictions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          onBlur={(e) => {
            // Delay hiding suggestions to allow for click
            setTimeout(() => {
              setShowSuggestions(false);
            }, 200);
          }}
        />
        {inputValue && (
          <button
            onClick={clearAddress}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Loading indicator */}
      {!isLoaded && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md mt-1 p-3 text-sm text-gray-500 z-10">
          Loading Google Places...
        </div>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && predictions.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-y-auto z-10 shadow-lg">
          {predictions.map((prediction) => (
            <button
              key={prediction.place_id}
              type="button"
              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:bg-gray-50 focus:outline-none"
              onClick={() => handlePlaceSelect(prediction)}
            >
              <div className="flex items-start">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {prediction.structured_formatting?.main_text ||
                      prediction.description}
                  </div>
                  <div className="text-xs text-gray-500">
                    {prediction.structured_formatting?.secondary_text || ""}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No API key warning */}
      {!process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY && (
        <div className="absolute top-full left-0 right-0 bg-yellow-50 border border-yellow-300 rounded-md mt-1 p-3 text-sm text-yellow-700 z-10">
          Google Places API key not configured
        </div>
      )}
    </div>
  );
};

export default GooglePlacesInput;
