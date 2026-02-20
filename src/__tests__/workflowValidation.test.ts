import { validateWorkflow } from "@/app/lib/workflowValidation";

describe("validateWorkflow", () => {
  describe("valid workflows", () => {
    it("returns valid for empty graph", () => {
      const result = validateWorkflow([], []);
      expect(result.valid).toBe(true);
      expect(result.cycles).toEqual([]);
      expect(result.orphanedNodeIds).toEqual([]);
    });

    it("returns orphaned for single node with no edges (isolated)", () => {
      const result = validateWorkflow([{ id: "1" }], []);
      expect(result.cycles).toEqual([]);
      expect(result.orphanedNodeIds).toEqual(["1"]);
      expect(result.valid).toBe(false);
    });

    it("returns valid for linear chain A -> B -> C", () => {
      const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }];
      const edges = [
        { source: "a", target: "b" },
        { source: "b", target: "c" },
      ];
      const result = validateWorkflow(nodes, edges);
      expect(result.valid).toBe(true);
      expect(result.cycles).toEqual([]);
      expect(result.orphanedNodeIds).toEqual([]);
    });

    it("returns valid for diamond (one source, one sink)", () => {
      const nodes = [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }];
      const edges = [
        { source: "1", target: "2" },
        { source: "1", target: "3" },
        { source: "2", target: "4" },
        { source: "3", target: "4" },
      ];
      const result = validateWorkflow(nodes, edges);
      expect(result.valid).toBe(true);
      expect(result.cycles).toEqual([]);
      expect(result.orphanedNodeIds).toEqual([]);
    });
  });

  describe("cycles", () => {
    it("detects self-loop", () => {
      const nodes = [{ id: "1" }];
      const edges = [{ source: "1", target: "1" }];
      const result = validateWorkflow(nodes, edges);
      expect(result.valid).toBe(false);
      expect(result.cycles.length).toBeGreaterThanOrEqual(1);
      expect(result.cycles.some((c) => c.includes("1"))).toBe(true);
    });

    it("detects cycle of two nodes", () => {
      const nodes = [{ id: "a" }, { id: "b" }];
      const edges = [
        { source: "a", target: "b" },
        { source: "b", target: "a" },
      ];
      const result = validateWorkflow(nodes, edges);
      expect(result.valid).toBe(false);
      expect(result.cycles.length).toBe(1);
      expect(result.cycles[0].sort()).toEqual(["a", "b"]);
    });

    it("detects cycle of three nodes", () => {
      const nodes = [{ id: "1" }, { id: "2" }, { id: "3" }];
      const edges = [
        { source: "1", target: "2" },
        { source: "2", target: "3" },
        { source: "3", target: "1" },
      ];
      const result = validateWorkflow(nodes, edges);
      expect(result.valid).toBe(false);
      expect(result.cycles.length).toBe(1);
      expect(result.cycles[0].sort()).toEqual(["1", "2", "3"]);
    });
  });

  describe("orphaned nodes", () => {
    it("marks node with no edges as orphaned", () => {
      const nodes = [{ id: "a" }, { id: "b" }];
      const edges: { source: string; target: string }[] = [];
      const result = validateWorkflow(nodes, edges);
      expect(result.orphanedNodeIds).toContain("a");
      expect(result.orphanedNodeIds).toContain("b");
      expect(result.valid).toBe(false);
    });

    it("marks node not reachable from any source as orphaned", () => {
      const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }];
      const edges = [{ source: "a", target: "b" }];
      const result = validateWorkflow(nodes, edges);
      expect(result.orphanedNodeIds).toContain("c");
      expect(result.valid).toBe(false);
    });
  });
});
