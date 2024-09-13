export function register(oneTimeCode: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirm Your Registration</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        h1 {
            color: #333333;
        }
        p {
            color: #666666;
        }
        .code {
            background-color: #f4f4f4;
            font-size: 24px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
            border: 1px dashed #ccc;
            letter-spacing: 3px;
            font-weight: bold;
            color: #333;
        }
        .footer {
            font-size: 12px;
            color: #999999;
            margin-top: 20px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to Budget!</h1>
        <p>Hi there,</p>
        <p>Thank you for registering with Budget. To complete your registration, please use the following one-time code:</p>
        <div class="code">${oneTimeCode}</div>
        <p>Enter this code in the Budget app to verify your email address.</p>
        <p>If you didn’t create an account with Budget, you can safely ignore this email.</p>
        <p>Best regards,<br>The Budget Team</p>
        <div class="footer">
            <p>&copy; 2024 Budget Inc. All rights reserved.</p>
            <p>123 Budget Street, City, Country</p>
        </div>
    </div>
</body>
</html>`;
}
