import smtplib
import sys
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

combined_args = sys.argv[1]
to, sub, msg = combined_args.split(',')


# Email configuration
sender_email = "theaspirants1@gmail.com"
receiver_email = to
subject = sub
message = msg

# Create the email
msg = MIMEMultipart()
msg["From"] = sender_email
msg["To"] = receiver_email
msg["Subject"] = subject
msg.attach(MIMEText(message, "plain"))

# Connect to the SMTP server and send the email
try:
    server = smtplib.SMTP("smtp.gmail.com", 587)
    server.starttls()
    server.login(sender_email, "wpjtvyqfxkyidood")  # Use your Gmail password or app-specific password
    server.sendmail(sender_email, receiver_email, msg.as_string())
    print("Email sent successfully!")
except Exception as e:
    print("Error:", e)
finally:
    server.quit()
