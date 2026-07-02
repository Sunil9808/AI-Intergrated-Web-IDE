import { Router } from 'express';
import { fileController } from '../controllers/fileController';

const router = Router();

router.get('/tree', fileController.getTree);
router.get('/read', fileController.readFile);
router.post('/write', fileController.writeFile);
router.post('/create', fileController.createFile);
router.delete('/delete', fileController.deleteFile);
router.put('/rename', fileController.renameFile);
router.get('/search', fileController.searchFiles);

export default router;
