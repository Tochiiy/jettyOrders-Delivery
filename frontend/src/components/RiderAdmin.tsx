import toast from "react-hot-toast";
import { verifyRider } from "../services/adminService";
import type { IRider } from "../types/types";

const RiderAdmin = ({
  rider,
  onVerify,
}: {
  rider: IRider;
  onVerify: () => void;
}) => {
  const verify = async () => {
    try {
      await verifyRider(rider._id);
      toast.success("Rider verified");
      onVerify();
    } catch {
      toast.error("failed to verify rider");
    }
  };
  return (
    <div className="rounded-xl bg-white p-4 shadow space-y-2">
      <img
        src={rider.image}
        className="h-40 w-full object-cover rounded"
        alt=""
      />
      <h3>{rider.phone}</h3>
      {rider.aadharNumber && <p>aadhar: {rider.aadharNumber}</p>}
      <p>Dl Number: {rider.driversLicenseNumber}</p>

      <button
        className="w-full rounded bg-green-500 py-2 text-white hover:bg-green-600"
        onClick={verify}
      >
        Verify Rider
      </button>
    </div>
  );
};

export default RiderAdmin;
