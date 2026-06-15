import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import {
  sendSuccess,
  sendCreated,
  ApiError,
} from "../../../utils/responses.js";
import { ERROR_CODES } from "../../../utils/error-codes.js";
import * as paymentService from "../services/payment.service.js";

export const get_payments = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const filters = {
      invoice_id: req.query["invoice_id"] as string,
      status: req.query["status"] as string,
      payment_mode: req.query["payment_mode"] as string,
      from_date: req.query["from_date"] as string,
      to_date: req.query["to_date"] as string,
    };
    const limit = parseInt(req.query["limit"] as string) || 50;
    const offset = parseInt(req.query["offset"] as string) || 0;

    const result = await paymentService.getPayments(filters, { limit, offset });
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const get_invoices_id_payments = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const payments = await paymentService.getPaymentsForInvoice(
      req.params["id"] as string,
    );
    sendSuccess(res, payments);
  } catch (error) {
    next(error);
  }
};

export const post_payments_upload_proof = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const file = (req as unknown as AuthenticatedRequest & {
      file?: Express.Multer.File;
    }).file;

    if (!file) {
      throw new ApiError(ERROR_CODES.MISSING_REQUIRED_FIELD, "No file uploaded");
    }

    const uploaded = await paymentService.uploadPaymentProof(
      {
        fileBuffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
      },
      req.user.id,
    );

    sendCreated(res, uploaded);
  } catch (error) {
    next(error);
  }
};

export const post_invoices_id_payments = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const payment = await paymentService.recordPayment(
      { ...req.body, invoice_id: req.params["id"] },
      req.user.id,
    );
    sendCreated(res, payment);
  } catch (error) {
    next(error);
  }
};

export const put_payments_id = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const payment = await paymentService.updatePayment(
      req.params["id"] as string,
      req.body,
      req.user.id,
    );
    sendSuccess(res, payment);
  } catch (error) {
    next(error);
  }
};
