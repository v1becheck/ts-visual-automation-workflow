import "@testing-library/jest-dom";

// ReactFlow (and others) use ResizeObserver; jsdom does not provide it.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

// jsdom does not provide fetch; mock for component tests that load data.
const defaultWorkflow = {
  id: "test-1",
  name: "Test",
  nodes: [],
  edges: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
global.fetch = jest.fn((url: string | URL) => {
  const path = typeof url === "string" ? url : (url as URL).pathname;
  if (path === "/api/automation" || path.startsWith("/api/automation?")) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(defaultWorkflow),
    }) as Promise<Response>;
  }
  if (path === "/api/automations") {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([{ id: defaultWorkflow.id, name: defaultWorkflow.name, createdAt: defaultWorkflow.createdAt, updatedAt: defaultWorkflow.updatedAt }]),
    }) as Promise<Response>;
  }
  if (path.match(/\/api\/automations\/[^/]+$/)) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(defaultWorkflow),
    }) as Promise<Response>;
  }
  return Promise.reject(new Error("Unknown URL in test fetch mock"));
}) as typeof fetch;
