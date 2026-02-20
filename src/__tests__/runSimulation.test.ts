import { runSimulation } from "@/app/lib/runSimulation";

describe("runSimulation", () => {
  describe("empty and trivial", () => {
    it("returns success with empty steps for no nodes", () => {
      const result = runSimulation([], []);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.steps).toEqual([]);
        expect(result.order).toEqual([]);
        expect(result.unreachableNodeIds).toEqual([]);
      }
    });

    it("returns success for single node (trigger)", () => {
      const result = runSimulation([{ id: "1" }], []);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.steps).toHaveLength(1);
        expect(result.steps[0].nodeIds).toEqual(["1"]);
        expect(result.order).toEqual(["1"]);
        expect(result.unreachableNodeIds).toEqual([]);
      }
    });
  });

  describe("linear flow", () => {
    it("runs linear chain trigger -> A -> B in three steps", () => {
      const nodes = [{ id: "trigger" }, { id: "a" }, { id: "b" }];
      const edges = [
        { source: "trigger", target: "a" },
        { source: "a", target: "b" },
      ];
      const result = runSimulation(nodes, edges);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.steps).toHaveLength(3);
        expect(result.steps[0].nodeIds).toEqual(["trigger"]);
        expect(result.steps[1].nodeIds).toEqual(["a"]);
        expect(result.steps[2].nodeIds).toEqual(["b"]);
        expect(result.order).toEqual(["trigger", "a", "b"]);
        expect(result.unreachableNodeIds).toEqual([]);
      }
    });
  });

  describe("parallel steps", () => {
    it("runs two triggers in step 0 then sink in step 1", () => {
      const nodes = [{ id: "t1" }, { id: "t2" }, { id: "sink" }];
      const edges = [
        { source: "t1", target: "sink" },
        { source: "t2", target: "sink" },
      ];
      const result = runSimulation(nodes, edges);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.steps).toHaveLength(2);
        expect(result.steps[0].nodeIds.sort()).toEqual(["t1", "t2"]);
        expect(result.steps[1].nodeIds).toEqual(["sink"]);
        expect(result.order).toEqual(expect.arrayContaining(["t1", "t2", "sink"]));
        expect(result.unreachableNodeIds).toEqual([]);
      }
    });
  });

  describe("cycles", () => {
    it("returns error when workflow has a cycle", () => {
      const nodes = [{ id: "a" }, { id: "b" }];
      const edges = [
        { source: "a", target: "b" },
        { source: "b", target: "a" },
      ];
      const result = runSimulation(nodes, edges);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/cycle/i);
      }
    });
  });

  describe("unreachable nodes", () => {
    it("reports no unreachable nodes in a DAG (all nodes reachable from some trigger)", () => {
      const nodes = [{ id: "trigger" }, { id: "a" }, { id: "b" }, { id: "c" }];
      const edges = [
        { source: "trigger", target: "a" },
        { source: "b", target: "c" },
      ];
      const result = runSimulation(nodes, edges);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.order).toContain("trigger");
        expect(result.order).toContain("a");
        expect(result.order).toContain("b");
        expect(result.order).toContain("c");
        expect(result.unreachableNodeIds).toEqual([]);
      }
    });
  });

  describe("edge normalization", () => {
    it("ignores edges pointing to non-existent nodes", () => {
      const nodes = [{ id: "1" }];
      const edges = [
        { source: "1", target: "missing" },
      ];
      const result = runSimulation(nodes, edges);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.order).toEqual(["1"]);
        expect(result.unreachableNodeIds).toEqual([]);
      }
    });
  });
});
