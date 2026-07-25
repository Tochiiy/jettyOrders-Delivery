import type { IRider, IOrder } from "../types/types";
import { useAppData } from "../context/AppContext";
import { useSocket } from "../context/SocketContext";
import { useState, useEffect, useRef, type FormEvent } from "react";
import { getMyProfile, toggleAvailability, registerRider, acceptOrder, getActiveOrders, updateOrderStatus, updateLocation } from "../services/riderService";
import { toast } from "react-hot-toast";
import { BiCheckCircle, BiXCircle, BiPackage, BiMapPin, BiTime, BiUpload, BiCurrentLocation, BiDollarCircle, BiCheck, BiUser, BiVolumeFull } from "react-icons/bi";
import { useNavigate } from "react-router-dom";
import audio from "../assets/software-interface-257.wav";

interface AvailableOrder {
  orderId: string;
  restaurantId: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  distance: number;
  riderAmount: number;
}

const statusColor: Record<string, string> = {
  rider_assigned: "text-purple-600 bg-purple-100",
  pickedUp: "text-cyan-600 bg-cyan-100",
  delivered: "text-green-600 bg-green-100",
};

const statusLabel: Record<string, string> = {
  rider_assigned: "Rider Assigned",
  pickedUp: "Picked Up",
  delivered: "Delivered",
};

const RiderDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAppData();
  const { socket } = useSocket();
  const [toogle, setToogle] = useState(false);
  const [profile, setProfile] = useState<IRider | null>(null);
  const [loading, setLoading] = useState(true);
  const [image, setImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { location: userLocation, loadingLocation } = useAppData();

  const [availableOrders, setAvailableOrders] = useState<AvailableOrder[]>([]);
  const [activeOrders, setActiveOrders] = useState<IOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [acceptingIds, setAcceptingIds] = useState<Set<string>>(new Set());
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchProfile = async () => {
    try {
      const { data } = await getMyProfile();
      setProfile(data.rider || null);
    } catch (err) {
      console.error("Failed to fetch rider profile", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveOrders = async () => {
    if (!profile) return;
    try {
      const { data } = await getActiveOrders();
      setActiveOrders(data.orders || []);
    } catch (err) {
      console.error("Failed to fetch active orders", err);
    }
  };

  useEffect(() => {
    if (user?.role !== "rider") return;
    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (!profile) return;
    fetchActiveOrders();
  }, [profile]);

  useEffect(() => {
    if (!profile?.isAvailable) return;

    const sendLocationUpdate = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          updateLocation(latitude, longitude).catch(() => {});
          socket?.emit("location:update", { lat: latitude, lng: longitude });
        },
        () => {}
      );
    };

    sendLocationUpdate();
    const interval = setInterval(sendLocationUpdate, 30000);

    return () => clearInterval(interval);
  }, [profile?.isAvailable, socket]);

  useEffect(() => {
    audioRef.current = new Audio(audio);
    audioRef.current.load();
  }, []);

  const unlockAudio = () => {
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        audioRef.current!.pause();
        audioRef.current!.currentTime = 0;
        setAudioUnlocked(true);
      }).catch((err) => {
        console.error("Error unlocking audio:", err);
      });
    }
  };

  useEffect(() => {
    if (!socket || !profile) return;

    const handleOrderAvailable = (order: AvailableOrder) => {
      if (audioUnlocked && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch((err) => {
          console.error("Error playing notification sound:", err);
        });
      }

      setAvailableOrders((prev) => {
        if (prev.find((o) => o.orderId === order.orderId)) return prev;
        toast("New delivery order available!", { icon: "🛵", duration: 5000 });
        return [...prev, order];
      });
    };

    const handleOrderUpdate = () => {
      fetchActiveOrders();
    };

    socket.on("rider:order_available", handleOrderAvailable);
    socket.on("order:update", handleOrderUpdate);

    return () => {
      socket.off("rider:order_available", handleOrderAvailable);
      socket.off("order:update", handleOrderUpdate);
    };
  }, [socket, profile, audioUnlocked]);

  const handleAcceptOrder = async (orderId: string) => {
    setAcceptingIds((prev) => new Set(prev).add(orderId));
    try {
      await acceptOrder(orderId);
      toast.success("Order accepted!");
      setAvailableOrders((prev) => prev.filter((o) => o.orderId !== orderId));
      await fetchActiveOrders();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to accept order";
      toast.error(msg);
    } finally {
      setAcceptingIds((prev) => { const next = new Set(prev); next.delete(orderId); return next; });
    }
  };

  const handleStatusUpdate = async (orderId: string, status: "pickedUp" | "delivered") => {
    setUpdatingIds((prev) => new Set(prev).add(orderId));
    try {
      await updateOrderStatus(orderId, status);
      toast.success(`Order ${status === "pickedUp" ? "picked up" : "delivered"}!`);
      await fetchActiveOrders();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to update status";
      toast.error(msg);
    } finally {
      setUpdatingIds((prev) => { const next = new Set(prev); next.delete(orderId); return next; });
    }
  };

  if (user?.role !== "rider") {
    return (
      <div className="min-h-screen bg-grey-50 px-4 py-6 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-slate-900">Access Denied</h2>
          <p className="mt-2 text-base text-slate-500">You are not registered as a rider.</p>
        </div>
      </div>
    );
  }

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;

    if (!image) {
      toast.error("Please upload a photo");
      return;
    }

    const formData = new FormData(form);

    try {
      setSubmitting(true);
      const { data } = await registerRider(formData);
      toast.success(data.message);
      form.reset();
      setImage(null);
      await fetchProfile();
    } catch (err: any) {
      const message = err?.response?.data?.message || "Something went wrong";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const toogleAvailability = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported please enable it");
      return;
    }

    setToogle(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await toggleAvailability({
            isAvailable: !profile?.isAvailable,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });

          toast.success(profile?.isAvailable ? "You are no longer available" : "You are now available");
          await fetchProfile();
        } catch (error: any) {
          if (error.response?.status === 400) {
            toast.error(error.response.data.message);
            return;
          }
          toast.error("Failed to toggle availability");
        } finally {
          setToogle(false);
        }
      },
      () => {
        toast.error("Failed to get location");
        setToogle(false);
      }
    );
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#E23744]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-slate-900 to-[#E23744] bg-clip-text text-transparent">
            Rider Dashboard
          </h1>
          <p className="mt-3 text-lg text-slate-500">Manage your deliveries and availability status.</p>
        </div>

        {!profile ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">Register as a Rider</h2>
            <p className="mt-2 text-base text-slate-500">Fill in your details to start delivering.</p>
            <form onSubmit={handleRegister} className="mt-6 space-y-5">
              <div>
                <label htmlFor="rider-phone" className="sr-only">Phone</label>
                <input id="rider-phone" name="phone" type="tel" placeholder="Phone Number" required className="w-full border rounded-lg px-5 py-4 text-base outline-none focus:ring-2 focus:ring-red-200" />
              </div>
              <div>
                <label htmlFor="rider-license" className="sr-only">Drivers License Number</label>
                <input id="rider-license" name="driversLicenseNumber" placeholder="Drivers License Number" required className="w-full border rounded-lg px-5 py-4 text-base outline-none focus:ring-2 focus:ring-red-200" />
              </div>
              {loadingLocation && <p className="text-sm text-gray-500 -mt-3">Fetching your location...</p>}
              <input name="latitude" type="hidden" value={userLocation?.latitude || ""} />
              <input name="longitude" type="hidden" value={userLocation?.longitude || ""} />
              <label htmlFor="rider-file" className="flex items-center gap-3 w-full border rounded-lg px-5 py-4 text-base outline-none cursor-pointer text-gray-600 hover:text-gray-700 focus-within:ring-2 focus-within:ring-red-200">
                <BiUpload className="h-7 w-7 text-[#E23744]" />
                <span>{image ? image.name : "Upload your photo"}</span>
                <input id="rider-file" name="file" type="file" accept="image/*" className="hidden" onChange={(e) => setImage(e.target.files?.[0] || null)} />
              </label>
              <button type="submit" disabled={submitting} className="w-full bg-red-500 text-white py-4 rounded-lg font-semibold text-lg hover:bg-red-600 disabled:opacity-60">
                {submitting ? "Submitting..." : "Register as Rider"}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
              <div className="flex items-center gap-6">
                <img
                  src={profile.image}
                  alt="Rider"
                  className="h-44 w-44 rounded-full object-cover shadow-lg"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-3xl font-semibold text-slate-900">{user?.name}</h2>
                    {profile.isVerified ? (
                      <BiCheckCircle className="h-7 w-7 text-blue-500" />
                    ) : (
                      <BiXCircle className="h-7 w-7 text-red-400" />
                    )}
                  </div>
                  <p className="text-xl text-slate-500 mt-1">{profile.phone}</p>
                  <span className={`mt-2 inline-block rounded-full px-4 py-1 text-sm font-semibold ${profile.isVerified ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {profile.isVerified ? "Verified Rider" : "Unverified"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
              <h3 className="text-2xl font-semibold text-slate-900">Availability</h3>
              <p className="mt-2 text-base text-slate-500">
                Toggle your status to start or stop receiving delivery requests.
              </p>
              <p className="mt-3 text-sm font-medium text-amber-600 bg-amber-50 rounded-lg px-4 py-3 border border-amber-200">
                Please be within 500m radius of any restaurant before going online to receive orders.
              </p>
              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-4 w-4 rounded-full ${profile.isAvailable ? "bg-green-500" : "bg-gray-300"}`} />
                  <span className="text-lg font-medium text-slate-700">
                    {profile.isAvailable ? "Online" : "Offline"}
                  </span>
                </div>
                <button
                  onClick={toogleAvailability}
                  disabled={toogle}
                  className={`rounded-full px-8 py-3 text-lg font-semibold text-white transition ${
                    profile.isAvailable
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-green-500 hover:bg-green-600"
                  } disabled:opacity-60`}
                >
                  {toogle ? "Processing..." : profile.isAvailable ? "Go Offline" : "Go Online"}
                </button>
              </div>
            </div>

            {!audioUnlocked && (
              <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BiVolumeFull className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="font-semibold text-blue-900">Enable Sound Notifications</p>
                    <p className="text-sm text-blue-700">Get notified when a new delivery order is available</p>
                  </div>
                </div>
                <button onClick={unlockAudio} className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition shrink-0">
                  Enable Sound
                </button>
              </div>
            )}

            {profile.isAvailable && availableOrders.length > 0 && (
              <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <BiCurrentLocation className="h-6 w-6 text-[#E23744]" />
                  <h3 className="text-2xl font-semibold text-slate-900">Available Orders</h3>
                  <span className="ml-auto rounded-full bg-[#E23744] text-white text-xs font-bold px-3 py-1">
                    {availableOrders.length}
                  </span>
                </div>
                <p className="text-base text-slate-500 mb-4">New delivery requests near you.</p>
                <div className="space-y-4">
                  {availableOrders.map((order) => (
                    <div key={order.orderId} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <BiMapPin className="h-4 w-4 text-[#E23744]" />
                            <span>{order.distance.toFixed(1)} km away</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <BiDollarCircle className="h-4 w-4 text-green-600" />
                            <span className="font-semibold text-slate-900">${order.riderAmount.toFixed(2)}</span>
                            <span className="text-slate-400">delivery fee</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAcceptOrder(order.orderId)}
                          disabled={acceptingIds.has(order.orderId)}
                          className="rounded-full bg-[#E23744] px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60 flex items-center gap-1.5"
                        >
                          {acceptingIds.has(order.orderId) ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : (
                            <BiCheck className="h-5 w-5" />
                          )}
                          {acceptingIds.has(order.orderId) ? "Accepting..." : "Accept"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeOrders.length > 0 && (
              <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <BiCurrentLocation className="h-6 w-6 text-[#E23744]" />
                  <h3 className="text-2xl font-semibold text-slate-900">Active Deliveries</h3>
                  <span className="ml-auto rounded-full bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1">
                    {activeOrders.length}
                  </span>
                </div>
                <div className="space-y-4">
                  {activeOrders.map((order) => (
                    <div key={order._id} className="rounded-2xl border border-slate-200 p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-lg font-semibold text-slate-900">{order.restaurantName}</h4>
                            <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${statusColor[order.status] || "text-slate-600 bg-slate-100"}`}>
                              {statusLabel[order.status] || order.status}
                            </span>
                          </div>
                          <p className="text-sm text-slate-400 mt-1">Order #{order._id.slice(-8)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                        <div className="flex items-center gap-1">
                          <BiPackage className="h-3.5 w-3.5" />
                          {order.items.reduce((sum, i) => sum + i.quantity, 0)} items
                        </div>
                        <div className="flex items-center gap-1">
                          <BiDollarCircle className="h-3.5 w-3.5 text-green-600" />
                          ${order.totalAmount.toFixed(2)}
                        </div>
                        <div className="flex items-center gap-1">
                          <BiMapPin className="h-3.5 w-3.5" />
                          {order.distance.toFixed(1)} km
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
                        <BiUser className="h-3.5 w-3.5" />
                        {order.deliveryAddress.formattedAddress}
                      </div>

                      {order.status === "rider_assigned" && (
                        <button
                          onClick={() => handleStatusUpdate(order._id, "pickedUp")}
                          disabled={updatingIds.has(order._id)}
                          className="w-full rounded-full bg-purple-600 py-3 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
                        >
                          {updatingIds.has(order._id) ? "Updating..." : "Mark as Picked Up"}
                        </button>
                      )}
                      {order.status === "pickedUp" && (
                        <button
                          onClick={() => handleStatusUpdate(order._id, "delivered")}
                          disabled={updatingIds.has(order._id)}
                          className="w-full rounded-full bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                        >
                          {updatingIds.has(order._id) ? "Updating..." : "Mark as Delivered"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
              <h3 className="text-2xl font-semibold text-slate-900">Stats</h3>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-slate-50 p-6 border border-slate-200">
                  <div className="flex items-center gap-2 text-base text-slate-500">
                    <BiPackage className="h-5 w-5 text-slate-500" />
                    <span>Deliveries</span>
                  </div>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{profile.totalDeliveries}</p>
                </div>
                {profile.lastActiveAt && (
                  <div className="rounded-2xl bg-slate-50 p-6 border border-slate-200">
                    <div className="flex items-center gap-2 text-base text-slate-500">
                      <BiTime className="h-5 w-5 text-[#E23744]" />
                      <span>Last Active</span>
                    </div>
                    <p className="mt-2 text-base font-medium text-slate-900">
                      {new Date(profile.lastActiveAt).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RiderDashboard;
