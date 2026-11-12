import toast from "react-hot-toast";
import { verifyRestaurant } from "../services/adminService";
import type { IRestaurant } from "../types/types";

const AdminRestaurantCard = ({
  restaurant,
  onVerify,
}: {
  restaurant: IRestaurant;
  onVerify: () => void;
}) => {
  const verify = async () => {
    try {
      await verifyRestaurant(restaurant._id);
      toast.success("Restaurant verified");
      onVerify();
    } catch {
      toast.error("failed to verify restaurant");
    }
  };
  return (
    <div className="rounded-xl bg-white p-4 shadow space-y-2">
      <img
        src={restaurant.image}
        className="h-40 w-full object-cover rounded"
        alt=""
      />
      <h3>{restaurant.name}</h3>
      <p className="text-sm text-gray-500">{restaurant.phone}</p>
      <p>{restaurant.autoLocation?.formattedAddress}</p>

      <button
        className="w-full rounded bg-green-500 py-2 text-white hover:bg-green-600"
        onClick={verify}
      >
        Verify Restaurant
      </button>
    </div>
  );
};

export default AdminRestaurantCard;
