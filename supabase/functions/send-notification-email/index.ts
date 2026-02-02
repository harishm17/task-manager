/**
 * Send Notification Email Edge Function
 *
 * Sends email notifications for various events:
 * - Expense created
 * - Task assigned
 * - Settlement recorded
 * - Invite received
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface NotificationData {
  type: 'expense_created' | 'task_assigned' | 'settlement_recorded' | 'invite_received';
  recipientEmail: string;
  recipientName: string;
  data: {
    groupName?: string;
    expenseDescription?: string;
    expenseAmount?: number;
    expensePaidBy?: string;
    taskTitle?: string;
    taskDueDate?: string;
    settlementAmount?: number;
    settlementWith?: string;
    inviteCode?: string;
    invitedBy?: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse notification data
    const notificationData: NotificationData = await req.json();

    // Build email content based on notification type
    const emailPayload = buildEmailPayload(notificationData);

    // Send email (using SendGrid, Resend, or similar)
    await sendEmail(emailPayload);

    console.log(`Email sent to ${notificationData.recipientEmail} for ${notificationData.type}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error sending email:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function buildEmailPayload(data: NotificationData): EmailPayload {
  const { type, recipientEmail, recipientName } = data;
  let subject = '';
  let html = '';
  let text = '';

  const baseStyle = `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
      .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; }
      .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
      .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 20px; }
    </style>
  `;

  switch (type) {
    case 'expense_created':
      subject = `New expense in ${data.data.groupName}`;
      html = `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h1>💰 New Expense</h1>
          </div>
          <div class="content">
            <p>Hi ${recipientName},</p>
            <p><strong>${data.data.expensePaidBy}</strong> added a new expense in <strong>${data.data.groupName}</strong>:</p>
            <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
              <p style="margin: 5px 0;"><strong>${data.data.expenseDescription}</strong></p>
              <p style="margin: 5px 0; color: #2563eb; font-size: 20px; font-weight: bold;">$${(data.data.expenseAmount! / 100).toFixed(2)}</p>
            </div>
            <p>Check your balance to see if you owe anything.</p>
            <a href="https://divvydo.app/expenses" class="button">View Expense</a>
          </div>
          <div class="footer">
            <p>DivvyDo - Split bills with roommates</p>
            <p><a href="https://divvydo.app/settings">Notification settings</a></p>
          </div>
        </div>
      `;
      text = `New expense in ${data.data.groupName}: ${data.data.expenseDescription} - $${(data.data.expenseAmount! / 100).toFixed(2)} paid by ${data.data.expensePaidBy}`;
      break;

    case 'task_assigned':
      subject = `Task assigned to you: ${data.data.taskTitle}`;
      html = `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h1>✅ New Task</h1>
          </div>
          <div class="content">
            <p>Hi ${recipientName},</p>
            <p>A task has been assigned to you in <strong>${data.data.groupName}</strong>:</p>
            <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
              <p style="margin: 5px 0;"><strong>${data.data.taskTitle}</strong></p>
              ${data.data.taskDueDate ? `<p style="margin: 5px 0; color: #64748b;">Due: ${new Date(data.data.taskDueDate).toLocaleDateString()}</p>` : ''}
            </div>
            <a href="https://divvydo.app/tasks" class="button">View Task</a>
          </div>
          <div class="footer">
            <p>DivvyDo - Manage household tasks</p>
            <p><a href="https://divvydo.app/settings">Notification settings</a></p>
          </div>
        </div>
      `;
      text = `Task assigned: ${data.data.taskTitle}${data.data.taskDueDate ? ` - Due: ${new Date(data.data.taskDueDate).toLocaleDateString()}` : ''}`;
      break;

    case 'settlement_recorded':
      subject = `Payment recorded: $${(data.data.settlementAmount! / 100).toFixed(2)}`;
      html = `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h1>💸 Payment Recorded</h1>
          </div>
          <div class="content">
            <p>Hi ${recipientName},</p>
            <p><strong>${data.data.settlementWith}</strong> marked a payment as settled:</p>
            <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
              <p style="margin: 5px 0; color: #10b981; font-size: 20px; font-weight: bold;">$${(data.data.settlementAmount! / 100).toFixed(2)}</p>
              <p style="margin: 5px 0; color: #64748b;">Settled</p>
            </div>
            <p>Your balance has been updated.</p>
            <a href="https://divvydo.app/balances" class="button">View Balances</a>
          </div>
          <div class="footer">
            <p>DivvyDo - Track balances</p>
            <p><a href="https://divvydo.app/settings">Notification settings</a></p>
          </div>
        </div>
      `;
      text = `Payment recorded: ${data.data.settlementWith} settled $${(data.data.settlementAmount! / 100).toFixed(2)}`;
      break;

    case 'invite_received':
      subject = `${data.data.invitedBy} invited you to ${data.data.groupName}`;
      html = `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h1>🏠 Group Invite</h1>
          </div>
          <div class="content">
            <p>Hi ${recipientName},</p>
            <p><strong>${data.data.invitedBy}</strong> invited you to join <strong>${data.data.groupName}</strong> on DivvyDo.</p>
            <p>DivvyDo helps roommates split bills and manage household tasks together.</p>
            <a href="https://divvydo.app/invite/${data.data.inviteCode}" class="button">Accept Invite</a>
            <p style="color: #64748b; font-size: 14px;">Or copy this link: https://divvydo.app/invite/${data.data.inviteCode}</p>
          </div>
          <div class="footer">
            <p>DivvyDo - Split bills with roommates</p>
          </div>
        </div>
      `;
      text = `${data.data.invitedBy} invited you to ${data.data.groupName} on DivvyDo. Accept at: https://divvydo.app/invite/${data.data.inviteCode}`;
      break;
  }

  return { to: recipientEmail, subject, html, text };
}

async function sendEmail(payload: EmailPayload): Promise<void> {
  // In production, use a real email service
  // Example with Resend:
  // const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  // const response = await fetch('https://api.resend.com/emails', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${RESEND_API_KEY}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     from: 'DivvyDo <notifications@divvydo.app>',
  //     to: payload.to,
  //     subject: payload.subject,
  //     html: payload.html,
  //     text: payload.text,
  //   }),
  // });

  // For now, just log (in production, this would actually send)
  console.log('Would send email:', {
    to: payload.to,
    subject: payload.subject,
    bodyLength: payload.html.length,
  });

  // Simulate delay
  await new Promise((resolve) => setTimeout(resolve, 100));
}
