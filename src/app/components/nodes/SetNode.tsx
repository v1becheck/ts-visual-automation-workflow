import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { memo } from "react";

type SetNodeType = Node<{ label: string }, "set">;

const SetNode = ({ data, selected }: NodeProps<SetNodeType>) => {
  return (
    <div className={`set-node${selected ? " selected" : ""}`}>
      <Handle type="target" position={Position.Left} />
      <div>
        <strong>{data.label}</strong>
      </div>
      <div className="node-subtitle">Set / Transform</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

export default memo(SetNode);
