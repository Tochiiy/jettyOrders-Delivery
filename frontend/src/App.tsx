import {  Route, Routes, BrowserRouter} from 'react-router-dom'
import Homepage from './pages/Homepage'
import Login from './pages/Login'
import { Toaster } from 'react-hot-toast'
import ProtectedRoute from './components/ProtectedRoute'
import PublicRoute from './components/PublicRoute'
import SelectRole from './pages/SelectRole'
import Navbar from './components/Navbar'
import Account from './components/Account'
import RestaurantDashboard from './pages/RestaurantDashboard'
import RestaurantMenu from './pages/RestaurantMenu'
import PublicMenu from './pages/PublicMenu'
import BrowseMenu from './pages/BrowseMenu'
import Cart from './pages/Cart'
import AddressPage from './pages/Address'
import Checkout from './pages/Checkout'
import Order from './pages/Order'
import MyOrders from './pages/MyOrders'
import SellerOrders from './pages/SellerOrders'
import OrderConfirmation from './pages/OrderConfirmation'
import ResetPassword from './pages/ResetPassword'

const App = () => {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Homepage />} />
          <Route path="/select-role" element={<SelectRole />} />
          <Route path="/account" element={<Account />} />
          <Route path="/seller/add" element={<RestaurantDashboard />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/browse" element={<BrowseMenu />} />
          <Route path="/address" element={<AddressPage />} />
          <Route path="/order" element={<Order />} />
          <Route path="/orders" element={<MyOrders />} />
          <Route path="/seller/orders" element={<SellerOrders />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order/:orderId" element={<OrderConfirmation />} />
        </Route>
        <Route path="/restaurant/:restaurantId" element={<RestaurantMenu />} />
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>
        <Route path="/menu/:restaurantId" element={<PublicMenu />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}

export default App


