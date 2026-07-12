import type { IRestaurant } from "../types/types";
import { useNavigate } from "react-router-dom";

type ViewMode = "nearby" | "all";

interface Props {
  restaurant: IRestaurant;
  distanceKm?: number | null;
  viewMode?: ViewMode;
}

const RestuarantCard = ({ restaurant, distanceKm = null, viewMode = "nearby" }: Props) => {
  const navigate = useNavigate();

  const handleOpen = () => navigate(`/restaurant/${restaurant._id}`);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(e) => { if (e.key === "Enter") handleOpen(); }}
      className="overflow-hidden rounded-3xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow transform-gpu transition-transform duration-200 hover:scale-105 hover:-translate-y-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-100"
    >
      <div className="flex items-start gap-4">
        <img src={restaurant.image} alt={restaurant.name} className="h-24 w-24 rounded-3xl object-cover shadow-sm" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-gray-900">{restaurant.name}</h2>
            <div className="flex gap-2 flex-wrap">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${restaurant.isOpen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {restaurant.isOpen ? "Open" : "Closed"}
              </span>
              {restaurant.isVerified ? (
                <span className="rounded-full px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700">Verified</span>
              ) : (
                <span className="rounded-full px-3 py-1 text-xs font-semibold bg-yellow-100 text-yellow-700">Unverified</span>
              )}
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-600 line-clamp-2">{restaurant.description || "No description available."}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500">
            <span>{restaurant.autoLocation.formattedAddress}</span>
            <span>•</span>
            <span>{restaurant.phone}</span>
            {distanceKm !== null && (viewMode === "nearby" || viewMode === "all") && (
              <>
                <span>•</span>
                <span>{distanceKm.toFixed(1)} km away</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestuarantCard;
