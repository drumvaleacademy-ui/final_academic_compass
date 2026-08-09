import { cn } from "@/lib/utils";

interface SchoolLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  textClassName?: string;
}

export function SchoolLogo({ className, size = "md", showText = false, textClassName }: SchoolLogoProps) {
  const sizeMap = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
    xl: "h-12 w-12",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img
        src="/school_logo.jpg"
        alt="Academic Compass School Logo"
        className={cn(
          sizeMap[size],
          "object-contain rounded-md",
        )}
      />
      {showText && (
        <span className={cn("font-semibold text-foreground", textClassName)}>
          Academic Compass
        </span>
      )}
    </div>
  );
}

export function SchoolLogoIcon({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const sizeMap = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
    xl: "h-12 w-12",
  };

  return (
    <img
      src="/school_logo.jpg"
      alt="Academic Compass School Logo"
      className={cn(sizeMap[size], "object-contain rounded-md", className)}
    />
  );
}
