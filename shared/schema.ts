import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  timestamp,
  date,
  jsonb,
  integer,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  fullName: text("full_name"),
  phone: text("phone"),
  dob: date("dob"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
  kycStatus: text("kyc_status").default("Not Submitted"),
  referralCode: text("referral_code"),
  referrerId: uuid("referrer_id"),
  role: text("role").default("user"),
  bankName: text("bank_name"),
  bankAccountHolderName: text("bank_account_holder_name"),
  bankAccountNumber: text("bank_account_number"),
  bankIfscCode: text("bank_ifsc_code"),
  memberId: text("member_id"),
  panNumber: text("pan_number"),
  aadhaarNumber: text("aadhaar_number"),
  bloodGroup: text("blood_group"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const wallets = pgTable("wallets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().unique(),
  balance: numeric("balance", { precision: 12, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const investmentPlans = pgTable("investment_plans", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  minAmount: numeric("min_amount", { precision: 12, scale: 2 }).notNull(),
  maxAmount: numeric("max_amount", { precision: 12, scale: 2 }),
  annualRate: numeric("annual_rate", { precision: 5, scale: 2 }).notNull(),
  durationMonths: integer("duration_months").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const userInvestments = pgTable("user_investments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  planId: uuid("plan_id").notNull(),
  investmentAmount: numeric("investment_amount", { precision: 12, scale: 2 }).notNull(),
  startDate: date("start_date").notNull(),
  maturityDate: date("maturity_date").notNull(),
  status: text("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const withdrawalRequests = pgTable("withdrawal_requests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  amount: numeric("amount").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("Pending"),
  details: jsonb("details"),
  adminNotes: text("admin_notes"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: uuid("reviewed_by"),
});

export const depositRequests = pgTable("deposit_requests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  amount: numeric("amount").notNull(),
  referenceId: text("reference_id").notNull(),
  screenshotPath: text("screenshot_path"),
  status: text("status").notNull().default("Pending"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow(),
  adminNotes: text("admin_notes"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: uuid("reviewed_by"),
});

export const investmentCancellationRequests = pgTable("investment_cancellation_requests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  investmentId: uuid("investment_id").notNull(),
  cancellationAmount: numeric("cancellation_amount").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("Pending"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: uuid("reviewed_by"),
  adminNotes: text("admin_notes"),
});

export const payoutLog = pgTable("payout_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  investmentId: uuid("investment_id").notNull(),
  payoutMonth: date("payout_month").notNull(),
  status: text("status").notNull().default("Pending"),
  paidAmount: numeric("paid_amount"),
  paymentDate: timestamp("payment_date", { withTimezone: true }),
  paymentMode: text("payment_mode"),
  remarks: text("remarks"),
  processedBy: uuid("processed_by"),
  processedAt: timestamp("processed_at", { withTimezone: true }).defaultNow(),
});

export const nominees = pgTable("nominees", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  fullName: text("full_name").notNull(),
  relationship: text("relationship").notNull(),
  dob: date("dob"),
  bloodGroup: text("blood_group"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const kycDocuments = pgTable("kyc_documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  documentType: text("document_type"),
  documentPath: text("document_path"),
  status: text("status").default("Pending"),
  adminNotes: text("admin_notes"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: uuid("reviewed_by"),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type"),
  linkTo: text("link_to"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  type: text("type").notNull(),
  amount: numeric("amount").notNull(),
  description: text("description"),
  status: text("status").default("Completed"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const commissionRules = pgTable("commission_rules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  level: integer("level").notNull(),
  rate: numeric("rate", { precision: 5, scale: 2 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const commissionPayouts = pgTable("commission_payouts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  sourceUserId: uuid("source_user_id"),
  investmentId: uuid("investment_id"),
  amount: numeric("amount").notNull(),
  level: integer("level"),
  status: text("status").default("Pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const systemSettings = pgTable("system_settings", {
  id: integer("id").primaryKey().default(1),
  maintenanceMode: boolean("maintenance_mode").default(false),
  maintenanceMessage: text("maintenance_message"),
  companyName: text("company_name"),
  companyAddress: text("company_address"),
  companyPhone: text("company_phone"),
  companyEmail: text("company_email"),
  companyBankName: text("company_bank_name"),
  companyBankAccount: text("company_bank_account"),
  companyBankIfsc: text("company_bank_ifsc"),
  companyUpiId: text("company_upi_id"),
  loginLogoPath: text("login_logo_path"),
  agreementTemplateText: text("agreement_template_text"),
  agreementFirstPartyName: text("agreement_first_party_name"),
  agreementStampPath: text("agreement_stamp_path"),
  agreementCompanySignaturePath: text("agreement_company_signature_path"),
  agreementPdfTemplate: jsonb("agreement_pdf_template"),
  agreementPdfFieldMap: jsonb("agreement_pdf_field_map"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const investmentAgreements = pgTable("investment_agreements", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  investmentId: uuid("investment_id").notNull(),
  status: text("status").default("Pending"),
  userPdfPath: text("user_pdf_path"),
  referenceNumber: text("reference_number"),
  documentHash: text("document_hash"),
  filledFields: jsonb("filled_fields"),
  adminFinalizedAt: timestamp("admin_finalized_at", { withTimezone: true }),
  adminFinalizedBy: uuid("admin_finalized_by"),
  adminPdfPath: text("admin_pdf_path"),
  verificationToken: text("verification_token"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const agreementPublicViews = pgTable("agreement_public_views", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(),
  agreementId: uuid("agreement_id").notNull(),
  userId: uuid("user_id").notNull(),
  investmentId: uuid("investment_id").notNull(),
  memberName: text("member_name"),
  memberId: text("member_id"),
  investmentAmount: numeric("investment_amount"),
  planName: text("plan_name"),
  startDate: date("start_date"),
  maturityDate: date("maturity_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const userNotes = pgTable("user_notes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  adminId: uuid("admin_id").notNull(),
  adminEmail: text("admin_email"),
  note: text("note").notNull(),
  isVisibleToUser: boolean("is_visible_to_user").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const adminAuditLog = pgTable("admin_audit_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: uuid("admin_id").notNull(),
  adminEmail: text("admin_email"),
  action: text("action").notNull(),
  targetUserId: uuid("target_user_id"),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const faqs = pgTable("faqs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const supportTickets = pgTable("support_tickets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  subject: text("subject").notNull(),
  status: text("status").notNull().default("Open"),
  priority: text("priority").default("Normal"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const supportMessages = pgTable("support_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: uuid("ticket_id").notNull(),
  userId: uuid("user_id").notNull(),
  message: text("message").notNull(),
  isAdminReply: boolean("is_admin_reply").notNull().default(false),
  attachmentPath: text("attachment_path"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const investmentRequests = pgTable("investment_requests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  planId: uuid("plan_id").notNull(),
  amount: numeric("amount").notNull(),
  screenshotPath: text("screenshot_path"),
  referenceId: text("reference_id"),
  status: text("status").notNull().default("Pending"),
  adminNotes: text("admin_notes"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: uuid("reviewed_by"),
});
