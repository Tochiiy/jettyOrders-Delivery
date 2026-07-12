import { useSearchParams } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useEffect, useState } from "react";
import * as restaurantService from "../services/restaurantService";
import type { IRestaurant } from "../types/types";
import RestaurantCard from "../components/RestaurantCard";
import RestaurantCarousel from "../components/RestaurantCarousel";
import { BiMapPin, BiStore, BiBuilding, BiPhone, BiError } from "react-icons/bi";

type ViewMode = "nearby" | "all";

const Homepage = () => {
  const { location, loadingLocation, user } = useAppData();
  const [searchParams] = useSearchParams();
  const search = searchParams.get("search") || "";
  const [viewMode, setViewMode] = useState<ViewMode>("nearby");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [restaurants, setRestaurants] = useState<IRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRestaurant, setUserRestaurant] = useState<IRestaurant | null>(null);
  const [userRestaurantLoading, setUserRestaurantLoading] = useState(false);
  const [userRestaurantError, setUserRestaurantError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRestaurants = async () => {
      setLoading(true);
      setError(null);

      try {
        if (viewMode === "nearby") {
          if (!location) {
            if (loadingLocation) {
              setError(null);
              return;
            }
            setRestaurants([]);
            setError("Location access is required for nearby restaurants.");
            return;
          }

          const { data } = await restaurantService.getNearbyRestaurants(
            location.latitude, location.longitude, search, 5000, verifiedOnly
          );

          setRestaurants(data.restaurants || []);
          return;
        }

        const { data } = await restaurantService.getAllRestaurants(search, verifiedOnly);

        setRestaurants(data.restaurants || []);
      } catch (err) {
        console.error(err);
        setError("Unable to load restaurants. Please try again later.");
        setRestaurants([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, [location, search, viewMode, verifiedOnly]);

  useEffect(() => {
    const fetchUserRestaurant = async () => {
      if (!user?.restaurantId) {
        setUserRestaurant(null);
        setUserRestaurantError(null);
        return;
      }

      setUserRestaurantLoading(true);
      setUserRestaurantError(null);

      try {
        const token = localStorage.getItem("token") || undefined;
        const { data } = await restaurantService.getRestaurantById(user.restaurantId, token);

        setUserRestaurant(data.restaurant || null);
      } catch (err) {
        console.error(err);
        setUserRestaurantError("Unable to load your restaurant details.");
        setUserRestaurant(null);
      } finally {
        setUserRestaurantLoading(false);
      }
    };

    fetchUserRestaurant();
  }, [user]);

  const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const deg2rad = (deg: number): number => deg * (Math.PI / 180);

  const title = viewMode === "nearby" ? "Nearby Restaurants" : "All Restaurants";
  const subtitle =
    viewMode === "nearby"
      ? `Search results for ${search || "all"} near your current location.`
      : `Displaying ${search ? `search results for ${search}` : "all restaurants"}.`;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900">
                <BiStore className="h-7 w-7 text-[#E23744]" />
                {title}
              </h1>
              <p className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                <BiMapPin className="h-4 w-4" />
                {subtitle}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${viewMode === "nearby" ? "bg-red-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                onClick={() => setViewMode("nearby")}
              >
                Nearby
              </button>
              <button
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${viewMode === "all" ? "bg-red-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                onClick={() => setViewMode("all")}
              >
                All Restaurants
              </button>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <span className="text-xs font-medium">Verified</span>
                <div
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${verifiedOnly ? "bg-blue-500" : "bg-gray-300"}`}
                  onClick={() => setVerifiedOnly((prev) => !prev)}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${verifiedOnly ? "translate-x-4" : "translate-x-0"}`}
                  />
                </div>
              </label>
            </div>
          </div>
        </div>

        {userRestaurantLoading ? (
          <div className="rounded-3xl bg-white p-8 shadow-sm text-center text-gray-500">Loading your restaurant...</div>
        ) : userRestaurantError ? (
          <div className="rounded-3xl bg-white p-8 shadow-sm text-center text-red-600 flex items-center justify-center gap-2">
            <BiError className="h-5 w-5" />
            {userRestaurantError}
          </div>
        ) : userRestaurant ? (
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
                  <BiBuilding className="h-6 w-6 text-[#E23744]" />
                  Your Restaurant
                </h2>
                <p className="mt-1 text-sm text-gray-500">Details for your authenticated restaurant.</p>
              </div>
              <span className={`rounded-full px-4 py-2 text-xs font-semibold ${userRestaurant.isOpen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {userRestaurant.isOpen ? "Open" : "Closed"}
              </span>
            </div>
            <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center">
              <img src={userRestaurant.image} alt={userRestaurant.name} className="h-28 w-28 rounded-3xl object-cover shadow-sm" />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold text-gray-900">{userRestaurant.name}</h3>
                  {userRestaurant.isVerified ? (
                    <span className="rounded-full px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700">Verified</span>
                  ) : (
                    <span className="rounded-full px-3 py-1 text-xs font-semibold bg-yellow-100 text-yellow-700">Unverified</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{userRestaurant.description || "No description provided."}</p>
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <BiMapPin className="h-3 w-3" />
                    {userRestaurant.autoLocation.formattedAddress}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <BiPhone className="h-3 w-3" />
                    {userRestaurant.phone}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {loadingLocation && viewMode === "nearby" ? (
          <div className="rounded-3xl bg-white p-8 shadow-sm text-center text-gray-500 flex items-center justify-center gap-2">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#E23744] border-t-transparent" />
            Getting your location...
          </div>
        ) : loading ? (
          <div className="rounded-3xl bg-white p-8 shadow-sm text-center text-gray-500">Loading restaurants...</div>
        ) : error ? (
          <div className="rounded-3xl bg-white p-8 shadow-sm text-center text-red-600 flex items-center justify-center gap-2">
            <BiError className="h-5 w-5" />
            {error}
          </div>
        ) : restaurants.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 shadow-sm text-center text-gray-500 flex flex-col items-center gap-3">
            <BiBuilding className="h-12 w-12 text-gray-300" />
            No restaurants found.
          </div>
        ) : (
          <>
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <RestaurantCarousel restaurants={restaurants} height="260px" />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
            {restaurants.map((restaurant) => {
              const distance = location
                ? getDistanceKm(
                    location.latitude,
                    location.longitude,
                    restaurant.autoLocation.coordinates[1],
                    restaurant.autoLocation.coordinates[0]
                  )
                : null;

              return (
                <RestaurantCard key={restaurant._id} restaurant={restaurant} distanceKm={distance} viewMode={viewMode} />
              );
            })}
          </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Homepage;
