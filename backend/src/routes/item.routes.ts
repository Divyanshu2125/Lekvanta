import { Router } from 'express';
import {
  listItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  adjustStock,
  getItemMovements,
  importCsvItems,
  listCategories,
  createCategory,
  listUnits,
  createUnit,
  listTaxRates,
  createTaxRate,
} from '../controllers/item.controller';
import { authenticate, requireBusiness, requireBusinessMember } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createItemSchema,
  updateItemSchema,
  adjustStockSchema,
  createCategorySchema,
  createUnitSchema,
  createTaxRateSchema,
} from '../schemas';

const router = Router({ mergeParams: true });

router.use(authenticate, requireBusiness, requireBusinessMember);

// Sub-resources
router.get('/categories', listCategories);
router.post('/categories', validate(createCategorySchema), createCategory);

router.get('/units', listUnits);
router.post('/units', validate(createUnitSchema), createUnit);

router.get('/tax-rates', listTaxRates);
router.post('/tax-rates', validate(createTaxRateSchema), createTaxRate);

// Bulk operations
router.post('/import-csv', importCsvItems);

// Items CRUD & Stock Adjustments
router.get('/', listItems);
router.post('/', validate(createItemSchema), createItem);
router.get('/:id', getItem);
router.patch('/:id', validate(updateItemSchema), updateItem);
router.delete('/:id', deleteItem);
router.post('/:id/adjust-stock', validate(adjustStockSchema), adjustStock);
router.get('/:id/movements', getItemMovements);

export default router;
