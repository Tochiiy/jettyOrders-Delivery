import { useParams, useNavigate } from "react-router-dom";
import { BiCheckCircle, BiHome, BiPackage } from "react-icons/bi";

const OrderConfirmation = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 py-10">
            <div className="mx-auto max-w-lg px-4 text-center">
                <div className="rounded-3xl border border-gray-200 bg-white p-12 shadow-sm">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                        <BiCheckCircle className="h-10 w-10 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Order Placed!</h1>
                    <p className="mt-3 text-sm text-slate-500">
                        Your order has been placed successfully.
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                        Order ID: {orderId}
                    </p>
                    <div className="mt-8 flex justify-center gap-3">
                        <button
                            onClick={() => navigate("/")}
                            className="inline-flex items-center gap-2 rounded-3xl bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                        >
                            <BiHome className="h-4 w-4" />
                            Home
                        </button>
                        <button
                            onClick={() => navigate("/orders")}
                            className="inline-flex items-center gap-2 rounded-3xl bg-[#E23744] px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
                        >
                            <BiPackage className="h-4 w-4" />
                            View Orders
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderConfirmation;
