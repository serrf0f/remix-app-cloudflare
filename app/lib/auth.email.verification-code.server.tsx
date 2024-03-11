import {
  CodeInline,
  Head,
  Hr,
  Html,
  Link,
  Text,
} from "@react-email/components";

export type SignUpVerificationCodeEmailParams = {
  code: string;
  callbackUrl: string;
};

export function SignUpVerificationCodeEmail({
  code,
  callbackUrl,
}: SignUpVerificationCodeEmailParams) {
  return (
    <Html>
      <Head>
        <title>Welcome</title>
      </Head>
      <Text>Please find your validation code below:</Text>
      <CodeInline>{code}</CodeInline>
      <Hr />
      <Link href={callbackUrl}>Go back to validation page</Link>
    </Html>
  );
}
