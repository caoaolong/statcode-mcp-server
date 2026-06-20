import { useEffect, useRef } from "react";
import { Graph, treeToGraphData } from "@antv/g6";

const sampleData = {
  id: "root",
  children: [
    {
      id: "src",
      children: [
        { id: "App.tsx", children: [{ id: "App()" }, { id: "callTool()" }] },
        { id: "App.css" },
        { id: "index.tsx" },
        { id: "mcp.ts", children: [{ id: "createMcpServer()" }] },
        {
          id: "server.ts",
          children: [{ id: "app.all('/mcp')" }, { id: "POST /api/projects" }],
        },
      ],
    },
    {
      id: "public",
      children: [{ id: "index.html" }, { id: "favicon.svg" }],
    },
    {
      id: "config",
      children: [
        { id: "vite.config.ts" },
        { id: "tsconfig.json" },
        { id: "package.json" },
      ],
    },
  ],
};

export default function Mindmap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);

  useEffect(() => {
    if (!containerRef.current || graphRef.current) return;

    const graph = new Graph({
      container: containerRef.current,
      autoFit: "view",
      autoResize: true,
      data: treeToGraphData(sampleData),
      node: {
        type: "rect",
        style: {
          labelText: (d) => d.id,
          fill: (d) =>
            d.depth === 0 ? "#2d1b69" : d.depth === 1 ? "#f8faff" : "#ffffff",
          stroke: (d) => (d.depth === 0 ? "#2d1b69" : "#c8d6e5"),
          lineWidth: (d) => (d.depth === 0 ? 0 : 1.5),
          radius: (d) => (d.depth === 0 ? 16 : 9),
          labelFontSize: (d) => (d.depth === 0 ? 17 : d.depth === 1 ? 13 : 12),
          labelFill: (d) =>
            d.depth === 0 ? "#ffffff" : d.depth === 1 ? "#2d1b69" : "#475569",
          labelFontWeight: (d) => (d.depth <= 1 ? "bold" : "normal"),
          labelPlacement: "center",
          labelMaxWidth: 130,
          padding: (d) =>
            d.depth === 0 ? [12, 24] : d.depth === 1 ? [10, 16] : [7, 12],
          ports: [{ placement: "right" }, { placement: "left" }],
          cursor: "pointer",
          shadowColor: (d) =>
            d.depth === 0 ? "rgba(45, 27, 105, 0.35)" : "rgba(0, 0, 0, 0.06)",
          shadowBlur: (d) => (d.depth === 0 ? 24 : 10),
          shadowOffsetX: 0,
          shadowOffsetY: (d) => (d.depth === 0 ? 8 : 3),
        },
        state: {
          hover: {
            fill: "#f0f2ff",
            stroke: "#4361ee",
            lineWidth: 2,
            shadowColor: "rgba(67, 97, 238, 0.2)",
            shadowBlur: 16,
            shadowOffsetY: 6,
          },
        },
        animation: {
          enter: [
            {
              fields: ["opacity"],
              values: [0, 1],
              duration: 500,
              easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
            },
          ],
          update: [
            {
              fields: ["fill"],
              duration: 200,
            },
          ],
        },
      },
      edge: {
        type: "cubic-horizontal",
        style: {
          stroke: "#cbd5e1",
          lineWidth: 1.5,
          opacity: 0.6,
        },
        animation: { enter: false },
      },
      layout: {
        type: "mindmap",
        direction: "H",
        getHeight: () => 32,
        getWidth: () => 32,
        getVGap: () => 4,
        getHGap: () => 64,
      },
      behaviors: [
        "drag-canvas",
        "zoom-canvas",
        { type: "collapse-expand", trigger: "click", animation: false },
      ],
      plugins: [
        {
          type: "toolbar",
          position: "top-left",
          onClick: (item: string, e: MouseEvent) => {
            const g = graphRef.current;
            if (!g) return;
            switch (item) {
              case "zoom-in":
                g.zoomBy(1.25);
                break;
              case "zoom-out":
                g.zoomBy(0.75);
                break;
              case "auto-fit":
                g.fitView();
                break;
              case "reset":
                g.fitView({ padding: 48 });
                break;
              case "export":
                g.toDataURL()
                  .then((url) => {
                    const a = document.createElement("a");
                    a.download = "graph.png";
                    a.href = url;
                    a.click();
                  })
                  .catch(() => {});
                break;
            }
          },
          getItems: () => [
            { id: "zoom-in", value: "zoom-in" },
            { id: "zoom-out", value: "zoom-out" },
            { id: "redo", value: "redo" },
            { id: "undo", value: "undo" },
            { id: "edit", value: "edit" },
            { id: "delete", value: "delete" },
            { id: "auto-fit", value: "auto-fit" },
            { id: "export", value: "export" },
            { id: "reset", value: "reset" },
          ],
        },
      ],
    });

    graphRef.current = graph;

    graph.on("node:mouseenter", (e: any) => {
      if (!graphRef.current) return;
      const node = e.target;
      if (node && node.id) {
        graphRef.current.setElementState(node.id, "hover");
      }
    });

    graph.on("node:mouseleave", (e: any) => {
      if (!graphRef.current) return;
      const node = e.target;
      if (node && node.id) {
        graphRef.current.clearElementState(node.id, "hover");
      }
    });

    const timer = setTimeout(() => {
      if (graphRef.current !== graph) return;
      graph.render();
    }, 0);

    return () => {
      clearTimeout(timer);
      graph.destroy();
      graphRef.current = null;
    };
  }, []);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
