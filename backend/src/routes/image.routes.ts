import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  upload,
  uploadImage,
  addProductImage,
  getProductImages,
  deleteProductImage,
  reorderProductImages,
  setPrimaryImage,
} from '../controllers/image.controller';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'STAFF'));

// General single-image upload (returns url, used by category imageUrl)
router.post('/upload', upload.single('image'), uploadImage);

// Product gallery
router.get('/products/:id/images',                    getProductImages);
router.post('/products/:id/images', upload.single('image'), addProductImage);
router.delete('/products/:id/images/:imageId',        deleteProductImage);
router.put('/products/:id/images/reorder',            reorderProductImages);
router.patch('/products/:id/images/:imageId/primary', setPrimaryImage);

export default router;
