import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { SchoolLogoIcon } from "@/components/SchoolLogo";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4 auth-bg">
      <div className="text-center space-y-6">
        {/* Compass illustration */}
        <div className="relative mx-auto h-32 w-32">
          <svg className="h-32 w-32" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="1" className="text-primary/20" />
            <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="1" className="text-primary/30" />
            <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary/40" />
            {/* Compass needle */}
            <polygon points="50,20 54,50 50,48 46,50" fill="currentColor" className="text-primary" />
            <polygon points="50,80 54,50 50,52 46,50" fill="currentColor" className="text-primary/40" />
            <circle cx="50" cy="50" r="4" fill="currentColor" className="text-primary" />
            {/* Cardinal markers */}
            <text x="50" y="12" textAnchor="middle" className="text-[8px] fill-primary/60 font-bold">N</text>
            <text x="50" y="92" textAnchor="middle" className="text-[8px] fill-primary/60 font-bold">S</text>
            <text x="8" y="53" textAnchor="middle" className="text-[8px] fill-primary/60 font-bold">W</text>
            <text x="92" y="53" textAnchor="middle" className="text-[8px] fill-primary/60 font-bold">E</text>
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-5xl font-bold text-primary">404</h1>
          <p className="text-xl text-muted-foreground">Oops! Page not found</p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            The page you're looking for seems to have wandered off. Let's get you back on track.
          </p>
        </div>

        <a
          href="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
           <SchoolLogoIcon size="sm" />
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
