import { type FormEvent, useState } from "react";
import toast from "react-hot-toast";
import { BiUpload, BiMapPin } from "react-icons/bi";
import { useAppData } from "../context/AppContext";
import * as restaurantService from "../services/restaurantService";

interface props {
    fetchMyRestaurant: () => Promise<void>;
}

const AddRestaurant = ({ fetchMyRestaurant }: props) => {
    const [submitting, setSubmitting] = useState(false);
    const [image, setImage] = useState<File | null>(null);
    const { loadingLocation, location } = useAppData();

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;

        if (!image) {
            toast.error("Please upload a restaurant image");
            return;
        }

        const formData = new FormData(form);

        try {
            setSubmitting(true);
            const { data } = await restaurantService.createRestaurant(formData);
            toast.success(data.message);
            form.reset();
            setImage(null);
            await fetchMyRestaurant();
        } catch (err: any) {
            const message = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || "Something went wrong";
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
            <form onSubmit={handleSubmit} className="w-full rounded-xl bg-white p-6 shadow-sm space-y-5">
                <h1 className="text-xl font-bold bg-clip-text bg-gradient-to-r from-black to-red-500">Add Your Restaurant</h1>
                <label htmlFor="rest-name" className="sr-only">Restaurant name</label>
                <input id="rest-name" name="name" placeholder="Restaurant Name" required className="w-full border rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-200" />
                <label htmlFor="rest-desc" className="sr-only">Description</label>
                <textarea id="rest-desc" name="description" placeholder="Description" className="w-full border rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-200" />
                <label htmlFor="rest-phone" className="sr-only">Phone</label>
                <input id="rest-phone" name="phone" type="tel" placeholder="Phone Number" required className="w-full border rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-200" />
                <div className="relative">
                    <BiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500" />
                    <label htmlFor="rest-address" className="sr-only">Address</label>
                    <input id="rest-address" name="formattedAddress" placeholder="Address" defaultValue={location?.formattedAddress || ""} required className="w-full border rounded-lg pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-200" />
                </div>
                {loadingLocation && <p className="text-xs text-gray-500 -mt-3">Fetching your location...</p>}
                <input name="latitude" type="hidden" value={location?.latitude || ""} />
                <input name="longitude" type="hidden" value={location?.longitude || ""} />
                <label htmlFor="rest-file" className="flex items-center gap-3 w-full border rounded-lg px-4 py-3 text-sm outline-none cursor-pointer text-gray-600 hover:text-gray-700 focus-within:ring-2 focus-within:ring-red-200">
                    <BiUpload className="h-6 w-6 text-[#E23744]" />
                    <span>{image ? image.name : "Upload restaurant image"}</span>
                    <input id="rest-file" name="file" type="file" accept="image/*" className="hidden" onChange={(e) => setImage(e.target.files?.[0] || null)} />
                </label>
                <button type="submit" disabled={submitting} className="w-full bg-red-500 text-white py-2 rounded-lg font-semibold hover:bg-red-600 disabled:opacity-60">
                    {submitting ? "Submitting..." : "Add Restaurant"}
                </button>
            </form>
    );
};

export default AddRestaurant;
