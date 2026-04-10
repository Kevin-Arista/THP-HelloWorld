"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
	const searchParams = useSearchParams();
	const error = searchParams.get("error");

	async function handleSignIn() {
		const supabase = createClient();
		await supabase.auth.signInWithOAuth({
			provider: "google",
			options: { redirectTo: `${window.location.origin}/auth/callback` },
		});
	}

	return (
		<main
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				minHeight: "calc(100vh - 56px)",
				fontFamily: "inherit",
				padding: "2rem",
			}}>
			{/* Panel */}
			<div
				style={{
					width: "100%",
					maxWidth: "360px",
					background: "#000f1e",
					border: "1px solid rgba(0, 240, 255, 0.28)",
					borderRadius: "6px",
					padding: "2.5rem 2rem",
					boxShadow: "0 0 40px rgba(0,240,255,0.08), inset 0 0 20px rgba(0,240,255,0.02)",
					animation: "glowPulse 4s ease-in-out infinite",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: "0.5rem",
				}}>
				{/* Title */}
				<h1
					style={{
						fontSize: "2rem",
						fontWeight: 800,
						color: "#00f0ff",
						letterSpacing: "0.2em",
						marginBottom: "0.25rem",
						animation: "neonFlicker 9s ease-in-out infinite, textGlowPulse 4s ease-in-out infinite",
					}}>
					MEMEVOTE
				</h1>

				<div
					style={{
						width: "60px",
						height: "1px",
						background: "rgba(0,240,255,0.3)",
						marginBottom: "0.5rem",
						boxShadow: "0 0 6px rgba(0,240,255,0.4)",
					}}
				/>

				<p
					style={{
						fontSize: "0.78rem",
						color: "#2e6070",
						letterSpacing: "0.12em",
						textAlign: "center",
						marginBottom: "1.5rem",
					}}>
					AUTHENTICATE TO ENTER THE GRID
				</p>

				{error && (
					<p
						style={{
							color: "#ff6600",
							fontSize: "0.78rem",
							letterSpacing: "0.06em",
							marginBottom: "1rem",
							padding: "0.5rem 0.75rem",
							background: "rgba(255,102,0,0.06)",
							border: "1px solid rgba(255,102,0,0.25)",
							borderRadius: "3px",
							width: "100%",
							textAlign: "center",
						}}>
						AUTHENTICATION FAILED. TRY AGAIN.
					</p>
				)}

				<button
					onClick={handleSignIn}
					style={{
						width: "100%",
						padding: "0.85rem 1.5rem",
						fontSize: "0.9rem",
						fontWeight: 700,
						letterSpacing: "0.1em",
						background: "#00f0ff",
						color: "#000810",
						border: "none",
						borderRadius: "4px",
						cursor: "pointer",
						fontFamily: "inherit",
						boxShadow: "0 0 20px rgba(0,240,255,0.45), 0 0 50px rgba(0,240,255,0.15)",
						animation: "glowPulse 3s ease-in-out infinite",
						transition: "opacity 0.2s",
					}}>
					SIGN IN WITH GOOGLE
				</button>
			</div>
		</main>
	);
}

export default function LoginPage() {
	return (
		<Suspense>
			<LoginForm />
		</Suspense>
	);
}
