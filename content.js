(function () {
    console.log('[Text Black Hole] content.js loaded (with UI params)');
    try {
        // === 速度相关参数（从chrome.storage加载） ===
        let ADSORPTION_FORCE = 10;
        let SPEED_FACTOR_BASE = 12;
        let RETURN_DAMPING = 0.05;
        let FRICTION = 0.95;
        let UPDATE_THROTTLE = 3;
        let RADIUS = 200;
        let VELOCITY_CAP = 0.1;
        let LOW_FPS_THRESHOLD = 40;

        // 加载参数
        function loadParams() {
            chrome.storage.local.get({
                ADSORPTION_FORCE: 10,
                SPEED_FACTOR_BASE: 12,
                RETURN_DAMPING: 0.05,
                FRICTION: 0.95,
                UPDATE_THROTTLE: 3,
                RADIUS: 200,
                VELOCITY_CAP: 0.1,
                LOW_FPS_THRESHOLD: 40
            }, (items) => {
                ADSORPTION_FORCE = items.ADSORPTION_FORCE;
                SPEED_FACTOR_BASE = items.SPEED_FACTOR_BASE;
                RETURN_DAMPING = items.RETURN_DAMPING;
                FRICTION = items.FRICTION;
                UPDATE_THROTTLE = items.UPDATE_THROTTLE;
                RADIUS = items.RADIUS;
                VELOCITY_CAP = items.VELOCITY_CAP;
                LOW_FPS_THRESHOLD = items.LOW_FPS_THRESHOLD;
                console.log('[Text Black Hole] Params loaded:', items);
            });
        }
        loadParams();

        // 监听变化（实时更新）
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local') {
                loadParams();
            }
        });

        let mouse = { x: -9999, y: -9999 };
        let enabled = false;
        let observer = null;
        let animationFrameId = null;
        let activeElems = [];
        let frameCount = 0;
        let totalChars = 0;
        let lastTime = performance.now();
        let fps = 60;
        let lowPerfMode = false;

        window.addEventListener('mousemove', e => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        }, { passive: true });

        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.code === 'KeyH') {
                enabled = !enabled;
                console.log('[Text Black Hole] toggled', enabled);
                if (enabled) {
                    totalChars = 0;
                    lowPerfMode = false;
                    initializeElements();
                    if (!observer) {
                        observer = new MutationObserver((mutations) => {
                            let added = 0;
                            for (const m of mutations) {
                                if (m.addedNodes && m.addedNodes.length) added += m.addedNodes.length;
                            }
                            if (added > 0) {
                                setTimeout(() => {
                                    initializeElements();
                                }, 500);
                            }
                        });
                    }
                    observer.observe(document.body, { childList: true, subtree: true });
                    if (!animationFrameId) {
                        animationFrameId = requestAnimationFrame(attractElements);
                    }
                } else {
                    clearTransforms();
                    if (observer) {
                        observer.disconnect();
                    }
                    if (animationFrameId) {
                        cancelAnimationFrame(animationFrameId);
                        animationFrameId = null;
                    }
                }
            }
        });

        function shouldSkip(el) {
            if (!el || el.nodeType !== 1) return true;
            const tag = el.tagName.toLowerCase();
            if (['script', 'style', 'meta', 'link', 'head', 'html', 'body', 'iframe', 'svg', 'canvas', 'noscript'].includes(tag)) return true;
            if (el.classList && el.classList.contains('blackhole-elem')) return true;
            if (el.closest && el.closest('.blackhole-elem')) return true;
            if (['input', 'textarea', 'select', 'button'].includes(tag)) return true;
            if (el.isContentEditable) return true;
            if (el.offsetWidth === 0 && el.offsetHeight === 0) return true;
            return false;
        }

        function isTableElement(el) {
            if (!el || el.nodeType !== 1) return false;
            const tag = el.tagName.toLowerCase();
            return ['table', 'tr', 'td', 'th'].includes(tag);
        }

        function wrapElement(el) {
            if (shouldSkip(el)) return false;
            if (el.classList && el.classList.contains('blackhole-elem')) return false;
            if (isTableElement(el)) return false;

            const wrapper = document.createElement('div');
            wrapper.className = 'blackhole-elem';
            const display = getComputedStyle(el).display;
            wrapper.style.display = (display === 'block' || display === 'flex' || display === 'grid') ? 'block' : 'inline-block';
            wrapper.style.transition = 'transform 0.1s linear';
            wrapper.style.willChange = 'transform';
            wrapper.style.lineHeight = '1';
            wrapper.style.position = 'relative';
            wrapper.style.zIndex = '10000';

            try {
                el.parentNode.insertBefore(wrapper, el);
                wrapper.appendChild(el);
                return true;
            } catch (e) {
                return false;
            }
        }

        function splitTextNode(textNode) {
            if (!textNode || textNode.nodeType !== 3 || totalChars > 6000) return;
            const text = textNode.textContent;
            if (!text.trim()) return;

            const parent = textNode.parentNode;
            if (!parent) return;
            if (parent.classList && parent.classList.contains('blackhole-char')) return;

            const style = window.getComputedStyle(parent);

            const frag = document.createDocumentFragment();
            for (let i = 0; i < text.length; i++) {
                if (totalChars > 6000) break;
                const char = text[i];
                const span = document.createElement('span');
                span.className = 'blackhole-char';
                span.textContent = char;

                span.style.fontFamily = style.fontFamily;
                span.style.fontSize = style.fontSize;
                span.style.fontWeight = style.fontWeight;
                span.style.fontStyle = style.fontStyle;
                span.style.letterSpacing = style.letterSpacing;
                span.style.wordSpacing = style.wordSpacing;
                span.style.color = style.color;
                span.style.display = 'inline-block';
                span.style.whiteSpace = 'pre-wrap';
                span.style.margin = '0';
                span.style.padding = '0';
                span.style.verticalAlign = 'baseline';
                span.style.lineHeight = style.lineHeight;
                span.style.transition = 'transform 0.1s linear';
                span.style.willChange = 'transform';
                span.style.pointerEvents = 'none';
                span.style.transform = 'translate(0, 0)';
                span.style.position = 'relative';
                span.style.zIndex = '10000';

                frag.appendChild(span);
                totalChars++;
            }
            parent.replaceChild(frag, textNode);
            const children = parent.children;
            for (let i = 0; i < children.length; i++) {
                const span = children[i];
                if (span.classList.contains('blackhole-char')) {
                    const rect = span.getBoundingClientRect();
                    span._originalX = rect.left + (window.pageXOffset || document.documentElement.scrollLeft);
                    span._originalY = rect.top + (window.pageYOffset || document.documentElement.scrollTop);
                }
            }
        }

        function processElement(el) {
            if (!el || el.nodeType !== 1 || totalChars > 6000) return;

            if (isTableElement(el)) {
                for (let i = el.childNodes.length - 1; i >= 0; i--) {
                    const node = el.childNodes[i];
                    if (node.nodeType === 3) {
                        splitTextNode(node);
                    } else if (node.nodeType === 1) {
                        processElement(node);
                    }
                }
            } else {
                if (wrapElement(el)) {
                    const wrapper = el.parentElement;
                    for (let i = wrapper.childNodes.length - 1; i >= 0; i--) {
                        const node = wrapper.childNodes[i];
                        if (node.nodeType === 3) {
                            splitTextNode(node);
                        } else if (node.nodeType === 1) {
                            processElement(node);
                        }
                    }
                } else {
                    for (let i = el.childNodes.length - 1; i >= 0; i--) {
                        const node = el.childNodes[i];
                        if (node.nodeType === 3) {
                            splitTextNode(node);
                        } else if (node.nodeType === 1) {
                            processElement(node);
                        }
                    }
                }
            }
        }

        function initializeElements(root = document.body) {
            console.log('[Text Black Hole] initializing elements (capped at 6000 chars)...');
            processElement(root);
            console.log('[Text Black Hole] initialization complete');
        }

        function clearTransforms() {
            const elems = Array.from(document.querySelectorAll('.blackhole-elem, .blackhole-char'));
            let i = 0;
            function batchClear(i) {
                const batch = elems.slice(i, i + 100);
                for (const el of batch) {
                    el.style.removeProperty('transform');
                    delete el._posX;
                    delete el._posY;
                }
                i += 100;
                if (i < elems.length) {
                    setTimeout(() => batchClear(i), 0);
                } else {
                    setTimeout(() => {
                        restoreTextNodes(document.body);
                        unwrapWrappers(document.body);
                    }, 0);
                }
            }
            batchClear(0);

            function restoreTextNodes(element) {
                if (!element || element.nodeType !== 1) return;
                const charSpans = Array.from(element.querySelectorAll(':scope > .blackhole-char'));
                if (charSpans.length > 0) {
                    let originalText = '';
                    for (const span of charSpans) {
                        originalText += span.textContent;
                    }
                    const textNode = document.createTextNode(originalText);
                    for (const span of charSpans) {
                        element.removeChild(span);
                    }
                    element.appendChild(textNode);
                }
                const children = Array.from(element.children);
                for (const child of children) {
                    restoreTextNodes(child);
                }
            }

            function unwrapWrappers(root) {
                const wrappers = root.querySelectorAll('.blackhole-elem');
                for (const wrapper of wrappers) {
                    const parent = wrapper.parentNode;
                    if (!parent) continue;
                    while (wrapper.firstChild) {
                        parent.insertBefore(wrapper.firstChild, wrapper);
                    }
                    parent.removeChild(wrapper);
                }
            }
        }

        function batchUpdateOffscreen(elems) {
            requestIdleCallback(() => {
                for (const el of elems) {
                    if (typeof el._posX !== 'number') el._posX = 0;
                    if (typeof el._posY !== 'number') el._posY = 0;
                    el._posX += (0 - el._posX) * 0.3;
                    el._posY += (0 - el._posY) * 0.3;
                    el.style.setProperty('transform', `translate(${el._posX}px, ${el._posY}px)`, 'important');
                }
            }, { timeout: 16 });
        }

        function attractElements() {
            const now = performance.now();
            if (!enabled) {
                animationFrameId = null;
                return;
            }

            frameCount++;
            const delta = now - lastTime;
            if (delta > 1000) {
                fps = Math.round(1000 / delta * frameCount);
                frameCount = 0;
                lastTime = now;
                if (fps < LOW_FPS_THRESHOLD) {
                    lowPerfMode = true;
                } else {
                    lowPerfMode = false;
                }
                console.log('[Text Black Hole] FPS:', fps, lowPerfMode ? '(low perf mode)' : '');
            }

            const radiusSq = RADIUS * RADIUS;
            const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
            const scrollY = window.pageYOffset || document.documentElement.scrollTop;
            const mouseDocX = mouse.x + scrollX;
            const mouseDocY = mouse.y + scrollY;
            const vh = window.innerHeight;
            const vw = window.innerWidth;
            const viewportMul = lowPerfMode ? 1 : 1.2;

            if (frameCount % 12 === 0) {
                activeElems = Array.from(document.querySelectorAll('.blackhole-char')).filter(el => {
                    const rect = el.getBoundingClientRect();
                    return rect.bottom > -0.2 * vh && rect.top < viewportMul * vh &&
                        rect.right > -0.2 * vw && rect.left < viewportMul * vw &&
                        rect.width > 0 && rect.height > 0;
                });
            }

            const offscreenElems = [];
            const onscreenUpdates = [];

            for (const el of activeElems) {
                const rect = el.getBoundingClientRect();
                if (rect.width === 0 && rect.height === 0) continue;

                const elDocX = rect.left + rect.width / 2 + scrollX;
                const elDocY = rect.top + rect.height / 2 + scrollY;
                const dx = mouseDocX - elDocX;
                const dy = mouseDocY - elDocY;
                const distSq = dx * dx + dy * dy;

                const isOnScreen = rect.top < vh && rect.bottom > 0 &&
                    rect.left < vw && rect.right > 0;

                if (!isOnScreen) {
                    offscreenElems.push(el);
                } else {
                    onscreenUpdates.push({ el, dx, dy, distSq });
                }
            }

            for (const update of onscreenUpdates) {
                const { el, dx, dy, distSq } = update;
                if (typeof el._posX !== 'number') el._posX = 0;
                if (typeof el._posY !== 'number') el._posY = 0;

                let vx = 0;
                let vy = 0; // 临时速度

                if (distSq <= radiusSq) {
                    const angle = Math.atan2(dy, dx);
                    const distance = Math.sqrt(distSq);
                    const distanceFactor = RADIUS / distance;
                    const fontSize = parseFloat(window.getComputedStyle(el).fontSize) || 16;
                    const accel = ADSORPTION_FORCE * distanceFactor * (SPEED_FACTOR_BASE / fontSize);

                    vx += Math.cos(angle) * accel;
                    vy += Math.sin(angle) * accel;
                } else {
                    const dxOrigin = 0 - el._posX; // 回0
                    const dyOrigin = 0 - el._posY;
                    vx += dxOrigin * RETURN_DAMPING;
                    vy += dyOrigin * RETURN_DAMPING;
                }

                // 应用摩擦到速度
                vx *= FRICTION;
                vy *= FRICTION;

                // 速度上限
                if (Math.abs(vx) < VELOCITY_CAP) vx = 0;
                if (Math.abs(vy) < VELOCITY_CAP) vy = 0;

                // 更新位置
                el._posX += vx;
                el._posY += vy;

                if (frameCount % UPDATE_THROTTLE === 0) {
                    el.style.setProperty('transform', `translate(${el._posX}px, ${el._posY}px)`, 'important');
                }
            }

            if (offscreenElems.length > 0) {
                batchUpdateOffscreen(offscreenElems);
            }

            const allElems = document.querySelectorAll('.blackhole-char');
            if (activeElems.length < allElems.length * 0.3) {
                activeElems = Array.from(allElems);
            }

            animationFrameId = requestAnimationFrame(attractElements);
        }

        if (document.readyState === 'complete' || document.readyState === 'interactive') {
        } else {
            window.addEventListener('DOMContentLoaded', () => {
            });
        }

    } catch (err) {
        console.error('[Text Black Hole] unexpected error', err);
    }
})();