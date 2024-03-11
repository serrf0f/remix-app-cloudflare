import { render } from "@react-email/render";
import type { ReactElement } from "react";

export type PostmarkSendEmailParams = {
  from?: string;
  to: string;
  subject: string;
  textBody?: string;
  htmlBody?: ReactElement;
};

export class PostmarkEmailClient {
  constructor(
    private readonly serverToken: string,
    private readonly defaultFrom: string,
    private readonly apiUrl: string = "https://api.postmarkapp.com/email",
  ) {}

  async sendEmail({
    from,
    subject,
    to,
    htmlBody,
    textBody,
  }: PostmarkSendEmailParams) {
    const res = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": this.serverToken,
      },
      body: JSON.stringify({
        From: from || this.defaultFrom,
        To: to,
        Subject: subject,
        ...(htmlBody ? { HtmlBody: render(htmlBody) } : {}),
        ...(textBody ? { TextBody: textBody } : {}),
        MessageStream: "outbound",
      }),
    });

    if (!res.ok) {
      throw new Error(`send email failed ${res.status}`, {
        cause: await res.text(),
      });
    }
    return res;
  }
}
