import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import * as restaurantService from "../services/restaurantService";
import * as menuService from "../services/menuService";
import { BiChevronLeft, BiMapPin, BiPhone, BiCheckCircle, BiX, BiTime, BiShield, BiTag, BiErrorCircle, BiPlusCircle } from "react-icons/bi";
import { toast } from "react-hot-toast";
import type { IRestaurant, IMenuItem } from "../types/types";

const RestaurantMenu = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
  const [items, setItems] = useState<IMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToCart } = useAppData();

  const handleAddToCart = async (item: IMenuItem) => {
    if (!restaurant?.isOpen) {
      toast.error("This restaurant is currently closed and not accepting orders.");
      return;
    }
    if (!item.isAvailable) {
      toast.error("This item is currently unavailable.");
      return;
    }
    try {
      await addToCart({
        menuItemId: item._id,
        name: item.name,
        price: item.price,
        image: item.image,
        category: item.category,
        restaurantId: restaurantId!,
        restaurantName: restaurant?.name || "",
        quantity: 1,
      });
      toast.success("Added to cart");
    } catch (err: any) {
      const message = err?.response?.data?.message || "Unable to add to cart";
      toast.error(message);
    }
  };

  useEffect(() => {
    if (!restaurantId) return;

    const fetchRestaurant = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("token") || undefined;

        const [restaurantRes, menuRes] = await Promise.all([
          restaurantService.getRestaurantById(restaurantId, token),
          menuService.getPublicMenuItems(restaurantId),
        ]);

        setRestaurant(restaurantRes.data.restaurant);
        setItems(menuRes.data.menuItems || []);
      } catch (err: any) {
        setError(
          err?.response?.data?.message || "Unable to load restaurant details."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [restaurantId]);

  const groupedItems = items.reduce<Record<string, IMenuItem[]>>((acc, item) => {
    const category = item.category || "Other";
    acc[category] = acc[category] || [];
    acc[category].push(item);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#E23744]" />
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-20">
        <div className="mx-auto max-w-xl rounded-3xl border border-red-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
            <BiX className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Restaurant not found</h1>
          <p className="mt-3 text-sm text-gray-500">{error || "We couldn't load the restaurant you're looking for."}</p>
          <Link to="/" className="mt-8 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">
            <BiChevronLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative overflow-hidden bg-slate-900">
        <img src={restaurant.image} alt={restaurant.name} className="h-72 w-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-4 pb-8 sm:px-6">
          <div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-xl shadow-2xl shadow-black/20 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-4 text-white">
                <Link to="/" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20">
                  <BiChevronLeft className="h-4 w-4" /> Back to restaurants
                </Link>
                <div className="space-y-2">
                  <p className="text-sm uppercase tracking-[0.25em] text-slate-300">Restaurant</p>
                  <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">{restaurant.name}</h1>
                  {restaurant.description && <p className="max-w-3xl text-sm text-slate-200 sm:text-base">{restaurant.description}</p>}
                </div>
              </div>
              <div className="grid gap-3 sm:text-right">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white">
                  <BiCheckCircle className="h-5 w-5 text-emerald-300" />
                  {restaurant.isOpen ? "Open now" : "Currently closed"}
                </div>
                <div className="rounded-full bg-white/10 px-4 py-2 text-sm text-slate-200">
                  Verified: {restaurant.isVerified ? "Yes" : "Pending"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-6">
            <section className="overflow-hidden rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">About this restaurant</h2>
                  <p className="mt-2 text-sm text-slate-500">Browse the full menu, see location details, and order what you love.</p>
                </div>
                <div className="space-y-2 text-sm text-slate-500">
                  <div className="inline-flex items-center gap-2">
                    <BiMapPin className="h-5 w-5 text-red-500" />
                    <span>{restaurant.address || restaurant.autoLocation.formattedAddress}</span>
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <BiPhone className="h-5 w-5 text-red-500" />
                    <span>{restaurant.phone}</span>
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <BiChevronLeft className="h-5 w-5 text-red-500 rotate-180" />
                    <span>Joined {new Date(restaurant.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">Menu</h2>
                  <p className="text-sm text-slate-500">{items.length === 0 ? "No items available yet." : `${items.length} items across ${Object.keys(groupedItems).length} categories.`}</p>
                </div>
              </div>

              {items.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  This restaurant does not have any public menu items yet.
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedItems).map(([category, categoryItems]) => (
                    <div key={category} className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-100">
                      <div className="border-b border-slate-200 px-6 py-4">
                        <h3 className="text-lg font-semibold text-slate-900">{category}</h3>
                      </div>
                      <div className="divide-y divide-slate-100 px-6 py-4">
{categoryItems.map((item) => (
                            <div key={item._id} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0">
                                <h4 className="truncate text-base font-semibold text-slate-900">{item.name}</h4>
                                {item.description && <p className="mt-1 text-sm text-slate-500">{item.description}</p>}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-slate-500">
                                <span className="font-semibold text-slate-900">${item.price.toFixed(2)}</span>
                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.isAvailable ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                  {item.isAvailable ? "Available" : "Unavailable"}
                                </span>
{!restaurant?.isOpen ? (
                                  <span className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-red-100 text-red-700">
                                    <BiErrorCircle className="h-3 w-3" /> Restaurant Closed
                                  </span>
                                ) : item.isAvailable ? (
                                  <button
                                    type="button"
                                    onClick={() => handleAddToCart(item)}
                                    className="inline-flex items-center gap-1.5 rounded-2xl bg-[#E23744] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-700"
                                  >
                                    <BiPlusCircle className="h-3 w-3" /> Add
                                  </button>
                                ) : (
                                  <span className="rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-500 cursor-not-allowed">Unavailable</span>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Restaurant snapshot</h3>
              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between"> <span className="flex items-center gap-2 text-slate-500"><BiTime className="h-4 w-4" />Status</span><span>{restaurant.isOpen ? "Open" : "Closed"}</span> </div>
                <div className="flex items-center justify-between"> <span className="flex items-center gap-2 text-slate-500"><BiShield className="h-4 w-4" />Verified</span><span>{restaurant.isVerified ? "Yes" : "No"}</span> </div>
                <div className="flex items-center justify-between"> <span className="flex items-center gap-2 text-slate-500"><BiPhone className="h-4 w-4" />Phone</span><span>{restaurant.phone}</span> </div>
                <div className="flex items-center justify-between"> <span className="flex items-center gap-2 text-slate-500"><BiTag className="h-4 w-4" />Category</span><span>Restaurant</span> </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">View actions</h3>
              <div className="mt-5 space-y-3">
                <Link to="/browse" className="block rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  Browse other restaurants
                </Link>
                <Link to="/" className="block rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  Return to dashboard
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default RestaurantMenu;
