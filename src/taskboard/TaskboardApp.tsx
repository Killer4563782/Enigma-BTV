import { Component, type ReactNode } from 'react';
import { Workspace } from './components/workspace';
import ErrorPage from './app/error';
import { isTaskboardPath } from './lib/routes.mjs';

class WorkspaceBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    return this.state.error
      ? <ErrorPage error={this.state.error} reset={() => window.location.reload()} />
      : this.props.children;
  }
}

export default function TaskboardApp() {
  return <WorkspaceBoundary>
    {isTaskboardPath(window.location.pathname) ? <Workspace /> : (
      <main className="route-error"><h1>Workspace page not found.</h1><a href="/taskboard">Return to Taskboard</a></main>
    )}
  </WorkspaceBoundary>;
}
