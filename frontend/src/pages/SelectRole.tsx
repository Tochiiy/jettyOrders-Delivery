import { useState } from "react";
import { useAppData } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import * as authService from "../services/authService";
import { BiUser, BiStore, BiBus } from "react-icons/bi";

const SelectRole = () => {

    type Role = "customer" | "rider" | "seller";

    const [role, setRole] = useState<Role | null>(null)
    const { setUser } = useAppData();
    const navigate = useNavigate();

    const roles: Role[] = ["customer", "rider", "seller"];

    const addRole = async () => {
        try {
            const { data } = await authService.addRole(role!);
            localStorage.setItem("token", data.token);
            setUser(data.user);
            toast.success(data.message);
            navigate("/", { replace: true });
        } catch (error) {
            toast.error("Failed to add role");
        }
    }

    return (

        <div className="flex flex-col min-h-screen items-center justify-center bg-white px-4">
            <div className="space-y-6 w-full max-w-sm">
                <h1 className="text-center text-2xl font-bold">choose Your Role</h1>

                {roles.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRole(r)}
                      className={
                        `w-full rounded-xl border px-4 py-3 text-sm font-medium capitalize transition flex items-center justify-center gap-3
                        ${role === r ? "border-[#E23744] bg-[#E23744] text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`
                      }
                    >
                      {r === "customer" && <BiUser className="h-5 w-5" />}
                      {r === "rider" && <BiBus className="h-5 w-5" />}
                      {r === "seller" && <BiStore className="h-5 w-5" />}
                      continue as {r}
                    </button>
                ))}

                <button
                    onClick={addRole}
                    disabled={!role}
                    className={`w-full rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                        role ? "border-[#E23744] bg-[#E23744] text-white hover:bg-[#d32f3a]" : "cursor-not-allowed border-gray-300 bg-gray-100 text-gray-400"
                    }`}
                >
                    Next
                </button>
            </div>
        </div>
    )
}

export default SelectRole
