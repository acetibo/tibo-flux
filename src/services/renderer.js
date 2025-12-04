/**
 * Renderer TiboFlux
 * Génère le SVG à partir de l'AST
 */

const { NodeType } = require('./parser');

// Configuration du layout
const CONFIG = {
  nodeWidth: 160,
  nodeHeight: 50,
  nodeSpacingX: 80,
  nodeSpacingY: 80,
  padding: 40,
  fontSize: 14,
  colors: {
    terminal: { fill: '#e0e7ff', stroke: '#4f46e5', text: '#1e1b4b' },
    process: { fill: '#dbeafe', stroke: '#2563eb', text: '#1e3a5f' },
    decision: { fill: '#fef3c7', stroke: '#d97706', text: '#78350f' },
    io: { fill: '#d1fae5', stroke: '#059669', text: '#064e3b' },
    arrow: { stroke: '#6b7280', fill: '#6b7280' }
  }
};

class LayoutEngine {
  constructor(ast) {
    this.ast = ast;
    this.positions = new Map();
    this.levels = new Map(); // niveau Y pour chaque nœud
    this.columns = new Map(); // colonne X pour chaque nœud
  }

  // Trouve le nœud de départ (celui qui n'a pas de connexion entrante)
  findStartNodes() {
    const hasIncoming = new Set();
    this.ast.connections.forEach(conn => hasIncoming.add(conn.to));
    return this.ast.nodes.filter(node => !hasIncoming.has(node.id));
  }

  // Algorithme de layout basé sur les niveaux (DFS avec niveau max)
  calculateLayout() {
    const startNodes = this.findStartNodes();

    if (startNodes.length === 0 && this.ast.nodes.length > 0) {
      startNodes.push(this.ast.nodes[0]);
    }

    // Créer la map des connexions sortantes
    const outgoingMap = new Map();
    this.ast.connections.forEach(conn => {
      if (!outgoingMap.has(conn.from)) {
        outgoingMap.set(conn.from, []);
      }
      outgoingMap.get(conn.from).push(conn);
    });

    // Phase 1: Calculer le niveau maximum pour chaque nœud (DFS)
    // Un nœud doit être au niveau max de tous ses parents + 1
    const calculateMaxLevel = (nodeId, currentLevel, visited = new Set()) => {
      if (visited.has(nodeId)) return; // Évite les cycles
      visited.add(nodeId);

      const existingLevel = this.levels.get(nodeId);
      if (existingLevel === undefined || currentLevel > existingLevel) {
        this.levels.set(nodeId, currentLevel);
      }

      const outgoing = outgoingMap.get(nodeId) || [];
      outgoing.forEach(conn => {
        const targetNode = this.ast.nodes.find(n => n.id === conn.to);
        if (targetNode) {
          calculateMaxLevel(targetNode.id, this.levels.get(nodeId) + 1, new Set(visited));
        }
      });
    };

    // Lancer le DFS depuis les nœuds de départ
    startNodes.forEach(node => calculateMaxLevel(node.id, 0));

    // Phase 2: Organiser les colonnes par niveau
    const levelNodes = new Map(); // Map<level, nodeId[]>
    this.ast.nodes.forEach(node => {
      const level = this.levels.get(node.id) || 0;
      if (!levelNodes.has(level)) {
        levelNodes.set(level, []);
      }
      levelNodes.get(level).push(node.id);
    });

    // Assigner les colonnes
    levelNodes.forEach((nodeIds, level) => {
      nodeIds.forEach((nodeId, idx) => {
        this.columns.set(nodeId, idx);
      });
    });

    // Calcule les positions finales
    const maxWidth = Math.max(...[...levelNodes.values()].map(arr => arr.length), 1);

    this.ast.nodes.forEach(node => {
      const level = this.levels.get(node.id) || 0;
      const column = this.columns.get(node.id) || 0;
      const nodesAtLevel = levelNodes.get(level)?.length || 1;

      // Centre les nœuds horizontalement
      const totalWidth = nodesAtLevel * (CONFIG.nodeWidth + CONFIG.nodeSpacingX);
      const startX = (maxWidth * (CONFIG.nodeWidth + CONFIG.nodeSpacingX) - totalWidth) / 2;

      this.positions.set(node.id, {
        x: CONFIG.padding + startX + column * (CONFIG.nodeWidth + CONFIG.nodeSpacingX),
        y: CONFIG.padding + level * (CONFIG.nodeHeight + CONFIG.nodeSpacingY)
      });
    });

    return {
      positions: this.positions,
      width: maxWidth * (CONFIG.nodeWidth + CONFIG.nodeSpacingX) + CONFIG.padding * 2,
      height: (Math.max(...this.levels.values(), 0) + 1) * (CONFIG.nodeHeight + CONFIG.nodeSpacingY) + CONFIG.padding * 2
    };
  }
}

class SVGRenderer {
  constructor(ast) {
    this.ast = ast;
    this.layout = new LayoutEngine(ast);
  }

  escapeXml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  renderTerminal(node, pos) {
    const { nodeWidth, nodeHeight, colors } = CONFIG;
    const rx = nodeHeight / 2; // Bords arrondis pour terminal

    return `
      <g class="node terminal" data-id="${node.id}">
        <rect
          x="${pos.x}" y="${pos.y}"
          width="${nodeWidth}" height="${nodeHeight}"
          rx="${rx}" ry="${rx}"
          fill="${colors.terminal.fill}"
          stroke="${colors.terminal.stroke}"
          stroke-width="2"
        />
        <text
          x="${pos.x + nodeWidth / 2}"
          y="${pos.y + nodeHeight / 2 + 5}"
          text-anchor="middle"
          fill="${colors.terminal.text}"
          font-size="${CONFIG.fontSize}"
          font-family="Arial, sans-serif"
        >${this.escapeXml(node.text)}</text>
      </g>
    `;
  }

  renderProcess(node, pos) {
    const { nodeWidth, nodeHeight, colors } = CONFIG;

    return `
      <g class="node process" data-id="${node.id}">
        <rect
          x="${pos.x}" y="${pos.y}"
          width="${nodeWidth}" height="${nodeHeight}"
          fill="${colors.process.fill}"
          stroke="${colors.process.stroke}"
          stroke-width="2"
        />
        <text
          x="${pos.x + nodeWidth / 2}"
          y="${pos.y + nodeHeight / 2 + 5}"
          text-anchor="middle"
          fill="${colors.process.text}"
          font-size="${CONFIG.fontSize}"
          font-family="Arial, sans-serif"
        >${this.escapeXml(node.text)}</text>
      </g>
    `;
  }

  renderDecision(node, pos) {
    const { nodeWidth, nodeHeight, colors } = CONFIG;
    const cx = pos.x + nodeWidth / 2;
    const cy = pos.y + nodeHeight / 2;
    const hw = nodeWidth / 2;
    const hh = nodeHeight / 2 + 10;

    return `
      <g class="node decision" data-id="${node.id}">
        <polygon
          points="${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}"
          fill="${colors.decision.fill}"
          stroke="${colors.decision.stroke}"
          stroke-width="2"
        />
        <text
          x="${cx}"
          y="${cy + 5}"
          text-anchor="middle"
          fill="${colors.decision.text}"
          font-size="${CONFIG.fontSize}"
          font-family="Arial, sans-serif"
        >${this.escapeXml(node.text)}</text>
      </g>
    `;
  }

  renderIO(node, pos) {
    const { nodeWidth, nodeHeight, colors } = CONFIG;
    const skew = 15;

    return `
      <g class="node io" data-id="${node.id}">
        <polygon
          points="${pos.x + skew},${pos.y} ${pos.x + nodeWidth},${pos.y} ${pos.x + nodeWidth - skew},${pos.y + nodeHeight} ${pos.x},${pos.y + nodeHeight}"
          fill="${colors.io.fill}"
          stroke="${colors.io.stroke}"
          stroke-width="2"
        />
        <text
          x="${pos.x + nodeWidth / 2}"
          y="${pos.y + nodeHeight / 2 + 5}"
          text-anchor="middle"
          fill="${colors.io.text}"
          font-size="${CONFIG.fontSize}"
          font-family="Arial, sans-serif"
        >${this.escapeXml(node.text)}</text>
      </g>
    `;
  }

  renderConnection(conn, positions) {
    const { nodeWidth, nodeHeight, colors } = CONFIG;

    const fromPos = positions.get(conn.from);
    const toPos = positions.get(conn.to);

    if (!fromPos || !toPos) return '';

    const fromNode = this.ast.nodes.find(n => n.id === conn.from);
    const toNode = this.ast.nodes.find(n => n.id === conn.to);

    // Points de départ et d'arrivée
    let x1 = fromPos.x + nodeWidth / 2;
    let y1 = fromPos.y + nodeHeight;
    let x2 = toPos.x + nodeWidth / 2;
    let y2 = toPos.y;

    // Ajustement pour les décisions (losange plus grand)
    if (fromNode && fromNode.type === NodeType.DECISION) {
      y1 += 10;
    }

    // Chemin avec courbe de Bézier pour les connexions non verticales
    let path;
    if (Math.abs(x1 - x2) < 5) {
      // Ligne droite verticale
      path = `M ${x1} ${y1} L ${x2} ${y2}`;
    } else {
      // Courbe de Bézier
      const midY = (y1 + y2) / 2;
      path = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
    }

    // Label de la connexion
    let labelSvg = '';
    if (conn.label) {
      const labelX = (x1 + x2) / 2;
      const labelY = (y1 + y2) / 2 - 10;
      labelSvg = `
        <rect
          x="${labelX - 20}" y="${labelY - 12}"
          width="40" height="18"
          fill="white"
          rx="3"
        />
        <text
          x="${labelX}"
          y="${labelY}"
          text-anchor="middle"
          fill="${colors.arrow.stroke}"
          font-size="12"
          font-family="Arial, sans-serif"
        >${this.escapeXml(conn.label)}</text>
      `;
    }

    return `
      <g class="connection">
        <path
          d="${path}"
          fill="none"
          stroke="${colors.arrow.stroke}"
          stroke-width="2"
          marker-end="url(#arrowhead)"
        />
        ${labelSvg}
      </g>
    `;
  }

  render() {
    const { positions, width, height } = this.layout.calculateLayout();

    const defs = `
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="${CONFIG.colors.arrow.fill}"
          />
        </marker>
      </defs>
    `;

    // Render les connexions d'abord (en dessous)
    const connectionsSvg = this.ast.connections
      .map(conn => this.renderConnection(conn, positions))
      .join('\n');

    // Render les nœuds
    const nodesSvg = this.ast.nodes.map(node => {
      const pos = positions.get(node.id);
      if (!pos) return '';

      switch (node.type) {
        case NodeType.TERMINAL:
          return this.renderTerminal(node, pos);
        case NodeType.PROCESS:
          return this.renderProcess(node, pos);
        case NodeType.DECISION:
          return this.renderDecision(node, pos);
        case NodeType.IO:
          return this.renderIO(node, pos);
        default:
          return this.renderProcess(node, pos);
      }
    }).join('\n');

    // Titre
    const titleSvg = `
      <text
        x="${width / 2}"
        y="25"
        text-anchor="middle"
        fill="#374151"
        font-size="18"
        font-weight="bold"
        font-family="Arial, sans-serif"
      >${this.escapeXml(this.ast.name)}</text>
    `;

    return `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 ${width} ${height + 20}"
        width="${width}"
        height="${height + 20}"
      >
        ${defs}
        ${titleSvg}
        <g transform="translate(0, 20)">
          ${connectionsSvg}
          ${nodesSvg}
        </g>
      </svg>
    `.trim();
  }
}

function render(ast) {
  const renderer = new SVGRenderer(ast);
  return renderer.render();
}

module.exports = {
  SVGRenderer,
  LayoutEngine,
  render,
  CONFIG
};
