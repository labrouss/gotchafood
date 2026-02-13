import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  getDashboardStats,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getAllOrders,
  getOrderDetails,
  updateOrderStatus,
  updateOrderItemStatus,
  cancelOrder,
  getAllCustomers,
  getCustomerDetails,
  toggleCustomerStatus,
  updateUserRole,
  updateUserRoutingRole,
} from '../controllers/admin.controller';
import { getStaffPerformance } from '../controllers/staff-performance.controller';

const router = Router();

// All admin routes require authentication and ADMIN role
router.use(authenticate);
router.use(authorize('ADMIN', 'STAFF'));

// Dashboard
router.get('/dashboard', getDashboardStats);

// Category Management
router.get('/categories', getAllCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Menu Item Management
router.post('/menu', createMenuItem);
router.put('/menu/:id', updateMenuItem);
router.delete('/menu/:id', deleteMenuItem);

// Order Management
router.get('/orders', getAllOrders);
router.get('/orders/:id', getOrderDetails);
router.patch('/orders/:id/status', updateOrderStatus);
router.patch('/order-items/:id/status', updateOrderItemStatus);
router.post('/orders/:id/cancel', cancelOrder);

// Customer Management
router.get('/customers', getAllCustomers);
router.get('/customers/:id', getCustomerDetails);
router.patch('/customers/:id/toggle-status', toggleCustomerStatus);
router.patch('/customers/:id/role', updateUserRole);
router.patch('/customers/:id/routing-role', updateUserRoutingRole);

// Staff Performance
router.get('/staff-performance', getStaffPerformance);

export default router;
