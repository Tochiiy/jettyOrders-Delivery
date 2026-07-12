import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { BiTrash, BiEdit, BiCheck, BiX, BiFoodMenu, BiUpload } from "react-icons/bi";
import * as menuService from "../services/menuService";

interface IMenuItemData {
    _id: string;
    name: string;
    description?: string;
    price: number;
    image?: string;
    category?: string;
    isAvailable: boolean;
}

interface props {
    restaurantId: string;
}

const MenuItems = ({ restaurantId }: props) => {
    const [items, setItems] = useState<IMenuItemData[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editPrice, setEditPrice] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editCategory, setEditCategory] = useState("");
    const [editImage, setEditImage] = useState<File | null>(null);

    const fetchItems = async () => {
        try {
            const { data } = await menuService.getAllMenuItems(restaurantId);
            setItems(data.menuItems);
        } catch {
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    const toggleAvailability = async (id: string) => {
        try {
            const { data } = await menuService.toggleMenuItemStatus(id);
            toast.success(data.message);
            fetchItems();
        } catch (err) {
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosErr = err as { response?: { data?: { message?: string } } };
                toast.error(axiosErr.response?.data?.message || "Something went wrong");
            }
        }
    };

    const startEditing = (item: IMenuItemData) => {
        setEditingId(item._id);
        setEditName(item.name);
        setEditPrice(String(item.price));
        setEditDescription(item.description || "");
        setEditCategory(item.category || "");
        setEditImage(null);
    };

    const cancelEditing = () => {
        setEditingId(null);
    };

    const updateItem = async (id: string) => {
        if (!editName || !editPrice) {
            toast.error("Name and price are required");
            return;
        }
        try {
            const formData = new FormData();
            formData.append("name", editName);
            formData.append("price", editPrice);
            formData.append("description", editDescription);
            formData.append("category", editCategory);
            if (editImage) formData.append("file", editImage);

            const { data } = await menuService.updateMenuItem(id, formData);
            toast.success(data.message);
            setEditingId(null);
            fetchItems();
        } catch (err) {
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosErr = err as { response?: { data?: { message?: string } } };
                toast.error(axiosErr.response?.data?.message || "Something went wrong");
            }
        }
    };

    const deleteItem = async (id: string, name: string) => {
        if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
        try {
            const { data } = await menuService.deleteMenuItem(id);
            toast.success(data.message);
            fetchItems();
        } catch (err) {
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosErr = err as { response?: { data?: { message?: string } } };
                toast.error(axiosErr.response?.data?.message || "Something went wrong");
            }
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#E23744]" />
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                    <BiFoodMenu className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">No menu items yet</h3>
                <p className="mt-1 text-sm text-gray-500">Head over to the "Add Item" tab to build your menu</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {items.map((item) => (
                <div key={item._id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                    {editingId === item._id ? (
                        <div className="p-6">
                            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Edit Menu Item</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">Name</label>
                                    <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="e.g. Pepperoni Pizza" className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition-colors focus:border-[#E23744] focus:ring-1 focus:ring-[#E23744]" />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">Price ($)</label>
                                    <input value={editPrice} onChange={e => setEditPrice(e.target.value)} type="number" step="0.01" min="0" placeholder="0.00" className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition-colors focus:border-[#E23744] focus:ring-1 focus:ring-[#E23744]" />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">Description</label>
                                    <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Describe this item..." rows={2} className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition-colors focus:border-[#E23744] focus:ring-1 focus:ring-[#E23744]" />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">Category</label>
                                    <input value={editCategory} onChange={e => setEditCategory(e.target.value)} placeholder="e.g. Pizza, Burger, Drink" className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition-colors focus:border-[#E23744] focus:ring-1 focus:ring-[#E23744]" />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">Image</label>
                                    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-700">
                                        <BiUpload className="h-5 w-5 text-[#E23744]" />
                                        <span>{editImage ? editImage.name : "Replace image (optional)"}</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={e => setEditImage(e.target.files?.[0] || null)} />
                                    </label>
                                </div>
                                <div className="flex items-center gap-3 pt-2">
                                    <button onClick={() => updateItem(item._id)} className="inline-flex items-center gap-2 rounded-lg bg-[#E23744] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700">
                                        <BiCheck className="h-5 w-5" />
                                        Save Changes
                                    </button>
                                    <button onClick={cancelEditing} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50">
                                        <BiX className="h-5 w-5" />
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-stretch cursor-pointer" onClick={() => setExpandedId(expandedId === item._id ? null : item._id)}>
                                {item.image && (
                                    <div className={`relative shrink-0 overflow-hidden max-sm:hidden ${expandedId === item._id ? "w-44" : "w-32"} transition-all duration-300`}>
                                        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                                    </div>
                                )}
                                <div className={`flex flex-1 items-center gap-4 ${expandedId === item._id ? "p-6" : "p-5"} transition-[padding] duration-300`}>
                                    {item.image && (
                                        <img src={item.image} alt={item.name} className="h-16 w-16 rounded-lg object-cover sm:hidden" />
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="truncate text-base font-bold text-gray-900">{item.name}</h3>
                                            {item.category && (
                                                <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">{item.category}</span>
                                            )}
                                        </div>
                                        {item.description && (
                                            <p className={`mt-1 text-sm font-medium text-gray-500 ${expandedId === item._id ? "" : "truncate"}`}>{item.description}</p>
                                        )}
                                        <p className="mt-2 text-lg font-bold text-[#E23744]">${Number(item.price).toFixed(2)}</p>
                                    </div>
                                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                        <div className="flex flex-col items-center gap-1.5">
                                            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{item.isAvailable ? "Live" : "Off"}</span>
                                            <button onClick={() => toggleAvailability(item._id)} className={`relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors ${item.isAvailable ? "bg-green-500" : "bg-gray-200"}`}>
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${item.isAvailable ? "translate-x-[22px]" : "translate-x-1"}`} />
                                            </button>
                                        </div>
                                        <div className="ml-2 flex flex-col gap-1.5">
                                            <button onClick={() => startEditing(item)} className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#E23744]" title="Edit item">
                                                <BiEdit className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => deleteItem(item._id, item.name)} className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500" title="Delete item">
                                                <BiTrash className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {expandedId === item._id && (
                                <div className="border-t border-gray-100 px-6 pb-5 pt-4 animate-[fadeIn_0.2s_ease]">
                                    {item.description && (
                                        <p className="text-sm leading-relaxed text-gray-600">{item.description}</p>
                                    )}
                                    {item.image && (
                                        <img src={item.image} alt={item.name} className="mt-3 h-48 w-full rounded-lg object-cover sm:hidden" />
                                    )}
                                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                                        <span>ID: {item._id.slice(-6).toUpperCase()}</span>
                                        <span>·</span>
                                        <span>Price: ${Number(item.price).toFixed(2)}</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            ))}
        </div>
    );
};

export default MenuItems;
