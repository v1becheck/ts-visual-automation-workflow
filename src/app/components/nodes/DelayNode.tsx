import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { memo } from "react";

type DelayNodeType = Node<{ label: string }, "delay">;

const DelayNode = ({ data, selected }: NodeProps<DelayNodeType>) => {
  return (
    <div className={`delay-node${selected ? " selected" : ""}`}>
      <Handle type="target" position={Position.Left} />
      <div>
        <strong>{data.label}</strong>
      </div>
      <div className="node-subtitle">Delay</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

export default memo(DelayNode);
