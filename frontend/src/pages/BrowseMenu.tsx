import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { BiFoodMenu, BiStore } from "react-icons/bi";
import { BsCartPlus } from "react-icons/bs";
import { IoLocationOutline } from "react-icons/io5";
import { useAppData } from "../context/AppContext";
import * as menuService from "../services/menuService";

interface IRestaurantRef {
    _id: string;
    name: string;
    image?: string;
    address?: string;
}

interface IMenuItem {
    _id: string;
    name: string;
    description?: string;
    price: number;
    image?: string;
    category?: string;
    isAvailable: boolean;
    restaurantId: IRestaurantRef;
}

const BrowseMenu = () => {
    const { addToCart, user } = useAppData();
    const [items, setItems] = useState<IMenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [heroIdx, setHeroIdx] = useState(0);

    useEffect(() => {
        const fetch = async () => {
            try {
                const { data } = await menuService.getAllAvailableItems();
                setItems(data.menuItems);
            } catch {
                setItems([]);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    const grouped = items.reduce<Record<string, { restaurant: IRestaurantRef; items: IMenuItem[] }>>((acc, item) => {
        const r = item.restaurantId;
        const id = r._id;
        if (!acc[id]) acc[id] = { restaurant: r, items: [] };
        acc[id].items.push(item);
        return acc;
    }, {});

    const restaurantImages = Object.values(grouped)
        .map((g) => g.restaurant.image)
        .filter((img): img is string => !!img);

    useEffect(() => {
        if (restaurantImages.length < 2) return;
        const interval = setInterval(() => {
            setHeroIdx((prev) => (prev + 1) % restaurantImages.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [restaurantImages.length]);

    if (loading) {
        return (
            <div className="flex min-h-[70vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-gray-100 border-t-[#E23744]" />
                    <p className="text-sm font-medium text-gray-400">Loading menus...</p>
                </div>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="flex min-h-[70vh] items-center justify-center">
                <div className="flex flex-col items-center gap-6 text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-red-50">
                        <BiFoodMenu className="h-10 w-10 text-[#E23744]" />
                    </div>
                    <div>
                        <h2 className="font-display text-2xl font-bold text-gray-900">No menus yet</h2>
                        <p className="mt-1.5 text-sm text-gray-500">Restaurants are setting up their menus — check back soon!</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50/50 to-white">
            <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
                <div className="relative mb-12 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    {restaurantImages.length > 0 && (
                        <div className="relative h-56 sm:h-72 md:h-80">
                            {restaurantImages.map((img, i) => (
                                <div
                                    key={i}
                                    className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
                                    style={{
                                        backgroundImage: `url(${img})`,
                                        opacity: i === heroIdx ? 1 : 0,
                                    }}
                                />
                            ))}
                            {restaurantImages.length > 1 && (
                                <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
                                    {restaurantImages.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setHeroIdx(i)}
                                            className={`h-2 rounded-full transition-all ${
                                                i === heroIdx ? "w-8 bg-white shadow-md" : "w-2 bg-white/60 hover:bg-white/80"
                                            }`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="grid gap-8">
                    {Object.entries(grouped).map(([restId, { restaurant, items: restItems }]) => (
                        <section key={restId} className="rounded-3xl border border-gray-200 bg-white shadow-sm">
                            <div className="flex flex-col gap-4 border-b border-gray-100 p-6 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="relative h-16 w-16 overflow-hidden rounded-3xl bg-gray-100 shadow-sm">
                                        {restaurant.image ? (
                                            <img src={restaurant.image} alt={restaurant.name} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex h-full items-center justify-center">
                                                <BiStore className="h-7 w-7 text-gray-400" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">{restaurant.name}</h2>
                                        {restaurant.address && (
                                            <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                                                <IoLocationOutline className="h-4 w-4" />
                                                {restaurant.address}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                        {restItems.length} item{restItems.length !== 1 ? "s" : ""}
                                    </span>
                                </div>
                            </div>

                            <div className="grid gap-4 p-6 grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
                                {restItems.map((item) => (
                                    <div key={item._id} className="group flex flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg">
                                        <div className="relative h-48 overflow-hidden bg-gray-100">
                                            {item.image ? (
                                                <img src={item.image} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                            ) : (
                                                <div className="flex h-full items-center justify-center">
                                                    <BiFoodMenu className="h-12 w-12 text-gray-300" />
                                                </div>
                                            )}
                                            {item.category && (
                                                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-700 shadow-sm backdrop-blur-sm">
                                                    {item.category}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-1 flex-col gap-3 p-5">
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                                                {item.description && (
                                                    <p className="mt-2 text-sm leading-relaxed text-gray-500 line-clamp-2">{item.description}</p>
                                                )}
                                            </div>
                                            <div className="mt-auto flex items-center justify-between gap-3">
                                                <span className="text-xl font-bold text-[#E23744]">${Number(item.price).toFixed(2)}</span>
                                                {user?.role !== "seller" && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            addToCart({
                                                                menuItemId: item._id,
                                                                name: item.name,
                                                                price: item.price,
                                                                image: item.image,
                                                                category: item.category,
                                                                restaurantId: item.restaurantId._id,
                                                                restaurantName: item.restaurantId.name,
                                                                quantity: 1,
                                                            })
                                                                .then(() => toast.success("Added to cart"))
                                                                .catch((err: any) => {
                                                                    const errorMessage = err?.response?.data?.message || "Unable to add to cart";
                                                                    toast.error(errorMessage);
                                                                });
                                                        }}
                                                        className="inline-flex items-center gap-2 rounded-2xl bg-[#E23744] px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700"
                                                    >
                                                        <BsCartPlus className="h-4 w-4" />
                                                        Add
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BrowseMenu;
