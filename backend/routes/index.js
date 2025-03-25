import express from 'express';
import portfolioRouter from './portfolio.js';

const router = express.Router();

router.use('/portfolio', portfolioRouter);

export default router;