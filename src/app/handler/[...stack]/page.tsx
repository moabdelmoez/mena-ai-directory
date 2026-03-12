import { StackHandler } from '@stackframe/stack';
import { stackServerApp } from '@/lib/auth';

export default function Handler(props: object) {
  return <StackHandler fullPage app={stackServerApp} {...props} />;
}
