import "@testing-library/jest-dom";

// ReactFlow (and others) use ResizeObserver; jsdom does not provide it.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
