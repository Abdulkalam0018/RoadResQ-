import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { askAI } from '../controller/ai.controller.js';

const router = Router();

router.post('/ask', verifyJWT, askAI);

export default router;
