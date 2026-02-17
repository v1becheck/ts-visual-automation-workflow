import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { memo } from "react";

type HttpNodeType = Node<{ label: string }, "http">;

const HttpNode = ({ data, selected }: NodeProps<HttpNodeType>) => {
  return (
    <div className={`http-node${selected ? " selected" : ""}`}>
      <Handle type="target" position={Position.Left} />
      <div>
        <strong>{data.label}</strong>
      </div>
      <div className="node-subtitle">HTTP Request</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

export default memo(HttpNode);
