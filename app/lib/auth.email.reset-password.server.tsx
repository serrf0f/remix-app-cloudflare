import { Head, Html, Link, Text } from "@react-email/components";

export type ResetPasswordLinkEmailParams = {
  resetPasswordUrl: string;
};

export function ResetPasswordLinkEmail({
  resetPasswordUrl,
}: ResetPasswordLinkEmailParams) {
  return (
    <Html>
      <Head>
        <title>Reset password</title>
      </Head>
      <Text>Please use the link below to reset your password:</Text>
      <Link href={resetPasswordUrl}>Reset password</Link>
    </Html>
  );
}
