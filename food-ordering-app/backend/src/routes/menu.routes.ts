import { Router } from 'express';
import {
  getAllMenuItems,
  getMenuItem,
  getPopularItems,
} from '../controllers/menu.controller';

const router = Router();

/**
 * @swagger
 * /api/menu:
 *   get:
 *     summary: Get all menu items
 *     tags: [Menu]
 *     parameters:
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name and description
 *       - in: query
 *         name: isPopular
 *         schema:
 *           type: boolean
 *         description: Filter popular items
 *       - in: query
 *         name: isAvailable
 *         schema:
 *           type: boolean
 *         description: Filter available items
 *     responses:
 *       200:
 *         description: List of menu items
 */
router.get('/', getAllMenuItems);

/**
 * @swagger
 * /api/menu/popular:
 *   get:
 *     summary: Get popular menu items
 *     tags: [Menu]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Number of items to return
 *     responses:
 *       200:
 *         description: List of popular menu items
 */
router.get('/popular', getPopularItems);

/**
 * @swagger
 * /api/menu/{id}:
 *   get:
 *     summary: Get menu item by ID
 *     tags: [Menu]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Menu item ID
 *     responses:
 *       200:
 *         description: Menu item details
 *       404:
 *         description: Menu item not found
 */
router.get('/:id', getMenuItem);

export default router;
