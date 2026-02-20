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
			options: {
				redirectTo: `${window.location.origin}/auth/callback`,
			},
		});
	}

	return (
		<main
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				minHeight: "100vh",
				fontFamily: "system-ui, sans-serif",
			}}>
			<h1
				style={{
					marginBottom: "0.5rem",
					fontSize: "2.5rem",
					fontWeight: 800,
					color: "#f0f0ff",
					textShadow:
						"0 0 7px rgba(78,205,196,0.6), 0 0 30px rgba(78,205,196,0.3)",
				}}>
				MemeVote
			</h1>
			<p
				style={{
					marginBottom: "2rem",
					fontSize: "1rem",
					color: "#8888aa",
				}}>
				Welcome — sign in to get started
			</p>

			{error && (
				<p style={{ color: "#ff6b6b", marginBottom: "1rem" }}>
					Authentication failed. Please try again.
				</p>
			)}

			<button
				onClick={handleSignIn}
				style={{
					padding: "0.75rem 1.5rem",
					fontSize: "1rem",
					backgroundColor: "#4285F4",
					color: "#fff",
					border: "none",
					borderRadius: "8px",
					cursor: "pointer",
					boxShadow: "0 0 15px rgba(66,133,244,0.3)",
					transition: "box-shadow 0.2s",
				}}>
				Sign in with Google
			</button>
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
