'use strict';

const nodemailer = require('nodemailer');

// ── Transporter ──────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return 'Not set';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

function fmtDuration(min) {
  if (!min) return '—';
  const h = Math.floor(min / 60), m = min % 60;
  if (h === 0) return `${m} minute${m !== 1 ? 's' : ''}`;
  if (m === 0) return `${h} hour${h !== 1 ? 's' : ''}`;
  return `${h} hr ${m} min`;
}

// ── Email template ───────────────────────────────────────────────────────────

function buildExamEmail({ student, exam, teacherName }) {
  const statusLabel = exam.status === 'live' ? '🔴 Live Now' : '🗓 Scheduled';
  const startInfo =
    exam.status === 'live'
      ? '<strong>The exam is LIVE — you can join right now!</strong>'
      : `Starts at: <strong>${fmtDate(exam.scheduledStart)}</strong>`;

  const rulesHtml =
    Array.isArray(exam.rules) && exam.rules.length > 0
      ? `<ul style="margin:0;padding-left:20px;color:#475569;">${exam.rules.map((r) => `<li style="margin:4px 0">${r}</li>`).join('')}</ul>`
      : '<p style="color:#94a3b8;margin:0">No specific rules listed.</p>';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Exam Notification – ExamForge</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:36px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:12px;padding:10px 16px;">
                      <span style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">⚡ ExamForge</span>
                    </div>
                    <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:20px 0 4px;letter-spacing:-0.5px;">You've been assigned an exam!</h1>
                    <p style="color:rgba(255,255,255,0.75);margin:0;font-size:15px;">Hello <strong style="color:#fff">${student.name}</strong>, your teacher has assigned a new exam to you.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Status badge row -->
          <tr>
            <td style="padding:28px 40px 0;">
              <span style="display:inline-block;padding:6px 16px;border-radius:100px;font-size:13px;font-weight:700;background:${exam.status === "live" ? "#fef2f2" : "#eff6ff"};color:${exam.status === "live" ? "#dc2626" : "#2563eb"};border:1px solid ${exam.status === "live" ? "#fecaca" : "#bfdbfe"};">${statusLabel}</span>
            </td>
          </tr>

          <!-- Exam title & description -->
          <tr>
            <td style="padding:20px 40px 0;">
              <h2 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 8px;">${exam.title}</h2>
              ${exam.description ? `<p style="font-size:15px;color:#64748b;margin:0;line-height:1.6;">${exam.description}</p>` : ""}
            </td>
          </tr>

          <!-- Details grid -->
          <tr>
            <td style="padding:24px 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
                <tr style="background:#f8fafc;">
                  <td style="padding:14px 20px;border-bottom:1px solid #e2e8f0;">
                    <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;">Duration</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#1e293b;">⏱ ${fmtDuration(exam.duration)}</p>
                  </td>
                  <td style="padding:14px 20px;border-bottom:1px solid #e2e8f0;border-left:1px solid #e2e8f0;">
                    <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;">Total Marks</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#1e293b;">🏆 ${exam.totalMarks || "—"}</p>
                  </td>
                </tr>
                <tr style="background:#ffffff;">
                  <td colspan="2" style="padding:14px 20px;">
                    <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;">Schedule</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#1e293b;">📅 ${startInfo}</p>
                  </td>
                </tr>
                ${
                  exam.status === "scheduled" && exam.latestJoinTime
                    ? `
                <tr style="background:#fffbeb;">
                  <td colspan="2" style="padding:14px 20px;border-top:1px solid #fde68a;">
                    <p style="margin:0;font-size:11px;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:0.08em;">⚠ Enroll By (Last Join Time)</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#b45309;">${fmtDate(exam.latestJoinTime)}</p>
                    <p style="margin:4px 0 0;font-size:12px;color:#d97706;">You must join the exam before this deadline.</p>
                  </td>
                </tr>`
                    : ""
                }
                ${
                  exam.accessCode
                    ? `
                <tr style="background:#f8fafc;">
                  <td colspan="2" style="padding:14px 20px;border-top:1px solid #e2e8f0;">
                    <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;">Access Code</p>
                    <div style="margin:8px 0 0;">
                      <span style="font-size:28px;font-weight:900;letter-spacing:0.25em;color:#4f46e5;font-family:monospace;vertical-align:middle;display:inline-block;padding-right:12px;">${exam.accessCode}</span>
                      <a href="#" onclick="navigator.clipboard.writeText('${exam.accessCode}'); alert('Code copied!'); return false;" style="display:inline-block;vertical-align:middle;background:#e0e7ff;color:#4f46e5;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:700;text-decoration:none;border:1px solid #c7d2fe;" title="Copy to clipboard">📋 Copy</a>
                    </div>
                    <p style="margin:8px 0 0;font-size:12px;color:#94a3b8;">Use this code to join the exam on ExamForge.</p>
                  </td>
                </tr>`
                    : ""
                }
              </table>
            </td>
          </tr>

          <!-- Rules -->
          <tr>
            <td style="padding:24px 40px 0;">
              <p style="font-size:13px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 10px;">📋 Exam Rules</p>
              ${rulesHtml}
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 16px;font-size:14px;color:#64748b;">Log in to your ExamForge account to view the full exam details and prepare accordingly.</p>
              <a href="${process.env.CLIENT_URL || "http://localhost:5173/student/login"}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:12px;font-size:15px;font-weight:700;letter-spacing:-0.2px;">Open ExamForge →</a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">This email was sent by <strong style="color:#64748b;">ExamForge</strong> on behalf of <strong style="color:#64748b;">${teacherName || "your teacher"}</strong>. Please do not reply to this email.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Hello ${student.name},

You have been assigned a new exam on ExamForge.

Exam: ${exam.title}
Status: ${statusLabel}
Duration: ${fmtDuration(exam.duration)}
Total Marks: ${exam.totalMarks || '—'}
${exam.status === 'live' ? 'The exam is LIVE — join now!' : `Starts at: ${fmtDate(exam.scheduledStart)}`}
${exam.status === 'scheduled' && exam.latestJoinTime ? `Enroll By (Last Join Time): ${fmtDate(exam.latestJoinTime)}` : ''}
${exam.accessCode ? `Access Code: ${exam.accessCode}` : ''}

Log in at ${process.env.CLIENT_URL || 'http://localhost:5173'} to view full details.

– ExamForge (sent by ${teacherName || 'your teacher'})
  `.trim();

  return { html, text };
}


async function sendExamNotifications({ exam, students, teacherName }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[mailer] SMTP_USER / SMTP_PASS not set — skipping email notifications.');
    return;
  }

  const results = await Promise.allSettled(
    students
      .filter((s) => s.email)
      .map((student) => {
        const { html, text } = buildExamEmail({ student, exam, teacherName });
        return transporter.sendMail({
          from: `"ExamForge" <${process.env.SMTP_USER}>`,
          to: student.email,
          subject: `📝 New Exam Assigned: ${exam.title}`,
          text,
          html,
        });
      })
  );

  const sent    = results.filter((r) => r.status === 'fulfilled').length;
  const failed  = results.filter((r) => r.status === 'rejected');

  console.log(`[mailer] Sent ${sent}/${students.length} exam notification(s).`);
  failed.forEach((f, i) => console.error(`[mailer] Failed to send to student ${i}:`, f.reason?.message));
}

module.exports = { sendExamNotifications };
