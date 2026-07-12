import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import * as paymentService from "../services/paymentService";
import { useAppData } from "../context/AppContext";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { BiArrowBack, BiCreditCard, BiErrorCircle } from "react-icons/bi";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

const CheckoutForm = ({ orderId, paymentIntentId, amount, onSuccess }:
    { orderId: string; paymentIntentId: string; amount: number; onSuccess: () => void }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setProcessing(true);
        setError("");

        const { error: submitError } = await elements.submit();
        if (submitError) {
            setError(submitError.message || "Payment failed");
            setProcessing(false);
            return;
        }

        const { error: confirmError } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/order/${orderId}`,
            },
            redirect: "if_required",
        });

        if (confirmError) {
            setError(confirmError.message || "Payment failed");
            setProcessing(false);
            return;
        }

        try {
            await paymentService.confirmPayment({ paymentIntentId, orderId });
        } catch (err) {
            console.error("Confirm payment error:", err);
        }

        onSuccess();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <PaymentElement />
            {error && (
                <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 p-4" role="alert">
                    <BiErrorCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}
            <button
                type="submit"
                disabled={!stripe || processing}
                className="w-full rounded-3xl bg-[#E23744] px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {processing ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        Processing payment...
                    </span>
                ) : (
                    `Pay $${amount.toFixed(2)}`
                )}
            </button>
        </form>
    );
};

const Checkout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { fetchCart } = useAppData();

    const [orderData] = useState(() => {
        if (location.state?.orderId && location.state?.clientSecret) {
            sessionStorage.setItem("checkout_data", JSON.stringify(location.state));
            return location.state as { orderId: string; paymentIntentId: string; clientSecret: string; amount: number };
        }

        const saved = sessionStorage.getItem("checkout_data");
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch {
                sessionStorage.removeItem("checkout_data");
            }
        }

        return null;
    });

    if (!orderData) {
        return <Navigate to="/cart" replace />;
    }

    const { orderId, paymentIntentId, clientSecret, amount } = orderData;

    const handlePaymentSuccess = async () => {
        await fetchCart();
        navigate(`/order/${orderId}`, { replace: true });
    };

    return (
        <div className="min-h-screen bg-gray-50 py-10">
            <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
                <div className="mb-6 flex items-center gap-3">
                    <button onClick={() => { sessionStorage.removeItem("checkout_data"); navigate("/order"); }} className="rounded-2xl bg-white p-2 shadow-sm hover:bg-gray-50">
                        <BiArrowBack className="h-5 w-5 text-slate-700" />
                    </button>
                    <h1 className="text-xl font-bold text-slate-900">Complete Payment</h1>
                </div>

                <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
                    <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-6">
                        <div className="rounded-2xl bg-[#E23744]/10 p-3">
                            <BiCreditCard className="h-6 w-6 text-[#E23744]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Pay with Card</h2>
                            <p className="text-sm text-slate-500">Total: ${amount?.toFixed(2)}</p>
                        </div>
                    </div>

                    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
                        <CheckoutForm
                            orderId={orderId}
                            paymentIntentId={paymentIntentId || ""}
                            amount={amount || 0}
                            onSuccess={handlePaymentSuccess}
                        />
                    </Elements>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
