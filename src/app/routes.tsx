import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense, type ReactNode } from 'react';
import { AppShell } from '@/components/ui/AppShell';

const LandingPage = lazy(() => import('@/components/dashboard/LandingPage'));
const InterviewSetupPage = lazy(
  () => import('@/components/interview/InterviewSetupPage'),
);
const InterviewSessionPage = lazy(
  () => import('@/components/interview/InterviewSessionPage'),
);
const ReviewPage = lazy(() => import('@/components/interview/ReviewPage'));
const HistoryPage = lazy(() => import('@/components/dashboard/HistoryPage'));
const SettingsPage = lazy(() => import('@/components/settings/SettingsPage'));

function withSuspense(Component: React.LazyExoticComponent<() => ReactNode>) {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
          }}
        >
          Loading...
        </div>
      }
    >
      <Component />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: withSuspense(LandingPage) },
      { path: 'setup', element: withSuspense(InterviewSetupPage) },
      {
        path: 'session/:interviewId',
        element: withSuspense(InterviewSessionPage),
      },
      { path: 'review/:interviewId', element: withSuspense(ReviewPage) },
      { path: 'history', element: withSuspense(HistoryPage) },
      { path: 'settings', element: withSuspense(SettingsPage) },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
