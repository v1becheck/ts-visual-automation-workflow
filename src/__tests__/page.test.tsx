import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import Home from "@/app/page";

describe("Home page", () => {
  it("exports a valid page component", () => {
    expect(Home).toBeDefined();
    expect(typeof Home).toBe("function");
  });

  it("renders the builder and shows Go to node search after load", async () => {
    render(<Home />);
    await waitFor(
      () => {
        expect(screen.getByLabelText(/go to node/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("renders Run simulation button after load", async () => {
    render(<Home />);
    await waitFor(
      () => {
        expect(screen.getByRole("button", { name: /run simulation/i })).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });
});
