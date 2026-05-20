import { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";
import { IMessage } from "react-native-gifted-chat";

export interface Estate {
  id: string;
  name: string;
  estate_code: string;
  address: string;
  created_at: string | null;
  city: string | null;
  state: string;
  lga: string;
  town: string | null;
  kyc_selection: KYCSelection;
}

export interface Apartment {
  id: string;
  unitNumber: string;
  residentName: string;
  status: "Occupied" | "Vacant" | "Under Maintenance";
  type: "Tenant" | "Owner";
  walletBalance: number;
}

export interface EstateProfile {
  id: string;
  name: string;
  address: string;
  state: string;
  lga: string;
  town: string;
}

export interface LocationPair {
  block: string;
  unit: string[]; // Dynamic string array for multi-unit selection
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  isTemp: boolean;
  created_at: string | null;
  biometric_login: boolean;
  password_changed: boolean;
  role: "TENANT" | "SECURITY" | "ADMIN" | "SUPER_ADMIN";

  rejection_message?: {
    type: "decline" | "block";
    estate: string;
    message: string;
  } | null;

  estate_ids: string[];

  locations: {
    [estateId: string]: LocationPair[];
  };

  estates: EstateProfile[];
  sub_users: string[];

  wallet_balance?: string | number;
  avatar?: string | null;
  id_type?: string;
  id_front_url?: string;
  id_back_url?: string;
  utility_bill_url?: string;
  showWelcome?: boolean;
  chatToken?: string;
  push_token?: string;
  last_notification_read_at: string;
}

export interface KYCSelection {
  selfie: boolean;
  rent_contract: boolean;
  ids: boolean;
  utility_bill: boolean;
}

export interface tempNotification {
  from: string;
  type: string;
  message: string;
  reason: string;
}

export interface notification {
  id: string;
  estate_id: number;
  user_id: number | null;
  recipient_role: "tenant" | "security" | "admin";
  title: string;
  message: string;
  type: "general" | "emergency" | "entry" | "invite" | "announcement";
  created_at: string;
  is_deleted: boolean;
}

export interface FetchNotificationsResponse {
  success: boolean;
  list: notification[];
  lastReadAt: string;
}

export interface GroupMember {
  user_id: string;
  clearedAt: FirebaseFirestoreTypes.Timestamp | null;
}

export interface ChatGroup {
  _id: string; // Firestore doc ID
  id?: string;
  name: string;
  members: GroupMember[];
  admins: string[];
  mutedBy: string[];
  isGroup: true;
  avatar?: string | null;
  createdBy?: string;
  createdAt?: any;
}

export interface ChatRoom {
  id: string;
  lastMessageAt?: any;
  lastSenderId?: string;
  [key: string]: any;
}


export interface IFileMessage extends IMessage {
  file?: {
    url: string;
    name: string;
    type: string;
  };
  pending?: boolean;
  isDeleted?: boolean;
}

export interface Post {
  id: string;
  estate_id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  title: string;
  content: string;
  category: string;
  image_url?: string;
  thumbnail_url?: string;
  likes_count: number;
  comments_count: number;
  has_liked: boolean;
  created_at: string;
}

export interface Comment {
  id: number;
  post_id: number;
  user_id: string;
  user_type: string;
  author_name: string;
  content: string;
  created_at: string;
}

export interface Like {
  user_id: string;
  author_name: string;
  created_at: string;
}

export interface Invitation {
  id: string;
  guest_name: string;
  guest_image_url: string | null;
  access_code: string;
  invite_type: "one_time" | "multi_entry" | "staff_entry";
  start_date: any;
  end_date: any;
  start_time: any;
  end_time: any;
  excluded_dates: string[];
  status: string;
  actual_checkin: any;
  actual_checkout: any;
  actual_checkin_date: any;
  actual_checkout_date: any;
  created_at: string;
  is_cancelled: boolean;
  estate_id: string;
  staff_position?: string;
  permitted_days: number[];
  is_activated?: boolean;
}

export type ReportType = "GENERAL" | "SECURITY" | "PAYMENT";
export type ReportCategory = "COMPLAINT" | "INFORMATION" | "EMERGENCY";
export type ReportStatus = "PENDING" | "REVIEWED" | "RESOLVED";

export interface EstateReport {
  id: string;
  estate_id: string;
  reporter_id: string;
  reporter_name?: string; // From the JOIN
  type: ReportType;
  category: ReportCategory;
  target_security_ids: string[];
  subject: string;
  description: string;
  status: ReportStatus;
  admin_response: string;
  created_at: string;
}

export interface SubmitReportPayload {
  type: ReportType;
  category: ReportCategory;
  target_security_ids?: string[];
  subject: string;
  payment_id?: string;
  description: string;
  estate_id: string;
}

export interface Guard {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  is_on_duty: boolean;
  check_in_location?: string;
  last_known_location?: string;
}

export type PaymentMode = "manual" | "api";

export interface PaymentSettingsResponse {
  success: boolean;
  data?: {
    payment_type: PaymentMode;
    details: {
      bank_name?: string;
      bank_account_number?: string;
      bank_account_name?: string;
      external_api_url?: string;
    };
  };
  error?: string;
}

export interface UtilityPaymentInfo {
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  external_api_url?: string;
}

export interface PaymentLog {
  id: string;
  amount: number;
  category: string; // Payment For (Electricity, etc.)
  transaction_reference: string; // The Bank's Session ID / Ref
  receipt_url: string;
  payment_date: string;
  payment_type: string;
  notes?: string;
  status: "pending" | "verified" | "rejected";
  created_at: string;
  resident_name: string;
}

export interface EmergencyContact {
  id: number;
  name: string;
  phone: string; // Matches your saved data key
}

/**
 * Represents the main Event structure from the estate_events table.
 */
export interface EstateEvent {
  id: string;
  estate_id: string;
  organizer_id: string | null;
  title: string;
  description: string | null;

  // Date and Time (Postgres formats)
  start_date: string; // ISO Date string (YYYY-MM-DD)
  end_date: string;
  start_time: string; // HH:mm:ss
  end_time: string;

  venue_detail: string | null;
  registered_guests: number;
  expected_guests: number;
  banner_url: string | null;

  // Financial & Security
  is_paid: boolean;
  ticket_price: string; // Decimal comes as string from Postgres
  subaccount_id: string | null;
  ref_code: string;

  is_approved: boolean;
  is_rejected: boolean;

  created_at: string;
}

/**
 * Represents a Guest registration for a specific event.
 */
export interface EventRegistration {
  id: string;
  event_id: string;
  guest_name: string;
  guest_email: string | null;
  guest_code: string; // The "GUEST-XXXX" code for the gate guard
  status: "registered" | "checked_in";
  checked_in_at: string | null;
  created_at: string;
}

/**
 * Data required to create a new event (Frontend Form State)
 */
export interface CreateEventRequest {
  title: string;
  banner_url: string;
  description?: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  venue_detail?: string;
  expected_guests: number;
  registered_guests?: number;
  is_paid: boolean;
  ticket_price?: number;
  bank_code: string;
  bank_name?: string; // Temporary fields used for subaccount creation
  account_number?: string;
}

/**
 * Data required for a guest to RSVP
 */
export interface RSVPRequest {
  event_id: string;
  guest_name: string;
  guest_email: string;
}

/**
 * Response from the RSVP API
 */
export interface RSVPResponse {
  message: string;
  guest_code?: string; // Returned immediately if FREE
  paymentLink?: string; // Returned if PAID (Paystack checkout)
}

export interface ResidentDashboardResponse {
  success: boolean;
  stats: {
    invitations: {
      total_expected: number;
      checked_in: number;
      checked_out: number;
      overstayed: number;
    };
    events: {
      title: string;
      start_date: string; // YYYY-MM-DD
    }[];
    feed: {
      unread_posts: number;
      likes_on_my_posts: number;
      comments_on_my_posts: number;
    };
  };
}

export interface DashboardStats {
  invitations: {
    total_expected: number;
    checked_in: number;
    checked_out: number;
    overstayed: number;
  };
  events: {
    title: string;
    start_date: string;
  }[];
  feed: {
    unread_posts: number;
    likes_on_my_posts: number;
    comments_on_my_posts: number;
  };
}
