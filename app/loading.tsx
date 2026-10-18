// Server component: import the pure client leaf by path, not the barrel (the barrel
// pulls in the Phosphor icon layer's createContext and crashes server rendering).
import { LoadingPulse } from '@/components/ui-system/patterns/LoadingPulse';

export default function Loading() {
  return (
    <div className="mx-auto grid min-h-[60dvh] w-full max-w-xl place-items-center bg-canvas px-4 py-16">
      <LoadingPulse label="Loading page" detail={['Loading page']} />
    </div>
  );
}
