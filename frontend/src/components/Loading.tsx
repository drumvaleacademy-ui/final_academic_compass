import { useEffect, useState } from "react";
import { School } from "lucide-react";

export default function Loading() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((old) => {
        if (old >= 100) {
          clearInterval(interval);
          return 100;
        }
        return old + 2;
      });
    }, 30);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4 auth-bg">
      <div className="text-center space-y-6">
        {/* Compass spinner */}
        <div className="relative mx-auto h-24 w-24">
          <svg className="h-24 w-24 animate-spin-slow" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-primary/20"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray="70 200"
              className="text-primary"
            />
            <circle
              cx="50"
              cy="50"
              r="35"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-primary/40"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <School className="h-8 w-8 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Academic Compass</h2>
          <p className="text-sm text-muted-foreground">Loading your academic dashboard...</p>
        </div>

        {/* Progress bar */}
        <div className="w-48 mx-auto">
          <div className="h-1.5 w-full rounded-full bg-primary/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">{progress}%</p>
        </div>
      </div>
    </div>
  );
}
