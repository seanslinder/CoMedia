import { Router } from 'express';
import { createRoom, getPublicRooms, joinRoom, getRoom, getQueue, addToQueue } from '../controllers/rooms';
import { authenticate, optionalAuthenticate } from '../middleware/auth';

const router = Router();

router.get('/public', optionalAuthenticate as any, getPublicRooms as any);
router.post('/', authenticate as any, createRoom as any);
router.post('/join', authenticate as any, joinRoom as any);
router.get('/:id', optionalAuthenticate as any, getRoom as any);

router.get('/:id/queue', authenticate as any, getQueue as any);
router.post('/:id/queue', authenticate as any, addToQueue as any);

export default router;
