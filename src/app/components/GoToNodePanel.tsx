"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Panel, useReactFlow, type Node } from "@xyflow/react";

function getNodeLabel(node: Node): string {
  return (node.data as { label?: string })?.label ?? node.id ?? "Unnamed";
}

const DEFAULT_NODE_WIDTH = 180;
const DEFAULT_NODE_HEIGHT = 40;

type Props = {
  nodes: Node[];
  setNodes: (payload: Node[] | ((prev: Node[]) => Node[])) => void;
  /** When true, render only the content (no Panel) for use inside a parent Panel. */
  embedded?: boolean;
};

export default function GoToNodePanel({ nodes, setNodes, embedded }: Props) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const { setCenter } = useReactFlow();

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return nodes.filter((n) => getNodeLabel(n).toLowerCase().includes(q));
  }, [nodes, query]);

  const goToNode = useCallback(
    (node: Node) => {
      const width =
        (node as { width?: number }).width ?? DEFAULT_NODE_WIDTH;
      const height =
        (node as { height?: number }).height ?? DEFAULT_NODE_HEIGHT;
      const centerX = node.position.x + width / 2;
      const centerY = node.position.y + height / 2;
      setCenter(centerX, centerY, { duration: 300 });
      setNodes((nds) =>
        nds.map((n) => ({ ...n, selected: n.id === node.id }))
      );
      setQuery("");
      setIsOpen(false);
      setFocusedIndex(0);
    },
    [setCenter, setNodes]
  );

  useEffect(() => {
    setFocusedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen || matches.length === 0) return;
    const el = listRef.current?.children[focusedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [focusedIndex, isOpen, matches.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || matches.length === 0) {
        if (e.key === "Escape") {
          setQuery("");
          setIsOpen(false);
          inputRef.current?.blur();
        }
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, matches.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const node = matches[focusedIndex];
        if (node) goToNode(node);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setQuery("");
        setIsOpen(false);
        inputRef.current?.blur();
      }
    },
    [isOpen, matches, focusedIndex, goToNode]
  );

  const showDropdown = isOpen && query.trim().length > 0;

  const content = (
    <div className="go-to-node-panel__wrap">
        <label htmlFor="go-to-node-input" className="go-to-node-panel__label">
          Go to node
        </label>
        <input
          id="go-to-node-input"
          ref={inputRef}
          type="text"
          className="go-to-node-panel__input"
          placeholder="Search by label…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            // Delay so click on a result runs first
            setTimeout(() => setIsOpen(false), 150);
          }}
          onKeyDown={handleKeyDown}
          aria-autocomplete="list"
          aria-controls="go-to-node-list"
          aria-expanded={showDropdown}
          aria-activedescendant={
            showDropdown && matches[focusedIndex]
              ? `go-to-node-option-${matches[focusedIndex].id}`
              : undefined
          }
        />
        {showDropdown && (
          <ul
            id="go-to-node-list"
            ref={listRef}
            className="go-to-node-panel__list"
            role="listbox"
          >
            {matches.length === 0 ? (
              <li className="go-to-node-panel__item go-to-node-panel__item--empty">
                No matching nodes
              </li>
            ) : (
              matches.map((node, i) => (
                <li
                  key={node.id}
                  id={`go-to-node-option-${node.id}`}
                  role="option"
                  aria-selected={i === focusedIndex}
                  className={`go-to-node-panel__item ${
                    i === focusedIndex ? "go-to-node-panel__item--focused" : ""
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    goToNode(node);
                  }}
                  onMouseEnter={() => setFocusedIndex(i)}
                >
                  {getNodeLabel(node)}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
  );

  if (embedded) {
    return <div className="go-to-node-panel">{content}</div>;
  }
  return (
    <Panel position="top-center" className="go-to-node-panel">
      {content}
    </Panel>
  );
}
