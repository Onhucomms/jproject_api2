import { Router, Request, Response } from "express";

const router = Router();

router.post('/', (req, res) => {
    const { id, password } = req.body;
    res.json({ message: 'Login successful' });
});

export default router;