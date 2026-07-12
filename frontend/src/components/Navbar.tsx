import { Link, useLocation } from "react-router-dom"
import { useAppData } from "../context/AppContext"
import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { CgShoppingCart } from "react-icons/cg"
import { BiMapPin } from "react-icons/bi"
import { BiSearch } from "react-icons/bi"
const Navbar = () => {
    const { isAuth, city, cartQuantity, user } = useAppData();
    const currentLocation = useLocation();

    const isHomePage = currentLocation.pathname === "/"
    const [searchParams, setSearchParams] = useSearchParams()
    const [search, setSearch] = useState(searchParams.get("search") || "");

    useEffect(() => {
        const timer = setTimeout(() => {
            if (search) {
                setSearchParams({ search });
            } else {
                setSearchParams({});
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [search])
  return (
      <div className="w-full bg-white shadow-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 ">
              <Link to={"/"} className="text-2xl font-bold cursor-pointer">
                  <span className="text-[#E23744]">jetty</span><span className="text-black">Orders-Delivery</span>
              </Link>
              
              <div className="flex items-center gap-4">
                  {user?.role !== "seller" && (
                      <Link to={"/cart"} className="relative">
                          <CgShoppingCart className="h-6 w-6 text-[#E23744]" />
                          <span className="absolute -top-2 -right-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#E23744] px-1.5 text-[10px] text-white font-semibold">{cartQuantity}</span>
                      </Link>
                  )}
                  {isAuth && (
                      <Link to="/browse" className="font-medium text-[#E23744]">
                          Browse
                      </Link>
                  )}
                  {isAuth ? (
                      <Link to="/account" className="font-medium text-[#E23744]">
                          Account
                      </Link>
                  ) : (
                      <Link to="/login" className="font-medium text-[#E23744]">
                          Login
                      </Link>
                  )}
                  </div>

          </div>
      
          {
              isHomePage &&
              
              <div className="border-t px-4 py-3">
                      <div className="mx-auto flex max-w-7xl items-center rounded-lg border
                      shadow-sm">
                          <div className="flex items-center gap-2 px-3 border-r text-gray-700">
                              <BiMapPin className="h-4 w-4 text-[#E23744]" />
                              <span className="text-sm truncate max-w-[140px]">{ city }</span>
                          </div>
                          
                          <div className="flex flex-1 items-center gap-2 px-3">
                              <BiSearch className="h-4 w-4 text-grey-400" />
                              <input type="text" placeholder="Search for resturants" value={search} 
                onChange={e=> setSearch(e.target.value)}  className="w-full py-2 text-sm outline-none"      />      
                              
                              </div>
                      </div>
              </div>
          }





    </div>
  )
}

export default Navbar
