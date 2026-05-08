import nodemailer from "nodemailer";
import { Notifier, NotifyEvent, formatMessage } from "../notifier";
import { EmailConfig } from "../config";

export class EmailNotifier implements Notifier {
  name = "email";
  private transporter: nodemailer.Transporter;

  constructor(private config: EmailConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: config.smtp_port,
      secure: config.smtp_secure,
      auth: config.smtp_user
        ? { user: config.smtp_user, pass: config.smtp_pass }
        : undefined,
    });
  }

  async send(event: NotifyEvent): Promise<void> {
    const { title, body } = formatMessage(event);

    await this.transporter.sendMail({
      from: this.config.from,
      to: this.config.to,
      subject: title,
      text: body,
      html: `<pre style="font-family: monospace; font-size: 14px;">${body}</pre>`,
    });
  }
}
