import { Outlet, NavLink } from 'react-router-dom';

export function AppShell() {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100dvh',
      }}
    >
      <nav
        style={{
          width: 'var(--sidebar-width)',
          borderRight: '1px solid var(--color-border-subtle)',
          padding: 'var(--space-4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
          backgroundColor: 'var(--color-bg-secondary)',
        }}
      >
        <div
          style={{
            fontSize: 'var(--text-xl)',
            fontWeight: 'var(--font-weight-bold)',
            padding: 'var(--space-4) var(--space-2)',
            marginBottom: 'var(--space-4)',
          }}
        >
          INTRVW
        </div>

        <SidebarLink to="/" label="Home" end />
        <SidebarLink to="/setup" label="New Interview" />
        <SidebarLink to="/history" label="History" />

        <div style={{ marginTop: 'auto' }}>
          <SidebarLink to="/settings" label="Settings" />
        </div>
      </nav>

      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}

function SidebarLink({
  to,
  label,
  end,
}: {
  to: string;
  label: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      style={({ isActive }) => ({
        display: 'block',
        padding: 'var(--space-2) var(--space-3)',
        borderRadius: 'var(--radius-md)',
        color: isActive
          ? 'var(--color-accent)'
          : 'var(--color-text-secondary)',
        backgroundColor: isActive ? 'var(--color-accent-subtle)' : 'transparent',
        fontWeight: isActive ? 'var(--font-weight-medium)' : 'var(--font-weight-normal)',
        textDecoration: 'none',
        transition: 'background-color var(--transition-fast)',
      })}
    >
      {label}
    </NavLink>
  );
}
