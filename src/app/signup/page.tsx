import { SignUp } from '@stackframe/stack';

export default function SignUpPage() {
  return (
    <SignUp
      fullPage
      extraInfo={
        <span>Sign up using your company email for full access and features</span>
      }
    />
  );
}
