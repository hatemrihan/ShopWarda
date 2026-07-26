interface AdminShellProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Consistent page wrapper for admin pages.
 * Provides title, optional description, and an action slot.
 */
export function AdminShell({ title, description, action, children }: AdminShellProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-white leading-none">{title}</h1>
          {description && (
            <p className="text-[11px] text-white/25 mt-1.5">{description}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  );
}
