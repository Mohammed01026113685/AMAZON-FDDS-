import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

admin.initializeApp();
const db = admin.firestore();

// NOTE: Before deploying, set the config variables in your firebase project:
// firebase functions:config:set gmail.email="your_email@gmail.com" gmail.password="your_app_password"
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: functions.config().gmail?.email || process.env.SMTP_EMAIL,
    pass: functions.config().gmail?.password || process.env.SMTP_PASSWORD,
  },
});

export const sendDailyReport = functions.pubsub.schedule("0 22 * * *").timeZone("Asia/Riyadh").onRun(async (context) => {
  try {
    // 1. Fetch configured email addresses
    const settingsDoc = await db.collection("reps").doc("app_settings_v1").get();
    let emails: string[] = [];
    if (settingsDoc.exists) {
      emails = settingsDoc.data()?.reportEmails || [];
    }

    if (!emails || emails.length === 0) {
      console.log("No recipient emails configured in Settings. Aborting.");
      return null;
    }

    // 2. Fetch today's records
    const today = new Date();
    // Assuming records are saved with YYYY-MM-DD
    const dateStr = today.toISOString().split("T")[0]; 

    const historySnapshot = await db.collection("reps").where("date", "==", dateStr).get();
    
    if (historySnapshot.empty) {
      console.log(`No records found for today (${dateStr}).`);
    }

    let totalVolume = 0;
    let totalDelivered = 0;

    historySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.stationTotal) {
          totalVolume += (data.stationTotal.total || 0);
          totalDelivered += (data.stationTotal.delivered || 0);
      }
    });

    const successRate = totalVolume > 0 ? ((totalDelivered / totalVolume) * 100).toFixed(1) : 0;

    // 3. Create email content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #FF9900;">LogiTrack Daily Summary</h2>
        <p>Here is the automated daily summary for <strong>${dateStr}</strong>:</p>
        
        <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #ddd;">
          <h3 style="margin-top: 0;">Overall Performance</h3>
          <ul>
            <li><strong>Total Volume:</strong> ${totalVolume} shipments</li>
            <li><strong>Total Delivered:</strong> ${totalDelivered} shipments</li>
            <li><strong>Success Rate:</strong> ${successRate}%</li>
          </ul>
        </div>
        
        <p style="margin-top: 20px; font-size: 12px; color: #888;">
          This is an automated email from the LogiTrack Firebase Functions system.
        </p>
      </div>
    `;

    // 4. Send Email
    const mailOptions = {
      from: "LogiTrack System <noreply@logitrack.com>",
      to: emails.join(","),
      subject: `Daily Operations Report - ${dateStr}`,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Successfully sent daily report to ${emails.length} recipients.`);
    
    return null;
  } catch (error) {
    console.error("Error sending daily report email:", error);
    return null;
  }
});
