-- Notification Preferences Table
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email_enabled BOOLEAN DEFAULT true,
  email_expense_created BOOLEAN DEFAULT true,
  email_task_assigned BOOLEAN DEFAULT true,
  email_settlement_recorded BOOLEAN DEFAULT true,
  email_invite_received BOOLEAN DEFAULT true,
  email_daily_summary BOOLEAN DEFAULT false,
  email_weekly_summary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own preferences
CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to create default preferences on user signup
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create preferences on user creation
CREATE TRIGGER on_auth_user_created_notification_prefs
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Comments
COMMENT ON TABLE notification_preferences IS 'User email notification preferences';
COMMENT ON COLUMN notification_preferences.email_enabled IS 'Master toggle for all email notifications';
COMMENT ON COLUMN notification_preferences.email_expense_created IS 'Notify when new expense is created in user groups';
COMMENT ON COLUMN notification_preferences.email_task_assigned IS 'Notify when task is assigned to user';
COMMENT ON COLUMN notification_preferences.email_settlement_recorded IS 'Notify when payment is marked as settled';
COMMENT ON COLUMN notification_preferences.email_invite_received IS 'Notify when invited to a group';
COMMENT ON COLUMN notification_preferences.email_daily_summary IS 'Daily summary of activity';
COMMENT ON COLUMN notification_preferences.email_weekly_summary IS 'Weekly summary of expenses and balances';
