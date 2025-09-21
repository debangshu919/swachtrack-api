import { Router, Request, Response } from 'express';
import classify from '../controllers/classify';
import analyze from '../controllers/analyze';
import report from '../controllers/report';
import chat from '../controllers/chat';

const router: Router = Router();

// Sample API routes for SwachTrack
router.get('/status', (req: Request, res: Response) => {
  res.json({
    message: 'SwachTrack API is operational',
    version: '1.0.0',
  });
});

// AI-powered civic issue classification endpoint
router.post('/classify', classify);

// AI-powered civic issue analysis endpoint
router.post('/analyze', analyze);

// Complete pipeline endpoint - classifies and analyzes civic issues
router.post('/report', report);

// AI Chat endpoint - interactive chat with AI agent for civic issue reporting
router.post('/chat', chat);

export { router as apiRoutes };
