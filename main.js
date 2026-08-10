(function () {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function initDesktop() {
    const desktop = document.querySelector("#desktop-screen");
    const startButton = document.querySelector("#start-button");
    const startMenu = document.querySelector("#start-menu");
    const taskClock = document.querySelector("#task-clock");
    const windows = Array.from(document.querySelectorAll(".os-window:not([hidden])"));
    const desktopIcons = Array.from(document.querySelectorAll(".desktop-icon"));
    const taskbarApps = Array.from(document.querySelectorAll(".taskbar-app"));
    let topZ = 10;

    const fileData = {
      desktop: {
        title: "Desktop",
        description: "ウィンドウ、アイコン、タスクバーのドラッグ境界を確認する場所です。",
      },
      motion: {
        title: "Motion.js",
        description: "開く、閉じる、最小化、復帰の動きを順番に組むと自然なGUIになります。",
      },
      drag: {
        title: "Draggable.js",
        description: "triggerにタイトルバーを指定すると、ウィンドウ全体をドラッグできます。",
      },
      theme: {
        title: "Theme.css",
        description: "OS全体のアクセントとウィンドウの光り方は、柔らかい灰色で固定しています。",
      },
    };

    function findWindow(name) {
      return windows.find((windowEl) => windowEl.dataset.window === name);
    }

    function updateClock() {
      if (!taskClock) {
        return;
      }

      const now = new Date();
      taskClock.textContent = now.toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      });
      taskClock.dateTime = now.toISOString();
    }

    function initWaveMesh() {
      const stage = document.querySelector("#mesh-stage");

      if (!stage || !window.THREE) {
        return;
      }

      const THREE = window.THREE;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
      let renderer = null;

      try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      } catch (error) {
        return;
      }

      const geometry = new THREE.PlaneGeometry(18, 11, 18, 10);
      const material = new THREE.MeshBasicMaterial({
        color: 0x8a8a8a,
        transparent: true,
        opacity: 0.62,
        wireframe: true,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      const positions = geometry.attributes.position;
      const basePositions = new Float32Array(positions.array);
      let animationFrame = 0;

      renderer.setClearColor(0xffffff, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      stage.appendChild(renderer.domElement);

      camera.position.set(0, 2.2, 6.4);
      camera.lookAt(0, 0, 0);
      mesh.rotation.x = -1.08;
      mesh.rotation.z = -0.24;
      mesh.position.y = -0.28;
      scene.add(mesh);

      function resizeMesh() {
        const rect = stage.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width));
        const height = Math.max(1, Math.round(rect.height));

        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        const aspectScale = width > height ? 1.18 : 0.94;
        mesh.scale.set(aspectScale, 1, 1);
      }

      function renderMesh(time = 0) {
        const seconds = time * 0.001;
        const array = positions.array;

        for (let index = 0; index < array.length; index += 3) {
          const x = basePositions[index];
          const y = basePositions[index + 1];
          const ridge =
            Math.sin(x * 1.4 + seconds * 1.15) * 0.2 +
            Math.sin(y * 2.1 + seconds * 0.85) * 0.16 +
            Math.sin((x + y) * 1.05 + seconds * 1.35) * 0.1;

          array[index] = x;
          array[index + 1] = y;
          array[index + 2] = ridge;
        }

        positions.needsUpdate = true;
        mesh.position.x = Math.sin(seconds * 0.12) * 0.82;
        mesh.position.y = -0.28 + Math.sin(seconds * 0.1) * 0.36;
        mesh.rotation.x = -1.08 + Math.sin(seconds * 0.08) * 0.035;
        mesh.rotation.z = -0.24 + Math.sin(seconds * 0.16) * 0.055;
        renderer.render(scene, camera);

        if (!prefersReducedMotion) {
          animationFrame = window.requestAnimationFrame(renderMesh);
        }
      }

      resizeMesh();
      renderMesh(0);
      window.addEventListener("resize", () => {
        resizeMesh();

        if (prefersReducedMotion) {
          renderMesh(0);
        }
      });

      if (prefersReducedMotion) {
        return;
      }

      document.addEventListener("visibilitychange", () => {
        if (document.hidden && animationFrame) {
          window.cancelAnimationFrame(animationFrame);
          animationFrame = 0;
        }

        if (!document.hidden && !animationFrame) {
          animationFrame = window.requestAnimationFrame(renderMesh);
        }
      });
    }

    function syncTaskbar(activeName) {
      taskbarApps.forEach((button) => {
        const appWindow = findWindow(button.dataset.windowTarget);
        const isOpen = appWindow && appWindow.classList.contains("is-open");
        button.classList.toggle("is-active", button.dataset.windowTarget === activeName && isOpen);
        button.classList.toggle("is-running", Boolean(isOpen));
      });
    }

    function syncBrandWidth() {
      const brand = document.querySelector(".brand-composition");
      const word = document.querySelector(".desktop-brand-word");
      const panels = Array.from(document.querySelectorAll("[data-brand-grid]"));
      const inkCanvas = document.querySelector("#ink-cutout-canvas");
      const inkContext = inkCanvas ? inkCanvas.getContext("2d") : null;
      let mergeLinks = [];
      let mergeLinkMap = new Map();
      let mergeTimer = 0;
      let inkAnimationFrame = 0;
      let hasPlayedIntro = false;

      if (!brand || !word) {
        return;
      }

      function resizeInkCanvas() {
        if (!inkCanvas || !inkContext) {
          return null;
        }

        const rect = inkCanvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const width = Math.max(1, Math.round(rect.width * dpr));
        const height = Math.max(1, Math.round(rect.height * dpr));

        if (inkCanvas.width !== width || inkCanvas.height !== height) {
          inkCanvas.width = width;
          inkCanvas.height = height;
        }

        inkContext.setTransform(dpr, 0, 0, dpr, 0, 0);
        return rect;
      }

      function traceRoundedRect(ctx, x, y, width, height, radius) {
        const safeRadius = Math.min(radius, width / 2, height / 2);

        ctx.beginPath();
        ctx.moveTo(x + safeRadius, y);
        ctx.lineTo(x + width - safeRadius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
        ctx.lineTo(x + width, y + height - safeRadius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
        ctx.lineTo(x + safeRadius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
        ctx.lineTo(x, y + safeRadius);
        ctx.quadraticCurveTo(x, y, x + safeRadius, y);
        ctx.closePath();
      }

      function drawInkCutouts() {
        if (!inkContext) {
          return;
        }

        const canvasRect = resizeInkCanvas();

        if (!canvasRect) {
          return;
        }

        inkContext.clearRect(0, 0, canvasRect.width, canvasRect.height);
        inkContext.globalAlpha = 1;
        inkContext.globalCompositeOperation = "source-over";
        inkContext.fillStyle = "#000000";
        inkContext.fillRect(0, 0, canvasRect.width, canvasRect.height);
        inkContext.globalCompositeOperation = "destination-out";
        inkContext.fillStyle = "#000000";

        panels.forEach((panel) => {
          Array.from(panel.children).forEach((block) => {
            const blockStyle = window.getComputedStyle(block);
            const opacity = Number.parseFloat(blockStyle.opacity) || 0;

            if (opacity <= 0.001) {
              return;
            }

            const rect = block.getBoundingClientRect();

            if (rect.width <= 0 || rect.height <= 0) {
              return;
            }

            inkContext.globalAlpha = opacity;
            traceRoundedRect(
              inkContext,
              rect.left - canvasRect.left,
              rect.top - canvasRect.top,
              rect.width,
              rect.height,
              Math.min(rect.width, rect.height) * 0.22,
            );
            inkContext.fill();
          });
        });

        mergeLinks.forEach((link) => {
          if (link.progress <= 0.001) {
            return;
          }

          const fromRect = link.from.getBoundingClientRect();
          const toRect = link.to.getBoundingClientRect();
          const fromOpacity = Number.parseFloat(window.getComputedStyle(link.from).opacity) || 0;
          const toOpacity = Number.parseFloat(window.getComputedStyle(link.to).opacity) || 0;
          const opacity = Math.min(fromOpacity, toOpacity) * link.progress;
          const bridgeSize = Math.min(fromRect.width, fromRect.height) * 0.82;

          if (opacity <= 0.001) {
            return;
          }

          inkContext.globalAlpha = opacity;
          inkContext.lineCap = "round";
          inkContext.lineJoin = "round";
          inkContext.lineWidth = bridgeSize;
          inkContext.beginPath();

          if (link.direction === "right") {
            const fromX = fromRect.left - canvasRect.left + fromRect.width / 2;
            const toX = toRect.left - canvasRect.left + toRect.width / 2;
            const y = fromRect.top - canvasRect.top + fromRect.height / 2;
            const center = (fromX + toX) / 2;
            const halfWidth = ((toX - fromX) / 2) * link.progress;

            inkContext.moveTo(center - halfWidth, y);
            inkContext.lineTo(center + halfWidth, y);
          } else {
            const x = fromRect.left - canvasRect.left + fromRect.width / 2;
            const fromY = fromRect.top - canvasRect.top + fromRect.height / 2;
            const toY = toRect.top - canvasRect.top + toRect.height / 2;
            const center = (fromY + toY) / 2;
            const halfHeight = ((toY - fromY) / 2) * link.progress;

            inkContext.moveTo(x, center - halfHeight);
            inkContext.lineTo(x, center + halfHeight);
          }

          inkContext.stroke();
        });

        const wordStyle = window.getComputedStyle(word);
        const wordOpacity = Number.parseFloat(wordStyle.opacity) || 0;

        if (wordOpacity > 0.001) {
          const wordRect = word.getBoundingClientRect();
          const text = word.textContent.trim();

          inkContext.globalAlpha = wordOpacity;
          inkContext.font = `${wordStyle.fontStyle} ${wordStyle.fontWeight} ${wordStyle.fontSize} ${wordStyle.fontFamily}`;
          inkContext.textAlign = "center";
          inkContext.textBaseline = "alphabetic";

          const metrics = inkContext.measureText(text);
          const ascent = metrics.actualBoundingBoxAscent || wordRect.height * 0.72;
          const descent = metrics.actualBoundingBoxDescent || wordRect.height * 0.18;
          const x = wordRect.left - canvasRect.left + wordRect.width / 2;
          const y = wordRect.top - canvasRect.top + wordRect.height / 2 + (ascent - descent) / 2;

          inkContext.fillText(text, x, y);
        }

        inkContext.globalAlpha = 1;
        inkContext.globalCompositeOperation = "source-over";
      }

      function requestInkDraw() {
        if (inkAnimationFrame) {
          return;
        }

        inkAnimationFrame = window.requestAnimationFrame(() => {
          inkAnimationFrame = 0;
          drawInkCutouts();
        });
      }

      function fillPanel(panel, columns, rowsPerPanel) {
        const total = columns * rowsPerPanel;

        if (panel.childElementCount === total) {
          return false;
        }

        const fragment = document.createDocumentFragment();
        const isTopPanel = panel.classList.contains("brand-block-panel-top");
        const centerColumn = (columns - 1) / 2;

        for (let row = 0; row < rowsPerPanel; row += 1) {
          for (let column = 0; column < columns; column += 1) {
            const block = document.createElement("span");
            const edgeDistance = isTopPanel ? rowsPerPanel - 1 - row : row;
            const centerDistance = Math.abs(column - centerColumn);
            const rippleOffset = ((row + column) % 3) * 0.08;

            block.className = "brand-block";
            block.dataset.column = String(column);
            block.dataset.row = String(row);
            block.dataset.popOrder = String(edgeDistance + centerDistance * 0.12 + rippleOffset);
            fragment.appendChild(block);
          }
        }

        panel.replaceChildren(fragment);
        return true;
      }

      function buildMergeLinks(columns, rowsPerPanel) {
        mergeLinks = [];
        mergeLinkMap = new Map();

        panels.forEach((panel, panelIndex) => {
          const blocks = Array.from(panel.children);

          blocks.forEach((block) => {
            const row = Number.parseInt(block.dataset.row, 10);
            const column = Number.parseInt(block.dataset.column, 10);
            const index = row * columns + column;
            const panelKey = panelIndex === 0 ? "top" : "bottom";

            if (column < columns - 1) {
              const link = {
                from: block,
                to: blocks[index + 1],
                direction: "right",
                key: `${panelKey}:${row}:${column}:right`,
                progress: 0,
                busy: false,
              };

              mergeLinks.push(link);
              mergeLinkMap.set(link.key, link);
            }

            if (row < rowsPerPanel - 1) {
              const link = {
                from: block,
                to: blocks[index + columns],
                direction: "down",
                key: `${panelKey}:${row}:${column}:down`,
                progress: 0,
                busy: false,
              };

              mergeLinks.push(link);
              mergeLinkMap.set(link.key, link);
            }
          });
        });
      }

      function animateMergeLink(link, delay) {
        link.busy = true;

        gsap
          .timeline({
            delay,
            onUpdate: requestInkDraw,
            onComplete: () => {
              link.busy = false;
              link.progress = 0;
              requestInkDraw();
            },
          })
          .to(link, { progress: 1, duration: 0.42, ease: "sine.inOut" })
          .to(link, { progress: 1, duration: 0.82 })
          .to(link, { progress: 0, duration: 0.52, ease: "sine.inOut" });
      }

      function triggerRandomMerges() {
        if (!mergeLinks.length || prefersReducedMotion) {
          return;
        }

        const columns = Number.parseInt(window.getComputedStyle(brand).getPropertyValue("--brand-columns"), 10) || 10;
        const rowsPerPanel = Number.parseInt(window.getComputedStyle(brand).getPropertyValue("--brand-panel-rows"), 10) || 10;
        const keys = new Set();

        function clamp(value, min, max) {
          return Math.max(min, Math.min(max, value));
        }

        function addHorizontal(panelKey, row, column, length) {
          const safeRow = clamp(row, 0, rowsPerPanel - 1);
          const start = clamp(column, 0, columns - 2);
          const end = clamp(column + length - 1, 0, columns - 2);

          for (let nextColumn = start; nextColumn <= end; nextColumn += 1) {
            keys.add(`${panelKey}:${safeRow}:${nextColumn}:right`);
          }
        }

        function addVertical(panelKey, column, row, length) {
          const safeColumn = clamp(column, 0, columns - 1);
          const start = clamp(row, 0, rowsPerPanel - 2);
          const end = clamp(row + length - 1, 0, rowsPerPanel - 2);

          for (let nextRow = start; nextRow <= end; nextRow += 1) {
            keys.add(`${panelKey}:${nextRow}:${safeColumn}:down`);
          }
        }

        function addSolidBlock(panelKey, row, column, width, height) {
          const safeWidth = clamp(width, 2, columns);
          const safeHeight = clamp(height, 2, rowsPerPanel);
          const startColumn = clamp(column, 0, columns - safeWidth);
          const startRow = clamp(row, 0, rowsPerPanel - safeHeight);

          for (let offset = 0; offset < safeHeight; offset += 1) {
            addHorizontal(panelKey, startRow + offset, startColumn, safeWidth - 1);
          }

          for (let offset = 0; offset < safeWidth; offset += 1) {
            addVertical(panelKey, startColumn + offset, startRow, safeHeight - 1);
          }
        }

        function addSnake(panelKey, row, column, width, height) {
          const safeWidth = clamp(width, 3, columns);
          const safeHeight = clamp(height, 2, rowsPerPanel);
          const startColumn = clamp(column, 0, columns - safeWidth);
          const startRow = clamp(row, 0, rowsPerPanel - safeHeight);

          for (let offset = 0; offset < safeHeight; offset += 1) {
            addHorizontal(panelKey, startRow + offset, startColumn, safeWidth - 1);

            if (offset < safeHeight - 1) {
              const edgeColumn = offset % 2 === 0 ? startColumn + safeWidth - 1 : startColumn;
              addVertical(panelKey, edgeColumn, startRow + offset, 1);
            }
          }
        }

        function addPattern() {
          const panelKey = Math.random() > 0.5 ? "top" : "bottom";
          const row = Math.floor(Math.random() * rowsPerPanel);
          const column = Math.floor(Math.random() * columns);
          const pattern = Math.floor(Math.random() * 8);

          if (pattern === 0) {
            const length = 2 + Math.floor(Math.random() * 5);

            addHorizontal(panelKey, row, column, length);

            if (Math.random() < 0.72) {
              addVertical(panelKey, column + Math.floor(length / 2), row, 1 + Math.floor(Math.random() * 3));
            }
          }

          if (pattern === 1) {
            const height = 2 + Math.floor(Math.random() * 5);

            addVertical(panelKey, column, row, height);

            if (Math.random() < 0.68) {
              addHorizontal(panelKey, row + Math.floor(height / 2), column - 1, 2 + Math.floor(Math.random() * 3));
            }
          }

          if (pattern === 2) {
            addSolidBlock(panelKey, row, column, 2 + Math.floor(Math.random() * 3), 2 + Math.floor(Math.random() * 3));
          }

          if (pattern === 3) {
            const steps = 2 + Math.floor(Math.random() * 4);

            for (let offset = 0; offset < steps; offset += 1) {
              addHorizontal(panelKey, row + offset, column + offset, 1);
              addVertical(panelKey, column + offset + 1, row + offset, 1);
            }
          }

          if (pattern === 4) {
            const arm = 2 + Math.floor(Math.random() * 3);

            addHorizontal(panelKey, row, column - arm, arm * 2);
            addVertical(panelKey, column, row - 1, 2 + Math.floor(Math.random() * 3));
          }

          if (pattern === 5) {
            const width = 2 + Math.floor(Math.random() * 4);
            const height = 2 + Math.floor(Math.random() * 4);

            addHorizontal(panelKey, row, column, width);
            addVertical(panelKey, column, row, height);
          }

          if (pattern === 6) {
            addSnake(panelKey, row, column, 3 + Math.floor(Math.random() * 4), 2 + Math.floor(Math.random() * 3));
          }

          if (pattern === 7) {
            const width = 3 + Math.floor(Math.random() * 4);

            addHorizontal(panelKey, row, column, width);
            addHorizontal(panelKey, row + 1, column + 1, Math.max(1, width - 2));

            if (Math.random() < 0.72) {
              addVertical(panelKey, column + 1, row, 1);
              addVertical(panelKey, column + width - 1, row, 1);
            }
          }
        }

        const patternCount = Math.random() < 0.44 ? 2 : 1;

        for (let index = 0; index < patternCount; index += 1) {
          addPattern();
        }

        Array.from(keys)
          .map((key) => mergeLinkMap.get(key))
          .filter((link) => link && !link.busy)
          .forEach((link, index) => animateMergeLink(link, index * 0.06));
      }

      function scheduleRandomMerges(initial = false) {
        if (prefersReducedMotion) {
          return;
        }

        window.clearTimeout(mergeTimer);
        mergeTimer = window.setTimeout(() => {
          if (Math.random() < 0.94) {
            triggerRandomMerges();
          }

          scheduleRandomMerges();
        }, initial ? 1800 : 900 + Math.random() * 1400);
      }

      function playBrandIntro() {
        if (hasPlayedIntro) {
          return;
        }

        hasPlayedIntro = true;
        brand.classList.add("is-brand-ready");

        const blocks = panels.flatMap((panel) => Array.from(panel.children));

        if (prefersReducedMotion) {
          gsap.set(word, { autoAlpha: 1, y: 0, filter: "none" });
          gsap.set(blocks, { autoAlpha: 1, scale: 1 });
          drawInkCutouts();
          return;
        }

        gsap.set(word, { autoAlpha: 0, y: 14, filter: "blur(8px)" });
        gsap.set(blocks, { autoAlpha: 0, scale: 0.2, transformOrigin: "50% 50%" });
        drawInkCutouts();

        gsap
          .timeline({
            defaults: { overwrite: true },
            onUpdate: requestInkDraw,
            onComplete: () => {
              drawInkCutouts();
              scheduleRandomMerges(true);
            },
          })
          .to(word, {
            autoAlpha: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.82,
            ease: "power2.out",
          })
          .to(
            blocks,
            {
              autoAlpha: 1,
              scale: 1,
              duration: 0.34,
              ease: "back.out(2.6)",
              stagger: (_, block) => Number(block.dataset.popOrder || 0) * 0.05,
            },
            "+=0.08",
          );
      }

      function updateBrandWidth() {
        const styles = window.getComputedStyle(brand);
        const columns = Number.parseInt(styles.getPropertyValue("--brand-columns"), 10) || 10;
        const rowsPerPanel = Number.parseInt(styles.getPropertyValue("--brand-panel-rows"), 10) || 10;
        const gap = Number.parseFloat(styles.getPropertyValue("--brand-grid-gap")) || 4;
        const stackGap = Number.parseFloat(styles.getPropertyValue("--brand-stack-gap")) || 0;
        const sideMargin = Number.parseFloat(styles.getPropertyValue("--brand-side-margin")) || 0;
        const desktopRect = desktop.getBoundingClientRect();
        const wordRect = word.getBoundingClientRect();
        const maxWidth = Math.max(220, desktopRect.width - sideMargin);
        const width = Math.min(Math.ceil(wordRect.width), maxWidth);
        const availablePanelHeight = Math.max(120, (desktopRect.height - 54 - wordRect.height - stackGap * 2) / 2);
        const blockSizeByWidth = (width - gap * (columns - 1)) / columns;
        const blockSizeByHeight = (availablePanelHeight - gap * (rowsPerPanel - 1)) / rowsPerPanel;
        const blockSize = Math.max(8, Math.min(blockSizeByWidth, blockSizeByHeight));
        const panelWidth = blockSize * columns + gap * (columns - 1);
        const panelHeight = blockSize * rowsPerPanel + gap * (rowsPerPanel - 1);

        if (width > 0) {
          brand.style.setProperty("--brand-word-width", `${width}px`);
          brand.style.setProperty("--brand-block-size", `${blockSize}px`);
          brand.style.setProperty("--brand-panel-width", `${panelWidth}px`);
          brand.style.setProperty("--brand-panel-height", `${panelHeight}px`);
        }

        let didRebuildBlocks = false;

        panels.forEach((panel) => {
          didRebuildBlocks = fillPanel(panel, columns, rowsPerPanel) || didRebuildBlocks;
        });

        if (didRebuildBlocks || !mergeLinks.length) {
          buildMergeLinks(columns, rowsPerPanel);
        }

        requestInkDraw();
      }

      function runIntro() {
        updateBrandWidth();
        playBrandIntro();
      }

      updateBrandWidth();
      window.addEventListener("resize", updateBrandWidth);

      if (document.fonts && document.fonts.ready) {
        const fallbackTimer = window.setTimeout(runIntro, 800);

        document.fonts.ready
          .then(() => {
            window.clearTimeout(fallbackTimer);
            runIntro();
          })
          .catch(runIntro);
      } else {
        window.requestAnimationFrame(runIntro);
      }
    }

    function initWatercolorCanvas() {
      if (prefersReducedMotion) {
        return;
      }

      const canvas = document.querySelector("#watercolor-canvas");

      if (!canvas) {
        return;
      }

      if (window.getComputedStyle(canvas).display === "none") {
        return;
      }

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        return;
      }

      const blooms = [];
      let width = 0;
      let height = 0;
      let dpr = 1;
      let lastX = null;
      let lastY = null;
      let lastBloomAt = 0;
      let animationId = 0;
      let lastFrameAt = performance.now();
      let settleFrames = 0;

      function resizeCanvas() {
        const rect = desktop.getBoundingClientRect();
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = Math.max(1, Math.round(rect.width));
        height = Math.max(1, Math.round(rect.height));
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);
      }

      function drawSoftCircle(x, y, radius, color, alpha) {
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `hsla(${color}, 86%, 72%, ${alpha})`);
        gradient.addColorStop(0.36, `hsla(${color + 10}, 80%, 66%, ${alpha * 0.36})`);
        gradient.addColorStop(0.72, `hsla(${color - 16}, 72%, 62%, ${alpha * 0.12})`);
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      function renderWatercolor(now) {
        const delta = Math.min(48, now - lastFrameAt);
        lastFrameAt = now;

        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = "rgba(0, 0, 0, 0.018)";
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = "source-over";

        for (let index = blooms.length - 1; index >= 0; index -= 1) {
          const bloom = blooms[index];
          bloom.age += delta;

          const progress = Math.min(1, bloom.age / bloom.life);
          const ease = 1 - Math.pow(1 - progress, 3);
          const radius = bloom.radius + ease * bloom.spread;
          const alpha = (1 - progress) * bloom.alpha;
          const wobble = Math.sin(progress * Math.PI * 3 + bloom.seed) * 7;

          drawSoftCircle(bloom.x, bloom.y, radius, bloom.hue, alpha);
          drawSoftCircle(bloom.x + bloom.driftX + wobble, bloom.y + bloom.driftY, radius * 0.62, bloom.hue + 28, alpha * 0.62);
          drawSoftCircle(bloom.x - bloom.driftY * 0.55, bloom.y + bloom.driftX * 0.5, radius * 0.46, bloom.hue - 34, alpha * 0.42);

          if (progress >= 1) {
            blooms.splice(index, 1);
          }
        }

        if (blooms.length > 0 || settleFrames > 0) {
          settleFrames = blooms.length > 0 ? 60 : settleFrames - 1;
          animationId = window.requestAnimationFrame(renderWatercolor);
        } else {
          animationId = 0;
        }
      }

      function addBloom(event) {
        const rect = desktop.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const hue = 185 + (x / Math.max(1, width)) * 42 + (y / Math.max(1, height)) * 18;

        blooms.push({
          x,
          y,
          hue,
          age: 0,
          life: 2600,
          radius: 10 + Math.random() * 8,
          spread: 58 + Math.random() * 44,
          alpha: 0.055 + Math.random() * 0.025,
          driftX: -12 + Math.random() * 24,
          driftY: -10 + Math.random() * 20,
          seed: Math.random() * Math.PI * 2,
        });

        if (blooms.length > 26) {
          blooms.splice(0, blooms.length - 26);
        }

        if (!animationId) {
          lastFrameAt = performance.now();
          animationId = window.requestAnimationFrame(renderWatercolor);
        }
      }

      resizeCanvas();
      window.addEventListener("resize", resizeCanvas);

      desktop.addEventListener("pointermove", (event) => {
        const now = performance.now();
        const movement =
          lastX === null || lastY === null ? Infinity : Math.hypot(event.clientX - lastX, event.clientY - lastY);

        if (movement < 24 || now - lastBloomAt < 95) {
          return;
        }

        lastX = event.clientX;
        lastY = event.clientY;
        lastBloomAt = now;
        addBloom(event);
      });
    }

    function showWindow(windowEl) {
      windowEl.classList.add("is-open");
      gsap.set(windowEl, { autoAlpha: 1, pointerEvents: "auto" });
    }

    function hideWindow(windowEl) {
      windowEl.classList.remove("is-open", "is-active");
      gsap.set(windowEl, { autoAlpha: 0, pointerEvents: "none" });
    }

    function focusWindow(name) {
      const windowEl = findWindow(name);

      if (!windowEl) {
        return;
      }

      topZ += 1;
      windows.forEach((item) => item.classList.remove("is-active"));
      showWindow(windowEl);
      windowEl.classList.add("is-active");
      windowEl.style.zIndex = topZ;
      syncTaskbar(name);
    }

    function openWindow(name) {
      const windowEl = findWindow(name);

      if (!windowEl) {
        return;
      }

      const wasOpen = windowEl.classList.contains("is-open");
      const currentY = gsap.getProperty(windowEl, "y");
      focusWindow(name);

      if (!prefersReducedMotion && !wasOpen) {
        gsap.fromTo(
          windowEl,
          { autoAlpha: 0, y: currentY + 24, scale: 0.94 },
          { autoAlpha: 1, y: currentY, scale: 1, duration: 0.28, ease: "back.out(1.7)" },
        );
      } else {
        gsap.set(windowEl, { autoAlpha: 1, scale: 1 });
      }
    }

    function openDesktopShortcut(icon) {
      const url = icon.dataset.url;

      if (url) {
        const externalWindow = window.open(url, "_blank");

        if (externalWindow) {
          externalWindow.opener = null;
        } else {
          window.location.href = url;
        }

        return;
      }

      if (icon.dataset.windowTarget) {
        openWindow(icon.dataset.windowTarget);
      }
    }

    function minimizeWindow(windowEl) {
      if (!windowEl) {
        return;
      }

      const name = windowEl.dataset.window;
      const currentY = gsap.getProperty(windowEl, "y");
      const finish = () => {
        hideWindow(windowEl);
        gsap.set(windowEl, { y: currentY, scale: 1, pointerEvents: "none" });
        syncTaskbar("");
      };

      if (prefersReducedMotion) {
        finish();
        return;
      }

      gsap.to(windowEl, {
        autoAlpha: 0,
        y: currentY + 36,
        scale: 0.94,
        duration: 0.2,
        ease: "power2.in",
        onComplete: finish,
      });
      syncTaskbar(name);
    }

    function closeWindow(windowEl) {
      if (!windowEl) {
        return;
      }

      const currentY = gsap.getProperty(windowEl, "y");
      const finish = () => {
        const restore = JSON.parse(windowEl.dataset.restore || "{}");

        if (windowEl.classList.contains("is-maximized")) {
          gsap.set(windowEl, {
            x: restore.x ?? 0,
            y: restore.y ?? currentY,
            left: restore.left ?? windowEl.style.left,
            top: restore.top ?? windowEl.style.top,
            width: restore.width ?? windowEl.offsetWidth,
            height: restore.height ?? windowEl.offsetHeight,
          });
        } else {
          gsap.set(windowEl, { y: currentY });
        }

        hideWindow(windowEl);
        windowEl.classList.remove("is-maximized");
        windowEl.removeAttribute("data-restore");
        gsap.set(windowEl, { scale: 0.96, pointerEvents: "none" });
        syncTaskbar("");
      };

      if (prefersReducedMotion) {
        finish();
        return;
      }

      gsap.to(windowEl, {
        autoAlpha: 0,
        y: currentY + 18,
        scale: 0.92,
        duration: 0.18,
        ease: "power2.in",
        onComplete: finish,
      });
    }

    function toggleMaximize(windowEl) {
      focusWindow(windowEl.dataset.window);

      if (windowEl.classList.contains("is-maximized")) {
        const restore = JSON.parse(windowEl.dataset.restore || "{}");
        windowEl.classList.remove("is-maximized");
        windowEl.removeAttribute("data-restore");
        gsap.to(windowEl, {
          x: restore.x || 0,
          y: restore.y || 0,
          left: restore.left || windowEl.style.left,
          top: restore.top || windowEl.style.top,
          width: restore.width || windowEl.offsetWidth,
          height: restore.height || windowEl.offsetHeight,
          duration: prefersReducedMotion ? 0 : 0.24,
          ease: "power2.out",
        });
        return;
      }

      windowEl.dataset.restore = JSON.stringify({
        x: gsap.getProperty(windowEl, "x"),
        y: gsap.getProperty(windowEl, "y"),
        left: windowEl.offsetLeft,
        top: windowEl.offsetTop,
        width: windowEl.offsetWidth,
        height: windowEl.offsetHeight,
      });

      windowEl.classList.add("is-maximized");
      gsap.to(windowEl, {
        x: 0,
        y: 0,
        left: 12,
        top: 12,
        width: Math.max(280, desktop.clientWidth - 24),
        height: Math.max(220, desktop.clientHeight - 24),
        duration: prefersReducedMotion ? 0 : 0.24,
        ease: "power2.out",
      });
    }

    function closeStartMenu() {
      if (!startMenu || !startButton) {
        return;
      }

      startMenu.classList.remove("is-open");
      startButton.setAttribute("aria-expanded", "false");
    }

    function toggleStartMenu() {
      if (!startMenu || !startButton) {
        return;
      }

      const isOpen = startMenu.classList.toggle("is-open");
      startButton.setAttribute("aria-expanded", String(isOpen));

      if (!prefersReducedMotion) {
        gsap.fromTo(
          startMenu,
          { y: isOpen ? 12 : 0, autoAlpha: isOpen ? 0 : 1 },
          { y: isOpen ? 0 : 12, autoAlpha: isOpen ? 1 : 0, duration: 0.18, ease: "power2.out" },
        );
      }
    }

    function appendTerminal(line) {
      const log = document.querySelector("#terminal-log");
      log.textContent = `${log.textContent}\n${line}`;
      log.scrollTop = log.scrollHeight;
    }

    function pulseWindow(windowEl) {
      if (!windowEl || prefersReducedMotion) {
        return;
      }

      gsap.fromTo(
        windowEl,
        { scale: 0.985 },
        { scale: 1, duration: 0.24, ease: "back.out(2.2)" },
      );
    }

    windows.forEach((windowEl) => {
      windowEl.addEventListener("pointerdown", () => focusWindow(windowEl.dataset.window));

      windowEl.querySelectorAll("[data-os-action]").forEach((button) => {
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          const action = button.dataset.osAction;

          if (action === "minimize") {
            minimizeWindow(windowEl);
          }

          if (action === "maximize") {
            toggleMaximize(windowEl);
          }

          if (action === "close") {
            closeWindow(windowEl);
          }
        });
      });
    });

    desktopIcons.forEach((icon) => {
      icon.addEventListener("click", () => {
        desktopIcons.forEach((item) => item.classList.remove("is-selected"));
        icon.classList.add("is-selected");
      });

      icon.addEventListener("dblclick", () => openDesktopShortcut(icon));
      icon.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openDesktopShortcut(icon);
        }
      });
    });

    taskbarApps.forEach((button) => {
      button.addEventListener("click", () => {
        const windowEl = findWindow(button.dataset.windowTarget);
        const isActive = windowEl && windowEl.classList.contains("is-active");
        const isOpen = windowEl && windowEl.classList.contains("is-open");

        if (isActive && isOpen) {
          minimizeWindow(windowEl);
        } else {
          openWindow(button.dataset.windowTarget);
        }
      });
    });

    if (startButton && startMenu) {
      startButton.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleStartMenu();
      });

      startMenu.querySelectorAll("[data-window-target]").forEach((button) => {
        button.addEventListener("click", () => {
          openWindow(button.dataset.windowTarget);
          closeStartMenu();
        });
      });
    }

    desktop.addEventListener("click", (event) => {
      if (!event.target.closest(".start-menu") && !event.target.closest(".start-button")) {
        closeStartMenu();
      }

      if (!event.target.closest(".desktop-icon")) {
        desktopIcons.forEach((icon) => icon.classList.remove("is-selected"));
      }
    });

    document.querySelectorAll(".file-row").forEach((button) => {
      button.addEventListener("click", () => {
        const data = fileData[button.dataset.file];
        document.querySelectorAll(".file-row").forEach((item) => item.classList.remove("is-selected"));
        button.classList.add("is-selected");
        document.querySelector("#file-title").textContent = data.title;
        document.querySelector("#file-description").textContent = data.description;
      });
    });

    function initMiniBrowser() {
      const address = document.querySelector("#browser-address");
      const browserPage = document.querySelector("#browser-page");
      const browserStatus = document.querySelector("#browser-status");
      const backButton = document.querySelector("#browser-back");
      const forwardButton = document.querySelector("#browser-forward");
      const homeButton = document.querySelector("#browser-home");
      const newTabButton = document.querySelector("#browser-new-tab");
      const browserForm = document.querySelector("#browser-form");
      const browserTabs = Array.from(document.querySelectorAll(".browser-tab[data-browser-route]"));
      let browserHistory = ["gsap://start"];
      let browserIndex = 0;

      const internalPages = {
        start: {
          title: "Start",
          html: `
            <div class="browser-hero">
              <p class="eyebrow">Mini Web</p>
              <h2>ブラウザの中のブラウザ</h2>
              <p>URLバー、戻る/進む、検索、ページ内リンクを持つ小さなWeb空間です。</p>
            </div>
            <div class="browser-grid">
              <button class="browser-card" type="button" data-browser-link="gsap://desktop">
                <strong>Desktop</strong>
                <span>このWeb OSの構成をブラウザ内ページとして表示します。</span>
              </button>
              <button class="browser-card" type="button" data-browser-link="gsap://docs">
                <strong>Docs</strong>
                <span>Draggableとウィンドウ操作のメモを開きます。</span>
              </button>
              <button class="browser-card" type="button" data-browser-link="gsap://gallery">
                <strong>Gallery</strong>
                <span>UIパーツの小さなギャラリーを表示します。</span>
              </button>
              <button class="browser-card" type="button" data-browser-link="https://gsap.com/docs/v3/Plugins/Draggable/">
                <strong>External URL</strong>
                <span>外部サイトは埋め込み制限がある場合があります。</span>
              </button>
            </div>
          `,
        },
        desktop: {
          title: "Desktop",
          html: `
            <div class="browser-hero">
              <p class="eyebrow">Local Page</p>
              <h2>GSAP Desktop</h2>
              <p>この画面は、アイコン、ウィンドウ、Startメニュー、タスクバーをHTML/CSS/GSAPで構成しています。</p>
            </div>
            <div class="browser-grid">
              <button class="browser-card" type="button" data-browser-link="gsap://docs">
                <strong>Window motion</strong>
                <span>開く、閉じる、最小化、最大化の状態管理を確認します。</span>
              </button>
              <button class="browser-card" type="button" data-browser-link="gsap://search?q=draggable">
                <strong>Search draggable</strong>
                <span>内部検索ページでDraggable関連を探します。</span>
              </button>
            </div>
          `,
        },
        docs: {
          title: "Docs",
          html: `
            <div class="browser-hero">
              <p class="eyebrow">Docs</p>
              <h2>Draggable memo</h2>
              <p>タイトルバーだけをtriggerにすると、入力欄や本文を邪魔せずウィンドウを動かせます。</p>
            </div>
            <div class="browser-result">
              <strong>Example</strong>
              <p><code>Draggable.create(windowEl, { trigger: titlebar, bounds: desktop })</code></p>
              <button type="button" data-browser-link="gsap://gallery">Open UI gallery</button>
            </div>
          `,
        },
        gallery: {
          title: "Gallery",
          html: `
            <div class="browser-hero">
              <p class="eyebrow">Gallery</p>
              <h2>Web OS parts</h2>
              <p>ブラウザ内でもカードやリンクをクリックしてページ遷移できます。</p>
            </div>
            <div class="browser-grid">
              <button class="browser-card" type="button" data-browser-link="gsap://start">
                <strong>Start page</strong>
                <span>ホームへ戻ります。</span>
              </button>
              <button class="browser-card" type="button" data-browser-link="gsap://desktop">
                <strong>Desktop page</strong>
                <span>デスクトップ概要を開きます。</span>
              </button>
            </div>
          `,
        },
      };

      function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, (char) => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "\"": "&quot;",
          "'": "&#39;",
        })[char]);
      }

      function normalizeAddress(value) {
        const raw = value.trim();

        if (!raw) {
          return "gsap://start";
        }

        if (/^https?:\/\//i.test(raw)) {
          return raw;
        }

        if (/^gsap:\/\//i.test(raw)) {
          return raw.toLowerCase();
        }

        const key = raw.replace(/^\/+/, "").toLowerCase();

        if (internalPages[key]) {
          return `gsap://${key}`;
        }

        if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(raw)) {
          return `https://${raw}`;
        }

        return `gsap://search?q=${encodeURIComponent(raw)}`;
      }

      function routeFromUrl(url) {
        if (!url.startsWith("gsap://")) {
          return "";
        }

        try {
          return new URL(url).hostname || "start";
        } catch {
          return "start";
        }
      }

      function renderSearch(url) {
        const parsed = new URL(url);
        const query = parsed.searchParams.get("q") || "";
        const safeQuery = escapeHtml(query);

        browserStatus.textContent = `Search results for "${query}"`;
        browserPage.innerHTML = `
          <div class="browser-hero">
            <p class="eyebrow">Search</p>
            <h2>${safeQuery}</h2>
            <p>このミニブラウザ内のページを検索している、という想定の結果です。</p>
          </div>
          <div class="browser-search-list">
            <article class="browser-result">
              <strong>Desktop</strong>
              <p>ウィンドウ、タスクバー、Startメニューの構成。</p>
              <button type="button" data-browser-link="gsap://desktop">Open result</button>
            </article>
            <article class="browser-result">
              <strong>Draggable memo</strong>
              <p>タイトルバーをtriggerにしたウィンドウ移動。</p>
              <button type="button" data-browser-link="gsap://docs">Open result</button>
            </article>
          </div>
        `;
      }

      function renderExternal(url) {
        const safeUrl = escapeHtml(url);
        browserStatus.textContent = "External preview. Some sites block iframe embedding.";
        browserPage.innerHTML = `
          <div class="browser-frame-wrap">
            <div class="browser-external-head">
              <p class="eyebrow">External URL</p>
              <h2>${safeUrl}</h2>
              <p class="browser-note">下のプレビューで開けない場合は、外部タブで開いてください。</p>
              <div class="browser-external-actions">
                <a class="browser-external-link" href="${safeUrl}" target="_blank" rel="noopener noreferrer">
                  Open external tab
                </a>
                <button type="button" data-browser-link="gsap://start">Back to start</button>
              </div>
            </div>
            <iframe class="browser-frame" src="${safeUrl}" title="External page preview" loading="lazy" referrerpolicy="no-referrer" sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-scripts allow-same-origin"></iframe>
          </div>
        `;
      }

      function updateBrowserChrome(url) {
        address.value = url;
        backButton.disabled = browserIndex === 0;
        forwardButton.disabled = browserIndex >= browserHistory.length - 1;

        browserTabs.forEach((tab) => {
          tab.classList.toggle("is-selected", tab.dataset.browserRoute === url);
        });
      }

      function renderBrowser(url) {
        const route = routeFromUrl(url);
        updateBrowserChrome(url);

        if (url.startsWith("http://") || url.startsWith("https://")) {
          renderExternal(url);
        } else if (route === "search") {
          renderSearch(url);
        } else if (internalPages[route]) {
          browserStatus.textContent = `Loaded ${internalPages[route].title}`;
          browserPage.innerHTML = internalPages[route].html;
        } else {
          browserStatus.textContent = "Page not found";
          browserPage.innerHTML = `
            <div class="browser-hero">
              <p class="eyebrow">404</p>
              <h2>Page not found</h2>
              <p><code>${escapeHtml(url)}</code> はこのミニブラウザ内にありません。</p>
            </div>
            <button class="browser-card" type="button" data-browser-link="gsap://start">
              <strong>Go home</strong>
              <span>Startページへ戻ります。</span>
            </button>
          `;
        }

        if (!prefersReducedMotion) {
          gsap.fromTo(browserPage, { autoAlpha: 0.8, y: 4 }, { autoAlpha: 1, y: 0, duration: 0.18, ease: "power2.out" });
        }
      }

      function navigateBrowser(url, replace = false) {
        const normalized = normalizeAddress(url);

        if (replace) {
          browserHistory[browserIndex] = normalized;
        } else {
          browserHistory = browserHistory.slice(0, browserIndex + 1);
          browserHistory.push(normalized);
          browserIndex = browserHistory.length - 1;
        }

        renderBrowser(normalized);
      }

      browserForm.addEventListener("submit", (event) => {
        event.preventDefault();
        navigateBrowser(address.value);
      });

      backButton.addEventListener("click", () => {
        if (browserIndex > 0) {
          browserIndex -= 1;
          renderBrowser(browserHistory[browserIndex]);
        }
      });

      forwardButton.addEventListener("click", () => {
        if (browserIndex < browserHistory.length - 1) {
          browserIndex += 1;
          renderBrowser(browserHistory[browserIndex]);
        }
      });

      homeButton.addEventListener("click", () => navigateBrowser("gsap://start"));
      newTabButton.addEventListener("click", () => navigateBrowser("gsap://start"));

      browserTabs.forEach((tab) => {
        tab.addEventListener("click", () => navigateBrowser(tab.dataset.browserRoute));
      });

      browserPage.addEventListener("click", (event) => {
        const link = event.target.closest("[data-browser-link]");

        if (link) {
          navigateBrowser(link.dataset.browserLink);
        }
      });

      renderBrowser(browserHistory[browserIndex]);
    }

    document.querySelector("#terminal-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const input = document.querySelector("#terminal-input");
      const command = input.value.trim().toLowerCase();
      input.value = "";

      if (!command) {
        return;
      }

      appendTerminal(`> ${command}`);

      if (command === "pulse") {
        pulseWindow(document.querySelector(".os-window.is-active"));
        appendTerminal("active window pulsed");
        return;
      }

      const [, action, target] =
        command.match(/^(open|focus|close|minimize)\s+(readme|terminal)$/) || [];

      if (action === "open" || action === "focus") {
        openWindow(target);
        appendTerminal(`${target} focused`);
        return;
      }

      if (action === "close") {
        closeWindow(findWindow(target));
        appendTerminal(`${target} closed`);
        return;
      }

      if (action === "minimize") {
        minimizeWindow(findWindow(target));
        appendTerminal(`${target} minimized`);
        return;
      }

      appendTerminal("unknown command");
    });

    if (window.Draggable) {
      windows.forEach((windowEl) => {
        Draggable.create(windowEl, {
          trigger: windowEl.querySelector(".window-titlebar"),
          bounds: desktop,
          onPress() {
            focusWindow(this.target.dataset.window);
          },
          onDragStart() {
            if (this.target.classList.contains("is-maximized")) {
              this.endDrag();
            }
          },
          onDrag() {
            if (!prefersReducedMotion) {
              gsap.to(this.target, { scale: 1.01, duration: 0.12, overwrite: true });
            }
          },
          onRelease() {
            gsap.to(this.target, { scale: 1, duration: 0.16 });
          },
        });
      });

      Draggable.create(".desktop-icon", {
        bounds: desktop,
        onPress() {
          desktopIcons.forEach((item) => item.classList.remove("is-selected"));
          this.target.classList.add("is-selected");
        },
      });
    }

    initWaveMesh();
    syncBrandWidth();
    initWatercolorCanvas();
    updateClock();
    setInterval(updateClock, 30000);
    windows.forEach((windowEl) => {
      const isOpen = windowEl.classList.contains("is-open");

      gsap.set(windowEl, {
        autoAlpha: isOpen ? 1 : 0,
        scale: isOpen ? 1 : 0.96,
        y: 0,
        pointerEvents: isOpen ? "auto" : "none",
      });
    });
    syncTaskbar("");
  }

  function init() {
    if (!window.gsap) {
      document.body.dataset.error = "gsap";
      return;
    }

    if (window.Draggable) {
      gsap.registerPlugin(Draggable);
    }

    initDesktop();
  }

  window.addEventListener("DOMContentLoaded", init);
})();
