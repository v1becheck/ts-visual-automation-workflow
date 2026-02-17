import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { memo } from "react";

type ConditionNodeType = Node<{ label: string }, "condition">;

const ConditionNode = ({ data, selected }: NodeProps<ConditionNodeType>) => {
  return (
    <div className={`condition-node${selected ? " selected" : ""}`}>
      <Handle type="target" position={Position.Left} />
      <div>
        <strong>{data.label}</strong>
      </div>
      <div className="node-subtitle">Condition</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

export default memo(ConditionNode);
