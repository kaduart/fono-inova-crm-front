interface LabelProps {
    children: React.ReactNode;
    htmlFor?: string;
  }
  
  export const Label = ({ children, htmlFor }: LabelProps) => (
    <label htmlFor={htmlFor} className="block text-gray-600">
      {children}
    </label>
  );