import "@testing-library/jest-dom";
import Home from "@/app/page";

describe("Home page", () => {
  it("exports a valid page component", () => {
    expect(Home).toBeDefined();
    expect(typeof Home).toBe("function");
  });
});
