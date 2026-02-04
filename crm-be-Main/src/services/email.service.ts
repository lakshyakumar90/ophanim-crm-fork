import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { config } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { supabaseAdmin } from "../config/supabase.js";

// Create transporter
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
  }
  return transporter;
}

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

/**
 * Send email
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const transport = getTransporter();

    await transport.sendMail({
      from: options.from || config.email.from || config.email.user,
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    logger.info(
      { to: options.to, subject: options.subject },
      "Email sent successfully"
    );
    return true;
  } catch (error) {
    logger.error(
      { error, to: options.to, subject: options.subject },
      "Failed to send email"
    );
    return false;
  }
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(
  email: string,
  fullName: string,
  tempPassword?: string
): Promise<boolean> {
  const subject = "Welcome to CRM";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Welcome to CRM, ${fullName}!</h1>
      <p>Your account has been created successfully.</p>
      ${
        tempPassword
          ? `
        <p>Your temporary password is: <strong>${tempPassword}</strong></p>
        <p style="color: #e74c3c;">Please change your password after logging in.</p>
      `
          : ""
      }
      <p>You can login at: <a href="${config.frontend.url}/login">${
    config.frontend.url
  }/login</a></p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #888; font-size: 12px;">This is an automated message from CRM.</p>
    </div>
  `;

  return sendEmail({ to: email, subject, html });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
): Promise<boolean> {
  const resetUrl = `${config.frontend.url}/reset-password?token=${resetToken}`;
  const subject = "Password Reset Request";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Password Reset Request</h1>
      <p>We received a request to reset your password.</p>
      <p>Click the button below to reset your password:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
          Reset Password
        </a>
      </p>
      <p>Or copy and paste this link: ${resetUrl}</p>
      <p style="color: #e74c3c;">This link will expire in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #888; font-size: 12px;">This is an automated message from CRM.</p>
    </div>
  `;

  return sendEmail({ to: email, subject, html });
}

/**
 * Send lead assignment notification
 */
export async function sendLeadAssignmentEmail(
  email: string,
  assigneeName: string,
  leadName: string,
  assignedBy: string
): Promise<boolean> {
  const subject = `New Lead Assigned: ${leadName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">New Lead Assigned</h1>
      <p>Hi ${assigneeName},</p>
      <p>A new lead has been assigned to you by ${assignedBy}:</p>
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <strong>Lead Name:</strong> ${leadName}
      </div>
      <p>
        <a href="${config.frontend.url}/leads" style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
          View Lead
        </a>
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #888; font-size: 12px;">This is an automated message from CRM.</p>
    </div>
  `;

  return sendEmail({ to: email, subject, html });
}

/**
 * Send task assignment notification
 */
export async function sendTaskAssignmentEmail(
  email: string,
  assigneeName: string,
  taskTitle: string,
  assignedBy: string,
  dueDate?: string
): Promise<boolean> {
  const subject = `New Task Assigned: ${taskTitle}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">New Task Assigned</h1>
      <p>Hi ${assigneeName},</p>
      <p>A new task has been assigned to you by ${assignedBy}:</p>
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <strong>Task:</strong> ${taskTitle}<br/>
        ${
          dueDate
            ? `<strong>Due Date:</strong> ${new Date(
                dueDate
              ).toLocaleDateString()}`
            : ""
        }
      </div>
      <p>
        <a href="${
          config.frontend.url
        }/tasks" style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
          View Task
        </a>
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #888; font-size: 12px;">This is an automated message from CRM.</p>
    </div>
  `;

  return sendEmail({ to: email, subject, html });
}

/**
 * Get email templates
 */
export async function getEmailTemplates() {
  const { data, error } = await supabaseAdmin
    .from("email_templates")
    .select("*")
    .order("name");

  if (error) {
    return [];
  }

  return data || [];
}

/**
 * Get email template by name
 */
export async function getEmailTemplate(name: string) {
  const { data, error } = await supabaseAdmin
    .from("email_templates")
    .select("*")
    .eq("name", name)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Create email template
 */
export async function createEmailTemplate(input: {
  name: string;
  subject: string;
  body: string;
  variables?: string[];
  createdBy: string;
}) {
  const { data, error } = await supabaseAdmin
    .from("email_templates")
    .insert({
      name: input.name,
      subject: input.subject,
      body: input.body,
      variables: input.variables || [],
      created_by: input.createdBy,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Render template with variables
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  return rendered;
}

/**
 * Send email using template
 */
export async function sendTemplateEmail(
  templateName: string,
  to: string,
  variables: Record<string, string>
): Promise<boolean> {
  const template = await getEmailTemplate(templateName);
  if (!template) {
    logger.error({ templateName }, "Email template not found");
    return false;
  }

  const subject = renderTemplate(template.subject, variables);
  const html = renderTemplate(template.body, variables);

  return sendEmail({ to, subject, html });
}

/**
 * Send OTP email for email verification
 */
export async function sendOTPEmail(
  email: string,
  otp: string,
  fullName: string
): Promise<boolean> {
  const subject = "Verify Your Email - CRM Registration";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Email Verification</h1>
      <p>Hi ${fullName},</p>
      <p>Thank you for registering. Please use the following verification code to complete your registration:</p>
      <div style="background-color: #f9f9f9; padding: 20px; text-align: center; margin: 30px 0; border-radius: 8px;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #3498db;">${otp}</span>
      </div>
      <p style="color: #e74c3c;">This code will expire in 10 minutes.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #888; font-size: 12px;">This is an automated message from CRM.</p>
    </div>
  `;

  return sendEmail({ to: email, subject, html });
}

/**
 * Send registration pending confirmation email
 */
export async function sendRegistrationPendingEmail(
  email: string,
  fullName: string
): Promise<boolean> {
  const subject = "Registration Request Received - CRM";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Registration Request Received</h1>
      <p>Hi ${fullName},</p>
      <p>Your email has been verified and your registration request has been submitted.</p>
      <div style="background-color: #fef3cd; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #ffc107;">
        <strong>Status:</strong> Pending Admin Approval
      </div>
      <p>You will receive an email once an administrator reviews your request.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #888; font-size: 12px;">This is an automated message from CRM.</p>
    </div>
  `;

  return sendEmail({ to: email, subject, html });
}

/**
 * Send registration approved email with temporary password
 */
export async function sendRegistrationApprovedEmail(
  email: string,
  fullName: string,
  tempPassword: string
): Promise<boolean> {
  const subject = "Registration Approved - Welcome to CRM!";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #27ae60;">🎉 Registration Approved!</h1>
      <p>Hi ${fullName},</p>
      <p>Great news! Your registration has been approved. You can now access the CRM system.</p>
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Temporary Password:</strong> <code style="background: #eee; padding: 4px 8px; border-radius: 4px;">${tempPassword}</code></p>
      </div>
      <p style="color: #e74c3c;"><strong>Important:</strong> Please change your password after logging in.</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${config.frontend.url}/login" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
          Login Now
        </a>
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #888; font-size: 12px;">This is an automated message from CRM.</p>
    </div>
  `;

  return sendEmail({ to: email, subject, html });
}

/**
 * Send registration rejected email
 */
export async function sendRegistrationRejectedEmail(
  email: string,
  fullName: string,
  reason?: string
): Promise<boolean> {
  const subject = "Registration Request Update - CRM";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #e74c3c;">Registration Request Update</h1>
      <p>Hi ${fullName},</p>
      <p>We regret to inform you that your registration request for CRM has not been approved.</p>
      ${
        reason
          ? `
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <strong>Reason:</strong> ${reason}
        </div>
      `
          : ""
      }
      <p>If you believe this is an error or have any questions, please contact the administrator.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #888; font-size: 12px;">This is an automated message from CRM.</p>
    </div>
  `;

  return sendEmail({ to: email, subject, html });
}

/**
 * Send notification to admins about new registration request
 */
export async function sendNewRegistrationNotification(
  adminEmails: string[],
  requestDetails: {
    fullName: string;
    email: string;
    phone: string | null;
    roleRequested: string;
  }
): Promise<boolean> {
  const subject = `New Registration Request: ${requestDetails.fullName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">New Registration Request</h1>
      <p>A new user has requested access to the CRM system.</p>
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Name:</strong> ${requestDetails.fullName}</p>
        <p><strong>Email:</strong> ${requestDetails.email}</p>
        <p><strong>Phone:</strong> ${requestDetails.phone || "Not provided"}</p>
        <p><strong>Requested Role:</strong> ${requestDetails.roleRequested}</p>
      </div>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${
          config.frontend.url
        }/registrations" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
          Review Request
        </a>
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #888; font-size: 12px;">This is an automated message from CRM.</p>
    </div>
  `;

  return sendEmail({ to: adminEmails, subject, html });
}
