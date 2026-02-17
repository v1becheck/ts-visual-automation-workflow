import { useDnD } from "../contexts/DnDContext";
import "./styles.css";

const Sidebar = () => {
  const { setType } = useDnD();

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    setType(nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside className="sidebar">
      <div className="description">You can drag these nodes.</div>
      <div
        className="dndnode input"
        onDragStart={(event) => onDragStart(event, "input")}
        draggable
      >
        Input Node
      </div>
      <div
        className="dndnode schedule"
        onDragStart={(event) => onDragStart(event, "schedule")}
        draggable
      >
        Schedule
      </div>
      <div
        className="dndnode output"
        onDragStart={(event) => onDragStart(event, "output")}
        draggable
      >
        Output Node
      </div>
      <div
        className="dndnode webhook"
        onDragStart={(event) => onDragStart(event, "webhook")}
        draggable
      >
        Webhook
      </div>
      <div
        className="dndnode email"
        onDragStart={(event) => onDragStart(event, "email")}
        draggable
      >
        Email
      </div>
      <div
        className="dndnode http"
        onDragStart={(event) => onDragStart(event, "http")}
        draggable
      >
        HTTP Request
      </div>
      <div
        className="dndnode slack"
        onDragStart={(event) => onDragStart(event, "slack")}
        draggable
      >
        Slack
      </div>
      <div
        className="dndnode delay"
        onDragStart={(event) => onDragStart(event, "delay")}
        draggable
      >
        Delay
      </div>
      <div
        className="dndnode condition"
        onDragStart={(event) => onDragStart(event, "condition")}
        draggable
      >
        Condition
      </div>
      <div
        className="dndnode set"
        onDragStart={(event) => onDragStart(event, "set")}
        draggable
      >
        Set
      </div>
      <div
        className="dndnode merge"
        onDragStart={(event) => onDragStart(event, "merge")}
        draggable
      >
        Merge
      </div>
      <div
        className="dndnode code"
        onDragStart={(event) => onDragStart(event, "code")}
        draggable
      >
        Code
      </div>
      <div
        className="dndnode"
        onDragStart={(event) => onDragStart(event, "default")}
        draggable
      >
        Default Node
      </div>
    </aside>
  );
};
export default Sidebar;
