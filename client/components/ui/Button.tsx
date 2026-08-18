type ButtonProps = {
  readonly variant?: "primary" | "secondary";
  readonly children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

/** 디자인 C10·C11. */
export function Button({ variant = "primary", children, className, ...rest }: ButtonProps) {
  const styles =
    variant === "primary" ? "bg-action text-action-text" : "border border-border bg-white text-text-primary";

  return (
    <button
      type="button"
      {...rest}
      className={`flex h-13 w-full items-center justify-center rounded-button text-[15px] font-bold ${styles} ${className ?? ""}`}
    >
      {children}
    </button>
  );
}
