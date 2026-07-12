import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import { toast } from "react-hot-toast";
import { BiPlus, BiTrash, BiLoader, BiArrowBack } from "react-icons/bi";
import { LuLocateFixed } from "react-icons/lu";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as addressService from "../services/addressService";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppContext";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface Address {
    _id: string;
    formattedAddress: string;
    mobile: number;
}

const LocationPicker = ({ setLocation }: { setLocation: (lat: number, lng: number) => void }) => {
    useMapEvents({
        click(e) {
            setLocation(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
};

const LocateMeButton = ({ onLocate }: { onLocate: (lat: number, lng: number) => void }) => {
    const map = useMap();
    const locateUser = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation not supported please enable it");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                map.flyTo([latitude, longitude], 16, { animate: true });
                onLocate(latitude, longitude);
            },
            () => toast.error("Location permission denied")
        );
    };
    return (
        <button
            onClick={locateUser}
            className="absolute right-3 top-3 z-[1000] flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm shadow hover:bg-gray-100"
        >
            <LuLocateFixed size={16} />
            Use current location
        </button>
    );
};

const AddressPage = () => {
    const navigate = useNavigate();
    const { location: userLocation } = useAppData();
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [mobile, setMobile] = useState("");
    const [formattedAddress, setFormattedAddress] = useState("");
    const [latitude, setLatitude] = useState<number | null>(userLocation?.latitude ?? null);
    const [longitude, setLongitude] = useState<number | null>(userLocation?.longitude ?? null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

    const fetchFormattedAddress = async (lat: number, lng: number) => {
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
            );
            const data = await res.json();
            setFormattedAddress(data.display_name || "");
        } catch {
            toast.error("Failed to fetch address");
        }
    };

    const setLocation = (lat: number, lng: number) => {
        setLatitude(lat);
        setLongitude(lng);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchFormattedAddress(lat, lng), 600);
    };

    const fetchAddresses = async () => {
        try {
            const { data } = await addressService.getAddresses();
            setAddresses(data.addresses || []);
        } catch {
            toast.error("Failed to load addresses");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAddresses();
    }, []);

    useEffect(() => {
        if (userLocation && latitude === null) {
            setLatitude(userLocation.latitude);
            setLongitude(userLocation.longitude);
            fetchFormattedAddress(userLocation.latitude, userLocation.longitude);
        }
    }, [userLocation]);

    const addAddress = async () => {
        if (!mobile || !formattedAddress || latitude === null || longitude === null) {
            toast.error("Please select location on map");
            return;
        }
        try {
            setAdding(true);
            await addressService.addAddress({
                mobile: Number(mobile),
                formattedAddress,
                latitude,
                longitude,
            });
            toast.success("Address added");
            setMobile("");
            setFormattedAddress("");
            setLatitude(null);
            setLongitude(null);
            fetchAddresses();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed");
        } finally {
            setAdding(false);
        }
    };

    const deleteAddress = async (id: string) => {
        if (!window.confirm("Delete this address?")) return;
        try {
            setDeletingId(id);
            await addressService.deleteAddress(id);
            toast.success("Address deleted");
            fetchAddresses();
        } catch {
            toast.error("Failed to delete address");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-6">
            <div className="mx-auto max-w-4xl">
                <div className="mb-4 flex items-center gap-3">
                    <button onClick={() => navigate("/account")} className="rounded-2xl bg-white p-2 shadow-sm hover:bg-gray-50">
                        <BiArrowBack className="h-5 w-5 text-slate-700" />
                    </button>
                    <h1 className="text-xl font-bold text-slate-900">Select Delivery Address</h1>
                </div>

                <div className="space-y-6">
                    <div className="relative h-80 w-full overflow-hidden rounded-3xl border border-gray-200 shadow-sm">
                        <MapContainer
                            center={[latitude || userLocation?.latitude || 28.6139, longitude || userLocation?.longitude || 77.209]}
                            zoom={13}
                            className="h-full w-full"
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            />
                            <LocationPicker setLocation={setLocation} />
                            <LocateMeButton onLocate={setLocation} />
                            {latitude !== null && longitude !== null && (
                                <Marker position={[latitude, longitude]} />
                            )}
                        </MapContainer>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="address-field" className="mb-1 block text-sm font-medium text-slate-700">Delivery Address</label>
                            <textarea
                                id="address-field"
                                placeholder="Click on the map to auto-fill, or type your address here..."
                                value={formattedAddress}
                                onChange={(e) => setFormattedAddress(e.target.value)}
                                rows={3}
                                className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#E23744] focus:ring-1 focus:ring-[#E23744]"
                            />
                            {formattedAddress && /\d/.test(formattedAddress) && (
                                <p className="mt-1 text-xs text-amber-600">Please include your phone number in the mobile field below, not in the address to save address.</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="mobile-field" className="mb-1 block text-sm font-medium text-slate-700">Mobile Number</label>
                            <input
                                id="mobile-field"
                                type="number"
                                placeholder="Enter your phone number"
                                value={mobile}
                                onChange={(e) => setMobile(e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#E23744] focus:ring-1 focus:ring-[#E23744]"
                            />
                        </div>

                        <button
                            disabled={adding}
                            onClick={addAddress}
                            className="flex w-full items-center justify-center gap-2 rounded-3xl bg-[#E23744] px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {adding ? <BiLoader className="animate-spin" size={18} /> : <BiPlus size={18} />}
                            Save Address
                        </button>
                    </div>

                    <div className="space-y-3">
                        <h2 className="text-lg font-semibold text-slate-900">Saved Addresses</h2>
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#E23744] border-t-transparent" />
                            </div>
                        ) : addresses.length === 0 ? (
                            <p className="text-sm text-slate-500">No addresses saved</p>
                        ) : (
                            addresses.map((addr) => (
                                <div key={addr._id} className="flex items-center justify-between rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">{addr.formattedAddress}</p>
                                        <p className="mt-1 text-xs text-slate-500">{addr.mobile}</p>
                                    </div>
                                    <button
                                        onClick={() => deleteAddress(addr._id)}
                                        disabled={deletingId === addr._id}
                                        className="rounded-2xl p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                    >
                                        {deletingId === addr._id ? (
                                            <BiLoader size={16} className="animate-spin" />
                                        ) : (
                                            <BiTrash size={16} />
                                        )}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddressPage;
