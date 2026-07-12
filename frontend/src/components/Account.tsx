import { useAppData } from "../context/AppContext"
import { useNavigate } from "react-router-dom"
import { toast } from "react-hot-toast"
import { BiPackage, BiLogOut, BiMapPin, BiStore } from "react-icons/bi"

const Account = () => {
    const { user, setUser, setIsAuth } = useAppData();

    const firstLetter = user?.name?.charAt(0).toUpperCase();
    const navigate = useNavigate();

    const logOutHandler = () => {
        localStorage.removeItem("token");
        setUser(null);
        setIsAuth(false);
        navigate("/login");
        toast.success("Logged out successfully");
    }

    return (
        <div className="min-h-screen bg-grey-50 px-4 py-6">
            <div className="mx-auto max-w-md rounded-3xl bg-white shadow-sm">
                <div className="flex flex-col items-center justify-center gap-4 border-b p-5">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-xl font-semibold text-white">
                        {firstLetter}
                    </div>
                    <div className="text-center">
                        <h2 className="text-lg font-semibold">{user?.name}</h2>
                        <p className="text-sm text-grey-500">{user?.email}</p>
                    </div>
                </div>
            </div>
            <div className="mx-auto mt-4 max-w-md divide-y rounded-3xl bg-white shadow-sm">
                {user?.role === "seller" ? (
                    <div className="flex cursor-pointer items-center gap-4 p-5 hover:bg-grey-50"
                        onClick={() => navigate("/seller/orders")}>
                        <BiStore className="h-5 w-5 text-red-500" />
                        <span className="font-medium">Manage Orders</span>
                    </div>
                ) : (
                    <div className="flex cursor-pointer items-center gap-4 p-5 hover:bg-grey-50"
                        onClick={() => navigate("/address")}>
                        <BiMapPin className="h-5 w-5 text-red-500" />
                        <span className="font-medium">Addresses</span>
                    </div>
                )}
                <div className="flex cursor-pointer items-center gap-4 p-5 hover:bg-grey-50"
                    onClick={() => navigate("/orders")}>
                    <BiPackage className="h-5 w-5 text-red-500" />
                    <span className="font-medium">{user?.role === "seller" ? "Order History" : "Your Orders"}</span>
                </div>
                <div className="flex cursor-pointer items-center gap-4 p-5 hover:bg-grey-50 text-red-500"
                    onClick={logOutHandler}>
                    <BiLogOut className="h-5 w-5" />
                    <span className="font-medium">Logout</span>
                </div>
            </div>
        </div>
    )
}

export default Account
