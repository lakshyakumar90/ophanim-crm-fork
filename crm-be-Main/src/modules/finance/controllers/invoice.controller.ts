import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
} from "../../../utils/responses.js";
import * as invoiceService from "../services/invoice.service.js";
import {
  buildInvoicePreviewHtml,
  generateInvoicePdfBuffer,
} from "../services/invoice-pdf.service.js";

export const get_invoices = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const filters = {
      status: req.query["status"] as string,
      lead_id: req.query["lead_id"] as string,
      created_by: req.query["created_by"] as string,
      department_id: req.query["department_id"] as string,
      from_date: req.query["from_date"] as string,
      to_date: req.query["to_date"] as string,
      search: req.query["search"] as string,
    };
    const limit = parseInt(req.query["limit"] as string) || 50;
    const offset = parseInt(req.query["offset"] as string) || 0;

    const result = await invoiceService.getInvoices(
      req.user.id,
      req.user.role,
      req.user.departmentId,
      filters,
      { limit, offset },
    );

    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const get_invoices_id = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const invoice = await invoiceService.getInvoiceById(
      req.params["id"] as string,
    );
    sendSuccess(res, invoice);
  } catch (error) {
    next(error);
  }
};

export const get_invoices_id_preview = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const invoice = await invoiceService.getInvoiceById(
      req.params["id"] as string,
    );

    const html = await buildInvoicePreviewHtml(invoice);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (error) {
    next(error);
  }
};

export const get_invoices_id_pdf = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const invoice = await invoiceService.getInvoiceById(
      req.params["id"] as string,
    );
    const pdfBuffer = await generateInvoicePdfBuffer(invoice);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${invoice.invoice_number}.pdf"`,
    );
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

export const post_invoices = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const invoice = await invoiceService.createInvoice(
      req.body,
      req.user.id,
    );
    sendCreated(res, invoice);
  } catch (error) {
    next(error);
  }
};

export const put_invoices_id = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const invoice = await invoiceService.updateInvoice(
      req.params["id"] as string,
      req.body,
      req.user.id,
    );
    sendSuccess(res, invoice);
  } catch (error) {
    next(error);
  }
};

export const delete_invoices_id = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    await invoiceService.deleteInvoice(req.params["id"] as string);
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
};

export const post_invoices_id_submit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const invoice = await invoiceService.submitInvoiceForApproval(
      req.params["id"] as string,
      req.user.id,
    );
    sendSuccess(res, invoice);
  } catch (error) {
    next(error);
  }
};

export const post_invoices_id_approve = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const invoice = await invoiceService.approveInvoice(
      req.params["id"] as string,
      req.user.id,
    );
    sendSuccess(res, invoice);
  } catch (error) {
    next(error);
  }
};

export const post_invoices_id_reject = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const invoice = await invoiceService.rejectInvoice(
      req.params["id"] as string,
      req.user.id,
      req.body.reason,
    );
    sendSuccess(res, invoice);
  } catch (error) {
    next(error);
  }
};

export const post_invoices_id_cancel = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const invoice = await invoiceService.cancelInvoice(
      req.params["id"] as string,
      req.user.id,
    );
    sendSuccess(res, invoice);
  } catch (error) {
    next(error);
  }
};

export const post_invoices_id_mark_sent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const invoice = await invoiceService.markInvoiceSent(
      req.params["id"] as string,
    );
    sendSuccess(res, invoice);
  } catch (error) {
    next(error);
  }
};
