import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { memo } from "react";

type SlackNodeType = Node<{ label: string }, "slack">;

const SlackNode = ({ data, selected }: NodeProps<SlackNodeType>) => {
  return (
    <div className={`slack-node${selected ? " selected" : ""}`}>
      <Handle type="target" position={Position.Left} />
      <div>
        <strong>{data.label}</strong>
      </div>
      <div className="node-subtitle">Slack</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

export default memo(SlackNode);
