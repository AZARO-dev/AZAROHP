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

    function revealDesktopIcons() {
      if (desktop.classList.contains("is-icons-ready")) {
        return;
      }

      const shouldSlideIn = window.matchMedia("(max-width: 560px)").matches;
      desktop.classList.add("is-icons-ready");

      if (!shouldSlideIn || prefersReducedMotion) {
        desktop.classList.remove("is-icons-pending");
        gsap.set(desktopIcons, { autoAlpha: 1, x: 0, scale: 1, pointerEvents: "auto" });
        return;
      }

      gsap.set(desktopIcons, {
        autoAlpha: 0,
        x: -112,
        scale: 0.96,
        pointerEvents: "none",
      });
      desktop.classList.remove("is-icons-pending");

      gsap.to(desktopIcons, {
        autoAlpha: 1,
        x: 0,
        scale: 1,
        pointerEvents: "auto",
        duration: 0.52,
        ease: "back.out(1.45)",
        stagger: 0.08,
        delay: 3,
        clearProps: "opacity,visibility,transform,pointerEvents",
      });
    }

    function syncBrandWidth() {
      const brand = document.querySelector(".brand-composition");
      const word = document.querySelector(".desktop-brand-word");
      const wordStack = document.querySelector(".brand-word-stack");
      const subtitle = document.querySelector(".brand-subtitle");
      const panels = Array.from(document.querySelectorAll("[data-brand-grid]"));
      const inkCanvas = document.querySelector("#ink-cutout-canvas");
      const inkContext = inkCanvas ? inkCanvas.getContext("2d") : null;
      let mergeLinks = [];
      let mergeLinkMap = new Map();
      let mergeTimer = 0;
      let inkAnimationFrame = 0;
      let hasPlayedIntro = false;

      if (!brand || !word) {
        revealDesktopIcons();
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

        function drawTextLine(element, alphaOverride = null) {
          const textStyle = window.getComputedStyle(element);
          const textOpacity = (alphaOverride === null ? Number.parseFloat(textStyle.opacity) : alphaOverride) || 0;

          if (textOpacity <= 0.001) {
            return;
          }

          const textRect = element.getBoundingClientRect();
          const text = element.textContent.trim();

          if (!text || textRect.width <= 0 || textRect.height <= 0) {
            return;
          }

          inkContext.globalAlpha = textOpacity;
          inkContext.font = `${textStyle.fontStyle} ${textStyle.fontWeight} ${textStyle.fontSize} ${textStyle.fontFamily}`;
          inkContext.textAlign = "center";
          inkContext.textBaseline = "alphabetic";

          const metrics = inkContext.measureText(text);
          const ascent = metrics.actualBoundingBoxAscent || textRect.height * 0.72;
          const descent = metrics.actualBoundingBoxDescent || textRect.height * 0.18;
          const x = textRect.left - canvasRect.left + textRect.width / 2;
          const y = textRect.top - canvasRect.top + textRect.height / 2 + (ascent - descent) / 2;

          inkContext.fillText(text, x, y);
        }

        function drawTextCutout(element) {
          if (!element) {
            return;
          }

          const parts = Array.from(element.querySelectorAll("[data-subtitle-part]"));

          if (parts.length) {
            const elementStyle = window.getComputedStyle(element);
            const elementOpacity = Number.parseFloat(elementStyle.opacity) || 0;

            parts.forEach((part) => drawTextLine(part, elementOpacity));
            return;
          }

          drawTextLine(element);
        }

        drawTextCutout(word);
        drawTextCutout(subtitle);

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
          gsap.set(subtitle, { autoAlpha: 1, y: 0, filter: "none" });
          gsap.set(blocks, { autoAlpha: 1, scale: 1 });
          drawInkCutouts();
          revealDesktopIcons();
          return;
        }

        gsap.set(word, { autoAlpha: 0, y: 14, filter: "blur(8px)" });
        gsap.set(subtitle, { autoAlpha: 0, y: 8, filter: "blur(5px)" });
        gsap.set(blocks, { autoAlpha: 0, scale: 0.2, transformOrigin: "50% 50%" });
        drawInkCutouts();

        gsap
          .timeline({
            defaults: { overwrite: true },
            onUpdate: requestInkDraw,
            onComplete: () => {
              drawInkCutouts();
              scheduleRandomMerges(true);
              revealDesktopIcons();
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
            subtitle,
            {
              autoAlpha: 1,
              y: 0,
              filter: "blur(0px)",
              duration: 0.46,
              ease: "power2.out",
            },
            "+=0.04",
          )
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
        const stackRect = wordStack ? wordStack.getBoundingClientRect() : wordRect;
        const maxWidth = Math.max(220, desktopRect.width - sideMargin);
        const width = Math.min(Math.ceil(wordRect.width), maxWidth);
        const availablePanelHeight = Math.max(120, (desktopRect.height - stackRect.height - stackGap * 2) / 2);
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

    function openWindow(name, options = {}) {
      const windowEl = findWindow(name);

      if (!windowEl) {
        return;
      }

      const wasOpen = windowEl.classList.contains("is-open");
      const currentY = gsap.getProperty(windowEl, "y");

      if (name === "snapper" && !options.preserveSnapperMode) {
        restoreSnapperContactMode();
      }

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

      if (name === "snapper" && !wasOpen && !snapperBoxUnlockActive) {
        playSnapperDialogue();
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

    let lastTouchIcon = null;
    let lastTouchTime = 0;
    let lastTouchX = 0;
    let lastTouchY = 0;

    function selectDesktopIcon(icon) {
      desktopIcons.forEach((item) => item.classList.remove("is-selected"));
      icon.classList.add("is-selected");
    }

    function trackIconPointerDown(icon, event) {
      icon.dataset.pointerStartX = String(event.clientX);
      icon.dataset.pointerStartY = String(event.clientY);
    }

    function handleIconTouchOpen(icon, event) {
      if (event.pointerType !== "touch" && event.pointerType !== "pen") {
        return;
      }

      const startX = Number.parseFloat(icon.dataset.pointerStartX || event.clientX);
      const startY = Number.parseFloat(icon.dataset.pointerStartY || event.clientY);
      const moveDistance = Math.hypot(event.clientX - startX, event.clientY - startY);

      if (moveDistance > 10) {
        lastTouchIcon = null;
        return;
      }

      const now = window.performance.now();
      const tapDistance = Math.hypot(event.clientX - lastTouchX, event.clientY - lastTouchY);
      const isDoubleTap = lastTouchIcon === icon && now - lastTouchTime < 430 && tapDistance < 28;

      selectDesktopIcon(icon);

      if (isDoubleTap) {
        event.preventDefault();
        lastTouchIcon = null;
        lastTouchTime = 0;
        openDesktopShortcut(icon);
        return;
      }

      lastTouchIcon = icon;
      lastTouchTime = now;
      lastTouchX = event.clientX;
      lastTouchY = event.clientY;
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

    let snapperTextTween = null;
    let snapperCompletionTween = null;
    let snapperDialogueIndex = 0;
    let snapperSampleSent = false;
    let snapperUplinkVisible = false;
    let snapperUplinkBusy = false;
    let snapperSelectedImageFile = null;
    let snapperSelectedImageUrl = "";
    let snapperLastAsideIndex = -1;
    let snapperBoxUnlockActive = false;
    let snapperBoxUnlockIndex = 0;
    let snapperBoxUnlockStarted = false;

    const snapperDialogueScript = [
      {
        src: "snapper-smile.png",
        text: "はじめまして、私は異星言語学者のミヅキです",
      },
      {
        src: "snapper-smile.png",
        text: "会えて嬉しいわ",
      },
      {
        src: "snapper-normal.png",
        text: "このサイトを開いたとき、初めて見た記号の羅列が書いてあったでしょう",
      },
      {
        src: "snapper-normal.png",
        text: "あれはつい最近異星から送られてきたメッセージなの",
      },
      {
        src: "snapper-normal.png",
        scene: "box",
        text: "そしてこのパスワードの掛かったデータも一緒に送られてきたの、私たちは箱って呼んでるわ",
      },
      {
        src: "snapper-sad.png",
        text: "ボイジャーのおかげかしらね。しかし、解読に難航していて、、",
      },
      {
        src: "snapper-smile.png",
        text: "是非あなたにも協力していただきたいわ",
      },
      {
        src: "snapper-normal.png",
        scene: "device",
        text: "私が研究して作成した星間通信装置！これを使って異星と交信が可能になるわ",
      },
      {
        src: "snapper-normal.png",
        scene: "device",
        text: "なんだか画像を送ると異星の方がどんな画像か説明してくれるみたい",
      },
      {
        src: "snapper-smile.png",
        scene: "sample",
        requiresSend: true,
        text: "試しにこの画像を送ってほしいわ",
      },
      {
        src: "snapper-smile.png",
        text: "異星と交信できたわね！",
      },
      {
        src: "snapper-normal.png",
        text: "あなたが撮った好きな画像を送ってどんな画像か説明してもらいましょう",
      },
      {
        src: "snapper-angry.png",
        text: "目標はこの鍵のかかったデータを開けることよ。文章が説明できるくらい単語や文法を集めましょう",
      },
      {
        src: "snapper-normal.png",
        text: "あと、注意事項なのだけど異星と交信するのだからあまりプライベートな写真を送信するのはNGよ",
      },
      {
        src: "snapper-sad.png",
        text: "研究データとして一生残るかも、、",
      },
      {
        src: "snapper-normal.png",
        text: "あなたの良識に任せるわ",
      },
      {
        src: "snapper-smile.png",
        text: "これからよろしくね",
      },
    ];

    const snapperSendAsides = [
      {
        src: "snapper-normal.png",
        text: "実は私、コーヒーより白湯の方が好きなの。研究室が冷えすぎるから",
      },
      {
        src: "snapper-smile.png",
        text: "この装置、名前を付けようとしたんだけど、候補が全部ダサくて保留中よ",
      },
      {
        src: "snapper-normal.png",
        text: "異星言語学者って言うと大げさだけど、普段は記号とにらめっこしてるだけなの",
      },
      {
        src: "snapper-sad.png",
        text: "解読中に寝落ちして、朝起きたらノートに意味不明な線が増えていたことがあるわ",
      },
      {
        src: "snapper-smile.png",
        text: "初めて異星から返事が来た日は、嬉しくて研究室の電気を消し忘れたの",
      },
      {
        src: "snapper-normal.png",
        text: "私は静かな場所が好き。機械音と紙をめくる音くらいがちょうどいいわ",
      },
      {
        src: "snapper-angry.png",
        text: "同僚はこの箱を文鎮にしようとしたのよ。もちろん全力で止めたわ",
      },
      {
        src: "snapper-smile.png",
        text: "未知の単語を見つけた瞬間って、鍵穴にぴったり合う音が聞こえる気がするの",
      },
      {
        src: "snapper-normal.png",
        text: "実家にはこの研究のこと、まだ半分くらいしか説明していないわ",
      },
      {
        src: "snapper-sad.png",
        text: "締め切り前の私はあまり見せられないわね。髪も資料も大変なことになるから",
      },
      {
        src: "snapper-smile.png",
        text: "あなたが送る画像、少し楽しみにしてるの。研究者として、もちろん研究者としてよ",
      },
      {
        src: "snapper-normal.png",
        text: "この文字、眺めているとたまに音楽みたいに見えるの。不思議でしょう",
      },
      {
        src: "snapper-normal.png",
        text: "子どもの頃は古いラジオを分解するのが好きだったわ。元に戻せたことは少ないけど",
      },
      {
        src: "snapper-smile.png",
        text: "チョコチップクッキーが好きなの。研究室に置くと、一枚だけのつもりがいつの間にかなくなっているわ",
      },
      {
        src: "snapper-sad.png",
        text: "学生の頃、発表前日に資料を全部作り直したことがあるわ。あれはもう二度と嫌ね",
      },
      {
        src: "snapper-normal.png",
        text: "朝より夜の方が頭が澄むの。え、生活習慣には気を付けないといけない？",
      },
      {
        src: "snapper-smile.png",
        text: "古い地図を見るのが好きよ。知らない場所なのに、誰かの記憶みたいで",
      },
      {
        src: "snapper-normal.png",
        text: "文字を書く時は左上をきっちり揃えたいの。そこが乱れると一日気になるわ",
      },
      {
        src: "snapper-angry.png",
        text: "昔、暗号遊びで友人を三日ほど困らせたことがあるわ。少しだけ反省しているの",
      },
      {
        src: "snapper-smile.png",
        text: "好きな色は白と黒。間にある灰色も嫌いじゃないわ、曖昧で正直だから",
      },
      {
        src: "snapper-normal.png",
        text: "初めて覚えた外国語の単語は、なぜか忘れ物に関する言葉だったの",
      },
      {
        src: "snapper-sad.png",
        text: "大事なメモほど小さな紙に書いてしまう癖があるの。見つからなくなるのにね",
      },
      {
        src: "snapper-smile.png",
        text: "研究室の椅子は一番こだわっているわ。腰が命だから",
      },
      {
        src: "snapper-normal.png",
        text: "昔は天文学者になりたかったの。でも星より、星から届いた言葉の方が気になった",
      },
      {
        src: "snapper-smile.png",
        text: "雨の日の研究室は少し好き。窓の外がぼやけて、机の上だけが世界みたいになるから",
      },
      {
        src: "snapper-normal.png",
        text: "本は最後から少しだけ覗いてしまうタイプよ。だいたい作者の思想が漏れていて、見ているのが楽しいの",
      },
      {
        src: "snapper-sad.png",
        text: "一度だけ、夢で見た単語を朝まで覚えていたのに、意味だけ忘れてしまったわ",
      },
      {
        src: "snapper-smile.png",
        text: "誰かと一緒に解読するの、実は少し久しぶりなの。だから今、少し楽しいわ",
      },
      {
        src: "snapper-normal.png",
        text: "ポスドクって、研究者なのに学生でも職員でもない立ち位置なの。肩書きが少し宙に浮いているでしょう",
      },
      {
        src: "snapper-sad.png",
        text: "任期の更新通知が来るたび、解読結果より先に自分の未来を読んでいる気分になるわ",
      },
      {
        src: "snapper-angry.png",
        text: "研究費の申請書は、研究そのものより研究の輝かしい未来を説明する時間の方が長いのよ",
      },
      {
        src: "snapper-sad.png",
        text: "論文の査読コメントって、短い文章なのに一日分の体力を持っていくの。異星語より手強いわ",
      },
      {
        src: "snapper-smile.png",
        text: "学会では新しい発見より、久しぶりの人に会えることを楽しみにしている自分もいるの",
      },
      {
        src: "snapper-normal.png",
        text: "指導教員から『面白いね』と言われると嬉しいのに、そのあと必ず『もう少し広げようか』が続くのよ",
      },
      {
        src: "snapper-sad.png",
        text: "自分の名前で部屋を借りるより先に、研究テーマに名前を付ける人生になってしまったわ",
      },
      {
        src: "snapper-angry.png",
        text: "実験がうまくいかない日は、データではなく机の引き出しだけが充実していくの",
      },
      {
        src: "snapper-sad.png",
        text: "ポスドクの悩みは、成果が出るまで待ってほしいのに、任期だけはきちんと進んでしまうことね",
      },
      {
        src: "snapper-normal.png",
        text: "今の研究が好きだから続けたい。でも好きだけでは申請書の欄が埋まらないのが難しいところよ",
      },
    ];

    const snapperBoxUnlockScript = [
      {
        src: "snapper-smile.png",
        text: "箱の第一段階が解けたみたいね！流石だわ！",
      },
      {
        src: "snapper-normal.png",
        scene: "vocab",
        text: "私も独自で単語を集めてみたの、良かったら参考にしてほしいわ",
      },
    ];

    function updateSnapperScene(entry) {
      const visual = document.querySelector("#snapper-scene-visual");
      const device = document.querySelector("#snapper-device");
      const box = document.querySelector("#snapper-box");
      const sampleCard = document.querySelector("#snapper-sample-card");
      const sendButton = document.querySelector("#snapper-send-button");
      const reply = document.querySelector("#snapper-alien-reply");
      const vocabCard = document.querySelector("#snapper-vocab-card");

      if (!visual || !device || !box || !sampleCard || !sendButton || !reply || !vocabCard) {
        return;
      }

      const hasScene = Boolean(entry.scene);
      visual.hidden = !hasScene;
      device.hidden = entry.scene !== "device" && entry.scene !== "sample";
      box.hidden = entry.scene !== "box";
      sampleCard.hidden = entry.scene !== "sample";
      sendButton.hidden = entry.scene !== "sample" || snapperSampleSent;
      reply.hidden = entry.scene !== "sample" || !snapperSampleSent;
      vocabCard.hidden = entry.scene !== "vocab";

      if (!prefersReducedMotion && hasScene) {
        gsap.fromTo(
          visual,
          { autoAlpha: 0, y: -4 },
          { autoAlpha: 1, y: 0, duration: 0.24, ease: "power2.out", overwrite: true },
        );
      }
    }

    function setSnapperCompletionGlyph(visible) {
      const glyph = document.querySelector("#snapper-completion-glyph");

      if (!glyph) {
        return;
      }

      if (snapperCompletionTween) {
        snapperCompletionTween.kill();
        snapperCompletionTween = null;
      }

      if (!visible) {
        glyph.hidden = true;
        gsap.set(glyph, { clearProps: "opacity,visibility,transform" });
        return;
      }

      glyph.hidden = false;

      if (prefersReducedMotion) {
        gsap.set(glyph, { autoAlpha: 1, scale: 1, rotation: 0 });
        return;
      }

      gsap.fromTo(
        glyph,
        { autoAlpha: 0, y: 6, scale: 0.72, rotation: -6 },
        { autoAlpha: 1, y: 0, scale: 1, rotation: 0, duration: 0.42, ease: "back.out(1.8)" },
      );
      snapperCompletionTween = gsap.to(glyph, {
        y: -4,
        rotation: 3,
        scale: 1.03,
        duration: 1.35,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        delay: 0.42,
      });
    }

    function canAdvanceSnapperDialogue(entry) {
      return !entry.requiresSend || snapperSampleSent;
    }

    function pickSnapperSendAside() {
      if (!snapperSendAsides.length) {
        return null;
      }

      let nextIndex = Math.floor(Math.random() * snapperSendAsides.length);

      if (snapperSendAsides.length > 1 && nextIndex === snapperLastAsideIndex) {
        nextIndex = (nextIndex + 1 + Math.floor(Math.random() * (snapperSendAsides.length - 1))) % snapperSendAsides.length;
      }

      snapperLastAsideIndex = nextIndex;
      return snapperSendAsides[nextIndex];
    }

    function speakSnapperAside(aside) {
      const character = document.querySelector("#snapper-character");
      const dialogue = document.querySelector("#snapper-dialogue-text") || document.querySelector("#snapper-dialogue");

      if (!aside || !character || !dialogue) {
        return;
      }

      const text = aside.text;
      const chars = Array.from(text);
      character.src = aside.src;
      setSnapperCompletionGlyph(false);

      if (snapperTextTween) {
        snapperTextTween.kill();
        snapperTextTween = null;
      }

      if (prefersReducedMotion) {
        dialogue.textContent = text;
        setSnapperCompletionGlyph(true);
        return;
      }

      dialogue.textContent = "";
      gsap.fromTo(
        character,
        { y: 4, scale: 0.99 },
        { y: 0, scale: 1, duration: 0.24, ease: "back.out(1.8)" },
      );

      const typing = { count: 0 };
      snapperTextTween = gsap.to(typing, {
        count: chars.length,
        duration: Math.max(0.85, Math.min(3.2, chars.length * 0.04)),
        ease: "none",
        onUpdate() {
          dialogue.textContent = chars.slice(0, Math.round(typing.count)).join("");
        },
        onComplete() {
          dialogue.textContent = text;
          snapperTextTween = null;
          setSnapperCompletionGlyph(true);
        },
      });
    }

    function normalizeSnapperSo(value) {
      return String(value || "")
        .replace(/[’]/g, "'")
        .replace(/u'/g, "h")
        .split(/\r?\n+/)
        .map((line) => line.replace(/[ \t]+/g, " ").trim())
        .filter(Boolean)
        .join("\n")
        .trim();
    }

    function getSnapperReplyFromPayload(payload) {
      if (!payload || typeof payload !== "object") {
        return "";
      }

      return normalizeSnapperSo(payload.so || payload.reply || payload.message || payload.text || payload.result);
    }

    function getMockSnapperReply() {
      return "vose linoa furo eso";
    }

    function getSnapperApiErrorMessage(payload, status) {
      if (payload && typeof payload === "object") {
        return payload.message || payload.error || `API request failed (${status})`;
      }

      return `API request failed (${status})`;
    }

    function wait(ms) {
      return new Promise((resolve) => window.setTimeout(resolve, ms));
    }

    async function requestSnapperDescription(file) {
      const minimumLoadingTime = wait(2200);
      const canUseApi = window.location.protocol === "http:" || window.location.protocol === "https:";

      if (canUseApi && file) {
        try {
          const formData = new FormData();
          formData.append("image", file);

          const response = await fetch("/api/describe", {
            method: "POST",
            body: formData,
          });

          const payload = await response.json().catch(() => ({}));

          if (response.ok) {
            const reply = getSnapperReplyFromPayload(payload);

            if (reply) {
              await minimumLoadingTime;
              return reply;
            }

            throw new Error("API response did not include a Soo reply.");
          }

          throw new Error(getSnapperApiErrorMessage(payload, response.status));
        } catch (error) {
          await minimumLoadingTime;
          throw error;
        }
      }

      await minimumLoadingTime;
      return getMockSnapperReply();
    }

    function setSnapperUplinkLoading(isLoading) {
      const loading = document.querySelector("#snapper-loading");
      const sendButton = document.querySelector("#snapper-uplink-send");
      const fileInput = document.querySelector("#snapper-image-input");

      snapperUplinkBusy = isLoading;

      if (loading) {
        loading.hidden = !isLoading;

        if (isLoading && !prefersReducedMotion) {
          gsap.fromTo(loading, { autoAlpha: 0, y: 4 }, { autoAlpha: 1, y: 0, duration: 0.24, ease: "power2.out" });
        }
      }

      if (sendButton) {
        sendButton.disabled = isLoading || !snapperSelectedImageFile;
      }

      if (fileInput) {
        fileInput.disabled = isLoading;
      }
    }

    function showSnapperUplink() {
      const conversation = document.querySelector(".snapper-conversation");
      const uplink = document.querySelector("#snapper-uplink");
      const skipButton = document.querySelector("#snapper-skip-button");

      if (!conversation || !uplink) {
        return;
      }

      snapperUplinkVisible = true;
      uplink.hidden = false;
      if (skipButton) {
        skipButton.hidden = true;
      }
      conversation.classList.add("is-uplink");
      updateSnapperScene({});
      setSnapperCompletionGlyph(false);

      if (!prefersReducedMotion) {
        gsap.fromTo(
          uplink,
          { autoAlpha: 0, y: 8, scale: 0.98 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.36, ease: "back.out(1.7)", overwrite: true },
        );
      }
    }

    function restoreSnapperContactMode() {
      if (!snapperBoxUnlockActive) {
        return;
      }

      snapperBoxUnlockActive = false;
      snapperBoxUnlockIndex = 0;

      if (snapperDialogueIndex >= snapperDialogueScript.length - 1 || snapperUplinkVisible) {
        showSnapperUplink();
        return;
      }

      renderSnapperDialogue(snapperDialogueIndex, { instant: true });
    }

    function skipSnapperIntro() {
      const character = document.querySelector("#snapper-character");
      const dialogue = document.querySelector("#snapper-dialogue-text") || document.querySelector("#snapper-dialogue");
      const skipButton = document.querySelector("#snapper-skip-button");
      const finalIndex = snapperDialogueScript.length - 1;
      const finalEntry = snapperDialogueScript[finalIndex];

      snapperDialogueIndex = finalIndex;
      snapperSampleSent = true;

      if (snapperTextTween) {
        snapperTextTween.kill();
        snapperTextTween = null;
      }

      if (snapperCompletionTween) {
        snapperCompletionTween.kill();
        snapperCompletionTween = null;
      }

      if (character && finalEntry) {
        character.src = finalEntry.src;
      }

      if (dialogue && finalEntry) {
        dialogue.textContent = finalEntry.text;
      }

      if (skipButton) {
        skipButton.hidden = true;
      }

      setSnapperCompletionGlyph(true);
    }

    function clearSnapperUplinkResult() {
      const result = document.querySelector("#snapper-uplink-result");

      if (result) {
        result.hidden = true;
        result.textContent = "";
      }
    }

    function setSnapperSelectedImage(file) {
      const previewImage = document.querySelector("#snapper-uplink-image");
      const placeholder = document.querySelector("#snapper-uplink-placeholder");
      const sendButton = document.querySelector("#snapper-uplink-send");

      if (snapperSelectedImageUrl) {
        URL.revokeObjectURL(snapperSelectedImageUrl);
        snapperSelectedImageUrl = "";
      }

      snapperSelectedImageFile = file || null;
      clearSnapperUplinkResult();
      setSnapperUplinkLoading(false);

      if (!previewImage || !placeholder || !sendButton) {
        return;
      }

      if (!file) {
        previewImage.hidden = true;
        previewImage.removeAttribute("src");
        placeholder.hidden = false;
        sendButton.disabled = true;
        return;
      }

      snapperSelectedImageUrl = URL.createObjectURL(file);
      previewImage.src = snapperSelectedImageUrl;
      previewImage.hidden = false;
      placeholder.hidden = true;
      sendButton.disabled = false;

      if (!prefersReducedMotion) {
        gsap.fromTo(previewImage, { autoAlpha: 0, scale: 1.04 }, { autoAlpha: 1, scale: 1, duration: 0.26, ease: "power2.out" });
      }
    }

    async function sendSnapperSelectedImage() {
      const result = document.querySelector("#snapper-uplink-result");

      if (!snapperSelectedImageFile || snapperUplinkBusy || !result) {
        return;
      }

      clearSnapperUplinkResult();
      setSnapperUplinkLoading(true);
      speakSnapperAside(pickSnapperSendAside());

      let reply = "";

      try {
        reply = await requestSnapperDescription(snapperSelectedImageFile);
      } catch (error) {
        console.warn("Snapper API request failed:", error);
        reply = "通信が失敗したわ。SecretとWorker Logsを確認してみて";
      }

      setSnapperUplinkLoading(false);
      result.textContent = reply;
      result.hidden = false;

      if (!prefersReducedMotion) {
        gsap.fromTo(result, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: "back.out(1.7)" });
      }
    }

    function initSnapperUploader() {
      const uplink = document.querySelector("#snapper-uplink");
      const fileInput = document.querySelector("#snapper-image-input");
      const sendButton = document.querySelector("#snapper-uplink-send");

      if (!uplink || !fileInput || !sendButton) {
        return;
      }

      uplink.addEventListener("click", (event) => event.stopPropagation());

      fileInput.addEventListener("change", () => {
        const [file] = Array.from(fileInput.files || []);
        setSnapperSelectedImage(file);
      });

      sendButton.addEventListener("click", (event) => {
        event.stopPropagation();
        sendSnapperSelectedImage();
      });
    }

    function hideSnapperUplinkForDialogue() {
      const conversation = document.querySelector(".snapper-conversation");
      const uplink = document.querySelector("#snapper-uplink");
      const skipButton = document.querySelector("#snapper-skip-button");

      snapperUplinkVisible = false;

      if (uplink) {
        uplink.hidden = true;
      }

      if (conversation) {
        conversation.classList.remove("is-uplink");
      }

      if (skipButton) {
        skipButton.hidden = true;
      }
    }

    function renderSnapperBoxUnlockDialogue(index, options = {}) {
      const character = document.querySelector("#snapper-character");
      const dialogue = document.querySelector("#snapper-dialogue-text") || document.querySelector("#snapper-dialogue");

      if (!character || !dialogue || !snapperBoxUnlockScript.length) {
        return;
      }

      snapperBoxUnlockIndex = Math.max(0, Math.min(index, snapperBoxUnlockScript.length - 1));
      const entry = snapperBoxUnlockScript[snapperBoxUnlockIndex];
      const text = entry.text;
      const chars = Array.from(text);
      character.src = entry.src;
      updateSnapperScene(entry);
      setSnapperCompletionGlyph(false);

      if (snapperTextTween) {
        snapperTextTween.kill();
        snapperTextTween = null;
      }

      if (prefersReducedMotion || options.instant) {
        dialogue.textContent = text;
        setSnapperCompletionGlyph(true);
        return;
      }

      dialogue.textContent = "";
      gsap.fromTo(
        character,
        { y: 5, scale: 0.98 },
        { y: 0, scale: 1, duration: 0.28, ease: "back.out(1.8)" },
      );

      const typing = { count: 0 };
      snapperTextTween = gsap.to(typing, {
        count: chars.length,
        duration: Math.max(0.85, Math.min(3.4, chars.length * 0.04)),
        ease: "none",
        onUpdate() {
          dialogue.textContent = chars.slice(0, Math.round(typing.count)).join("");
        },
        onComplete() {
          dialogue.textContent = text;
          snapperTextTween = null;
          setSnapperCompletionGlyph(true);
        },
      });
    }

    function startSnapperBoxUnlockDialogue() {
      if (snapperBoxUnlockStarted) {
        return;
      }

      snapperBoxUnlockStarted = true;
      snapperBoxUnlockActive = true;
      snapperBoxUnlockIndex = 0;
      hideSnapperUplinkForDialogue();
      openWindow("snapper", { preserveSnapperMode: true });
      renderSnapperBoxUnlockDialogue(0);
    }

    function renderSnapperDialogue(index, options = {}) {
      const character = document.querySelector("#snapper-character");
      const dialogue = document.querySelector("#snapper-dialogue-text") || document.querySelector("#snapper-dialogue");
      const skipButton = document.querySelector("#snapper-skip-button");

      if (!character || !dialogue || !snapperDialogueScript.length) {
        return;
      }

      snapperDialogueIndex = Math.max(0, Math.min(index, snapperDialogueScript.length - 1));
      if (skipButton) {
        skipButton.hidden = snapperDialogueIndex >= snapperDialogueScript.length - 1 || snapperUplinkVisible;
      }
      const entry = snapperDialogueScript[snapperDialogueIndex];
      const text = entry.text;
      const chars = Array.from(text);
      character.src = entry.src;
      updateSnapperScene(entry);
      setSnapperCompletionGlyph(false);

      if (snapperTextTween) {
        snapperTextTween.kill();
        snapperTextTween = null;
      }

      if (prefersReducedMotion || options.instant) {
        dialogue.textContent = text;
        setSnapperCompletionGlyph(canAdvanceSnapperDialogue(entry));
        return;
      }

      dialogue.textContent = "";
      gsap.fromTo(
        character,
        { y: 5, scale: 0.98 },
        { y: 0, scale: 1, duration: 0.28, ease: "back.out(1.8)" },
      );

      const typing = { count: 0 };
      snapperTextTween = gsap.to(typing, {
        count: chars.length,
        duration: Math.max(0.85, Math.min(3.4, chars.length * 0.04)),
        ease: "none",
        onUpdate() {
          dialogue.textContent = chars.slice(0, Math.round(typing.count)).join("");
        },
        onComplete() {
          dialogue.textContent = text;
          snapperTextTween = null;
          setSnapperCompletionGlyph(canAdvanceSnapperDialogue(entry));
        },
      });
    }

    function advanceSnapperDialogue(step) {
      if (snapperBoxUnlockActive) {
        if (snapperTextTween) {
          snapperTextTween.progress(1);
          return;
        }

        if (step > 0 && snapperBoxUnlockIndex < snapperBoxUnlockScript.length - 1) {
          renderSnapperBoxUnlockDialogue(snapperBoxUnlockIndex + step);
          return;
        }

        if (step > 0) {
          snapperBoxUnlockActive = false;
          snapperDialogueIndex = snapperDialogueScript.length - 1;
          showSnapperUplink();
        }

        return;
      }

      if (snapperUplinkVisible) {
        return;
      }

      if (snapperTextTween) {
        snapperTextTween.progress(1);
        return;
      }

      if (step > 0 && snapperDialogueIndex >= snapperDialogueScript.length - 1) {
        showSnapperUplink();
        return;
      }

      const entry = snapperDialogueScript[snapperDialogueIndex];

      if (step > 0 && entry && entry.requiresSend && !snapperSampleSent) {
        const sendButton = document.querySelector("#snapper-send-button");

        if (sendButton && !prefersReducedMotion) {
          gsap.fromTo(sendButton, { scale: 0.96 }, { scale: 1, duration: 0.22, ease: "back.out(2)" });
        }

        return;
      }

      renderSnapperDialogue(snapperDialogueIndex + step);
    }

    function playSnapperDialogue() {
      if (snapperBoxUnlockActive || snapperUplinkVisible) {
        return;
      }

      renderSnapperDialogue(snapperDialogueIndex);
    }

    function initSnapperDialogue() {
      const conversation = document.querySelector(".snapper-conversation");
      const sendButton = document.querySelector("#snapper-send-button");
      const skipButton = document.querySelector("#snapper-skip-button");
      const vocabCard = document.querySelector("#snapper-vocab-card");

      if (!conversation || !sendButton) {
        return;
      }

      initSnapperUploader();

      if (skipButton) {
        skipButton.addEventListener("click", (event) => {
          event.stopPropagation();
          skipSnapperIntro();
        });
      }

      conversation.addEventListener("click", () => advanceSnapperDialogue(1));
      conversation.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          advanceSnapperDialogue(1);
        }
      });

      if (vocabCard) {
        ["click", "pointerdown", "touchstart"].forEach((eventName) => {
          vocabCard.addEventListener(eventName, (event) => event.stopPropagation());
        });
      }

      sendButton.addEventListener("click", (event) => {
        event.stopPropagation();
        snapperSampleSent = true;
        updateSnapperScene(snapperDialogueScript[snapperDialogueIndex]);

        const reply = document.querySelector("#snapper-alien-reply");

        if (reply && !prefersReducedMotion) {
          gsap.fromTo(reply, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.28, ease: "back.out(1.7)" });
        }

        setSnapperCompletionGlyph(true);
      });

      renderSnapperDialogue(0, { instant: true });
    }

    function initBoxKeyboard() {
      const answer = document.querySelector("#box-answer");
      const problemText = document.querySelector("#box-problem-text");
      const problemCount = document.querySelector("#box-problem-count");
      const problemImage = document.querySelector("#box-problem-image");
      const result = document.querySelector("#box-result");
      const access = document.querySelector("#box-access");
      const boxBody = document.querySelector(".box-body");
      const keys = Array.from(document.querySelectorAll("[data-box-key], [data-box-action]"));
      const boxProblems = [
        {
          prompt: "zoo sonya vose lidh\n○○○○",
          answer: "fero",
          image: "box-question-tree.png",
          imageAlt: "青空の下に立つ大きな木",
        },
        {
          prompt: "現在での開発はここまでです！\n全て実装するまでもう少しお待ちください",
          answer: "",
          image: "box-coming-soon-snapper.png",
          imageAlt: "案内をするミヅキ",
          imagePixel: true,
          locked: true,
          notice: true,
        },
        {
          prompt: "linoa soa nyamophoa moph eso\n○○○○",
          answer: "moph",
        },
        {
          prompt: "soa moph eso",
          answer: "moph",
        },
        {
          prompt: "nya nopa furo limi",
          answer: "limi",
        },
        {
          prompt: "stua fero viva ruv eso",
          answer: "fero ruv",
        },
      ];
      let currentProblemIndex = 0;
      let isAwaitingBoxAdvance = false;

      function normalizeBoxAnswer(value) {
        return value.trim().replace(/\s+/g, " ");
      }

      function playBoxAccessAnimation() {
        if (!access) {
          return;
        }

        access.hidden = false;

        if (prefersReducedMotion || !window.gsap) {
          return;
        }

        const image = access.querySelector("img");
        const label = access.querySelector("span");

        gsap.killTweensOf([access, image, label]);
        gsap.set(access, { autoAlpha: 0 });
        gsap.set(image, { autoAlpha: 0, scale: 1.08 });
        gsap.set(label, { autoAlpha: 0, y: 28, scale: 0.96 });

        gsap.timeline({
          defaults: { ease: "power2.out" },
        })
          .to(access, { autoAlpha: 1, duration: 0.12 })
          .to(image, { autoAlpha: 1, scale: 1, duration: 0.42 }, "<")
          .to(label, { autoAlpha: 1, y: 0, scale: 1, duration: 0.28, ease: "back.out(1.45)" }, "<0.08")
          .to(label, { scale: 1.08, duration: 0.16, yoyo: true, repeat: 1 }, "+=0.18");
      }

      function advanceBoxProblem() {
        if (!isAwaitingBoxAdvance) {
          return;
        }

        isAwaitingBoxAdvance = false;
        currentProblemIndex = (currentProblemIndex + 1) % boxProblems.length;
        renderBoxProblem();
      }

      function renderBoxProblem() {
        const problem = boxProblems[currentProblemIndex];

        if (problemText) {
          problemText.textContent = problem.prompt;
          problemText.classList.toggle("is-notice", Boolean(problem.notice));
        }

        if (problemImage) {
          problemImage.hidden = !problem.image;
          problemImage.src = problem.image || "";
          problemImage.alt = problem.imageAlt || "";
          problemImage.classList.toggle("is-pixel", Boolean(problem.imagePixel));
        }

        if (problemCount) {
          problemCount.textContent = `${String(currentProblemIndex + 1).padStart(2, "0")} / ${String(boxProblems.length).padStart(2, "0")}`;
        }

        answer.textContent = "";
        isAwaitingBoxAdvance = false;

        if (boxBody) {
          boxBody.classList.toggle("is-box-locked", Boolean(problem.locked));
        }

        keys.forEach((button) => {
          button.disabled = Boolean(problem.locked);
        });

        if (result) {
          result.textContent = "";
          result.classList.remove("is-correct", "is-wrong");
        }

        if (access) {
          access.hidden = true;
        }
      }

      function judgeBoxAnswer() {
        const problem = boxProblems[currentProblemIndex];

        if (problem.locked) {
          return;
        }

        const isCorrect = normalizeBoxAnswer(answer.textContent) === problem.answer;

        if (result) {
          result.textContent = isCorrect ? "○" : "×";
          result.classList.toggle("is-correct", isCorrect);
          result.classList.toggle("is-wrong", !isCorrect);
        }

        if (!isCorrect) {
          return;
        }

        isAwaitingBoxAdvance = true;
        playBoxAccessAnimation();

        if (currentProblemIndex === 0) {
          window.setTimeout(startSnapperBoxUnlockDialogue, 680);
        }
      }

      if (!answer || !keys.length || !boxProblems.length) {
        return;
      }

      renderBoxProblem();

      if (access) {
        access.addEventListener("click", (event) => {
          event.stopPropagation();
          advanceBoxProblem();
        });
      }

      keys.forEach((button) => {
        button.addEventListener("click", (event) => {
          event.stopPropagation();

          if (isAwaitingBoxAdvance) {
            return;
          }

          if (button.dataset.boxAction === "backspace") {
            answer.textContent = answer.textContent.slice(0, -1);

            if (result) {
              result.textContent = "";
              result.classList.remove("is-correct", "is-wrong");
            }

            return;
          }

          if (button.dataset.boxAction === "enter") {
            judgeBoxAnswer();
            return;
          }

          answer.textContent = `${answer.textContent}${button.dataset.boxKey}`;

          if (result) {
            result.textContent = "";
            result.classList.remove("is-correct", "is-wrong");
          }
        });
      });
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
        selectDesktopIcon(icon);
      });

      icon.addEventListener("pointerdown", (event) => trackIconPointerDown(icon, event));
      icon.addEventListener("pointerup", (event) => handleIconTouchOpen(icon, event));
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
        command.match(/^(open|focus|close|minimize)\s+(readme|contact|snapper|box|terminal)$/) || [];
      const windowTarget = target === "contact" ? "snapper" : target;

      if (action === "open" || action === "focus") {
        openWindow(windowTarget);
        appendTerminal(`${target} focused`);
        return;
      }

      if (action === "close") {
        closeWindow(findWindow(windowTarget));
        appendTerminal(`${target} closed`);
        return;
      }

      if (action === "minimize") {
        minimizeWindow(findWindow(windowTarget));
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
    initSnapperDialogue();
    initBoxKeyboard();
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
