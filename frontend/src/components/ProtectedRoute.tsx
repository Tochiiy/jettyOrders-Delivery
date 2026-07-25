import { useAppData } from "../context/AppContext";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import RiderDashboard from "../pages/RiderDashboard";


const ProtectedRoute = () => {

    const { isAuth, loading, user } = useAppData();
    const location = useLocation();

    if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#E23744]" /></div>;

    if (!isAuth || !user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (user?.role === "rider") {
        return <RiderDashboard />;
    }

    if (user?.role === "seller") {
        if (location.pathname === "/") return <Navigate to="/seller/add" replace />;
        if (["/browse", "/cart"].includes(location.pathname)) return <Navigate to="/" replace />;
    }

    if (user?.role === null && location.pathname !== "/select-role") {
        return <Navigate to="/select-role" replace />;
    }

    if (user.role && location.pathname === "/select-role") {
        return <Navigate to="/" replace />;
    }

    return <Outlet />
}

export default ProtectedRoute
