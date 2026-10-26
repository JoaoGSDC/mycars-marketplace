export type AdminShellProps = {
  children: React.ReactNode;
};

/** Chrome visual fica no DashboardShell das Views admin. */
export function AdminShell({ children }: AdminShellProps) {
  return <>{children}</>;
}
