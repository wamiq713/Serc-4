/**
 * Dijkstra's Algorithm implementation for Shortest Path
 * Used to find the fastest route for ambulances.
 */

interface Node {
  id: string;
  lat: number;
  lng: number;
}

interface Edge {
  from: string;
  to: string;
  weight: number; // Duration or distance
}

export class Graph {
  nodes: Map<string, Node> = new Map();
  adjacencyList: Map<string, { node: string; weight: number }[]> = new Map();

  addNode(node: Node) {
    this.nodes.set(node.id, node);
    this.adjacencyList.set(node.id, []);
  }

  addEdge(from: string, to: string, weight: number) {
    this.adjacencyList.get(from)?.push({ node: to, weight });
    this.adjacencyList.get(to)?.push({ node: from, weight }); // Undirected graph
  }

  dijkstra(startNode: string, endNode: string) {
    const distances: Record<string, number> = {};
    const previous: Record<string, string | null> = {};
    const nodes = new Set<string>();

    for (const nodeId of this.nodes.keys()) {
      if (nodeId === startNode) {
        distances[nodeId] = 0;
      } else {
        distances[nodeId] = Infinity;
      }
      previous[nodeId] = null;
      nodes.add(nodeId);
    }

    while (nodes.size > 0) {
      let closestNode: string | null = null;

      for (const nodeId of nodes) {
        if (closestNode === null || distances[nodeId] < distances[closestNode]) {
          closestNode = nodeId;
        }
      }

      if (closestNode === null || distances[closestNode] === Infinity || closestNode === endNode) {
        break;
      }

      nodes.delete(closestNode!);

      for (const neighbor of this.adjacencyList.get(closestNode!) || []) {
        const alt = distances[closestNode!] + neighbor.weight;
        if (alt < distances[neighbor.node]) {
          distances[neighbor.node] = alt;
          previous[neighbor.node] = closestNode;
        }
      }
    }

    const path: string[] = [];
    let current: string | null = endNode;
    while (current !== null) {
      path.unshift(current);
      current = previous[current];
    }

    return {
      path: path[0] === startNode ? path : [],
      distance: distances[endNode],
    };
  }
}
