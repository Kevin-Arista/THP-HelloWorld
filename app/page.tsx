"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function LandingPage() {
	const [user, setUser] = useState<User | null>(null);
	const supabase = createClient();

	useEffect(() => {
		supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
	}, [supabase]);

	return (
		<main
			style={{
				minHeight: "calc(100vh - 56px)",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				fontFamily: "inherit",
				padding: "2rem",
			}}>

			{/* Hero title */}
			<h1
				style={{
					fontSize: "clamp(2.5rem, 8vw, 5rem)",
					fontWeight: 800,
					color: "#00f0ff",
					letterSpacing: "0.22em",
					marginBottom: "0.6rem",
					textAlign: "center",
					animation: "neonFlicker 9s ease-in-out infinite, textGlowPulse 4s ease-in-out infinite",
				}}>
				MEMEVOTE
			</h1>

			<p
				style={{
					fontSize: "0.78rem",
					color: "#2e6070",
					marginBottom: "0.3rem",
					textAlign: "center",
					letterSpacing: "0.18em",
					textTransform: "uppercase",
				}}>
				Powered by{" "}
				<span style={{ color: "#00f0ff", fontWeight: 600 }}>
					Cracked AI
				</span>
			</p>

			<p
				style={{
					fontSize: "1rem",
					color: "#2e6070",
					marginBottom: "2rem",
					textAlign: "center",
					letterSpacing: "0.18em",
				}}>
				SWIPE · VOTE · LAUGH
			</p>

			<p
				style={{
					fontSize: "0.82rem",
					color: "#2e6070",
					marginBottom: "3rem",
					textAlign: "center",
					maxWidth: "360px",
					lineHeight: 1.9,
					letterSpacing: "0.05em",
				}}>
				Upload an image. The AI generates captions.
				The Grid decides which ones are funny.
			</p>

			{/* Decorative phone frame */}
			<div
				style={{
					width: "240px",
					height: "400px",
					background: "#000f1e",
					borderRadius: "34px",
					border: "2px solid rgba(0, 240, 255, 0.28)",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					overflow: "hidden",
					marginBottom: "3rem",
					animation: "glowPulse 4s ease-in-out infinite",
					boxShadow: "0 0 40px rgba(0,240,255,0.08), inset 0 0 20px rgba(0,240,255,0.02)",
				}}>
				{/* Notch */}
				<div
					style={{
						width: "80px",
						height: "22px",
						background: "#000810",
						borderRadius: "0 0 12px 12px",
						borderBottom: "1px solid rgba(0,240,255,0.12)",
					}}
				/>

				{/* Screen content */}
				<div
					style={{
						flex: 1,
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						gap: "1rem",
						padding: "1.25rem",
					}}>
					{/* Image placeholder */}
					<div
						style={{
							width: "168px",
							height: "128px",
							background: "#000810",
							borderRadius: "10px",
							border: "1px solid rgba(0,240,255,0.15)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							fontSize: "2.2rem",
							boxShadow: "inset 0 0 10px rgba(0,240,255,0.05)",
						}}>
						😂
					</div>

					{/* Caption lines */}
					<div
						style={{
							width: "150px",
							height: "2px",
							background: "rgba(0,240,255,0.2)",
							borderRadius: "2px",
							boxShadow: "0 0 6px rgba(0,240,255,0.3)",
						}}
					/>
					<div
						style={{
							width: "110px",
							height: "2px",
							background: "rgba(0,240,255,0.1)",
							borderRadius: "2px",
						}}
					/>

					{/* Vote buttons */}
					<div style={{ display: "flex", gap: "2rem", marginTop: "0.5rem" }}>
						<span
							style={{
								width: "42px",
								height: "42px",
								borderRadius: "50%",
								border: "2px solid rgba(255, 102, 0, 0.4)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontSize: "1rem",
								color: "#ff6600",
								animation: "orangeGlowPulse 3.5s ease-in-out infinite",
							}}>
							✗
						</span>
						<span
							style={{
								width: "42px",
								height: "42px",
								borderRadius: "50%",
								border: "2px solid rgba(0, 240, 255, 0.4)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontSize: "1rem",
								color: "#00f0ff",
								animation: "glowPulse 3s ease-in-out infinite",
							}}>
							✓
						</span>
					</div>
				</div>

				{/* Home indicator */}
				<div
					style={{
						width: "70px",
						height: "3px",
						background: "rgba(0,240,255,0.2)",
						borderRadius: "2px",
						marginBottom: "10px",
						boxShadow: "0 0 6px rgba(0,240,255,0.25)",
					}}
				/>
			</div>

			{/* CTA buttons */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: "1rem",
					width: "100%",
					maxWidth: "380px",
				}}>
				{user ? (
					<>
						<Link
							href="/vote"
							style={{
								display: "block",
								width: "100%",
								padding: "1.15rem 2rem",
								fontSize: "1.25rem",
								fontWeight: 800,
								color: "#000810",
								background: "#00f0ff",
								borderRadius: "4px",
								textDecoration: "none",
								textAlign: "center",
								letterSpacing: "0.14em",
								boxShadow: "0 0 28px rgba(0,240,255,0.55), 0 0 70px rgba(0,240,255,0.2)",
								animation: "glowPulse 3s ease-in-out infinite",
							}}>
							START VOTING
						</Link>
						<Link
							href="/gallery"
							style={{
								display: "block",
								width: "100%",
								padding: "0.85rem 2rem",
								fontSize: "0.95rem",
								fontWeight: 600,
								color: "#00f0ff",
								background: "transparent",
								border: "1px solid rgba(0, 240, 255, 0.3)",
								borderRadius: "4px",
								textDecoration: "none",
								textAlign: "center",
								letterSpacing: "0.1em",
							}}>
							VIEW GALLERY
						</Link>
					</>
				) : (
					<>
						<Link
							href="/login"
							style={{
								display: "block",
								width: "100%",
								padding: "1.15rem 2rem",
								fontSize: "1.25rem",
								fontWeight: 800,
								color: "#000810",
								background: "#00f0ff",
								borderRadius: "4px",
								textDecoration: "none",
								textAlign: "center",
								letterSpacing: "0.14em",
								boxShadow: "0 0 28px rgba(0,240,255,0.55), 0 0 70px rgba(0,240,255,0.2)",
								animation: "glowPulse 3s ease-in-out infinite",
							}}>
							SIGN IN TO GET STARTED
						</Link>
						<Link
							href="/gallery"
							style={{
								display: "block",
								width: "100%",
								padding: "0.85rem 2rem",
								fontSize: "0.95rem",
								fontWeight: 600,
								color: "#00f0ff",
								background: "transparent",
								border: "1px solid rgba(0, 240, 255, 0.3)",
								borderRadius: "4px",
								textDecoration: "none",
								textAlign: "center",
								letterSpacing: "0.1em",
							}}>
							VIEW GALLERY
						</Link>
					</>
				)}
			</div>
		</main>
	);
}
