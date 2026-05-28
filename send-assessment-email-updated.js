// api/send-assessment-email.js
// Deploy this as a serverless function (Vercel/Netlify)
// Install: npm install resend

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { respondentEmail, respondentName, salesRepEmail, assessmentData } = req.body;

    // Validation
    if (!respondentEmail || !respondentName || !assessmentData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Build email HTML for respondent (personalized)
    const respondentEmailHTML = buildRespondentEmail(respondentName, assessmentData);

    // Build email HTML for sales rep (summary + lead info)
    const salesRepEmailHTML = buildSalesRepEmail(respondentName, respondentEmail, assessmentData);

    // Send email to RESPONDENT
    const respondentResult = await resend.emails.send({
      from: 'ED3 Assessment <noreply@ed3-assessment.ifs.com>',
      to: respondentEmail,
      subject: `Your ED3 Readiness Assessment Results - ${assessmentData.stage.stage}`,
      html: respondentEmailHTML,
    });

    if (respondentResult.error) {
      throw new Error(`Failed to send respondent email: ${respondentResult.error.message}`);
    }

    // Send email to SALES REP
    const salesRepResult = await resend.emails.send({
      from: 'ED3 Assessment <noreply@ed3-assessment.ifs.com>',
      to: salesRepEmail,
      subject: `New ED3 Assessment: ${respondentName} - ${assessmentData.stage.stage}`,
      html: salesRepEmailHTML,
    });

    if (salesRepResult.error) {
      throw new Error(`Failed to send sales rep email: ${salesRepResult.error.message}`);
    }

    res.status(200).json({
      success: true,
      message: 'Emails sent successfully to both recipient and sales team',
      respondentEmailId: respondentResult.data.id,
      salesRepEmailId: salesRepResult.data.id
    });

  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({
      error: 'Failed to send email',
      message: error.message
    });
  }
}

// EMAIL 1: For the respondent (detailed, personalized)
function buildRespondentEmail(name, data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #333; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1a0d2e 0%, #2d1b4e 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 1.8em; }
            .score-box { background: white; padding: 30px; border-radius: 8px; text-align: center; margin: 20px 0; }
            .score { font-size: 3.5em; font-weight: bold; color: #8427E2; margin: 15px 0; }
            .badge { display: inline-block; background: linear-gradient(135deg, #8427E2, #CD92FF); color: white; padding: 10px 20px; border-radius: 20px; margin: 10px 0; font-weight: 600; }
            .meaning { background: #f0e6ff; padding: 20px; border-left: 4px solid #8427E2; border-radius: 8px; margin: 20px 0; }
            .section { margin: 30px 0; padding: 20px; background: #f9f9f9; border-radius: 8px; }
            .section h3 { color: #1a0d2e; margin-top: 0; }
            .strength-list { list-style: none; padding: 0; }
            .strength-list li { padding: 8px 0; border-bottom: 1px solid #e0e0e0; }
            .strength-list li:last-child { border-bottom: none; }
            .strength-list li:before { content: "✓ "; color: #10b981; font-weight: bold; margin-right: 8px; }
            .dimension-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            .dimension-item { background: white; padding: 15px; border-left: 4px solid #8427E2; border-radius: 6px; }
            .dimension-name { font-weight: 600; color: #1a0d2e; margin-bottom: 5px; font-size: 0.9em; }
            .dimension-score { font-size: 1.4em; color: #8427E2; font-weight: bold; }
            .cta { background: linear-gradient(135deg, #8427E2, #CD92FF); color: white; padding: 15px 30px; border-radius: 8px; text-align: center; text-decoration: none; display: inline-block; margin: 20px auto; }
            .footer { text-align: center; color: #999; font-size: 0.85em; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>ED3 Readiness Assessment</h1>
                <p>Your Results Are Ready</p>
            </div>

            <p>Hi ${name},</p>

            <p>Thank you for taking the ED3 Delivery Readiness Assessment. Here are your results:</p>

            <div class="score-box">
                <div class="score">${data.overallScore.toFixed(1)}/4</div>
                <div class="badge">${data.stage.stage}: ${data.stage.label}</div>
                <p style="margin: 15px 0 0 0; color: #666;">${data.stage.meaning}</p>
            </div>

            <div class="section">
                <h3>Your Key Strengths</h3>
                <ul class="strength-list">
                    ${data.strengths.slice(0, 3).map(s => `<li>${s}</li>`).join('')}
                </ul>
            </div>

            <div class="section">
                <h3>Critical Focus Areas</h3>
                <ul class="strength-list">
                    ${data.focusAreas.map(f => `<li style="list-style-type: none;"><span style="color: #f59e0b; font-weight: bold;">⚠ </span>${f}</li>`).join('')}
                </ul>
            </div>

            <div class="section">
                <h3>Maturity by Dimension</h3>
                <div class="dimension-grid">
                    ${data.allDimensions.map(d => `
                        <div class="dimension-item">
                            <div class="dimension-name">${d.dim}</div>
                            <div class="dimension-score">${d.avg.toFixed(1)}/4</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div style="text-align: center; margin: 40px 0;">
                <p style="color: #666; font-size: 0.95em;">Questions about your results? Our team is here to help.</p>
                <a href="mailto:palakh.sharma@ifs.com" class="cta">Schedule a Strategy Discussion</a>
            </div>

            <div class="footer">
                <p>&copy; 2025 IFS Copperleaf | Category Creator in Asset Investment Planning</p>
                <p style="margin-top: 8px; font-size: 0.8em;">Helping utilities build defensible, optimized capital plans</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

// EMAIL 2: For the sales rep (lead info + summary)
function buildSalesRepEmail(respondentName, respondentEmail, data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #333; line-height: 1.6; }
            .container { max-width: 700px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1a0d2e 0%, #2d1b4e 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 1.8em; }
            .lead-card { background: #f0e6ff; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #8427E2; }
            .lead-field { margin: 12px 0; }
            .lead-label { font-weight: 600; color: #1a0d2e; font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.5px; }
            .lead-value { color: #333; font-size: 1.1em; margin-top: 4px; }
            .results-box { background: white; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 30px; border: 2px solid #8427E2; }
            .score { font-size: 3em; font-weight: bold; color: #8427E2; margin: 15px 0; }
            .stage { display: inline-block; background: linear-gradient(135deg, #8427E2, #CD92FF); color: white; padding: 10px 20px; border-radius: 20px; font-weight: 600; margin: 10px 0; }
            .readiness-statement { color: #666; font-size: 0.95em; margin-top: 15px; line-height: 1.6; }
            .section { margin: 30px 0; padding: 20px; background: #f9f9f9; border-radius: 8px; }
            .section h3 { color: #1a0d2e; margin-top: 0; }
            .two-column { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .list-item { padding: 8px 0; border-bottom: 1px solid #e0e0e0; font-size: 0.95em; }
            .list-item:last-child { border-bottom: none; }
            .cta { background: linear-gradient(135deg, #8427E2, #CD92FF); color: white; padding: 12px 30px; border-radius: 8px; text-align: center; text-decoration: none; display: inline-block; margin: 15px auto; }
            .footer { text-align: center; color: #999; font-size: 0.85em; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>New ED3 Assessment Lead</h1>
                <p>New respondent completed diagnostic</p>
            </div>

            <div class="lead-card">
                <div class="lead-field">
                    <div class="lead-label">Respondent Name</div>
                    <div class="lead-value">${respondentName}</div>
                </div>
                <div class="lead-field">
                    <div class="lead-label">Email Address</div>
                    <div class="lead-value"><a href="mailto:${respondentEmail}" style="color: #8427E2; text-decoration: none;">${respondentEmail}</a></div>
                </div>
                <div class="lead-field">
                    <div class="lead-label">Assessment Date</div>
                    <div class="lead-value">${data.timestamp}</div>
                </div>
            </div>

            <div class="results-box">
                <h3 style="margin-top: 0; color: #1a0d2e;">Assessment Results</h3>
                <div class="score">${data.overallScore.toFixed(1)}/4</div>
                <div class="stage">${data.stage.stage}: ${data.stage.label}</div>
                <p class="readiness-statement">${data.stage.meaning}</p>
            </div>

            <div class="section">
                <h3>Assessment Summary</h3>
                <div class="two-column">
                    <div>
                        <h4 style="color: #10b981; margin-top: 0;">Top Strengths</h4>
                        ${data.strengths.slice(0, 2).map(s => `<div class="list-item">✓ ${s}</div>`).join('')}
                    </div>
                    <div>
                        <h4 style="color: #f59e0b; margin-top: 0;">Focus Areas</h4>
                        ${data.focusAreas.slice(0, 2).map(f => `<div class="list-item">⚠ ${f}</div>`).join('')}
                    </div>
                </div>
            </div>

            <div class="section">
                <h3>Next Steps</h3>
                <p>This lead has demonstrated interest in ED3 readiness. Consider:</p>
                <div style="background: white; padding: 15px; border-radius: 6px; margin-top: 15px;">
                    <div class="list-item">📧 Send personalized follow-up based on their stage (${data.stage.label})</div>
                    <div class="list-item">📞 Schedule a strategy call to discuss their gaps</div>
                    <div class="list-item">📊 Share relevant case studies for Stage ${data.stage.stage} utilities</div>
                    <div class="list-item">🎯 Propose Copperleaf evaluation based on focus areas</div>
                </div>
            </div>

            <div style="text-align: center;">
                <a href="mailto:${respondentEmail}" class="cta">Email Respondent</a>
            </div>

            <div class="footer">
                <p>&copy; 2025 IFS Copperleaf | ED3 Assessment Leads</p>
            </div>
        </div>
    </body>
    </html>
  `;
}