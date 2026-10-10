export interface NotifPreferences {
  emailBookings: boolean;
  emailReminders: boolean;
  emailMessages: boolean;
  emailReviews: boolean;
  emailPayouts: boolean;
  emailReferrals: boolean;
  inAppBookings: boolean;
  inAppReminders: boolean;
  inAppMessages: boolean;
  inAppReviews: boolean;
  inAppReferrals: boolean;
}

export const DEFAULT_PREFS: NotifPreferences = {
  emailBookings: true,
  emailReminders: true,
  emailMessages: true,
  emailReviews: true,
  emailPayouts: true,
  emailReferrals: true,
  inAppBookings: true,
  inAppReminders: true,
  inAppMessages: true,
  inAppReviews: true,
  inAppReferrals: true,
};
