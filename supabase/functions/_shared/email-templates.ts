export function emailShell(body: string, footerNote: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f7fa;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:8px;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px 40px;border-bottom:1px solid #f0f0f0;">
<img src="https://truguide.app/assets/images/TruGuideLogoTransparentTitle1024x1024.png" alt="TruGuide" width="120" style="display:block;border:0;" />
<p style="margin:8px 0 0 0;font-size:16px;font-weight:600;color:#607D8B;">Travel with Confidence</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #f0f0f0;">
              <p style="margin:0 0 8px 0;color:#607D8B;font-size:13px;line-height:1.6;">${footerNote}</p>
              <p style="margin:0;color:#90A4AE;font-size:12px;">&copy; 2025 TruGuide. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function ctaButton(url: string, label: string): string {
    return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
    <tr>
      <td>
        <a href="${url}" style="display:inline-block;padding:14px 32px;background-color:#2A5C99;color:#ffffff;text-decoration:none;border-radius:6px;font-size:15px;font-weight:600;">${label}</a>
      </td>
    </tr>
  </table>`;
}