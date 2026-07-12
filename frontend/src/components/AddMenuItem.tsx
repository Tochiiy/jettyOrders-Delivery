import { type FormEvent, useState } from "react";
import toast from "react-hot-toast";
import { BiUpload, BiDollar } from "react-icons/bi";
import * as menuService from "../services/menuService";

interface props {
    onSuccess?: () => void;
}

const categories = ["Appetizer", "Main Course", "Dessert", "Drinks", "Sides"];

const AddMenuItem = ({ onSuccess }: props) => {
    const [submitting, setSubmitting] = useState(false);
    const [image, setImage] = useState<File | null>(null);
    const [customCategory, setCustomCategory] = useState(false);
    const [categoryValue, setCategoryValue] = useState("");

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;

        const formData = new FormData(form);

            try {
                setSubmitting(true);
                const { data } = await menuService.createMenuItem(formData);
                toast.success(data.message);
                form.reset();
                setImage(null);
                setCustomCategory(false);
                setCategoryValue("");
                if (onSuccess) onSuccess();
        } catch (err) {
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosErr = err as { response?: { data?: { message?: string } } };
                toast.error(axiosErr.response?.data?.message || "Something went wrong");
            } else {
                toast.error("Something went wrong");
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="item-name" className="sr-only">Item name</label>
                    <input id="item-name" name="name" placeholder="Item Name" required className="w-full border rounded-lg px-5 py-4 text-base outline-none focus:ring-2 focus:ring-red-200" />
                </div>
                <div className="relative">
                    <label htmlFor="item-price" className="sr-only">Price</label>
                    <BiDollar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input id="item-price" name="price" type="number" step="0.01" min="0" placeholder="Price" required className="w-full border rounded-lg pl-12 pr-5 py-4 text-base outline-none focus:ring-2 focus:ring-red-200" />
                </div>
            </div>
            <label htmlFor="item-description" className="sr-only">Description</label>
            <textarea id="item-description" name="description" placeholder="Description (optional)" rows={4} className="w-full border rounded-lg px-5 py-4 text-base outline-none focus:ring-2 focus:ring-red-200" />
            {customCategory ? (
                <div className="flex gap-3">
                    <label htmlFor="custom-category" className="sr-only">Custom category</label>
                    <input id="custom-category" name="category" value={categoryValue} onChange={e => setCategoryValue(e.target.value)} placeholder="Enter custom category" className="flex-1 border rounded-lg px-5 py-4 text-base outline-none focus:ring-2 focus:ring-red-200" />
                    <button type="button" onClick={() => { setCustomCategory(false); setCategoryValue(""); }} className="shrink-0 px-4 py-4 text-sm text-gray-500 hover:text-gray-700 border rounded-lg">Back</button>
                </div>
            ) : (
                <select id="category" name="category" value={categoryValue} onChange={e => { const val = e.target.value; if (val === "__custom__") { setCustomCategory(true); setCategoryValue(""); } else { setCategoryValue(val); } }} className="w-full border rounded-lg px-5 py-4 text-base outline-none text-gray-600 focus:ring-2 focus:ring-red-200">
                    <option value="">Select category (optional)</option>
                    {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="__custom__">+ Add custom category</option>
                </select>
            )}
            <label htmlFor="item-file" className="flex items-center gap-3 w-full border rounded-lg px-5 py-4 text-base outline-none cursor-pointer text-gray-600 hover:text-gray-700 hover:border-gray-400 transition-colors focus-within:ring-2 focus-within:ring-red-200">
                <BiUpload className="h-6 w-6 text-[#E23744]" />
                <span>{image ? image.name : "Upload image (optional)"}</span>
                <input id="item-file" name="file" type="file" accept="image/*" className="hidden" onChange={(e) => setImage(e.target.files?.[0] || null)} />
            </label>
            <button type="submit" disabled={submitting} className="w-full bg-red-500 text-white py-4 rounded-lg font-semibold text-base hover:bg-red-600 disabled:opacity-60 transition-colors">
                {submitting ? "Adding item..." : "Add Item"}
            </button>
        </form>
    );
};

export default AddMenuItem;
