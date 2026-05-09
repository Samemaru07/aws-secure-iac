const LOGS = [
                [
                    "[ Client ] Resolving DNS and establishing connection...",
                    false
                ],
                ["[ AWS ] VPC, IGW, and Security Group: VERIFIED", false],
                ["[ EC2 ] Instance state: RUNNING", false],
                ["[ systemd ] UFW & Nginx services started.", false],
                [
                    "[ Nginx ] 案内ロボ、準備完了！リクエストを処理します 🤖✨",
                    true
                ],
                ["[ SYSTEM ] Welcome to Infrastructure Town.", false]
            ];
            const logContainer = document.getElementById("log-container");
            const bootScreen = document.getElementById("boot-screen");
            let delay = 0;
            LOGS.forEach(([msg, cute], i) => {

                delay += Math.random() * 100 + 100;
                setTimeout(() => {
                    const d = document.createElement("div");
                    d.className = "log-line" + (cute ? " log-cute" : "");
                    d.textContent = msg;
                    logContainer.appendChild(d);
                    setTimeout(() => (d.style.opacity = 1), 30);

                    if (i === LOGS.length - 1) {

                        setTimeout(() => {
                            bootScreen.style.opacity = "0";
                            setTimeout(() => {
                                bootScreen.remove();
                                startTypeWriter();
                            }, 600);
                        }, 500);
                    }
                }, delay);
            });

            function startTypeWriter() {
                const text = "Welcome to Infrastructure Town!";
                const target = document.getElementById("typewriter-text");
                let index = 0;

                function type() {
                    if (index < text.length) {
                        target.textContent += text.charAt(index);
                        index++;
                        setTimeout(type, 80);
                    }
                }
                setTimeout(type, 300);
            }

            const canvas = document.getElementById("c");
            const ctx = canvas.getContext("2d");

            function resize() {

                const container = document.getElementById("canvas-container");
                canvas.width = container.clientWidth;
                canvas.height = container.clientHeight;
            }
            resize();
            window.addEventListener("resize", resize);

            let angleX = 0.52,
                angleY = -Math.PI / 4,
                zoom = 0.85;
            let dragging = false,
                lastMX = 0,
                lastMY = 0;
            canvas.addEventListener("mousedown", (e) => {
                dragging = true;
                lastMX = e.clientX;
                lastMY = e.clientY;
            });
            window.addEventListener("mouseup", () => (dragging = false));
            window.addEventListener("mouseleave", () => (dragging = false));
            window.addEventListener("mousemove", (e) => {
                if (!dragging) return;
                angleY += (e.clientX - lastMX) * 0.008;
                angleX += (e.clientY - lastMY) * 0.008;
                angleX = Math.max(0.1, Math.min(1.2, angleX));
                lastMX = e.clientX;
                lastMY = e.clientY;
            });
            canvas.addEventListener(
                "wheel",
                (e) => {
                    zoom *= e.deltaY > 0 ? 0.92 : 1.09;
                    zoom = Math.max(0.2, Math.min(4, zoom));
                    e.preventDefault();
                },
                { passive: false }
            );
            let lastTouchDist = 0;
            canvas.addEventListener("touchstart", (e) => {
                if (e.touches.length === 1) {
                    dragging = true;
                    lastMX = e.touches[0].clientX;
                    lastMY = e.touches[0].clientY;
                }
                if (e.touches.length === 2)
                    lastTouchDist = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
            });
            canvas.addEventListener(
                "touchmove",
                (e) => {
                    e.preventDefault();
                    if (e.touches.length === 1 && dragging) {
                        angleY += (e.touches[0].clientX - lastMX) * 0.008;
                        angleX += (e.touches[0].clientY - lastMY) * 0.008;
                        angleX = Math.max(0.1, Math.min(1.2, angleX));
                        lastMX = e.touches[0].clientX;
                        lastMY = e.touches[0].clientY;
                    }
                    if (e.touches.length === 2) {
                        const d = Math.hypot(
                            e.touches[0].clientX - e.touches[1].clientX,
                            e.touches[0].clientY - e.touches[1].clientY
                        );
                        zoom *= d / lastTouchDist;
                        zoom = Math.max(0.2, Math.min(4, zoom));
                        lastTouchDist = d;
                    }
                },
                { passive: false }
            );
            canvas.addEventListener("touchend", () => (dragging = false));

            let packetT = 0;
            let currentBalloons = [];

            function project(x, y, z) {
                const cosY = Math.cos(angleY),
                    sinY = Math.sin(angleY);
                const rx = x * cosY - z * sinY;
                const rz = x * sinY + z * cosY;
                const cosX = Math.cos(angleX),
                    sinX = Math.sin(angleX);
                const ry2 = y * cosX - rz * sinX;
                const scale =
                    zoom * Math.min(canvas.width, canvas.height) * 0.2;
                return {
                    x: canvas.width / 2 + rx * scale,

                    y: canvas.height / 2 + 60 + ry2 * scale
                };
            }

            function getDepth(x, y, z) {
                const cosY = Math.cos(angleY),
                    sinY = Math.sin(angleY);
                const rz = x * sinY + z * cosY;
                const cosX = Math.cos(angleX),
                    sinX = Math.sin(angleX);
                return y * sinX + rz * cosX;
            }

            function isFront(pts) {
                const p = pts.map((pt) => project(...pt));
                const ax = p[1].x - p[0].x,
                    ay = p[1].y - p[0].y;
                const bx = p[3].x - p[0].x,
                    by = p[3].y - p[0].y;
                return ax * by - ay * bx <= 0;
            }

            function drawFace(pts, fill, stroke, lw) {
                ctx.beginPath();
                const p0 = project(...pts[0]);
                ctx.moveTo(p0.x, p0.y);
                for (let i = 1; i < pts.length; i++) {
                    const p = project(...pts[i]);
                    ctx.lineTo(p.x, p.y);
                }
                ctx.closePath();
                if (fill) {
                    ctx.fillStyle = fill;
                    ctx.fill();
                }
                if (stroke) {
                    ctx.strokeStyle = stroke;
                    ctx.lineWidth = lw || 1;
                    ctx.stroke();
                }
            }

            function drawBox(cx, cy, cz, w, h, d, col) {
                const x0 = cx - w / 2,
                    x1 = cx + w / 2,
                    y0 = cy - h / 2,
                    y1 = cy + h / 2,
                    z0 = cz - d / 2,
                    z1 = cz + d / 2;
                const st = col.stroke || "rgba(255,255,255,0.18)",
                    lw = col.strokeWidth || 1;
                const faces = [
                    {
                        pts: [
                            [x0, y1, z1],
                            [x1, y1, z1],
                            [x1, y1, z0],
                            [x0, y1, z0]
                        ],
                        fill: col.bottom
                    },
                    {
                        pts: [
                            [x1, y0, z0],
                            [x0, y0, z0],
                            [x0, y1, z0],
                            [x1, y1, z0]
                        ],
                        fill: col.back
                    },
                    {
                        pts: [
                            [x0, y0, z0],
                            [x0, y0, z1],
                            [x0, y1, z1],
                            [x0, y1, z0]
                        ],
                        fill: col.left
                    },
                    {
                        pts: [
                            [x1, y0, z1],
                            [x1, y0, z0],
                            [x1, y1, z0],
                            [x1, y1, z1]
                        ],
                        fill: col.right
                    },
                    {
                        pts: [
                            [x0, y0, z1],
                            [x1, y0, z1],
                            [x1, y1, z1],
                            [x0, y1, z1]
                        ],
                        fill: col.front
                    },
                    {
                        pts: [
                            [x0, y0, z0],
                            [x1, y0, z0],
                            [x1, y0, z1],
                            [x0, y0, z1]
                        ],
                        fill: col.top
                    }
                ];
                const sorted = faces
                    .map((f) => {
                        const ps = f.pts.map((pt) => project(...pt));
                        return {
                            ...f,
                            avgY: ps.reduce((s, p) => s + p.y, 0) / ps.length
                        };
                    })
                    .sort((a, b) => b.avgY - a.avgY);
                sorted.forEach((f) => {
                    if (isFront(f.pts)) drawFace(f.pts, f.fill, st, lw);
                });
            }

            function text3D(str, x, y, z, color, size, align) {
                const p = project(x, y, z);
                ctx.save();
                ctx.fillStyle = color;
                ctx.font = `bold ${size}px 'Fira Code',monospace`;
                ctx.textAlign = align || "center";
                ctx.textBaseline = "middle";
                ctx.fillText(str, p.x, p.y);
                ctx.restore();
            }

            function drawBalloon(x, y, z, text, bgColor, textColor) {
                const p = project(x, y, z);
                ctx.save();
                ctx.font = "bold 15px 'Fira Code', monospace";
                const tw = ctx.measureText(text).width;
                const th = 26;
                const pad = 12;
                const r = 8;

                const bx = p.x - tw / 2;
                const by = p.y - th - pad - 25;

                ctx.fillStyle = bgColor;
                ctx.beginPath();
                ctx.moveTo(bx - pad + r, by - pad);
                ctx.lineTo(bx + tw + pad - r, by - pad);
                ctx.quadraticCurveTo(
                    bx + tw + pad,
                    by - pad,
                    bx + tw + pad,
                    by - pad + r
                );
                ctx.lineTo(bx + tw + pad, by + th + pad - r);
                ctx.quadraticCurveTo(
                    bx + tw + pad,
                    by + th + pad,
                    bx + tw + pad - r,
                    by + th + pad
                );
                ctx.lineTo(bx - pad + r, by + th + pad);
                ctx.quadraticCurveTo(
                    bx - pad,
                    by + th + pad,
                    bx - pad,
                    by + th + pad - r
                );
                ctx.lineTo(bx - pad, by - pad + r);
                ctx.quadraticCurveTo(
                    bx - pad,
                    by - pad,
                    bx - pad + r,
                    by - pad
                );
                ctx.fill();

                ctx.beginPath();
                ctx.moveTo(p.x - 8, by + th + pad - 1);
                ctx.lineTo(p.x + 8, by + th + pad - 1);
                ctx.lineTo(p.x, by + th + pad + 12);
                ctx.fill();

                ctx.fillStyle = textColor;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(text, p.x, by + th / 2);
                ctx.restore();
            }

            const VPC_X0 = -0.5,
                VPC_X1 = 3.5;
            const VPC_Z0 = -1.6,
                VPC_Z1 = 1.6;

            const IGW_X = -0.5;
            const EC2_CX = 2.5,
                EC2_CZ = 0.0;

            const CLI_X = -3.5,
                CLI_Z = 0.8;
            const DNS_X = -2.0,
                DNS_Z = -1.2;

            const ROUTE_TABLE_X = 0.1,
                ROUTE_TABLE_Z = -0.45;
            const GUARD_SG_X = 1.0,
                GUARD_SG_Z = -0.35;

            const GUARD_UFW_X = 1.9,
                GUARD_UFW_Y = -0.85,
                GUARD_UFW_Z = -0.45;

            function drawGround() {
                const sz = 3.5,
                    step = 0.52;
                ctx.strokeStyle = "rgba(45,90,45,0.28)";
                ctx.lineWidth = 0.5;
                for (let i = -sz; i <= sz; i += step) {
                    const a = project(i, 0, -sz),
                        b = project(i, 0, sz),
                        c = project(-sz, 0, i),
                        d = project(sz, 0, i);
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(c.x, c.y);
                    ctx.lineTo(d.x, d.y);
                    ctx.stroke();
                }
            }

            function drawVPC() {
                const corners = [
                    [VPC_X0, 0, VPC_Z0],
                    [VPC_X1, 0, VPC_Z0],
                    [VPC_X1, 0, VPC_Z1],
                    [VPC_X0, 0, VPC_Z1]
                ];
                const ps = corners.map(([x, y, z]) => project(x, y, z));
                ctx.save();
                ctx.strokeStyle = "#2d5a2d";
                ctx.lineWidth = 2.5;
                ctx.setLineDash([9, 5]);
                ctx.beginPath();
                ctx.moveTo(ps[0].x, ps[0].y);
                ps.forEach((p) => ctx.lineTo(p.x, p.y));
                ctx.closePath();
                ctx.stroke();
                ctx.restore();
                text3D(
                    "AWS VPC",
                    VPC_X0 + 0.2,
                    0,
                    VPC_Z0 + 0.2,
                    "#4ade80",
                    16,
                    "left"
                );
            }

            function drawSubnet() {
                const sx0 = VPC_X0 + 0.2,
                    sx1 = VPC_X1 - 0.2,
                    sz0 = VPC_Z0 + 0.2,
                    sz1 = VPC_Z1 - 0.2;
                drawFace(
                    [
                        [sx0, 0.005, sz0],
                        [sx1, 0.005, sz0],
                        [sx1, 0.005, sz1],
                        [sx0, 0.005, sz1]
                    ],
                    "rgba(16,185,129,0.04)",
                    null
                );
                const ps = [
                    [sx0, sz0],
                    [sx1, sz0],
                    [sx1, sz1],
                    [sx0, sz1]
                ].map(([x, z]) => project(x, 0.005, z));
                ctx.save();
                ctx.strokeStyle = "rgba(16,185,129,0.28)";
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(ps[0].x, ps[0].y);
                ps.forEach((p) => ctx.lineTo(p.x, p.y));
                ctx.closePath();
                ctx.stroke();
                ctx.restore();
                text3D(
                    "Public Subnet",
                    (sx0 + sx1) / 2,
                    0.005,
                    sz0 + 0.1,
                    "rgba(16,185,129,0.45)",
                    14
                );
            }

            function drawRoad() {
                const rx0 = CLI_X - 0.3,
                    rx1 = EC2_CX - 0.5;
                drawFace(
                    [
                        [rx0, 0.01, -0.3],
                        [rx1, 0.01, -0.3],
                        [rx1, 0.01, 0.3],
                        [rx0, 0.01, 0.3]
                    ],
                    "#334155",
                    null
                );
                drawFace(
                    [
                        [CLI_X - 0.3, 0.01, 0.3],
                        [CLI_X + 0.3, 0.01, 0.3],
                        [CLI_X + 0.3, 0.01, CLI_Z],
                        [CLI_X - 0.3, 0.01, CLI_Z]
                    ],
                    "#334155",
                    null
                );
                drawFace(
                    [
                        [DNS_X - 0.3, 0.01, DNS_Z],
                        [DNS_X + 0.3, 0.01, DNS_Z],
                        [DNS_X + 0.3, 0.01, -0.3],
                        [DNS_X - 0.3, 0.01, -0.3]
                    ],
                    "#334155",
                    null
                );

                for (let x = rx0 + 0.08; x < rx1 - 0.04; x += 0.36) {
                    drawFace(
                        [
                            [x, 0.02, -0.04],
                            [x + 0.18, 0.02, -0.04],
                            [x + 0.18, 0.02, 0.04],
                            [x, 0.02, 0.04]
                        ],
                        "#fbbf24",
                        null
                    );
                }
            }

            function drawDNS(t) {
                const dx = DNS_X,
                    dz = DNS_Z;
                for (let i = 0; i < 3; i++) {
                    let dy = -0.1 - i * 0.2;
                    drawBox(dx, dy, dz, 0.4, 0.15, 0.4, {
                        front: "#1e1b4b",
                        back: "#1e1b4b",
                        left: "#312e81",
                        right: "#312e81",
                        top: "#4338ca",
                        stroke: "#6366f1"
                    });
                    let fx = dx - 0.2 - 0.01;
                    drawFace(
                        [
                            [fx, dy - 0.02, dz - 0.12],
                            [fx, dy - 0.02, dz - 0.04],
                            [fx, dy + 0.02, dz - 0.04],
                            [fx, dy + 0.02, dz - 0.12]
                        ],
                        "rgba(52, 211, 153, 0.8)",
                        null
                    );
                }
                drawBox(dx, -0.65, dz, 0.02, 0.3, 0.02, {
                    front: "#94a3b8",
                    back: "#94a3b8",
                    left: "#94a3b8",
                    right: "#94a3b8",
                    top: "#94a3b8"
                });
                const blink = Math.sin(t * 10) > 0;
                const ledCol = blink ? "#ef4444" : "#7f1d1d";
                drawBox(dx, -0.82, dz, 0.06, 0.06, 0.06, {
                    front: ledCol,
                    back: ledCol,
                    left: ledCol,
                    right: ledCol,
                    top: ledCol,
                    stroke: "#fca5a5"
                });
                text3D("🌐 DNS", dx, -1.0, dz, "#818cf8", 16);
            }

            function drawClient() {
                const cx = CLI_X,
                    cz = CLI_Z;
                const bodyCol = {
                    front: "#334155",
                    back: "#0f172a",
                    left: "#1e293b",
                    right: "#334155",
                    top: "#475569",
                    stroke: "#64748b"
                };

                drawBox(cx - 0.1, 0.0, cz, 0.15, 0.02, 0.25, bodyCol);
                drawBox(cx - 0.1, -0.08, cz, 0.03, 0.15, 0.08, bodyCol);
                drawBox(cx - 0.1, -0.3, cz, 0.05, 0.35, 0.6, bodyCol);

                const screenX = cx - 0.074;
                drawFace(
                    [
                        [screenX, -0.14, cz - 0.28],
                        [screenX, -0.14, cz + 0.28],
                        [screenX, -0.46, cz + 0.28],
                        [screenX, -0.46, cz - 0.28]
                    ],
                    "rgba(14, 165, 233, 0.8)",
                    "rgba(56, 189, 248, 0.9)",
                    1
                );
                drawFace(
                    [
                        [screenX + 0.001, -0.4, cz - 0.28],
                        [screenX + 0.001, -0.4, cz + 0.28],
                        [screenX + 0.001, -0.46, cz + 0.28],
                        [screenX + 0.001, -0.46, cz - 0.28]
                    ],
                    "#0f172a",
                    null
                );

                drawFace(
                    [
                        [screenX + 0.002, -0.44, cz - 0.25],
                        [screenX + 0.002, -0.44, cz - 0.23],
                        [screenX + 0.002, -0.42, cz - 0.23],
                        [screenX + 0.002, -0.42, cz - 0.25]
                    ],
                    "#ef4444",
                    null
                );
                drawFace(
                    [
                        [screenX + 0.002, -0.44, cz - 0.21],
                        [screenX + 0.002, -0.44, cz - 0.19],
                        [screenX + 0.002, -0.42, cz - 0.19],
                        [screenX + 0.002, -0.42, cz - 0.21]
                    ],
                    "#f59e0b",
                    null
                );
                drawFace(
                    [
                        [screenX + 0.002, -0.44, cz - 0.17],
                        [screenX + 0.002, -0.44, cz - 0.15],
                        [screenX + 0.002, -0.42, cz - 0.15],
                        [screenX + 0.002, -0.42, cz - 0.17]
                    ],
                    "#10b981",
                    null
                );

                drawBox(cx + 0.15, 0.0, cz, 0.15, 0.02, 0.35, bodyCol);
                drawFace(
                    [
                        [cx + 0.09, -0.011, cz - 0.15],
                        [cx + 0.21, -0.011, cz - 0.15],
                        [cx + 0.21, -0.011, cz + 0.15],
                        [cx + 0.09, -0.011, cz + 0.15]
                    ],
                    "#0f172a",
                    null
                );

                text3D("Client PC", cx, -0.55, cz, "#94a3b8", 16);
            }

            function drawRouteTable() {
                const sx = ROUTE_TABLE_X,
                    sz = ROUTE_TABLE_Z;
                drawBox(sx, -0.2, sz, 0.05, 0.44, 0.05, {
                    front: "#475569",
                    back: "#334155",
                    left: "#475569",
                    right: "#475569",
                    top: "#64748b",
                    stroke: "#64748b"
                });
                drawBox(sx, -0.58, sz, 0.8, 0.28, 0.06, {
                    front: "#1e293b",
                    back: "#0f172a",
                    left: "#1e293b",
                    right: "#1e293b",
                    top: null,
                    stroke: "#fbbf24"
                });

                text3D("🪧 Route Table", sx, -0.6, sz - 0.02, "#fbbf24", 12);

                const pIGW = project(IGW_X, 0, 0);
                const pRT = project(sx, 0, 0);
                const arrow = pIGW.x < pRT.x ? "⬅" : "⮕";

                text3D(
                    `0.0.0.0/0 ${arrow} IGW`,
                    sx,
                    -0.5,
                    sz - 0.02,
                    "#fef3c7",
                    11
                );
            }

            function drawSGWall() {
                const sx = GUARD_SG_X;
                drawBox(sx, -0.4, 0.0, 0.05, 0.8, 0.8, {
                    front: "rgba(245, 158, 11, 0.15)",
                    back: "rgba(245, 158, 11, 0.15)",
                    left: "rgba(245, 158, 11, 0.3)",
                    right: "rgba(245, 158, 11, 0.3)",
                    top: "rgba(245, 158, 11, 0.5)",
                    stroke: "#fcd34d"
                });
                text3D("AWS SG", sx, -0.85, 0.0, "#fcd34d", 14);
            }

            function drawGuard(x, y, z, label, emoji, color, t, drawBase) {
                if (drawBase) {
                    drawBox(x, y + 0.18, z, 0.15, 0.04, 0.15, {
                        front: "#334155",
                        back: "#1e293b",
                        left: "#334155",
                        right: "#334155",
                        top: "#475569",
                        stroke: "#64748b"
                    });
                }
                const float = Math.sin(t * 3) * 0.02;
                text3D(emoji, x, y + float, z, "#fff", 26);
                text3D(label, x, y + 0.13 + float, z, color, 11);
            }

            function drawIGW() {
                const cx = IGW_X,
                    pH = 0.9,
                    pW = 0.2,
                    pD = 0.2,
                    spanZ = 0.6;
                const pilCol = {
                    front: "rgba(59,130,246,0.88)",
                    back: "rgba(37,99,235,0.62)",
                    left: "rgba(30,80,200,0.72)",
                    right: "rgba(96,165,250,0.72)",
                    top: "rgba(147,197,253,0.92)",
                    stroke: "#60a5fa",
                    strokeWidth: 1.2
                };
                drawBox(cx, -pH / 2, -spanZ, pW, pH, pD, pilCol);
                drawBox(cx, -pH / 2, spanZ, pW, pH, pD, pilCol);
                drawBox(cx, -pH + 0.08, 0, pW, 0.18, spanZ * 2 + pD, {
                    front: "rgba(96,165,250,0.92)",
                    back: "rgba(59,130,246,0.72)",
                    left: "rgba(59,130,246,0.82)",
                    right: "rgba(59,130,246,0.82)",
                    top: "rgba(186,218,255,0.97)",
                    stroke: "#93c5fd",
                    strokeWidth: 1.5
                });
                drawFace(
                    [
                        [cx - 0.25, 0.01, -spanZ - 0.1],
                        [cx + 0.25, 0.01, -spanZ - 0.1],
                        [cx + 0.25, 0.01, spanZ + 0.1],
                        [cx - 0.25, 0.01, spanZ + 0.1]
                    ],
                    "rgba(71,113,182,0.15)",
                    "rgba(96,165,250,0.28)",
                    0.8
                );
                const barTop = -(pH - 0.15),
                    barBot = 0.0;
                for (let i = 0; i < 4; i++) {
                    const bz = -spanZ + 0.1 + (i * (spanZ * 2 - 0.2)) / 3;
                    drawBox(
                        cx,
                        (barTop + barBot) / 2,
                        bz,
                        pW * 0.4,
                        barTop - barBot,
                        pD * 0.4,
                        {
                            front: "rgba(96,165,250,0.55)",
                            back: "rgba(59,130,246,0.4)",
                            left: "rgba(59,130,246,0.45)",
                            right: "rgba(96,165,250,0.45)",
                            top: "rgba(147,197,253,0.6)",
                            stroke: "rgba(96,165,250,0.3)",
                            strokeWidth: 0.6
                        }
                    );
                }
                text3D("Internet Gateway", cx, -pH - 0.18, 0, "#93c5fd", 15);
            }

            function buildRackObjects(t) {
                const cx = EC2_CX,
                    cz = EC2_CZ,
                    w = 1.0,
                    h = 1.7,
                    d = 1.0;
                const rCol = {
                    front: "#0f172a",
                    back: "#020617",
                    left: "#1e293b",
                    right: "#0f172a",
                    top: "#334155",
                    stroke: "#475569"
                };
                let objs = [];

                objs.push({
                    draw: () => drawBox(cx, -0.05, cz, w, 0.1, d, rCol),
                    depth: getDepth(cx, -0.05, cz)
                });
                objs.push({
                    draw: () => {
                        drawBox(cx, -h + 0.05, cz, w, 0.1, d, rCol);
                        text3D(
                            "🏢 EC2 Instance",
                            cx,
                            -h - 0.15,
                            cz,
                            "#cbd5e1",
                            16
                        );
                    },
                    depth: getDepth(cx, -h + 0.05, cz)
                });

                const pw = 0.08;
                const px1 = cx - w / 2 + pw / 2,
                    px2 = cx + w / 2 - pw / 2;
                const pz1 = cz - d / 2 + pw / 2,
                    pz2 = cz + d / 2 - pw / 2;
                [
                    { x: px1, z: pz1 },
                    { x: px2, z: pz1 },
                    { x: px1, z: pz2 },
                    { x: px2, z: pz2 }
                ].forEach((p) => {
                    objs.push({
                        draw: () =>
                            drawBox(p.x, -h / 2, p.z, pw, h - 0.2, pw, rCol),
                        depth: getDepth(p.x, -h / 2, p.z)
                    });
                });

                const addBlade = (cy, bh, col, label) => {
                    objs.push({
                        draw: () => {
                            const bw = w - 0.16,
                                bd = d - 0.1;
                            drawBox(cx, cy, cz, bw, bh, bd, col);
                            const fx = cx - bw / 2 - 0.01;
                            for (let v = 0; v < 3; v++) {
                                const vy = cy - 0.06 + v * 0.06;
                                drawFace(
                                    [
                                        [fx, vy - 0.01, cz - 0.25],
                                        [fx, vy - 0.01, cz + 0.1],
                                        [fx, vy + 0.01, cz + 0.1],
                                        [fx, vy + 0.01, cz - 0.25]
                                    ],
                                    "rgba(0,0,0,0.5)",
                                    null
                                );
                            }
                            for (let i = 0; i < 4; i++) {
                                const lz = cz - bd / 2 + 0.2 + i * 0.15;
                                const blink = Math.sin(t * 15 + i * 3) > 0;
                                const ledCol = blink ? "#10b981" : "#064e3b";
                                drawFace(
                                    [
                                        [fx, cy - 0.03, lz - 0.03],
                                        [fx, cy - 0.03, lz + 0.03],
                                        [fx, cy + 0.03, lz + 0.03],
                                        [fx, cy + 0.03, lz - 0.03]
                                    ],
                                    ledCol,
                                    null
                                );
                            }
                            text3D(label, cx - 0.55, cy, cz, "#fff", 13);
                        },
                        depth: getDepth(cx, cy, cz)
                    });
                };

                addBlade(
                    -0.35,
                    0.3,
                    {
                        front: "#0369a1",
                        back: "#075985",
                        left: "#0ea5e9",
                        right: "#0284c7",
                        top: "#38bdf8",
                        stroke: "#7dd3fc"
                    },
                    "🗄️ Hardware"
                );
                addBlade(
                    -0.85,
                    0.4,
                    {
                        front: "#c2410c",
                        back: "#9a3412",
                        left: "#f97316",
                        right: "#ea580c",
                        top: "#fdba74",
                        stroke: "#fed7aa"
                    },
                    "🐧 Ubuntu"
                );
                addBlade(
                    -1.4,
                    0.3,
                    {
                        front: "#047857",
                        back: "#065f46",
                        left: "#10b981",
                        right: "#059669",
                        top: "#34d399",
                        stroke: "#6ee7b7"
                    },
                    "⚙️ Nginx"
                );

                return objs;
            }

            function drawNginxBot(t) {
                const float = Math.sin(t * 2.5) * 0.09;
                const pp = project(EC2_CX, -2.1 + float, EC2_CZ);
                const r = Math.max(
                    zoom * Math.min(canvas.width, canvas.height) * 0.012,
                    6
                );

                const glow = ctx.createRadialGradient(
                    pp.x,
                    pp.y,
                    r * 0.3,
                    pp.x,
                    pp.y,
                    r * 2.5
                );
                glow.addColorStop(0, "rgba(16,185,129,0.4)");
                glow.addColorStop(1, "rgba(16,185,129,0)");
                ctx.beginPath();
                ctx.arc(pp.x, pp.y, r * 2.5, 0, Math.PI * 2);
                ctx.fillStyle = glow;
                ctx.fill();

                const grad = ctx.createRadialGradient(
                    pp.x - r * 0.3,
                    pp.y - r * 0.3,
                    r * 0.1,
                    pp.x,
                    pp.y,
                    r
                );
                grad.addColorStop(0, "#34d399");
                grad.addColorStop(1, "#059669");
                ctx.beginPath();
                ctx.arc(pp.x, pp.y, r, 0, Math.PI * 2);
                ctx.fillStyle = grad;
                ctx.fill();

                ctx.strokeStyle = "#10b981";
                ctx.lineWidth = 1.2;
                ctx.stroke();
                ctx.save();
                ctx.font = `${Math.max(r * 1.3, 16)}px sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("🤖", pp.x, pp.y);
                ctx.restore();
            }

            const PACKET_PATH = [
                [CLI_X, -0.1, CLI_Z],
                [CLI_X, -0.1, 0.0],
                [DNS_X, -0.1, 0.0],
                [DNS_X, -0.1, DNS_Z],
                [DNS_X, -0.1, DNS_Z],
                [DNS_X, -0.1, 0.0],
                [CLI_X, -0.1, 0.0],
                [CLI_X, -0.1, CLI_Z],
                [CLI_X, -0.1, CLI_Z],
                [CLI_X, -0.1, 0.0],
                [IGW_X, -0.1, 0.0],
                [GUARD_SG_X - 0.2, -0.1, 0.0],
                [GUARD_SG_X, -0.1, 0.0],
                [GUARD_SG_X, -0.1, 0.0],
                [GUARD_UFW_X, -0.1, 0.0],
                [GUARD_UFW_X, -0.85, 0.0],
                [GUARD_UFW_X, -0.85, 0.0],
                [GUARD_UFW_X, -0.85, 0.0],
                [GUARD_UFW_X, -1.4, 0.0],
                [EC2_CX - 0.2, -1.4, 0.0],
                [EC2_CX - 0.2, -1.4, 0.0],
                [EC2_CX - 0.2, -1.4, 0.0],
                [GUARD_UFW_X, -1.4, 0.0],
                [GUARD_UFW_X, -0.85, 0.0],
                [GUARD_UFW_X, -0.85, 0.0],
                [GUARD_UFW_X, -0.85, 0.0],
                [GUARD_UFW_X, -0.1, 0.0],
                [GUARD_SG_X, -0.1, 0.0],
                [GUARD_SG_X, -0.1, 0.0],
                [IGW_X, -0.1, 0.0],
                [CLI_X, -0.1, 0.0],
                [CLI_X, -0.1, CLI_Z]
            ];

            function processPacketLogic() {
                const total = PACKET_PATH.length - 1;
                const seg = Math.floor(packetT * total);

                let speaker = null;
                if (seg === 3 || seg === 4) speaker = "DNS";
                else if (seg === 12 || seg === 13) speaker = "SG_IN";
                else if (seg === 16 || seg === 17) speaker = "UFW_IN";
                else if (seg === 24 || seg === 25) speaker = "UFW_OUT";
                else if (seg === 27 || seg === 28) speaker = "SG_OUT";

                if (speaker === "DNS")
                    currentBalloons.push({
                        x: DNS_X,
                        y: -0.3,
                        z: DNS_Z,
                        text: "DNS: ドメインは このIP だよ！",
                        bg: "rgba(79, 70, 229, 0.95)",
                        fg: "#fff"
                    });
                if (speaker === "SG_IN")
                    currentBalloons.push({
                        x: GUARD_SG_X,
                        y: -0.2,
                        z: GUARD_SG_Z,
                        text: "SG: 443番ポート、通過ヨシ！",
                        bg: "rgba(245, 158, 11, 0.95)",
                        fg: "#fff"
                    });
                if (speaker === "UFW_IN")
                    currentBalloons.push({
                        x: GUARD_UFW_X,
                        y: GUARD_UFW_Y,
                        z: GUARD_UFW_Z,
                        text: "UFW: あなたは443番だね。いいよ！",
                        bg: "rgba(225, 29, 72, 0.95)",
                        fg: "#fff"
                    });
                if (speaker === "UFW_OUT")
                    currentBalloons.push({
                        x: GUARD_UFW_X,
                        y: GUARD_UFW_Y,
                        z: GUARD_UFW_Z,
                        text: "UFW(Stateful): 戻りの通信ですね。どうぞ！",
                        bg: "rgba(225, 29, 72, 0.95)",
                        fg: "#fff"
                    });
                if (speaker === "SG_OUT")
                    currentBalloons.push({
                        x: GUARD_SG_X,
                        y: -0.2,
                        z: GUARD_SG_Z,
                        text: "SG(Egress): 全許可 / Stateful ヨシ！",
                        bg: "rgba(245, 158, 11, 0.95)",
                        fg: "#fff"
                    });
            }

            function drawPacket(t) {
                const total = PACKET_PATH.length - 1;
                const seg = Math.floor(packetT * total);
                if (seg >= total) return;
                const frac = packetT * total - seg;
                const a = PACKET_PATH[seg],
                    b = PACKET_PATH[seg + 1];
                const px = a[0] + (b[0] - a[0]) * frac,
                    py = a[1] + (b[1] - a[1]) * frac,
                    pz = a[2] + (b[2] - a[2]) * frac;
                const pp = project(px, py, pz);

                let pktType = "request";
                let labelStr = "GET /";
                let mainColor = "#38bdf8";

                if (seg < 8) {
                    pktType = "dns_req";
                    labelStr = "🔍 DNS Query";
                    mainColor = "#a78bfa";
                } else if (seg >= 8 && seg < 19) {
                    pktType = "request";
                    labelStr = "✉️ GET /";
                    mainColor = "#38bdf8";
                } else if (seg === 19 || seg === 20) {
                    pktType = "process";
                    labelStr = "Processing...";
                    mainColor = "#f59e0b";
                } else {
                    pktType = "response";
                    labelStr = "📦 200 OK";
                    mainColor = "#10b981";
                }

                const sc =
                    zoom * Math.min(canvas.width, canvas.height) * 0.0008;
                const size = Math.max(sc * 14, 5);

                if (pktType === "request" || pktType.startsWith("dns")) {
                    const letterCol = pktType.startsWith("dns")
                        ? {
                              front: "#eef2ff",
                              back: "#c7d2fe",
                              left: "#a5b4fc",
                              right: "#a5b4fc",
                              top: "#ffffff",
                              stroke: "#818cf8",
                              strokeWidth: 1.0
                          }
                        : {
                              front: "#ffffff",
                              back: "#e2e8f0",
                              left: "#cbd5e1",
                              right: "#cbd5e1",
                              top: "#ffffff",
                              stroke: "#94a3b8",
                              strokeWidth: 1.0
                          };
                    drawBox(px, py, pz, 0.16, 0.02, 0.12, letterCol);

                    ctx.save();
                    ctx.font = `bold ${Math.max(size * 0.8, 12)}px 'Fira Code',monospace`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    const textPos = project(px, py - 0.12, pz);
                    const tw = ctx.measureText(labelStr).width;
                    const th = Math.max(size * 0.8, 12);

                    const bgFill = pktType.startsWith("dns")
                        ? "rgba(79, 70, 229, 0.9)"
                        : "rgba(2,132,199,0.9)";
                    ctx.fillStyle = bgFill;
                    ctx.fillRect(
                        textPos.x - tw / 2 - 6,
                        textPos.y - th / 2 - 4,
                        tw + 12,
                        th + 8
                    );
                    ctx.strokeStyle = mainColor;
                    ctx.lineWidth = 1;
                    ctx.strokeRect(
                        textPos.x - tw / 2 - 6,
                        textPos.y - th / 2 - 4,
                        tw + 12,
                        th + 8
                    );

                    ctx.fillStyle = "#ffffff";
                    ctx.fillText(labelStr, textPos.x, textPos.y);
                    ctx.restore();
                } else {
                    const boxCol =
                        pktType === "response"
                            ? {
                                  front: "rgba(5,150,105,0.9)",
                                  back: "rgba(4,120,87,0.9)",
                                  left: "rgba(4,120,87,0.9)",
                                  right: "rgba(16,185,129,0.9)",
                                  top: "rgba(52,211,153,0.95)",
                                  stroke: "#a7f3d0",
                                  strokeWidth: 1.0
                              }
                            : {
                                  front: "rgba(217,119,6,0.9)",
                                  back: "rgba(180,83,9,0.9)",
                                  left: "rgba(180,83,9,0.9)",
                                  right: "rgba(245,158,11,0.9)",
                                  top: "rgba(251,191,36,0.95)",
                                  stroke: "#fde68a",
                                  strokeWidth: 1.0
                              };

                    const glowColor =
                        pktType === "response"
                            ? "rgba(16,185,129,0.5)"
                            : "rgba(245,158,11,0.5)";
                    const glow = ctx.createRadialGradient(
                        pp.x,
                        pp.y,
                        0,
                        pp.x,
                        pp.y,
                        size * 2.5
                    );
                    glow.addColorStop(0, glowColor);
                    glow.addColorStop(1, "rgba(0,0,0,0)");
                    ctx.beginPath();
                    ctx.arc(pp.x, pp.y, size * 2.5, 0, Math.PI * 2);
                    ctx.fillStyle = glow;
                    ctx.fill();

                    drawBox(px, py, pz, 0.16, 0.14, 0.16, boxCol);

                    ctx.save();
                    ctx.font = `bold ${Math.max(size * 0.8, 12)}px 'Fira Code',monospace`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    const textPos = project(px, py - 0.2, pz);
                    const tw = ctx.measureText(labelStr).width;
                    const th = Math.max(size * 0.8, 12);
                    const bgFill =
                        pktType === "response"
                            ? "rgba(4,120,87,0.85)"
                            : "rgba(180,83,9,0.85)";

                    ctx.fillStyle = bgFill;
                    ctx.fillRect(
                        textPos.x - tw / 2 - 6,
                        textPos.y - th / 2 - 6,
                        tw + 12,
                        th + 12
                    );
                    ctx.strokeStyle = mainColor;
                    ctx.lineWidth = 1;
                    ctx.strokeRect(
                        textPos.x - tw / 2 - 6,
                        textPos.y - th / 2 - 6,
                        tw + 12,
                        th + 12
                    );

                    ctx.fillStyle = "#ffffff";
                    ctx.fillText(labelStr, textPos.x, textPos.y);
                    ctx.restore();
                }
            }

            function draw(ts) {
                currentBalloons = [];
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = "#0f111a";
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                drawGround();
                drawVPC();
                drawSubnet();
                drawRoad();

                processPacketLogic();

                const total = PACKET_PATH.length - 1;
                const seg = Math.floor(packetT * total);
                let pktX = PACKET_PATH[0][0],
                    pktY = PACKET_PATH[0][1],
                    pktZ = PACKET_PATH[0][2];
                if (seg < total) {
                    const frac = packetT * total - seg;
                    const a = PACKET_PATH[seg],
                        b = PACKET_PATH[seg + 1];
                    pktX = a[0] + (b[0] - a[0]) * frac;
                    pktY = a[1] + (b[1] - a[1]) * frac;
                    pktZ = a[2] + (b[2] - a[2]) * frac;
                }

                let objects = [
                    { draw: drawClient, depth: getDepth(CLI_X, -0.14, CLI_Z) },
                    {
                        draw: () => drawDNS(ts / 1000),
                        depth: getDepth(DNS_X, -0.3, DNS_Z)
                    },
                    { draw: drawIGW, depth: getDepth(IGW_X, -0.39, 0) },
                    {
                        draw: drawRouteTable,
                        depth: getDepth(ROUTE_TABLE_X, -0.35, ROUTE_TABLE_Z)
                    },
                    {
                        draw: drawSGWall,
                        depth: getDepth(GUARD_SG_X, -0.4, 0.0)
                    },
                    {
                        draw: () =>
                            drawGuard(
                                GUARD_SG_X,
                                -0.2,
                                GUARD_SG_Z,
                                "SG",
                                "👮",
                                "#fcd34d",
                                ts / 1000,
                                true
                            ),
                        depth: getDepth(GUARD_SG_X, -0.2, GUARD_SG_Z)
                    },
                    {
                        draw: () =>
                            drawGuard(
                                GUARD_UFW_X,
                                GUARD_UFW_Y,
                                GUARD_UFW_Z,
                                "UFW",
                                "🛡️",
                                "#fda4af",
                                ts / 1000,
                                false
                            ),
                        depth: getDepth(GUARD_UFW_X, GUARD_UFW_Y, GUARD_UFW_Z)
                    },
                    {
                        draw: () => drawNginxBot(ts / 1000),
                        depth: getDepth(EC2_CX, -2.1, EC2_CZ)
                    },
                    {
                        draw: () => drawPacket(ts / 1000),
                        depth: getDepth(pktX, pktY, pktZ)
                    }
                ];

                objects = objects.concat(buildRackObjects(ts / 1000));

                objects.sort((a, b) => b.depth - a.depth);
                objects.forEach((obj) => obj.draw());

                currentBalloons.forEach((b) => {
                    drawBalloon(b.x, b.y, b.z, b.text, b.bg, b.fg);
                });
            }

            let lastTime = 0;
            function loop(ts) {
                const dt = Math.min((ts - lastTime) / 1000, 0.05);
                lastTime = ts;
                packetT = (packetT + dt * 0.045) % 1;
                draw(ts);
                requestAnimationFrame(loop);
            }
            requestAnimationFrame(loop);
