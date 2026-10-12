export function WorkspaceLoading() {
  return (
    <main className="workspace-loading" aria-busy="true" aria-live="polite">
      <span className="loading-mark" />
      <span>Opening your workspace</span>
    </main>
  );
}