import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router'

import { LoadingState } from '@/components/common/LoadingState'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { StorefrontLayout } from '@/components/layout/StorefrontLayout'
import { RequirePermission } from '@/features/team/presentation/RequirePermission'

import { AdminRoute } from './AdminRoute'
import { ProtectedRoute } from './ProtectedRoute'
import { routes } from './routes'
import { ScrollToTop } from './ScrollToTop'

const HomePage = lazy(() => import('@/pages/storefront/HomePage'))
const ShopPage = lazy(() => import('@/pages/storefront/ShopPage'))
const ProductDetailsPage = lazy(() => import('@/pages/storefront/ProductDetailsPage'))
const CartPage = lazy(() => import('@/pages/storefront/CartPage'))
const CheckoutPage = lazy(() => import('@/pages/storefront/CheckoutPage'))
const OrderConfirmationPage = lazy(() => import('@/pages/storefront/OrderConfirmationPage'))
const LoginPage = lazy(() => import('@/pages/storefront/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/storefront/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/storefront/ForgotPasswordPage'))
const VerifyEmailPage = lazy(() => import('@/pages/storefront/VerifyEmailPage'))
const AccountPage = lazy(() => import('@/pages/storefront/AccountPage'))
const MyOrdersPage = lazy(() => import('@/pages/storefront/MyOrdersPage'))
const OrderDetailsPage = lazy(() => import('@/pages/storefront/OrderDetailsPage'))
const AboutPage = lazy(() => import('@/pages/storefront/AboutPage'))
const CustomPage = lazy(() => import('@/pages/storefront/CustomPage'))
const NotFoundPage = lazy(() => import('@/pages/storefront/NotFoundPage'))

const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage'))
const ProductsPage = lazy(() => import('@/pages/admin/ProductsPage'))
const ProductFormPage = lazy(() => import('@/pages/admin/ProductFormPage'))
const CategoriesPage = lazy(() => import('@/pages/admin/CategoriesPage'))
const InventoryPage = lazy(() => import('@/pages/admin/InventoryPage'))
const OrdersPage = lazy(() => import('@/pages/admin/OrdersPage'))
const AdminOrderDetailsPage = lazy(() => import('@/pages/admin/AdminOrderDetailsPage'))
const CustomersPage = lazy(() => import('@/pages/admin/CustomersPage'))
const SettingsPage = lazy(() => import('@/pages/admin/SettingsPage'))
const MediaPage = lazy(() => import('@/pages/admin/MediaPage'))
const NavigationPage = lazy(() => import('@/pages/admin/NavigationPage'))
const ThemePage = lazy(() => import('@/pages/admin/ThemePage'))
const AnnouncementPage = lazy(() => import('@/pages/admin/AnnouncementPage'))
const ContentPage = lazy(() => import('@/pages/admin/ContentPage'))
const EditorPage = lazy(() => import('@/pages/admin/EditorPage'))
const RevisionsPage = lazy(() => import('@/pages/admin/RevisionsPage'))

// Agent B: reviews + returns
const ReviewsPage = lazy(() => import('@/pages/admin/ReviewsPage'))
const ReturnsPage = lazy(() => import('@/pages/admin/ReturnsPage'))

// Agent A: storefront commerce
const WishlistPage = lazy(() => import('@/pages/storefront/WishlistPage'))
const TrackOrderPage = lazy(() => import('@/pages/storefront/TrackOrderPage'))
const StockAlertsPage = lazy(() => import('@/pages/admin/StockAlertsPage'))

// Agent C: admin ops
const DiscountsPage = lazy(() => import('@/pages/admin/DiscountsPage'))
const TeamPage = lazy(() => import('@/pages/admin/TeamPage'))
const PackingSlipPage = lazy(() => import('@/pages/admin/PackingSlipPage'))

export function AppRouter() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<LoadingState fullPage />}>
        <Routes>
          <Route element={<StorefrontLayout />}>
            <Route path={routes.home} element={<HomePage />} />
            <Route path={routes.shop} element={<ShopPage />} />
            <Route path="/collections/:slug" element={<ShopPage />} />
            <Route path="/products/:slug" element={<ProductDetailsPage />} />
            <Route path={routes.cart} element={<CartPage />} />
            <Route path={routes.checkout} element={<CheckoutPage />} />
            <Route path="/orders/confirmation/:orderNumber" element={<OrderConfirmationPage />} />
            <Route path={routes.about} element={<AboutPage />} />
            <Route path="/pages/:slug" element={<CustomPage />} />
            <Route path={routes.login} element={<LoginPage />} />
            <Route path={routes.register} element={<RegisterPage />} />
            <Route path={routes.verifyEmail} element={<VerifyEmailPage />} />
            <Route path={routes.forgotPassword} element={<ForgotPasswordPage />} />
            {/* Agent A: storefront commerce (public) */}
            <Route path={routes.wishlist} element={<WishlistPage />} />
            <Route path={routes.track} element={<TrackOrderPage />} />
            <Route
              path={routes.account}
              element={
                <ProtectedRoute>
                  <Outlet />
                </ProtectedRoute>
              }
            >
              <Route index element={<AccountPage />} />
              <Route path="orders" element={<MyOrdersPage />} />
              <Route path="orders/:id" element={<OrderDetailsPage />} />
              {/* Agent A: storefront commerce */}
              <Route path="wishlist" element={<WishlistPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<Navigate to={routes.admin.dashboard} replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="products/new" element={<ProductFormPage />} />
            <Route path="products/:id/edit" element={<ProductFormPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:id" element={<AdminOrderDetailsPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="media" element={<MediaPage />} />
            <Route path="navigation" element={<NavigationPage />} />
            <Route
              path="theme"
              element={
                <RequirePermission permission="theme.edit">
                  <ThemePage />
                </RequirePermission>
              }
            />
            <Route path="announcement" element={<AnnouncementPage />} />
            <Route path="content" element={<ContentPage />} />
            <Route path="content/revisions" element={<RevisionsPage />} />
            <Route path="editor" element={<EditorPage />} />
            {/* Agent B: reviews + returns */}
            <Route path="reviews" element={<ReviewsPage />} />
            <Route path="returns" element={<ReturnsPage />} />
            {/* Agent A: storefront commerce */}
            <Route path="stock-alerts" element={<StockAlertsPage />} />
            {/* Agent C: admin ops */}
            <Route path="discounts" element={<DiscountsPage />} />
            <Route path="team" element={<TeamPage />} />
          </Route>

          {/* Agent C: printable packing slip — admin-gated but without the admin chrome */}
          <Route
            path="/admin/orders/:id/packing-slip"
            element={
              <AdminRoute>
                <PackingSlipPage />
              </AdminRoute>
            }
          />
        </Routes>
      </Suspense>
    </>
  )
}
