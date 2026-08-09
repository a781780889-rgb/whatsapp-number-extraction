import type { Request, Response } from 'express';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import * as numbersService from '../services/numbers.service.js';
import type { numbersQuerySchema } from '../validators/schemas.js';
import type { z } from 'zod';

export const listNumbersHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as z.infer<typeof numbersQuerySchema>;
  const result = await numbersService.queryNumbers(query);
  res.json({ success: true, data: result.items, pagination: result.pagination });
});
