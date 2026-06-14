import { cn } from "../../utils/lib/utils";

interface LabelProps {
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
  required?: boolean;
}

export const Label = ({ children, htmlFor, className, required = false }: LabelProps) => (
  <label
    htmlFor={htmlFor}
    className={cn("form-label", required && "form-label-required", className)}
  >
    {children}
  </label>
);
