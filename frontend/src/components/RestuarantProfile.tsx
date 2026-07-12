import type { IRestaurant } from "../types/types";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { BiEdit, BiMapPin, BiPhone, BiCalendar, BiTrash } from "react-icons/bi";
import * as restaurantService from "../services/restaurantService";

interface props { 
    restuarant: IRestaurant;
    isSeller: boolean;
    onUpdate?: (restaurant: IRestaurant) => void;
    onDelete?: () => void;
}

const RestuarantProfile = ({ restuarant, isSeller, onUpdate, onDelete }: props) => {
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(restuarant.name);
  const [description, setDescription] = useState(restuarant.description || "");
  const [isOpen, setIsOpen] = useState(restuarant.isOpen);
  const [loading, setLoading] = useState(false);
 
  const deleteRestaurantHandler = async () => {
    if (!window.confirm("Delete this restaurant? This cannot be undone.")) return;
    try {
      setLoading(true);
      const { data } = await restaurantService.deleteRestaurant();
      if (data.token) {
        localStorage.setItem("token", data.token);
      }
      toast.success(data.message);
      if (onDelete) onDelete();
    } catch (error: any) {
      const message = error?.response?.data?.error?.message || error?.response?.data?.message || "Unable to delete restaurant";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async () => { 
    try { 
      const { data } = await restaurantService.toggleRestaurantStatus(!isOpen);
      
      toast.success(data.message); 
      setIsOpen(data.restaurant.isOpen);
    } catch (error: any) {
      console.log(error);
      toast.error(error.response.data.message);
    } 
  }

  const saveChanges = async () => {
    try { 
      setLoading(true);

      const { data } = await restaurantService.editRestaurant({ name, description });

      if (onUpdate) onUpdate(data.restaurant);
      toast.success(data.message);
      setEditMode(false);
    } catch (error: any) {
      const message = error?.response?.data?.error?.message || error?.response?.data?.message || "Unable to save changes";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl bg-white shadow-sm overflow-hidden transition-transform duration-200 hover:scale-[1.02] active:scale-[1.01] cursor-pointer">
      <div className="relative">
        {restuarant.image && (
          <img src={restuarant.image} alt={restuarant.name} className="w-full h-48 object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold text-white drop-shadow-sm">{restuarant.name}</h2>
            {restuarant.description && <p className="text-base text-white/80 mt-1 line-clamp-2">{restuarant.description}</p>}
          </div>
          {isSeller && !editMode && (
            <button onClick={() => setEditMode(true)} className="flex items-center gap-1.5 bg-white/90 hover:bg-white text-gray-700 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
              <BiEdit className="h-4 w-4" />
              Edit
            </button>
          )}
        </div>
      </div>
      <div className="p-5 space-y-4">
        {editMode ? (
          <>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Restaurant Name" className="w-full border rounded-lg px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-red-200" />
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" className="w-full border rounded-lg px-4 py-3 text-lg font-semibold outline-none focus:ring-2 focus:ring-red-200" />
            <div className="flex gap-3 pt-2">
              <button onClick={saveChanges} disabled={loading} className="bg-blue-500 text-white py-2 px-5 rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-60 transition-colors">
                {loading ? "Saving..." : "Save Changes"}
              </button>
              <button onClick={() => setEditMode(false)} className="py-2 px-5 rounded-lg font-semibold border border-red-500 text-red-500 hover:bg-red-50 transition-colors">
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2.5 text-gray-600">
                  <BiMapPin className="h-5 w-5 text-[#E23744] shrink-0" />
                  <span className="line-clamp-1">{restuarant.autoLocation.formattedAddress}</span>
                </div>
                <div className="flex items-center gap-2.5 text-gray-600">
                  <BiPhone className="h-5 w-5 text-[#E23744] shrink-0" />
                  <span>{restuarant.phone}</span>
                </div>
                <div className="flex items-center gap-2.5 text-gray-600">
                  <BiCalendar className="h-5 w-5 text-[#E23744] shrink-0" />
                  <span>Joined {new Date(restuarant.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${isOpen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {isOpen ? "Open" : "Closed"}
              </span>
              {restuarant.isVerified && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">Verified</span>
              )}
            </div>
            {isSeller && (
              <div className="border-t pt-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-base font-bold text-gray-800">Restaurant Status</span>
                  <button onClick={toggleStatus} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isOpen ? "bg-green-500" : "bg-gray-300"}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isOpen ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </label>
                <p className="text-sm font-medium text-gray-500 mt-1">{isOpen ? "Your restaurant is accepting orders" : "Your restaurant is currently closed"}</p>
              </div>
            )}
            {isSeller && (
              <div className="border-t pt-4">
                <button
                  onClick={deleteRestaurantHandler}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 text-red-600 hover:text-red-700 font-medium py-2 transition-colors"
                >
                  <BiTrash className="h-5 w-5" />
                  Delete Restaurant
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default RestuarantProfile
