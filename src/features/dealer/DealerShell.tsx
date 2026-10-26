export type DealerShellProps = {
  children: React.ReactNode;
};

/** Shell do ambiente painel — o chrome visual fica no DashboardShell da View. */
export function DealerShell({ children }: DealerShellProps) {
  return <>{children}</>;
}
