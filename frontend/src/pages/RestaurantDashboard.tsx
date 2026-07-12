import { useEffect, useState } from "react";
import * as restaurantService from "../services/restaurantService";
import { useAppData } from "../context/AppContext";
import type { IRestaurant } from "../types/types";
import AddRestaurant from "../components/AddRestaurant";
import RestaurantProfile from "../components/RestaurantProfile";
import MenuItems from "../components/MenuItems";
import AddMenuItem from "../components/AddMenuItem";
import MarketingCarousel from "../components/MarketingCarousel";
import RestaurantOrders from "../components/RestaurantOrders";
import { BiFoodMenu, BiPlusCircle, BiBarChartAlt2 } from "react-icons/bi";

type SellerTab = "menu" | "add-item" | "sales";
const RestaurantDashboard = () => {
    const { user } = useAppData();
    const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
    const [loading, setLoading] = useState(true);
    const [Tab, setTab] = useState<SellerTab>("menu");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);


     
    const getApiErrorDetails = (error: any) => {
        return {
            message: error?.response?.data?.error?.message || error?.response?.data?.message || error?.message || "Unable to load your restaurant data.",
        };
    };

    const fetchMyRestaurant = async () => {
        try {
            setLoading(true);
            const { data } = await restaurantService.getMyRestaurant();

            if (data.token) {
                localStorage.setItem("token", data.token);
            }

            setRestaurant(data.restaurant);
            setErrorMessage(null);
        } catch (err: any) {
            const details = getApiErrorDetails(err);
            setErrorMessage(details.message);
            setRestaurant(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMyRestaurant();
    }, []);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading your restaurant...</div>;
    }

    if (!restaurant) {
        return (
          <div className="min-h-screen bg-gray-100 px-4 py-8">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
              <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">No restaurant found</h2>
                <p className="mt-3 text-sm text-slate-500">
                  We couldn't find a restaurant for your account. Create one now to manage menu items and sales.
                </p>
                {errorMessage && (
                  <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    <p>{errorMessage}</p>
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900">Create your restaurant</h3>
                <p className="mt-2 text-sm text-slate-500">Add your restaurant details to unlock menu management and sales tracking.</p>
                <div className="mt-6">
                  <AddRestaurant fetchMyRestaurant={fetchMyRestaurant} />
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm lg:hidden">
                <MarketingCarousel />
              </div>
            </div>
          </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-6">
            <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-slate-900 to-[#E23744] bg-clip-text text-transparent">Seller Dashboard</h1>
                            <p className="mt-2 text-slate-500">Manage your restaurant menu, add new items, and review sales data.</p>
                        </div>
                        <div className="rounded-2xl bg-gradient-to-r from-[#E23744] to-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/25">
                            {restaurant.name}
                        </div>
                    </div>
                </div>
                
                <RestaurantProfile restaurant={restaurant} isSeller={user?.role === "seller"}
                    onUpdate={(r) => setRestaurant(r)} onDelete={() => setRestaurant(null)} />
                
                <RestaurantOrders restaurantId={restaurant._id} />
                
                <div className="mt-8">
                    <div className="mx-auto max-w-5xl">
                        <nav className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" role="tablist">
                            {[
                                { key: "menu", label: "Menu Items", icon: BiFoodMenu },
                                { key: "add-item", label: "Add Menu Item", icon: BiPlusCircle },
                                { key: "sales", label: "Sales", icon: BiBarChartAlt2 },
                            ].map((tab) => {
                                const Icon = tab.icon;
                                const isActive = Tab === tab.key;
                                return (
                                    <button
                                        key={tab.key}
                                        role="tab"
                                        aria-selected={isActive}
                                        onClick={() => setTab(tab.key as SellerTab)}
                                        className={`flex flex-col items-center justify-center gap-2 rounded-xl px-4 py-4 text-sm font-semibold transition-all duration-200 ${isActive ? "bg-gradient-to-r from-[#E23744] to-red-600 text-white shadow-md shadow-red-500/30" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
                                    >
                                        <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-slate-400"}`} />
                                        <span>{tab.label}</span>
                                        {isActive && <span className="h-0.5 w-full bg-white/30 rounded-full" />}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                    <div className="mt-6">
                        <div className="mx-auto max-w-5xl">
                            {Tab === "menu" && <MenuItems restaurantId={restaurant._id} />}
                            {Tab === "add-item" && <AddMenuItem onSuccess={() => setTab("menu")} />}
                            {Tab === "sales" && (
                                <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl font-bold text-slate-900">Sales Overview</h2>
                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">Beta</span>
                                    </div>
                                    <p className="text-slate-500">Sales metrics are coming soon. Manage your menu items and track orders from this dashboard.</p>
                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                        <div className="rounded-2xl bg-slate-50 p-6 border border-slate-200">
                                            <p className="text-sm text-slate-500">Total Orders</p>
                                            <p className="mt-2 text-3xl font-bold text-slate-900">0</p>
                                        </div>
                                        <div className="rounded-2xl bg-slate-50 p-6 border border-slate-200">
                                            <p className="text-sm text-slate-500">Total Revenue</p>
                                            <p className="mt-2 text-3xl font-bold text-slate-900">$0.00</p>
                                        </div>
                                        <div className="rounded-2xl bg-slate-50 p-6 border border-slate-200">
                                            <p className="text-sm text-slate-500">Avg. Order Value</p>
                                            <p className="mt-2 text-3xl font-bold text-slate-900">$0.00</p>
                                        </div>
                                        <div className="rounded-2xl bg-slate-50 p-6 border border-slate-200">
                                            <p className="text-sm text-slate-500">Active Customers</p>
                                            <p className="mt-2 text-3xl font-bold text-slate-900">0</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RestaurantDashboard;
