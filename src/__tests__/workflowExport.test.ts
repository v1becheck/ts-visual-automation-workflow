import {
  exportWorkflow,
  parseWorkflowFile,
  type WorkflowExport,
} from "@/app/lib/workflowExport";

describe("workflowExport", () => {
  const validNodes = [
    {
      id: "1",
      position: { x: 0, y: 0 },
      data: { label: "Input" },
      type: "input",
    },
  ];
  const validEdges = [{ id: "e1", source: "1", target: "2" }];

  describe("exportWorkflow", () => {
    it("returns JSON string with nodes, edges, version and exportedAt", () => {
      const json = exportWorkflow(validNodes, validEdges);
      const parsed = JSON.parse(json) as WorkflowExport;
      expect(parsed.nodes).toEqual(validNodes);
      expect(parsed.edges).toEqual(validEdges);
      expect(parsed.version).toBe(1);
      expect(typeof parsed.exportedAt).toBe("string");
      expect(() => new Date(parsed.exportedAt).getTime()).not.toBeNaN();
    });

    it("handles empty nodes and edges", () => {
      const json = exportWorkflow([], []);
      const parsed = JSON.parse(json) as WorkflowExport;
      expect(parsed.nodes).toEqual([]);
      expect(parsed.edges).toEqual([]);
    });
  });

  describe("parseWorkflowFile", () => {
    it("parses valid workflow JSON and returns nodes and edges", () => {
      const json = exportWorkflow(validNodes, validEdges);
      const result = parseWorkflowFile(json);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.nodes).toEqual(validNodes);
        expect(result.edges).toEqual(validEdges);
      }
    });

    it("returns error for invalid JSON", () => {
      const result = parseWorkflowFile("not json");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/invalid json/i);
    });

    it("returns error when nodes is missing", () => {
      const result = parseWorkflowFile('{"edges":[]}');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/nodes/);
    });

    it("returns error when edges is missing", () => {
      const result = parseWorkflowFile('{"nodes":[]}');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/edges/);
    });

    it("returns error when a node lacks id", () => {
      const json = JSON.stringify({
        nodes: [{ position: { x: 0, y: 0 }, data: {} }],
        edges: [],
        version: 1,
        exportedAt: new Date().toISOString(),
      });
      const result = parseWorkflowFile(json);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/invalid/);
    });

    it("returns error when an edge lacks source or target", () => {
      const json = JSON.stringify({
        nodes: validNodes,
        edges: [{ id: "e1", source: "1" }],
        version: 1,
        exportedAt: new Date().toISOString(),
      });
      const result = parseWorkflowFile(json);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/invalid/);
    });
  });
});
