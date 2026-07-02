import { Router } from 'express';
import { aiController } from '../controllers/aiController';

const router = Router();

// All AI routes
router.post('/chat', aiController.chat);
router.post('/agent', aiController.agent);
router.post('/explain', aiController.explain);
router.post('/generate', aiController.generate);
router.post('/debug', aiController.debug);
router.post('/refactor', aiController.refactor);
router.post('/review', aiController.review);
router.post('/test', aiController.generateTests);
router.post('/document', aiController.generateDocs);
router.post('/convert', aiController.convert);

export default router;
