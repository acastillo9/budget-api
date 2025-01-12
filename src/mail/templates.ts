export const emailVerification = (code: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Confirm Your Email</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table width="100%" bgcolor="#f4f4f4" cellpadding="0" cellspacing="0">
        <tr>
            <td align="center">
                <!--[if mso]>
                <table width="600" cellpadding="0" cellspacing="0">
                <tr>
                <td>
                <![endif]-->
                <table width="100%" bgcolor="#ffffff" cellpadding="20" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
                    <tr>
                        <td>
                            <h1 style="color: #333333; margin-top: 0;">Welcome to Budget App!</h1>
                            <p style="color: #666666;">Hi there,</p>
                            <p style="color: #666666;">Thank you for registering to Budget App. To complete your registration, please use the following one-time code:</p>
                            <div style="background-color: #f4f4f4; font-size: 24px; padding: 15px; margin: 20px 0; text-align: center; border: 1px dashed #ccc; letter-spacing: 3px; font-weight: bold; color: #333333;">
                                ${code}
                            </div>
                            <p style="color: #666666;">Enter this code in the Budget App to verify your email address.</p>
                            <p style="color: #666666;">If you didn’t create an account with Budget App, you can safely ignore this email.</p>
                            <p style="color: #666666;">Best regards,<br>The Budget Team</p>
                            <div style="font-size: 12px; color: #999999; margin-top: 20px; text-align: center;">
                                <p style="margin: 5px 0;">&copy; 2024 Budget App. All rights reserved.</p>
                            </div>
                        </td>
                    </tr>
                </table>
                <!--[if mso]>
                </td>
                </tr>
                </table>
                <![endif]-->
            </td>
        </tr>
    </table>
</body>
</html>
`;

export const passwordReset = (resetLink: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table width="100%" bgcolor="#f4f4f4" cellpadding="0" cellspacing="0">
        <tr>
            <td align="center">
                <!--[if mso]>
                <table width="600" cellpadding="0" cellspacing="0">
                <tr>
                <td>
                <![endif]-->
                <table width="100%" bgcolor="#ffffff" cellpadding="20" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
                    <tr>
                        <td>
                            <h1 style="color: #333333; margin-top: 0;">Reset Your Password</h1>
                            <p style="color: #666666;">Hi there,</p>
                            <p style="color: #666666;">We received a request to reset the password for your Budget App account. Use the button below to reset your password:</p>
                            <div style="text-align: center; margin: 20px 0;">
                                <a href="${resetLink}" style="background-color: #007BFF; color: #ffffff; text-decoration: none; font-size: 16px; padding: 10px 20px; border-radius: 5px; display: inline-block;">Reset Password</a>
                            </div>
                            <p style="color: #666666;">If you didn’t request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
                            <p style="color: #666666;">For your security, this link will expire in 30 minutes.</p>
                            <p style="color: #666666;">Best regards,<br>The Budget Team</p>
                            <div style="font-size: 12px; color: #999999; margin-top: 20px; text-align: center;">
                                <p style="margin: 5px 0;">&copy; 2024 Budget App. All rights reserved.</p>
                            </div>
                        </td>
                    </tr>
                </table>
                <!--[if mso]>
                </td>
                </tr>
                </table>
                <![endif]-->
            </td>
        </tr>
    </table>
</body>
</html>
`;
