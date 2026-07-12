import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import * as menuService from "../services/menuService";
import { BiFoodMenu, BiTag } from "react-icons/bi";

interface IMenuItem {
    _id: string;
    name: string;
    description?: string;
    price: number;
    image?: string;
    category?: string;
    isAvailable: boolean;
}

const PublicMenu = () => {
    const { restaurantId } = useParams();
    const [items, setItems] = useState<IMenuItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!restaurantId) return;
        const fetch = async () => {
            try {
                const { data } = await menuService.getPublicMenuItems(restaurantId);
                setItems(data.menuItems);
            } catch {
                setItems([]);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [restaurantId]);

    const grouped = items.reduce<Record<string, IMenuItem[]>>((acc, item) => {
        const cat = item.category || "Other";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#E23744]" />
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                    <BiFoodMenu className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">No menu available</h3>
                <p className="mt-1 text-sm text-gray-500">This restaurant hasn't added any menu items yet</p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-3xl px-4 py-8">
            <div className="mb-8 text-center">
                <h1 className="font-display text-3xl font-bold text-gray-900">Our Menu</h1>
                <p className="mt-1 text-sm text-gray-500">Browse our selection of freshly prepared items</p>
            </div>

            {Object.entries(grouped).map(([category, categoryItems]) => (
                <div key={category} className="mb-8">
                    <h2 className="mb-4 flex items-center gap-2 border-b border-gray-200 pb-2 text-lg font-bold text-gray-900">
                      <BiTag className="h-5 w-5 text-[#E23744]" />
                      {category}
                    </h2>
                    <div className="space-y-3">
                        {categoryItems.map((item) => (
                            <div key={item._id} className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                                {item.image ? (
                                    <img src={item.image} alt={item.name} className="h-20 w-20 shrink-0 rounded-lg object-cover" />
                                ) : (
                                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                                        <BiFoodMenu className="h-6 w-6 text-gray-400" />
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h3 className="font-bold text-gray-900">{item.name}</h3>
                                            {item.description && (
                                                <p className="mt-0.5 text-sm text-gray-500">{item.description}</p>
                                            )}
                                        </div>
                                        <p className="shrink-0 flex items-center gap-1 text-lg font-bold text-[#E23744]">
                                          <BiTag className="h-5 w-5" />
                                          ${Number(item.price).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default PublicMenu;
