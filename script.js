if (typeof noise === 'undefined') {
  window.noise = {
    seed() {},
    perlin2(x, y) {
      return Math.sin(x * 2.13 + y * 1.37) * Math.cos(y * 1.91 - x * 1.17);
    }
  };
}

class MeshSVG {
  constructor() {
    this.ratio = 297 / 210;
    this.maxWidth = 1280;
    this.el = document.querySelector('svg');
    this.resize();
  }

  resize() {
    this.width = Math.min(window.innerWidth * 0.9, this.maxWidth);
    this.height = this.width / this.ratio;
    this.el.setAttribute('width', `${this.width}px`);
    this.el.setAttribute('height', `${this.height}px`);
    this.el.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
  }
}

class Scene {
  constructor(svg) {
    this.svg = svg;
    this.isPaused = false;
    this.speedX = 0.00045;
    this.speedY = 0.00034;
    this.strength = 12;

    window.addEventListener('resize', () => {
      this.svg.resize();
      this.generate();
    });
  }

  generate() {
    noise.seed(Math.random());
    this.svg.el.innerHTML = '';

    this.pathB = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.pathB.setAttribute('fill', 'none');
    this.pathB.setAttribute('stroke', '#ff4f9a');
    this.pathB.setAttribute('stroke-width', '1.3px');

    this.pathR = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.pathR.setAttribute('fill', 'none');
    this.pathR.setAttribute('stroke', '#ff8fc2');
    this.pathR.setAttribute('stroke-width', '1.3px');

    this.svg.el.append(this.pathB, this.pathR);

    this.rows = { b: [], r: [] };
    this.cols = { b: [], r: [] };

    const paddingX = this.svg.width * 0.1;
    const paddingY = this.svg.height * 0.1;
    const width = this.svg.width - paddingX;
    const height = this.svg.height - paddingY;
    const totalCols = Math.max(30, Math.floor(width * 0.075));
    const totalRows = Math.max(24, Math.floor(height * 0.32));
    const stepX = width / totalCols;
    const stepY = height / totalRows;

    this.flag = { x: paddingX / 2, y: paddingY / 2, lines: [] };

    for (let i = 0; i < totalRows; i += 1) {
      const line = [];
      for (let j = 0; j < totalCols; j += 1) {
        const px = this.flag.x + j * stepX;
        const py = this.flag.y + i * stepY;
        const u = j / (totalCols - 1);
        const v = i / (totalRows - 1);
        const edgeFadeX = Math.sin(Math.PI * u);
        const edgeFadeY = Math.sin(Math.PI * v);
        const edgeInfluence = edgeFadeX * edgeFadeY;

        line.push({
          originX: px,
          originY: py,
          offsetX: 0,
          offsetY: 0,
          x: px,
          y: py,
          edgeInfluence
        });
      }
      this.flag.lines.push(line);
    }

    for (let i = 0; i < totalRows; i += 1) {
      const pb = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const pr = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      this.rows.b.push(pb);
      this.rows.r.push(pr);
      this.pathB.append(pb);
      this.pathR.append(pr);
    }

    for (let i = 0; i < totalCols; i += 1) {
      const pb = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const pr = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      this.cols.b.push(pb);
      this.cols.r.push(pr);
      this.pathB.append(pb);
      this.pathR.append(pr);
    }

    if (!this.isPaused) this.animate();
  }

  move(time) {
    this.flag.lines.forEach((line) => {
      line.forEach((point) => {
        const flow = noise.perlin2(
          point.originX * 0.002 + time * this.speedX,
          point.originY * 0.003 + time * this.speedY
        );

        const rolling = Math.sin(time * 0.0018 + point.originX * 0.012) * 4;
        const flutter = Math.cos(time * 0.002 + point.originY * 0.014) * 4;
        const amplitude = point.edgeInfluence;

        const offsetX = (Math.cos(flow * Math.PI * 2) * this.strength + rolling) * amplitude;
        const offsetY = (Math.sin(flow * Math.PI * 2) * this.strength + flutter) * amplitude;

        point.offsetX = offsetX;
        point.offsetY = offsetY;
        point.x = point.originX + offsetX;
        point.y = point.originY + offsetY;
      });
    });
  }

  draw() {
    const aStrength = 0.38;

    this.flag.lines.forEach((line, index) => {
      const start = line[0];
      let d = `M ${start.x} ${start.y} `;
      let d2 = `M ${start.x + start.offsetX * aStrength} ${start.y + start.offsetY * aStrength} `;

      line.forEach((point, pointIndex) => {
        const p2 = line[pointIndex + 1] || line[line.length - 1];
        d += `Q ${point.x} ${point.y} ${(point.x + p2.x) / 2} ${(point.y + p2.y) / 2} `;
        d2 += `Q ${point.x + point.offsetX * aStrength} ${point.y + point.offsetY * aStrength} ${(point.x + point.offsetX * aStrength + p2.x + p2.offsetX * aStrength) / 2} ${(point.y + point.offsetY * aStrength + p2.y + p2.offsetY * aStrength) / 2} `;
      });

      this.rows.b[index].setAttribute('d', d);
      this.rows.r[index].setAttribute('d', d2);
    });

    const cols = [];
    this.flag.lines.forEach((line) => {
      line.forEach((point, colIndex) => {
        if (!cols[colIndex]) cols[colIndex] = [];
        cols[colIndex].push(point);
      });
    });

    cols.forEach((col, index) => {
      let d = '';
      let d2 = '';

      col.forEach((point, pointIndex) => {
        const cmd = pointIndex === 0 ? 'M' : 'L';
        d += ` ${cmd} ${point.x} ${point.y} `;
        d2 += ` ${cmd} ${point.x + point.offsetX * aStrength} ${point.y + point.offsetY * aStrength} `;
      });

      this.cols.b[index].setAttribute('d', d);
      this.cols.r[index].setAttribute('d', d2);
    });
  }

  animate() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.tick.bind(this));
  }

  tick(nowTime = performance.now()) {
    if (!this.isPaused) {
      this.move(nowTime);
      this.draw();
    }

    this.raf = requestAnimationFrame(this.tick.bind(this));
  }
}

const scene = new Scene(new MeshSVG());
scene.generate();
