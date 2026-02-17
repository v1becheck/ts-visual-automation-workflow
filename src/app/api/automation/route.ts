import { initialEdges, initialNodes } from "@/app/Constants";
import { NextRequest } from "next/server";

export async function GET() {
  return new Response(
    JSON.stringify({
      nodes: initialNodes,
      edges: initialEdges,
    }),
    {
      status: 200,
    }
  );
}

export async function PUT(request: NextRequest) {
  const { nodes, edges } = await request.json();
  return new Response(
    JSON.stringify({
      nodes,
      edges,
    }),
    {
      status: 200,
    }
  );
}
