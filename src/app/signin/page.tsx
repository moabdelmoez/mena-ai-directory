import { SignIn } from '@stackframe/stack';

export default function SignInPage() {
  return (
    <SignIn
      fullPage
      extraInfo={
        <span>Sign in using your company email for full access and features</span>
      }
    />
  );
}
